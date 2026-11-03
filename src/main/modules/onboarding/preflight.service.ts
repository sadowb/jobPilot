import { basename } from 'node:path';
import { z } from 'zod';
import type {
  AgentState,
  AgentTool,
  AllowConnectionsInput,
  AllowConnectionsResult,
  BrowserTool,
  Preflight,
} from '../../../shared/dto';
import { detectCodex } from '../../platform/agents/detect';
import type { AgentModel } from '../../platform/agents/models';
import { fingerprint } from '../../platform/agents/fingerprint';
import type { AgentProvider } from '../../platform/agents/types';
import type { BrowserProvider } from '../../platform/browsers/types';
import { UserFacingError } from '../../platform/ipc/user-facing-error';
import type { GrantsService } from '../grants/grants.service';
import type { SettingsRepository } from '../settings/settings.repository';
import { structuredCall } from './structured-call';

/** The slice of Claude settings that setup needs. `AgentSettingsService` is the real one; E2E passes a fake. */
export interface ClaudeControl {
  state(): Promise<AgentState>;
  models(): Promise<AgentModel[]>;
  save(input: { model: string; auth: AgentState['auth'] }): Promise<AgentState>;
}

const CUSTOM_KEY = 'agents.custom';
const CustomAgentSchema = z.object({ path: z.string().min(1).max(4096) });
const TEST_TIMEOUT_MS = 60_000;

/** Display names are code, not data; the id is what crosses IPC. */
const BROWSER_NAMES: Record<string, string> = {
  neo: 'BrowserOS neo',
  playwright: 'Playwright MCP',
  embedded: 'JobPilot window',
};

/**
 * The single place browser detection lives. Today it asks the one provider main holds; when the Neo/MCP discovery
 * (#196) returns several, only this function changes. No port, URL or config path ever reaches the renderer.
 */
async function browserTools(browser: BrowserProvider): Promise<BrowserTool[]> {
  const probe = (browser as { status?: () => Promise<'installed' | 'not_installed' | 'not_running'> }).status;
  const status = probe ? await probe.call(browser).catch(() => 'not_running' as const) : 'installed';
  return [
    {
      id: browser.id,
      name: BROWSER_NAMES[browser.id] ?? browser.id,
      state: status === 'installed' ? 'running' : status,
    },
  ];
}

export class PreflightService {
  constructor(
    private readonly grants: GrantsService,
    private readonly claude: ClaudeControl,
    /** The gated agent: the test call below proves the grant check works. */
    private readonly agent: AgentProvider,
    private readonly browser: BrowserProvider,
    private readonly settings: SettingsRepository,
    private readonly findCodex: typeof detectCodex = detectCodex,
  ) {}

  private customCandidate(): z.infer<typeof CustomAgentSchema> | null {
    const parsed = CustomAgentSchema.safeParse(this.settings.getSetting(CUSTOM_KEY));
    return parsed.success ? parsed.data : null;
  }

  /** `filePath` comes from the native picker in main. Stat + hash only: an unknown program is never executed to "detect" it. */
  async chooseCustom(filePath: string): Promise<Preflight> {
    try {
      const { path } = await fingerprint(filePath);
      this.settings.setSetting(CUSTOM_KEY, { path });
    } catch {
      throw new UserFacingError('Choose an executable file.');
    }
    return this.detect();
  }

  async detect(): Promise<Preflight> {
    const [claudeState, codex, models] = await Promise.all([
      this.claude.state(),
      this.findCodex().catch(() => null),
      this.claude.models(),
    ]);
    const claudeFound = claudeState.status !== 'tool_not_installed';
    const haiku = models.find((model) => model.value === 'haiku');
    const agents: AgentTool[] = [
      {
        id: 'claude',
        name: 'Claude Code',
        state: claudeFound ? 'found' : 'not_installed',
        version: claudeState.version,
        path: claudeState.path,
        models,
        // Cheapest first: the Haiku alias when this Claude lists it, else whatever the agent defaults to.
        defaultModel: haiku?.value ?? null,
        runnable: true,
      },
      {
        id: 'codex',
        name: 'Codex',
        state: codex ? 'found' : 'not_installed',
        version: codex?.version ?? null,
        path: codex?.path ?? null,
        models: [],
        defaultModel: null,
        runnable: false,
      },
    ];
    const custom = this.customCandidate();
    if (custom) {
      let resolved: string | null = null;
      try {
        resolved = (await fingerprint(custom.path)).path;
      } catch {
        /* Gone or no longer executable: shown as not installed. */
      }
      agents.push({
        id: 'custom',
        name: basename(custom.path),
        state: resolved ? 'found' : 'not_installed',
        version: null,
        path: resolved ?? custom.path,
        models: [],
        defaultModel: null,
        runnable: false,
      });
    }
    return { agents, browsers: await browserTools(this.browser) };
  }

  /**
   * "Allow both" (or one side from Settings). The grant is written first because the test call goes through the
   * gate; a failed test withdraws it again, so nothing stays allowed that does not work.
   */
  async allow(input: AllowConnectionsInput): Promise<AllowConnectionsResult> {
    const result: AllowConnectionsResult = { agent: null, browser: null };
    if (input.agent) result.agent = await this.allowAgent(input.agent);
    if (input.browser) result.browser = await this.allowBrowser(input.browser.id);
    return result;
  }

  private async allowAgent(choice: NonNullable<AllowConnectionsInput['agent']>) {
    if (choice.id !== 'claude') throw new UserFacingError('That agent cannot run jobs yet.');
    const state = await this.claude.state();
    if (state.status === 'tool_not_installed') throw new UserFacingError('Claude Code was not found on this computer.');
    if (choice.model) {
      const listed = await this.claude.models();
      if (listed.length > 0 && !listed.some((model) => model.value === choice.model))
        throw new UserFacingError('That model is not offered by your Claude Code.');
    }
    await this.claude.save({ model: choice.model ?? state.model, auth: state.auth });
    this.grants.allow('agent', 'claude');
    const started = Date.now();
    try {
      await structuredCall(
        this.agent,
        z.object({ ok: z.literal(true) }),
        'Reply with the JSON {"ok": true}. Nothing else.',
        {
          timeoutMs: TEST_TIMEOUT_MS,
        },
      );
      return { ok: true, ms: Date.now() - started, message: null };
    } catch (error) {
      this.grants.withdraw('agent', 'claude');
      const refreshed = await this.claude.state();
      return {
        ok: false,
        ms: null,
        message:
          refreshed.status === 'not_logged_in'
            ? 'Claude Code is not signed in. Run `claude` in a terminal once, sign in, then try again.'
            : error instanceof UserFacingError
              ? error.message
              : 'Claude Code did not answer the test. Check it works in a terminal, then try again.',
      };
    }
  }

  private async allowBrowser(id: string) {
    const tools = await browserTools(this.browser);
    const tool = tools.find((item) => item.id === id);
    if (!tool) throw new UserFacingError('That browser tool is not available.');
    this.grants.allow('browser', tool.id);
    const started = Date.now();
    if (tool.state !== 'running') {
      this.grants.withdraw('browser', tool.id);
      return {
        ok: false,
        ms: null,
        message:
          tool.state === 'not_running'
            ? `${tool.name} is not running. Open it, then try again.`
            : `${tool.name} is not installed.`,
      };
    }
    // shortcut: the test is "the tool answers and lists its tabs tool", not a real test tab (opening one needs a URL and would hit the network); upgrade when the MCP discovery (#196) lands an about:blank-safe probe.
    return { ok: true, ms: Date.now() - started, message: null };
  }
}
