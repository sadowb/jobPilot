import { createHash } from 'node:crypto';
import type { BrowserStatus } from '../../../shared/dto';
import type { BrowserProvider } from './types';

export class FakeBrowserProvider implements BrowserProvider {
  readonly id = 'neo';
  readonly tabs = new Map<string, string>();

  async status(): Promise<BrowserStatus> {
    return { status: 'connected', port: 9210, endpoint: 'http://127.0.0.1:9210/mcp' };
  }

  async mcpServerConfig() {
    return { type: 'stdio' as const, command: 'jobpilot-fake-browser' };
  }

  async openTab(runId: string) {
    const tabId = `fake-${runId}`;
    this.tabs.set(runId, tabId);
    return { tabId };
  }

  async closeTab(runId: string): Promise<void> {
    this.tabs.delete(runId);
  }

  async formHash(runId: string): Promise<string> {
    return createHash('sha256').update(`fake-form-${runId}`).digest('hex');
  }
}
