import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import type { Logger } from 'pino';
import type { McpServerConfig } from '../agents/types';
import type { BrowserProvider, BrowserTab } from './types';
import { NeoMcp } from './neo-mcp';

const HttpsUrl = z.url({ protocol: /^https$/ }).refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password;
}, 'Posting URL must not contain credentials');
const PageId = z.number().int().nonnegative().max(0xffffffff);
const ToolResult = z.object({ isError: z.boolean().optional(), structuredContent: z.unknown().optional() });

export class NeoBrowserProvider implements BrowserProvider {
  readonly id = 'neo' as const;
  readonly installHint =
    'Install BrowserOS neo from https://www.browseros.com/ and open it; enable its local MCP endpoint.';
  private readonly mcp: NeoMcp;
  private readonly tabs = new Map<string, BrowserTab>();
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly logger: Pick<Logger, 'debug'>,
    endpoint = 'http://127.0.0.1:9200/mcp',
  ) {
    const url = new URL(z.url().parse(endpoint));
    if (
      url.protocol !== 'http:' ||
      !['127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.hash
    ) {
      throw new Error('Neo MCP must use a loopback HTTP endpoint without credentials or a fragment');
    }
    this.mcp = new NeoMcp(url.href);
  }

  async status(): Promise<'installed' | 'not_installed' | 'not_running'> {
    return this.serial(async () => {
      try {
        const { tools } = z
          .object({ tools: z.array(z.object({ name: z.string() })) })
          .parse(await this.mcp.call('tools/list'));
        if (!tools.some(({ name }) => name === 'tabs')) throw new Error('Neo tabs tool unavailable');
        return 'installed';
      } catch (error) {
        this.logger.debug(
          { error_class: error instanceof Error ? error.constructor.name : 'Unknown' },
          'Neo MCP availability check failed',
        );
        // shortcut: standard macOS app locations only; add discovery when custom installs are supported.
        return ['/Applications/BrowserOS neo.app', join(homedir(), 'Applications/BrowserOS neo.app')].some(existsSync)
          ? 'not_running'
          : 'not_installed';
      }
    });
  }

  async mcpServerConfig(): Promise<McpServerConfig> {
    return { type: 'http', url: this.mcp.endpoint };
  }

  /** The main-process run service must pass the posting's persisted canonical_url, never IPC input. */
  async openTab(runId: string, url: string): Promise<BrowserTab> {
    z.string().min(1).parse(runId);
    const canonicalUrl = HttpsUrl.parse(url);
    return this.serial(async () => {
      const existing = this.tabs.get(runId);
      if (existing) return { ...existing };
      const result = await this.tabsTool({ action: 'new', url: canonicalUrl });
      const { page } = z.object({ page: PageId }).parse(result);
      const tab = { tabId: String(page) };
      this.tabs.set(runId, tab);
      return { ...tab };
    });
  }

  async closeTab(runId: string): Promise<void> {
    z.string().min(1).parse(runId);
    return this.serial(async () => {
      const tab = this.tabs.get(runId);
      if (!tab) return;
      const { pages } = z
        .object({ pages: z.array(z.object({ page: PageId })) })
        .parse(await this.tabsTool({ action: 'list' }));
      if (pages.some(({ page }) => String(page) === tab.tabId)) {
        await this.tabsTool({ action: 'close', page: Number(tab.tabId) });
      }
      this.tabs.delete(runId);
    });
  }

  private async tabsTool(args: Record<string, unknown>): Promise<unknown> {
    const result = ToolResult.parse(await this.mcp.call('tools/call', { name: 'tabs', arguments: args }));
    if (result.isError) throw new Error('Neo tabs tool failed');
    return result.structuredContent;
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(operation);
    this.pending = result.catch(() => undefined);
    return result;
  }
}
