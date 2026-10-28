import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute } from 'node:path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { Logger } from 'pino';
import {
  RunEventSchema,
  RunResultSchema,
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

export class ClaudeProvider implements AgentProvider {
  readonly id = 'claude' as const;

  private readonly controllers = new Set<AbortController>();

  stop(): void {
    for (const controller of this.controllers) controller.abort();
  }

  constructor(private readonly options: ClaudeProviderOptions) {
    for (const path of [options.executablePath, options.cwd, options.configDirectory]) {
      if (!isAbsolute(path)) throw new Error('Claude requires absolute tool and workspace paths.');
    }
  }

  run(spec: RunSpec): AgentRun {
    let resolveResult!: (value: z.infer<typeof RunResultSchema>) => void;
    let rejectResult!: (error: Error) => void;
    const promise = new Promise<z.infer<typeof RunResultSchema>>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    // The stream owns failures; attach a handler before callers start consuming it.
    void promise.catch(() => undefined);
    const options = this.options;
    const controllers = this.controllers;
    async function* events(): AsyncGenerator<RunEvent> {
      const controller = new AbortController();
      controllers.add(controller);
      let child: ChildProcess | undefined;
      const kill = (): void => {
        if (!child?.pid) return;
        try {
          // Windows has no process groups: taskkill /T kills the whole tree (MCP servers, helpers), synchronously
          // so it still completes during a shutdown/logoff session-end.
          if (process.platform === 'win32')
            spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
          else process.kill(-child.pid, 'SIGKILL');
        } catch {
          /* Already exited. */
        }
      };
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
        const env: Record<string, string> = {};
        for (const key of environmentKeys) {
          const value = spec.env?.[key];
          if (value !== undefined) env[key] = z.string().parse(value);
        }
        env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '1';
        env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
        env.CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL = '1';
        if (apiKey) {
          env.CLAUDE_CONFIG_DIR = options.configDirectory;
          env.ANTHROPIC_API_KEY = apiKey;
        }
        stream = query({
          prompt: spec.prompt,
          options: {
            pathToClaudeCodeExecutable: options.executablePath,
            cwd: options.cwd,
            env,
            abortController: controller,
            model: spec.model ?? 'haiku',
            // Transcripts are written only under the private config dir (API-key mode); login mode would write
            // ~/.claude, which ADR 0016 forbids.
            // shortcut: login-mode runs cannot resume and restart a fresh session, upgrade when the SDK takes a transcript dir.
            persistSession: apiKey !== '',
            ...(spec.resume && apiKey ? { resume: spec.sessionId } : { sessionId: spec.sessionId }),
            mcpServers: spec.mcpServers,
            strictMcpConfig: true,
            settingSources: [],
            tools: [],
            canUseTool: async (name, input) =>
              name === 'StructuredOutput' ||
              Object.keys(spec.mcpServers).some((server) => {
                const prefix = `mcp__${server}__`;
                return (
                  name.startsWith(prefix) && (spec.toolAllowlist?.[server]?.includes(name.slice(prefix.length)) ?? true)
                );
              })
                ? { behavior: 'allow', updatedInput: input }
                : { behavior: 'deny', message: 'Only run-scoped MCP tools are allowed.' },
            outputFormat: { type: 'json_schema', schema: z.toJSONSchema(spec.outputSchema, { io: 'input' }) },
            // Reapply our environment at the actual spawn boundary, even if SDK defaults change.
            spawnClaudeCodeProcess: ({ args, signal }) => {
              const processChild = spawn(options.executablePath, args, {
                cwd: options.cwd,
                env,
                signal,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: process.platform !== 'win32',
              });
              child = processChild;
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
          },
        });
        let output: z.infer<typeof RunResultSchema> | undefined;
        for await (const message of stream) {
          controller.signal.throwIfAborted();
          if (message.type === 'system' && message.subtype === 'init') {
            yield safeEvent({ type: 'session', sessionId: message.session_id });
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
            output = RunResultSchema.parse(spec.outputSchema.parse(message.structured_output));
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
