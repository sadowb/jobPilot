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
    return AgentPreferencesSchema.parse(
      this.repository.agentPreferences() ?? { auth: this.distributed ? 'api_key' : 'login' },
    );
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

  async detect(path?: string | null) {
    this.detected = await detectClaude(path);
    this.detection = undefined;
    this.login = 'unknown';
    const saved = this.preferences();
    this.repository.storeAgentPreferences({ ...saved, confirmed: false, path: null, version: null });
    return this.state();
  }

  async save(input: z.infer<typeof SaveAgentSchema>) {
    const parsed = SaveAgentSchema.parse(input);
    const detected = await detectClaude(parsed.path);
    if (!detected) throw new Error('Choose an executable Claude path that responds to --version.');
    this.repository.storeAgentPreferences({ ...parsed, ...detected, confirmed: true });
    this.login = 'unknown';
    return this.state();
  }

  async prepare(): Promise<void> {
    const saved = this.preferences();
    if (!saved.confirmed || !saved.path) throw new Error('Confirm the Claude path in Settings → Agent.');
    const state = await this.state();
    if (state.status !== 'ready') throw new Error(state.status);
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
        const cwd = join(service.userData, 'agents/claude');
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
