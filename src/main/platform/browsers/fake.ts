import { createHash } from 'node:crypto';
import type { BrowserStatus } from '../../../shared/dto';
import type { BrowserProvider, FormSnapshot, SubmitAuthorisation, TabLocation } from './types';

export class FakeBrowserProvider implements BrowserProvider {
  readonly id = 'neo';
  readonly tabs = new Map<string, string>();

  async status(): Promise<BrowserStatus> {
    return { status: 'connected', port: 9210, endpoint: 'http://127.0.0.1:9210/mcp' };
  }

  /** The authorisation a run's browser was configured with; E2E stands in for the agent's click with `clickSubmit`. */
  readonly submit = new Map<string, SubmitAuthorisation>();

  /** Mirrors the real guard: the live form must still hash to the approved value, then the single claim is taken. */
  async clickSubmit(runId: string): Promise<'clicked' | 'refused'> {
    const authorisation = this.submit.get(runId);
    if (!authorisation || (await this.formSnapshot(runId)).hash !== authorisation.formHash) return 'refused';
    return authorisation.claim() ? 'clicked' : 'refused';
  }

  async mcpServerConfig(runId?: string, _signal?: AbortSignal, submit?: SubmitAuthorisation) {
    if (runId && submit) this.submit.set(runId, submit);
    return { type: 'stdio' as const, command: 'jobpilot-fake-browser' };
  }

  async openTab(runId: string) {
    const tabId = `fake-${runId}`;
    this.tabs.set(runId, tabId);
    return { tabId };
  }

  async closeTab(runId: string): Promise<void> {
    this.tabs.delete(runId);
    this.held.delete(runId);
  }

  readonly held = new Set<string>();

  holdTab(runId: string): boolean {
    if (!this.tabs.has(runId)) return false;
    this.held.add(runId);
    return true;
  }

  releaseTab(runId: string): void {
    this.held.delete(runId);
  }

  isHeld(runId: string): boolean {
    return this.held.has(runId);
  }

  async tabLocation(runId: string): Promise<TabLocation | null> {
    const tabId = this.tabs.get(runId);
    return tabId ? { tabId, url: 'https://example.com/jobs/fake' } : null;
  }

  /** Test seam: bump a run's version to simulate the page changing after review. */
  readonly drift = new Map<string, number>();

  async formSnapshot(runId: string): Promise<FormSnapshot> {
    if (!this.tabs.has(runId)) throw new Error('Run tab is unavailable.');
    const version = this.drift.get(runId) ?? 0;
    return {
      hash: createHash('sha256').update(`fake-form-${runId}-${version}`).digest('hex'),
      fields: [
        { label: 'Full name', value: 'Sara Benali' },
        { label: 'Email', value: 'sara.benali@example.com' },
      ],
    };
  }
}
