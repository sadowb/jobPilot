import { createHash } from 'node:crypto';
import type { BrowserProvider } from './types';

export class FakeBrowserProvider implements BrowserProvider {
  readonly id = 'neo';
  readonly tabs = new Map<string, string>();

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
