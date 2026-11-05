import { randomUUID } from 'node:crypto';
import { ulid } from 'ulid';
import { z } from 'zod';
import type { ChatAction, ChatEvent, ChatKey, ChatMessage } from '../../../shared/dto';
import type { AgentProvider, RunSpec } from '../../platform/agents/types';
import { UserFacingError } from '../../platform/ipc/user-facing-error';
import { loggerFor } from '../observability/log.service';

const TURN_TIMEOUT_MS = 120_000;
/** Deltas closer together than this are sent as one IPC message; the first delta of a reply always goes out at once. */
const FLUSH_MS = 40;

export interface ChatTurnSpec {
  chatKey: ChatKey;
  prompt: string;
  mcpServers?: RunSpec['mcpServers'];
  toolAllowlist?: RunSpec['toolAllowlist'];
  /** Persists the reply text and returns the saved message. */
  save(body: string): ChatMessage;
  /** Saved as the reply when the model produced no text at all. */
  fallback: string;
  /** Runs after the reply is saved and shown (Cap's relays); its failure never touches the reply. */
  after?(reply: ChatMessage): Promise<ChatAction[]>;
}

/**
 * Streams one conversational reply per chat: `thinking` at once, then `delta`s as the model writes, then `done`.
 * At most one reply per chat is in flight; `cancel` aborts it and keeps what already streamed. Everything the
 * renderer learns goes out as `ChatEvent`s; the reply is saved (by `spec.save`) only when the turn ends.
 */
export class ChatTurns {
  private readonly active = new Map<ChatKey, AbortController>();

  constructor(
    private readonly agent: AgentProvider | undefined,
    private readonly emit: (event: ChatEvent) => void,
    private readonly options: { timeoutMs?: number; flushMs?: number; now?: () => number } = {},
  ) {}

  busy(chatKey: ChatKey): boolean {
    return this.active.has(chatKey);
  }

  /** Throws before anything is saved if this chat already has a reply in flight. */
  assertIdle(chatKey: ChatKey): void {
    if (this.busy(chatKey)) throw new UserFacingError('Wait for the current reply, or press Esc to stop it.');
  }

  cancel(chatKey: ChatKey): boolean {
    const controller = this.active.get(chatKey);
    controller?.abort();
    return controller !== undefined;
  }

  /** Aborts every reply in flight (app quit). */
  stop(): void {
    for (const controller of this.active.values()) controller.abort();
  }

  warm(): void {
    this.agent?.warm?.();
  }

  /** Starts the reply and returns at once; `finished` settles after `done` (and `after`) were emitted. Never rejects. */
  start(spec: ChatTurnSpec): { replyId: string; finished: Promise<void> } {
    this.assertIdle(spec.chatKey);
    const replyId = ulid();
    const controller = new AbortController();
    this.active.set(spec.chatKey, controller);
    return { replyId, finished: this.run(spec, replyId, controller) };
  }

  private async run(spec: ChatTurnSpec, replyId: string, controller: AbortController): Promise<void> {
    const { chatKey } = spec;
    const now = this.options.now ?? Date.now;
    const flushMs = this.options.flushMs ?? FLUSH_MS;
    const startedAt = now();
    let ttftMs: number | null = null;
    let streamed = '';
    let unsent = '';
    let timer: NodeJS.Timeout | undefined;
    const flush = (): void => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (unsent === '') return;
      const text = unsent;
      unsent = '';
      this.emit({ type: 'delta', chatKey, replyId, text });
    };
    this.emit({ type: 'thinking', chatKey, replyId });
    let outcome: 'ok' | 'failed' | 'cancelled' = 'ok';
    let text: string;
    try {
      if (!this.agent) throw new Error('no agent');
      const run = this.agent.run({
        runId: randomUUID(),
        sessionId: randomUUID(),
        prompt: spec.prompt,
        mcpServers: spec.mcpServers ?? {},
        ...(spec.toolAllowlist ? { toolAllowlist: spec.toolAllowlist } : {}),
        outputSchema: z.string(),
        streamText: true,
        ephemeral: true,
        signal: controller.signal,
        timeoutMs: this.options.timeoutMs ?? TURN_TIMEOUT_MS,
      });
      void run.result.catch(() => undefined);
      for await (const event of run.events) {
        if (event.type !== 'delta') continue;
        streamed += event.text;
        if (ttftMs === null) {
          ttftMs = now() - startedAt;
          this.emit({ type: 'delta', chatKey, replyId, text: event.text });
        } else {
          unsent += event.text;
          timer ??= setTimeout(flush, flushMs);
        }
      }
      text = (await run.result).trim();
      if (text === '') throw new Error('empty reply');
    } catch (error) {
      if (controller.signal.aborted) outcome = 'cancelled';
      else {
        outcome = 'failed';
        loggerFor('inbox').warn(
          {
            chat: chatKey === 'cap' ? 'cap' : 'job',
            error_class: error instanceof Error ? error.constructor.name : 'Unknown',
          },
          'Chat reply failed',
        );
      }
      // Whatever the owner already saw stays; only a reply that never produced text gets the fallback.
      text = streamed.trim();
    }
    flush();
    if (outcome === 'failed' && text === '') text = spec.fallback;
    let message: ChatMessage | null = null;
    try {
      if (text !== '') message = spec.save(text);
    } catch {
      outcome = 'failed';
    }
    this.active.delete(chatKey);
    this.emit({ type: 'done', chatKey, replyId, message, outcome, ttftMs });
    if (ttftMs !== null)
      loggerFor('inbox').debug({ chat: chatKey === 'cap' ? 'cap' : 'job', ttft_ms: ttftMs }, 'Chat first token');
    if (message && outcome === 'ok' && spec.after) {
      try {
        const actions = await spec.after(message);
        if (actions.length > 0) this.emit({ type: 'actions', chatKey, replyId, actions });
      } catch {
        loggerFor('inbox').warn({ chat: chatKey === 'cap' ? 'cap' : 'job' }, 'Chat follow-up step failed');
      }
    }
  }
}
