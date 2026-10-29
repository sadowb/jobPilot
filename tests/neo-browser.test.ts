import { describe, expect, it } from 'vitest';
import type { Logger } from 'pino';
import { allowlistedErrorCode, NeoMcp } from '../src/main/platform/browsers/neo-mcp';
import {
  clickTargetLine,
  computeFormHash,
  extractFormFields,
  FINAL_ACTION,
  NeoBrowserProvider,
} from '../src/main/platform/browsers/neo';
import { StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

describe('Neo MCP diagnostics (#142)', () => {
  it('extracts allowlisted error codes from various error shapes', () => {
    expect(allowlistedErrorCode({ code: 'ECONNREFUSED' })).toBe('ECONNREFUSED');
    expect(allowlistedErrorCode({ cause: { code: 'ENOTFOUND' } })).toBe('ENOTFOUND');
    expect(allowlistedErrorCode({ cause: { cause: { code: 'ETIMEDOUT' } } })).toBe('ETIMEDOUT');
    expect(allowlistedErrorCode({ status: 502 })).toBe(502);
    expect(allowlistedErrorCode(new StreamableHTTPError(404, 'not found'))).toBe(404);
    expect(allowlistedErrorCode(new McpError(-32601, 'Method not found'))).toBe(-32601);
  });

  it('rejects non-allowlisted properties, arbitrary text, and urls with query strings', () => {
    expect(allowlistedErrorCode(undefined)).toBeUndefined();
    expect(allowlistedErrorCode(null)).toBeUndefined();
    expect(allowlistedErrorCode(new Error('Page content with sensitive text'))).toBeUndefined();
    expect(allowlistedErrorCode({ code: 'https://example.com/api?token=secret123' })).toBeUndefined();
    expect(allowlistedErrorCode({ code: 'A'.repeat(100) })).toBeUndefined();
    expect(allowlistedErrorCode({ code: 'error with spaces' })).toBeUndefined();
  });

  it('preserves code on thrown error from NeoMcp.call and hides page text', async () => {
    const mcp = new NeoMcp('http://127.0.0.1:59999');
    try {
      await mcp.call('tools/list');
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Neo MCP request failed');
      expect((error as Error & { code?: string }).code).toBe('ECONNREFUSED');
      expect((error as Error).cause).toBeUndefined();
    }
  });

  it('logs neo_error_code ECONNREFUSED when connection is refused', async () => {
    const logs: Array<{ level: string; obj: Record<string, unknown>; msg: string }> = [];
    const logger = {
      debug: (obj: Record<string, unknown>, msg: string) => logs.push({ level: 'debug', obj, msg }),
      warn: (obj: Record<string, unknown>, msg: string) => logs.push({ level: 'warn', obj, msg }),
    } as unknown as Pick<Logger, 'debug' | 'warn'>;

    const provider = new NeoBrowserProvider(logger, 'http://127.0.0.1:59999');
    const result = await provider.status();

    expect(['not_installed', 'not_running']).toContain(result);
    const debugLog = logs.find((l) => l.msg === 'Neo MCP availability check failed');
    expect(debugLog).toBeDefined();
    expect(debugLog?.obj.error_class).toBe('Error');
    expect(debugLog?.obj.neo_error_code).toBe('ECONNREFUSED');
  });
});

describe('Neo snapshot traversal error handling (#147)', () => {
  it('throws and logs warn with error_class when traversal throws on corrupt object', () => {
    const logs: Array<{ level: string; obj: Record<string, unknown>; msg: string }> = [];
    const logger = {
      warn: (obj: Record<string, unknown>, msg: string) => logs.push({ level: 'warn', obj, msg }),
    } as unknown as Pick<Logger, 'warn'>;

    const corruptSnapshot = {
      get corrupt() {
        throw new TypeError('Corrupted AST property');
      },
    };

    expect(() => extractFormFields(corruptSnapshot, logger)).toThrow(TypeError);
    expect(() => computeFormHash(corruptSnapshot, logger)).toThrow(TypeError);

    const warnLog = logs.find((l) => l.msg === 'Neo snapshot traversal failed');
    expect(warnLog).toBeDefined();
    expect(warnLog?.obj.error_class).toBe('TypeError');
  });

  it('does not fall back to plain text parsing when JSON traversal fails', () => {
    const logs: Array<{ level: string; obj: Record<string, unknown>; msg: string }> = [];
    const logger = {
      warn: (obj: Record<string, unknown>, msg: string) => logs.push({ level: 'warn', obj, msg }),
    } as unknown as Pick<Logger, 'warn'>;

    // Deeply nested JSON object that causes recursive visitObject stack overflow
    let deepJson = '{"ref":"e1","name":"field","value":"Sara Benali"}';
    for (let i = 0; i < 15_000; i++) {
      deepJson = `{"nested":${deepJson}}`;
    }

    expect(() => extractFormFields(deepJson, logger)).toThrow(RangeError);
    const warnLog = logs.find((l) => l.msg === 'Neo snapshot traversal failed');
    expect(warnLog).toBeDefined();
    expect(warnLog?.obj.error_class).toBe('RangeError');
  });

  it('parses valid JSON snapshot without logging traversal warnings', () => {
    const logs: Array<{ level: string; obj: Record<string, unknown>; msg: string }> = [];
    const logger = {
      warn: (obj: Record<string, unknown>, msg: string) => logs.push({ level: 'warn', obj, msg }),
    } as unknown as Pick<Logger, 'warn'>;

    const json = JSON.stringify({
      ref: 'e1',
      name: 'Full Name',
      value: 'Sara Benali',
    });

    const fields = extractFormFields(json, logger);
    expect(fields).toEqual([{ field: 'e1:Full Name', value: 'Sara Benali' }]);
    expect(logs.length).toBe(0);
  });

  it('parses non-JSON plain text snapshot without logging traversal warnings', () => {
    const logs: Array<{ level: string; obj: Record<string, unknown>; msg: string }> = [];
    const logger = {
      warn: (obj: Record<string, unknown>, msg: string) => logs.push({ level: 'warn', obj, msg }),
    } as unknown as Pick<Logger, 'warn'>;

    const plainText = 'textbox "Full Name": Sara Benali\n[ref=e1] textbox "Role": Engineer';
    const fields = extractFormFields(plainText, logger);
    expect(fields.length).toBeGreaterThan(0);
    expect(logs.length).toBe(0);
  });
});

describe('Neo browser tools: guarded click', () => {
  const SNAPSHOT = [
    'heading "Senior Engineer"',
    '  button "Show more" [ref=e1]',
    '  link "Apply for this job" [ref=e2]',
    '  button "Submit application" [ref=e3]',
    '  button "Accept cookies" [ref=e12]',
  ].join('\n');

  async function setup(urlAfterClick = 'https://jobs.example.com/apply') {
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    const provider = new NeoBrowserProvider({ debug() {}, warn() {} } as unknown as Logger, 'http://127.0.0.1:59999');
    let url = 'https://example.com/careers/1';
    (provider as unknown as { mcp: { call: (m: string, p: never) => Promise<unknown> } }).mcp = {
      call: async (_method, params: { name: string; arguments: Record<string, unknown> }) => {
        calls.push(params);
        const action = params.arguments.action;
        if (params.name === 'tabs' && action === 'new') return { content: [], structuredContent: { page: 7 } };
        if (params.name === 'tabs' && action === 'list')
          return { content: [], structuredContent: { pages: [{ page: 7, url }] } };
        if (params.name === 'tabs') return { content: [], structuredContent: {} };
        if (params.name === 'act') url = urlAfterClick;
        return { content: [{ type: 'text', text: params.name === 'snapshot' ? SNAPSHOT : 'ok' }] };
      },
    };
    await provider.openTab('read-1', 'https://example.com/careers/1');
    const server = (await provider.mcpServerConfig('read-1', new AbortController().signal)) as unknown as {
      instance: {
        _registeredTools: Record<
          string,
          { handler: (args: object, extra: object) => Promise<{ isError?: boolean; content: Array<{ text: string }> }> }
        >;
      };
    };
    const run = (name: string, args: object = {}) => server.instance._registeredTools[name]!.handler(args, {});
    return { provider, calls, run };
  }

  it('matches refs exactly and flags final actions', () => {
    expect(clickTargetLine(SNAPSHOT, 'e1')).toContain('Show more');
    expect(clickTargetLine(SNAPSHOT, 'e4')).toBeUndefined();
    for (const name of ['Submit application', 'Send', 'Confirm and pay', 'Delete account', 'Log out', 'Place order'])
      expect(FINAL_ACTION.test(name), name).toBe(true);
    for (const name of ['Show more', 'Apply for this job', 'Next', 'Continue', 'Accept cookies', 'Read more'])
      expect(FINAL_ACTION.test(name), name).toBe(false);
  });

  it('refuses a click before a snapshot and on a final action, without reaching Neo', async () => {
    const { calls, run } = await setup();
    expect((await run('click', { ref: 'e1' })).isError).toBe(true);
    await run('snapshot');
    const refused = await run('click', { ref: 'e3' });
    expect(refused.isError).toBe(true);
    expect(refused.content[0]!.text).toMatch(/final action/);
    expect(calls.filter(({ name }) => name === 'act')).toEqual([]);
  });

  it('clicks a safe control on the owned tab, then requires a fresh snapshot', async () => {
    const { calls, run } = await setup();
    await run('snapshot');
    expect((await run('click', { ref: 'e2' })).isError).toBeFalsy();
    expect(calls.find(({ name }) => name === 'act')!.arguments).toEqual({
      kind: 'click',
      ref: 'e2',
      diff: 'summary',
      page: 7,
    });
    expect((await run('click', { ref: 'e1' })).isError).toBe(true);
  });

  it('still closes the tab after a click moved it to another host', async () => {
    const { provider, calls, run } = await setup('https://boards.example-ats.com/acme/1');
    await run('snapshot');
    await run('click', { ref: 'e2' });
    await provider.closeTab('read-1');
    expect(calls.some(({ name, arguments: a }) => name === 'tabs' && a.action === 'close')).toBe(true);
  });
});
