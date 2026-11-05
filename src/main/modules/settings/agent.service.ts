import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { AgentPreferencesSchema, AgentStateSchema, SaveAgentSchema } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import { ClaudeProvider } from '../../platform/agents/claude';
import { detectClaude, executablePath } from '../../platform/agents/detect';
import { listClaudeModels, type AgentModel } from '../../platform/agents/models';
import type { AgentProvider, AgentRun, RunResultSchema, RunSpec } from '../../platform/agents/types';
import { loggerFor } from '../observability/log.service';
import { redact } from '../observability/redact';
import { SettingsRepository } from './settings.repository';
import { claudeKeyService } from './settings.service';
import { UserFacingError } from '../../platform/ipc/user-facing-error';

/** Long enough to cover a pause between two chat messages, short enough that no agent process idles for long. */
const SPARE_TTL_MS = 90_000;

const agentEnv = (tmp: string) => ({
  PATH: process.env.PATH ?? '',
  HOME: process.env.HOME ?? '',
  USER: process.env.USER ?? '',
  LOGNAME: process.env.LOGNAME ?? '',
  TMPDIR: tmp,
  LANG: process.env.LANG ?? 'en_US.UTF-8',
});

export class AgentSettingsService implements AgentProvider {
  readonly id = 'claude' as const;
  private readonly repository: SettingsRepository;
  private detected?: Awaited<ReturnType<typeof detectClaude>>;
  private detection?: Promise<Awaited<ReturnType<typeof detectClaude>>>;
  private login: 'unknown' | 'ok' | 'not_logged_in' = 'unknown';
  private stopping = false;
  private readonly active = new Set<ClaudeProvider>();
  /** A tool-less process kept ready for the next chat reply; at most one, dropped when unused for SPARE_TTL_MS. */
  private spare?: { provider: ClaudeProvider; timer: NodeJS.Timeout };
  private warming?: Promise<void>;

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

  /** The models this Claude Code reports, from the CLI itself; empty when it cannot be asked (the agent's own default applies). */
  async models(): Promise<AgentModel[]> {
    const state = await this.state();
    if (!state.path) return [];
    const cwd = join(this.userData, 'agents/claude', 'models');
    try {
      await mkdir(cwd, { recursive: true, mode: 0o700 });
      return await listClaudeModels({
        executablePath: state.path,
        version: state.version,
        cwd,
        env: {
          PATH: process.env.PATH ?? '',
          HOME: process.env.HOME ?? '',
          USER: process.env.USER ?? '',
          LOGNAME: process.env.LOGNAME ?? '',
          TMPDIR: cwd,
          LANG: process.env.LANG ?? 'en_US.UTF-8',
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        },
      });
    } catch {
      return [];
    }
  }

  async prepare(): Promise<void> {
    const saved = this.preferences();
    if (!saved.confirmed || !saved.path) throw new UserFacingError('Confirm the Claude path in Settings → Agent.');
    const state = await this.state();
    if (state.status !== 'ready')
      throw new UserFacingError(`Claude is not ready (${state.status}). Check Settings → Agent.`);
  }

  private provider(saved: ReturnType<AgentSettingsService['preferences']>, cwd: string): ClaudeProvider {
    return new ClaudeProvider({
      executablePath: saved.path!,
      cwd,
      configDirectory: join(cwd, 'config'),
      ...(saved.auth === 'api_key' ? { readApiKey: () => claudeKeyService(this.db).readApiKey() } : {}),
      logger: loggerFor('agents'),
      redact,
    });
  }

  /**
   * Best effort, never throws: start a tool-less Claude ahead of the next chat reply (the owner just opened a chat or
   * just got a reply), so that reply's first token does not wait for a cold start. It idles for at most SPARE_TTL_MS.
   */
  warm(): void {
    if (this.stopping) return;
    if (this.spare) {
      this.armSpare(this.spare.provider);
      return;
    }
    this.warming ??= this.prewarm()
      .catch(() => undefined)
      .finally(() => {
        this.warming = undefined;
      });
  }

  private async prewarm(): Promise<void> {
    await this.prepare();
    const saved = this.preferences();
    const cwd = join(this.userData, 'agents/claude', 'chat');
    await mkdir(join(cwd, 'config'), { recursive: true, mode: 0o700 });
    await mkdir(join(cwd, 'tmp'), { recursive: true, mode: 0o700 });
    const provider = this.provider(saved, cwd);
    this.active.add(provider);
    try {
      await provider.prewarm({ model: saved.model, env: agentEnv(join(cwd, 'tmp')) });
    } catch (error) {
      this.active.delete(provider);
      throw error;
    }
    if (this.stopping) {
      provider.stop();
      this.active.delete(provider);
      return;
    }
    this.armSpare(provider);
  }

  private armSpare(provider: ClaudeProvider): void {
    if (this.spare) clearTimeout(this.spare.timer);
    const timer = setTimeout(() => {
      provider.stop();
      this.active.delete(provider);
      if (this.spare?.provider === provider) this.spare = undefined;
    }, SPARE_TTL_MS);
    timer.unref();
    this.spare = { provider, timer };
  }

  private takeSpare(): ClaudeProvider | undefined {
    const spare = this.spare;
    if (!spare) return undefined;
    clearTimeout(spare.timer);
    this.spare = undefined;
    return spare.provider;
  }

  run<S extends z.ZodType = typeof RunResultSchema>(spec: RunSpec<S>): AgentRun<z.infer<S>> {
    let resolve!: (value: z.infer<S>) => void;
    let reject!: (error: unknown) => void;
    const result = new Promise<z.infer<S>>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    void result.catch(() => undefined);
    async function* events(service: AgentSettingsService) {
      let provider: ClaudeProvider | undefined;
      let workspace: string | undefined;
      try {
        await service.prepare();
        const saved = service.preferences();
        const runId = z
          .string()
          .regex(/^[A-Za-z0-9_-]+$/)
          .max(128)
          .parse(spec.runId);
        // A chat reply takes the process warmed for it (its workspace outlives the run); anything else starts fresh.
        provider = spec.streamText && Object.keys(spec.mcpServers).length === 0 ? service.takeSpare() : undefined;
        const cwd = provider
          ? join(service.userData, 'agents/claude', 'chat')
          : join(service.userData, 'agents/claude', runId);
        if (!provider) {
          workspace = cwd;
          await mkdir(join(cwd, 'config'), { recursive: true, mode: 0o700 });
          provider = service.provider(saved, cwd);
        }
        if (service.stopping) throw new Error('Agent stopped.');
        service.active.add(provider);
        const run = provider.run({ ...spec, model: saved.model, env: agentEnv(join(cwd, 'tmp')) });
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
        // The next message of this chat is likely soon: have a process ready for it.
        if (spec.streamText) service.warm();
        if (spec.ephemeral && workspace)
          await rm(workspace, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => undefined);
      }
    }
    return { result, events: events(this) };
  }

  stop(): void {
    this.stopping = true;
    if (this.spare) clearTimeout(this.spare.timer);
    this.spare = undefined;
    for (const provider of this.active) provider.stop();
  }
}
