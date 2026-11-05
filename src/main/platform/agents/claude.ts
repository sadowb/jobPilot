import { randomUUID } from 'node:crypto';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute } from 'node:path';
import { query, startup, type Options, type WarmQuery } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { Logger } from 'pino';
import {
  RunEventSchema,
  type RunResultSchema,
  type AgentProvider,
  type AgentRun,
  type RunEvent,
  type RunSpec,
} from './types';
import { redactSecret, STDERR_CAP, stderrDiagnostic } from './redact';

const environmentKeys = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'USER', 'LOGNAME'] as const;
const contentSchema = z.union([
  z.string(),
  z.array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('text'), text: z.string() }),
      z.object({ type: z.literal('tool_use'), id: z.string(), name: z.string(), input: z.unknown() }),
      z.object({
        type: z.literal('tool_result'),
        tool_use_id: z.string(),
        content: z.unknown(),
        is_error: z.boolean().optional(),
      }),
      z.object({
        type: z.enum([
          'thinking',
          'redacted_thinking',
          'image',
          'document',
          'server_tool_use',
          'web_search_tool_result',
        ]),
      }),
    ]),
  ),
]);

export interface ClaudeProviderOptions {
  /** Installed native executable, never Electron or a command found on PATH. */
  executablePath: string;
  /** Private agent workspace and config home, under userData/agents/claude. */
  cwd: string;
  configDirectory: string;
  /** Main-process platform/secrets accessor; never sourced from RunSpec or the renderer. */
  readApiKey?: () => Promise<string | undefined>;
  /** LogService child and redactor supplied by the main-process composition root. */
  logger: Pick<Logger, 'debug'>;
  redact: (value: unknown) => unknown;
}

/** The agent process a query spawned, shared between the code that starts it and the code that must kill it. */
interface ChildHolder {
  child?: ChildProcess;
}

/** Kills the agent and everything it spawned (MCP servers, helpers). Windows has no process groups, so it kills the tree. */
function killChild(child: ChildProcess | undefined): void {
  if (!child?.pid) return;
  try {
    // taskkill /T runs synchronously so it still completes during a shutdown/logoff session-end.
    if (process.platform === 'win32')
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGKILL');
  } catch {
    /* Already exited. */
  }
}

function buildEnv(
  options: ClaudeProviderOptions,
  specEnv: Record<string, string> | undefined,
  apiKey: string,
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of environmentKeys) {
    const value = specEnv?.[key];
    if (value !== undefined) env[key] = z.string().parse(value);
  }
  env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1';
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  env.CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL = '1';
  if (apiKey) {
    env.CLAUDE_CONFIG_DIR = options.configDirectory;
    env.ANTHROPIC_API_KEY = apiKey;
  }
  return env;
}

function buildQueryOptions(input: {
  options: ClaudeProviderOptions;
  spec: RunSpec<z.ZodType>;
  env: Record<string, string>;
  apiKey: string;
  controller: AbortController;
  holder: ChildHolder;
}): Options {
  const { options, spec, env, apiKey, controller, holder } = input;
  return {
    pathToClaudeCodeExecutable: options.executablePath,
    cwd: options.cwd,
    env,
    abortController: controller,
    model: spec.model ?? 'haiku',
    // Transcripts are written only under the private config dir (API-key mode); login mode would write
    // ~/.claude, which ADR 0016 forbids.
    // shortcut: login-mode runs cannot resume and restart a fresh session, upgrade when the SDK takes a transcript dir.
    persistSession: apiKey !== '' && !spec.streamText,
    includePartialMessages: spec.streamText === true,
    ...(spec.resume && apiKey ? { resume: spec.sessionId } : { sessionId: spec.sessionId }),
    mcpServers: spec.mcpServers,
    strictMcpConfig: true,
    settingSources: [],
    tools: [],
    canUseTool: async (name, input) =>
      name === 'StructuredOutput' ||
      Object.keys(spec.mcpServers).some((server) => {
        const prefix = `mcp__${server}__`;
        return name.startsWith(prefix) && (spec.toolAllowlist?.[server]?.includes(name.slice(prefix.length)) ?? true);
      })
        ? { behavior: 'allow', updatedInput: input }
        : { behavior: 'deny', message: 'Only run-scoped MCP tools are allowed.' },
    // draft-7: Claude Code's --json-schema validator rejects the 2020-12 `$schema` zod emits by default.
    // A conversational (`streamText`) turn answers in plain text instead, so it can stream as it is written.
    ...(spec.streamText
      ? {}
      : {
          outputFormat: {
            type: 'json_schema' as const,
            schema: z.toJSONSchema(spec.outputSchema, { io: 'input', target: 'draft-7' }),
          },
        }),
    // Reapply our environment at the actual spawn boundary, even if SDK defaults change.
    spawnClaudeCodeProcess: ({ args, signal }) => {
      const processChild = spawn(options.executablePath, args, {
        cwd: options.cwd,
        env,
        signal,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      });
      holder.child = processChild;
      const key = apiKey;
      let stderr = Buffer.alloc(0);
      let spawnFailed = false;
      processChild.stderr.on('data', (chunk: Buffer) => {
        stderr = Buffer.concat([stderr, chunk.subarray(0, Math.max(0, STDERR_CAP - stderr.length))]);
      });
      processChild.once('error', () => {
        spawnFailed = true;
      });
      processChild.once('close', (code) => {
        if (code === 0 && !spawnFailed) return;
        const diagnostic = z.string().parse(options.redact(stderrDiagnostic(stderr, key)));
        options.logger.debug({
          run_id: spec.runId,
          agent: 'claude',
          error_class: spawnFailed ? 'ClaudeProcessError' : 'ClaudeProcessExit',
          exit_code: code,
          stderr: diagnostic,
        });
      });
      return processChild;
    },
  };
}

/**
 * A tool-less Claude process started ahead of a chat reply (initialised, not yet prompted), so the reply's first token
 * does not wait for a cold start. Single use: `run` claims it, or `close` discards it.
 */
export interface ClaudeWarm {
  readonly model: string;
  /** True when a `streamText` run with these needs can take this process instead of spawning one. */
  fits(spec: RunSpec<z.ZodType>): boolean;
}

interface WarmInternals extends ClaudeWarm {
  warmQuery: WarmQuery;
  controller: AbortController;
  holder: ChildHolder;
  close(): void;
}

export class ClaudeProvider implements AgentProvider {
  readonly id = 'claude' as const;

  private readonly controllers = new Set<AbortController>();
  private spare?: WarmInternals;

  stop(): void {
    this.spare?.close();
    this.spare = undefined;
    for (const controller of this.controllers) controller.abort();
  }

  /**
   * Starts a tool-less process ahead of time for the next `streamText` run on this provider. Resolves once it is
   * initialised; a run with a different model or any MCP server discards it and starts normally.
   */
  async prewarm(input: { model?: string; env?: Record<string, string> }): Promise<void> {
    const options = this.options;
    await access(options.executablePath, constants.X_OK);
    const key = await options.readApiKey?.();
    const apiKey = key === undefined ? '' : z.string().trim().min(1).parse(key);
    const controller = new AbortController();
    const holder: ChildHolder = {};
    const model = input.model ?? 'haiku';
    const spec: RunSpec<z.ZodType> = {
      runId: randomUUID(),
      sessionId: randomUUID(),
      prompt: '',
      mcpServers: {},
      outputSchema: z.string(),
      streamText: true,
      ephemeral: true,
      model,
      ...(input.env ? { env: input.env } : {}),
      signal: controller.signal,
      timeoutMs: 60_000,
    };
    const env = buildEnv(options, spec.env, apiKey);
    controller.signal.addEventListener('abort', () => killChild(holder.child), { once: true });
    const warmQuery = await startup({ options: buildQueryOptions({ options, spec, env, apiKey, controller, holder }) });
    this.spare?.close();
    this.spare = {
      model,
      warmQuery,
      controller,
      holder,
      fits: (next) =>
        next.streamText === true && Object.keys(next.mcpServers).length === 0 && (next.model ?? 'haiku') === model,
      close: () => {
        controller.abort();
        warmQuery.close();
      },
    };
  }

  constructor(private readonly options: ClaudeProviderOptions) {
    for (const path of [options.executablePath, options.cwd, options.configDirectory]) {
      if (!isAbsolute(path)) throw new Error('Claude requires absolute tool and workspace paths.');
    }
  }

  run<S extends z.ZodType = typeof RunResultSchema>(spec: RunSpec<S>): AgentRun<z.infer<S>> {
    let resolveResult!: (value: z.infer<S>) => void;
    let rejectResult!: (error: Error) => void;
    const promise = new Promise<z.infer<S>>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    // The stream owns failures; attach a handler before callers start consuming it.
    void promise.catch(() => undefined);
    const options = this.options;
    const controllers = this.controllers;
    // A pre-warmed process is single use: this run takes it if it fits, otherwise it is discarded.
    const warmed = this.spare?.fits(spec as RunSpec<z.ZodType>) ? this.spare : undefined;
    if (!warmed) this.spare?.close();
    this.spare = undefined;
    const holder: ChildHolder = warmed?.holder ?? {};
    async function* events(): AsyncGenerator<RunEvent> {
      const controller = new AbortController();
      controllers.add(controller);
      const kill = (): void => killChild(holder.child);
      controller.signal.addEventListener('abort', kill, { once: true });
      let stream: ReturnType<typeof query> | undefined;
      let finished = false;
      let apiKey = '';
      let failure = 'Claude run failed.';
      const abort = (): void => {
        if (!controller.signal.aborted) failure = 'Claude run aborted.';
        controller.abort();
        stream?.close();
        rejectResult(new Error(failure));
      };
      const cancelled = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('Claude cancelled.')), { once: true });
      });
      void cancelled.catch(() => undefined);
      const timer = setTimeout(() => {
        controller.abort();
        failure = 'Claude run timed out.';
        stream?.close();
        rejectResult(new Error(failure));
      }, spec.timeoutMs);
      spec.signal.addEventListener('abort', abort, { once: true });
      const safeEvent = (event: RunEvent): RunEvent =>
        RunEventSchema.parse(apiKey ? JSON.parse(redactSecret(JSON.stringify(event), apiKey)) : event);
      try {
        if (!Number.isSafeInteger(spec.timeoutMs) || spec.timeoutMs <= 0 || spec.timeoutMs > 2_147_483_647)
          throw new Error('Invalid timeout.');
        if (spec.signal.aborted) abort();
        controller.signal.throwIfAborted();
        try {
          await access(options.executablePath, constants.X_OK);
        } catch {
          failure = 'tool_not_installed';
          throw new Error(failure);
        }
        const key = await Promise.race([options.readApiKey?.(), cancelled]);
        apiKey = key === undefined ? '' : z.string().trim().min(1).parse(key);
        controller.signal.throwIfAborted();
        const env = buildEnv(options, spec.env, apiKey);
        stream = warmed
          ? warmed.warmQuery.query(spec.prompt)
          : query({
              prompt: spec.prompt,
              options: buildQueryOptions({
                options,
                spec: spec as RunSpec<z.ZodType>,
                env,
                apiKey,
                controller,
                holder,
              }),
            });
        let output: z.infer<S> | undefined;
        for await (const message of stream) {
          controller.signal.throwIfAborted();
          if (message.type === 'system' && message.subtype === 'init') {
            yield safeEvent({ type: 'session', sessionId: message.session_id });
          } else if (message.type === 'stream_event') {
            const delta = message.event.type === 'content_block_delta' ? message.event.delta : undefined;
            if (spec.streamText && message.parent_tool_use_id === null && delta?.type === 'text_delta')
              yield safeEvent({ type: 'delta', text: delta.text });
          } else if (message.type === 'assistant' || message.type === 'user') {
            if (message.type === 'assistant' && message.error) {
              if (message.error === 'authentication_failed') failure = 'not_logged_in';
              throw new Error('Claude API error.');
            }
            const content = contentSchema.parse(message.message.content);
            if (typeof content === 'string') {
              yield safeEvent({ type: 'message', role: message.type, text: content });
            } else {
              for (const block of content) {
                if (block.type === 'text') yield safeEvent({ type: 'message', role: message.type, text: block.text });
                else if (block.type === 'tool_use') {
                  yield safeEvent({ type: 'tool_call', callId: block.id, name: block.name, input: block.input });
                } else if (block.type === 'tool_result') {
                  yield safeEvent({
                    type: 'tool_result',
                    callId: block.tool_use_id,
                    output: block.content,
                    isError: block.is_error ?? false,
                  });
                }
              }
            }
          } else if (message.type === 'result') {
            const usage = Object.values(message.modelUsage);
            yield safeEvent({
              type: 'cost',
              inputTokens: usage.reduce(
                (sum, model) => sum + model.inputTokens + model.cacheReadInputTokens + model.cacheCreationInputTokens,
                0,
              ),
              outputTokens: usage.reduce((sum, model) => sum + model.outputTokens, 0),
              costMicros: Math.round(message.total_cost_usd * 1_000_000),
            });
            if (message.subtype !== 'success' || message.is_error) throw new Error('Claude result error.');
            failure = 'Claude returned an invalid structured result.';
            output = spec.outputSchema.parse(
              spec.streamText ? (message as { result?: unknown }).result : message.structured_output,
            ) as z.infer<S>;
            if (apiKey && redactSecret(JSON.stringify(output), apiKey) !== JSON.stringify(output)) {
              throw new Error('Claude returned credential material.');
            }
          }
        }
        controller.signal.throwIfAborted();
        if (!output) throw new Error('Claude returned no structured result.');
        finished = true;
        resolveResult(output);
      } catch {
        rejectResult(new Error(failure));
        yield { type: 'error', message: failure };
      } finally {
        kill();
        controllers.delete(controller);
        clearTimeout(timer);
        spec.signal.removeEventListener('abort', abort);
        stream?.close();
        if (!finished) rejectResult(new Error(failure));
        apiKey = '';
      }
    }
    return { events: events(), result: promise };
  }
}
