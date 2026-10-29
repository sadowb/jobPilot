import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { AgentPreferencesSchema, AgentStateSchema, SaveAgentSchema } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import { ClaudeProvider } from '../../platform/agents/claude';
import { detectClaude, executablePath } from '../../platform/agents/detect';
import type { AgentProvider, AgentRun, RunSpec } from '../../platform/agents/types';
import { loggerFor } from '../observability/log.service';
import { redact } from '../observability/redact';
import { SettingsRepository } from './settings.repository';
import { claudeKeyService } from './settings.service';
import { UserFacingError } from '../../platform/ipc/user-facing-error';

export class AgentSettingsService implements AgentProvider {
  readonly id = 'claude' as const;
  private readonly repository: SettingsRepository;
  private detected?: Awaited<ReturnType<typeof detectClaude>>;
  private detection?: Promise<Awaited<ReturnType<typeof detectClaude>>>;
  private login: 'unknown' | 'ok' | 'not_logged_in' = 'unknown';
  private stopping = false;
  private readonly active = new Set<ClaudeProvider>();

  constructor(
    private readonly db: JobPilotDb,
    private readonly userData: string,
    private readonly distributed: boolean,
  ) {
    this.repository = new SettingsRepository(db);
  }

  private preferences() {
    return AgentPreferencesSchema.parse(this.repository.agentPreferences() ?? { auth: 'login' });
  }

  async state() {
    const saved = this.preferences();
    if (!saved.confirmed && this.detected === undefined) {
      this.detection ??= detectClaude();
      this.detected = await this.detection;
    }
    const path = saved.confirmed ? saved.path : (this.detected?.path ?? null);
    let available = path !== null;
    if (saved.confirmed && path) {
      try {
        await executablePath(path);
      } catch {
        available = false;
      }
    }
    return AgentStateSchema.parse({
      ...saved,
      path,
      version: saved.confirmed ? saved.version : (this.detected?.version ?? null),
      tool: 'claude',
      login: this.login,
      status: !available
        ? 'tool_not_installed'
        : !saved.confirmed
          ? 'needs_confirmation'
          : saved.auth === 'api_key' && !this.repository.hasAnthropicKey()
            ? 'api_key_required'
            : saved.auth === 'login' && this.login === 'not_logged_in'
              ? 'not_logged_in'
              : 'ready',
    });
  }

  private adopt(detected: Awaited<ReturnType<typeof detectClaude>>) {
    this.detected = detected;
    this.detection = undefined;
    this.login = 'unknown';
    const saved = this.preferences();
    this.repository.storeAgentPreferences({ ...saved, confirmed: false, path: null, version: null });
    return this.state();
  }

  /**
   * Auto-discovery only: the renderer cannot name a path. A confirmed choice survives unless that executable is
   * gone or no longer verifies as Claude Code.
   */
  async detect() {
    const saved = this.preferences();
    if (saved.confirmed && saved.path && (await detectClaude(saved.path))) return this.state();
    return this.adopt(await detectClaude());
  }

  /** `filePath` comes from the native picker in main; a file that is not Claude Code leaves settings untouched. */
  async chooseCandidate(filePath: string) {
    const detected = await detectClaude(filePath);
    if (!detected) throw new UserFacingError('That file is not Claude Code.');
    return this.adopt(detected);
  }

  /** Confirms the candidate main already holds (or re-verifies the saved path); the payload carries preferences only. */
  async save(input: z.infer<typeof SaveAgentSchema>) {
    const parsed = SaveAgentSchema.parse(input);
    const saved = this.preferences();
    const candidate = this.detected ?? (saved.confirmed && saved.path ? await detectClaude(saved.path) : null);
    if (!candidate) throw new UserFacingError('No Claude candidate to confirm. Find or choose Claude first.');
    this.detected = candidate;
    this.repository.storeAgentPreferences({ ...parsed, ...candidate, confirmed: true });
    this.login = 'unknown';
    return this.state();
  }

  async prepare(): Promise<void> {
    const saved = this.preferences();
    if (!saved.confirmed || !saved.path) throw new UserFacingError('Confirm the Claude path in Settings → Agent.');
    const state = await this.state();
    if (state.status !== 'ready')
      throw new UserFacingError(`Claude is not ready (${state.status}). Check Settings → Agent.`);
  }

  run(spec: RunSpec): AgentRun {
    let resolve!: (value: Awaited<AgentRun['result']>) => void;
    let reject!: (error: unknown) => void;
    const result = new Promise<Awaited<AgentRun['result']>>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    void result.catch(() => undefined);
    async function* events(service: AgentSettingsService) {
      let provider: ClaudeProvider | undefined;
      try {
        await service.prepare();
        const saved = service.preferences();
        const runId = z
          .string()
          .regex(/^[A-Za-z0-9_-]+$/)
          .max(128)
          .parse(spec.runId);
        const cwd = join(service.userData, 'agents/claude', runId);
        const configDirectory = join(cwd, 'config');
        await mkdir(configDirectory, { recursive: true, mode: 0o700 });
        provider = new ClaudeProvider({
          executablePath: saved.path!,
          cwd,
          configDirectory,
          ...(saved.auth === 'api_key' ? { readApiKey: () => claudeKeyService(service.db).readApiKey() } : {}),
          logger: loggerFor('agents'),
          redact,
        });
        if (service.stopping) throw new Error('Agent stopped.');
        service.active.add(provider);
        const run = provider.run({
          ...spec,
          model: saved.model,
          env: {
            PATH: process.env.PATH ?? '',
            HOME: process.env.HOME ?? '',
            USER: process.env.USER ?? '',
            LOGNAME: process.env.LOGNAME ?? '',
            TMPDIR: join(cwd, 'tmp'),
            LANG: process.env.LANG ?? 'en_US.UTF-8',
          },
        });
        await mkdir(join(cwd, 'tmp'), { recursive: true, mode: 0o700 });
        for await (const event of run.events) {
          if (event.type === 'error' && event.message === 'not_logged_in') service.login = 'not_logged_in';
          yield event;
        }
        const output = await run.result;
        service.login = 'ok';
        resolve(output);
      } catch (error) {
        reject(error);
      } finally {
        reject(new Error('Agent stream closed.'));
        provider?.stop();
        if (provider) service.active.delete(provider);
      }
    }
    return { result, events: events(this) };
  }

  stop(): void {
    this.stopping = true;
    for (const provider of this.active) provider.stop();
  }
}
