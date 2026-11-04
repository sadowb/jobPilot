import { describe, expect, it } from 'vitest';
import type { BrowserStatus } from '../src/shared/dto';
import type { BrowserProvider } from '../src/main/platform/browsers/types';
import { browserTools } from '../src/main/modules/onboarding/preflight.service';

const provider = (status?: () => Promise<BrowserStatus>) => ({ id: 'neo', status }) as unknown as BrowserProvider;

describe('browserTools', () => {
  it.each([
    [{ status: 'connected', port: 9210, endpoint: 'http://127.0.0.1:9210/mcp' }, 'running'],
    [{ status: 'not_running', port: 9210 }, 'not_running'],
    [{ status: 'not_installed', port: 9210 }, 'not_installed'],
    [{ status: 'not_detected' }, 'not_installed'],
  ] as const)('maps %o to %s', async (status, state) => {
    const [tool] = await browserTools(provider(() => Promise.resolve(status as BrowserStatus)));
    expect(tool?.state).toBe(state);
  });

  it('treats a failing probe as not running and a provider without a probe as running', async () => {
    expect((await browserTools(provider(() => Promise.reject(new Error('x')))))[0]?.state).toBe('not_running');
    expect((await browserTools(provider()))[0]?.state).toBe('running');
  });
});
