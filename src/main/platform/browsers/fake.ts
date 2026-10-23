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
}
