import { describe, expect, it, vi } from 'vitest';
import type { Logger } from 'pino';
import { allowlistedErrorCode, NeoMcp } from '../src/main/platform/browsers/neo-mcp';
import {
  candidateConfigPaths,
  clickTargetLine,
  computeFormHash,
  extractFormFields,
  FINAL_ACTION,
  NEVER_ACTION,
  NeoBrowserProvider,
  SUBMIT_ACTION,
  parseNeoConfig,
} from '../src/main/platform/browsers/neo';
import { attachedFiles, snapshotForm, tabsReply } from '../src/main/platform/browsers/neo';
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

    expect(['not_installed', 'not_running']).toContain(result.status);
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
    expect(fields).toEqual([{ field: 'e1:Full Name', value: 'Sara Benali', kind: '', state: '' }]);
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

describe('Neo endpoint discovery and config parsing (#196)', () => {
  it('parses valid config with ports.server 9210 to http://127.0.0.1:9210/mcp', () => {
    const config = JSON.stringify({ ports: { cdp: 9110, proxy: 9010, server: 9210 } });
    const parsed = parseNeoConfig(config);
    expect(parsed).toEqual({ port: 9210, endpoint: 'http://127.0.0.1:9210/mcp' });
  });

  it('rejects malformed JSON', () => {
    expect(parseNeoConfig('not valid json')).toBeUndefined();
    expect(parseNeoConfig('{ malformed')).toBeUndefined();
  });

  it('rejects missing ports or missing server port', () => {
    expect(parseNeoConfig({})).toBeUndefined();
    expect(parseNeoConfig({ ports: {} })).toBeUndefined();
    expect(parseNeoConfig({ ports: { cdp: 9110 } })).toBeUndefined();
  });

  it('rejects non-loopback host in config', () => {
    expect(parseNeoConfig({ ports: { server: 9210 }, host: '192.168.1.100' })).toBeUndefined();
    expect(parseNeoConfig({ ports: { server: 9210 }, host: 'example.com' })).toBeUndefined();
  });

  it('rejects out-of-range or non-numeric port', () => {
    expect(parseNeoConfig({ ports: { server: 0 } })).toBeUndefined();
    expect(parseNeoConfig({ ports: { server: -1 } })).toBeUndefined();
    expect(parseNeoConfig({ ports: { server: 65536 } })).toBeUndefined();
    expect(parseNeoConfig({ ports: { server: 99999 } })).toBeUndefined();
    expect(parseNeoConfig({ ports: { server: '9210' } })).toBeUndefined();
    expect(parseNeoConfig({ ports: { server: 9210.5 } })).toBeUndefined();
  });

  it('derives candidate config paths per platform without hardcoding usernames', () => {
    const darwin = candidateConfigPaths('darwin', '/mock/home');
    expect(darwin).toEqual(['/mock/home/Library/Application Support/BrowserClaw/.browseros/config.json']);

    const win = candidateConfigPaths('win32', 'C:\\Users\\Mock', {
      APPDATA: 'C:\\Users\\Mock\\AppData\\Roaming',
      LOCALAPPDATA: 'C:\\Users\\Mock\\AppData\\Local',
    });
    expect(win).toContain('C:\\Users\\Mock\\AppData\\Roaming\\BrowserClaw\\.browseros\\config.json');

    const linux = candidateConfigPaths('linux', '/home/mock', { XDG_CONFIG_HOME: '/home/mock/.config' });
    expect(linux).toEqual(['/home/mock/.config/BrowserClaw/.browseros/config.json']);
  });

  it('reports not_detected when no config exists and no endpoint is passed', async () => {
    const logger = { debug() {}, warn() {} } as unknown as Logger;
    const provider = new NeoBrowserProvider(logger);
    vi.spyOn(provider, 'resolveEndpoint').mockReturnValue(undefined);

    const status = await provider.status();
    expect(status.status).toBe('not_detected');
    expect(status.installHint).toContain('Install BrowserOS neo');
  });

  it('surfaces not detected error via openTab', async () => {
    const logger = { debug() {}, warn() {} } as unknown as Logger;
    const provider = new NeoBrowserProvider(logger);
    vi.spyOn(provider, 'resolveEndpoint').mockReturnValue(undefined);

    await expect(provider.openTab('test-run', 'https://example.com/apply')).rejects.toThrow(/Neo not detected/);
  });

  it('respects valid owner override endpoint and rejects invalid', () => {
    const logger = { debug() {}, warn() {} } as unknown as Logger;
    const providerWithValid = new NeoBrowserProvider(logger, undefined, () => 'http://127.0.0.1:9215/mcp');
    expect(providerWithValid.resolveEndpoint()).toEqual({ port: 9215, endpoint: 'http://127.0.0.1:9215/mcp' });

    const providerWithInvalid = new NeoBrowserProvider(logger, undefined, () => 'http://192.168.1.1:9215/mcp');
    expect(providerWithInvalid.resolveEndpoint([])).toBeUndefined();
  });
});

describe('Neo browser tools: hash-checked submit', () => {
  const FIELDS = ['textbox "Full name" [ref=e1]: Sara Benali', 'textbox "Email" [ref=e2]: sara.benali@example.com'];
  const FORM = [...FIELDS, 'button "Submit application" [ref=e3]', 'button "Delete account" [ref=e4]'].join('\n');

  type RunResult = { isError?: boolean; content: Array<{ text: string }> };

  async function setup(initial: string) {
    let snapshotText = initial;
    const events: string[] = [];
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    const provider = new NeoBrowserProvider({ debug() {}, warn() {} } as unknown as Logger, 'http://127.0.0.1:59999');
    (provider as unknown as { mcp: { call: (m: string, p: never) => Promise<unknown> } }).mcp = {
      call: async (_method, params: { name: string; arguments: Record<string, unknown> }) => {
        calls.push(params);
        const action = params.arguments.action;
        if (params.name === 'tabs' && action === 'new') return { content: [], structuredContent: { page: 7 } };
        if (params.name === 'tabs' && action === 'list')
          return {
            content: [],
            structuredContent: { pages: [{ page: 7, url: 'https://example.com/careers/1' }] },
          };
        if (params.name === 'tabs') return { content: [], structuredContent: {} };
        if (params.name === 'act') events.push('act');
        return { content: [{ type: 'text', text: params.name === 'snapshot' ? snapshotText : 'ok' }] };
      },
    };
    await provider.openTab('read-1', 'https://example.com/careers/1');
    const connect = async (submit?: { formHash: string; claim: () => boolean }) => {
      const server = (await provider.mcpServerConfig('read-1', new AbortController().signal, submit)) as unknown as {
        instance: {
          _registeredTools: Record<string, { handler: (args: object, extra: object) => Promise<RunResult> }>;
        };
      };
      return (name: string, args: object = {}) => server.instance._registeredTools[name]!.handler(args, {});
    };
    const claimFor = (formHash: string, ok = true) =>
      vi.fn((): boolean => {
        events.push('claim');
        return ok;
      });
    return {
      provider,
      calls,
      events,
      connect,
      claimFor,
      setText: (text: string) => {
        snapshotText = text;
      },
    };
  }

  it('refuses a submit click when no submit authorisation was passed', async () => {
    const { calls, connect } = await setup(FORM);
    const run = await connect();
    await run('snapshot');
    const refused = await run('click', { ref: 'e3' });
    expect(refused.isError).toBe(true);
    expect(refused.content[0]!.text).toMatch(/final action/);
    expect(calls.filter(({ name }) => name === 'act')).toEqual([]);
  });

  it('clicks the submit button once, claiming the attempt before the act call', async () => {
    const { provider, calls, events, connect, claimFor } = await setup(FORM);
    const approved = (await provider.formSnapshot('read-1')).hash;
    const claim = claimFor(approved);
    const run = await connect({ formHash: approved, claim });
    await run('snapshot');
    const result = await run('click', { ref: 'e3' });
    expect(result.isError).toBeFalsy();
    const acts = calls.filter(({ name }) => name === 'act');
    expect(acts).toHaveLength(1);
    expect(acts[0]!.arguments).toMatchObject({ kind: 'click', ref: 'e3' });
    expect(claim).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['claim', 'act']);
  });

  it('refuses the submit when a field value changed after approval, without claiming', async () => {
    const { provider, calls, connect, claimFor, setText } = await setup(FORM);
    const approved = (await provider.formSnapshot('read-1')).hash;
    const claim = claimFor(approved);
    const run = await connect({ formHash: approved, claim });
    await run('snapshot');
    setText(FORM.replace('sara.benali@example.com', 'attacker@example.com'));
    const refused = await run('click', { ref: 'e3' });
    expect(refused.isError).toBe(true);
    expect(refused.content[0]!.text).toMatch(/form changed after approval/);
    expect(claim).not.toHaveBeenCalled();
    expect(calls.filter(({ name }) => name === 'act')).toEqual([]);
  });

  it('refuses when the ref now points at a non-submit control in the fresh read, without claiming', async () => {
    const { provider, calls, connect, claimFor, setText } = await setup(FORM);
    const approved = (await provider.formSnapshot('read-1')).hash;
    const claim = claimFor(approved);
    const run = await connect({ formHash: approved, claim });
    // Stale lastSnapshot still shows e3 as Submit; the fresh read moves Submit to e9 and puts a link on e3.
    await run('snapshot');
    setText(
      [
        ...FIELDS,
        'link "Back to search" [ref=e3]',
        'button "Submit application" [ref=e9]',
        'button "Delete account" [ref=e4]',
      ].join('\n'),
    );
    const refused = await run('click', { ref: 'e3' });
    expect(refused.isError).toBe(true);
    expect(refused.content[0]!.text).toMatch(/not a submit button/);
    expect(claim).not.toHaveBeenCalled();
    expect(calls.filter(({ name }) => name === 'act')).toEqual([]);
  });

  it('refuses a second submit when the approval was already claimed', async () => {
    const { provider, calls, connect, claimFor } = await setup(FORM);
    const approved = (await provider.formSnapshot('read-1')).hash;
    const claim = claimFor(approved, false);
    const run = await connect({ formHash: approved, claim });
    await run('snapshot');
    const refused = await run('click', { ref: 'e3' });
    expect(refused.isError).toBe(true);
    expect(refused.content[0]!.text).toMatch(/already attempted/);
    expect(claim).toHaveBeenCalledTimes(1);
    expect(calls.filter(({ name }) => name === 'act')).toEqual([]);
  });

  it('keeps NEVER_ACTION controls refused even with submit authorised', async () => {
    const form = [...FIELDS, 'button "Delete account" [ref=e4]', 'button "Submit and pay" [ref=e5]'].join('\n');
    const { provider, calls, connect, claimFor } = await setup(form);
    const approved = (await provider.formSnapshot('read-1')).hash;
    const claim = claimFor(approved);
    const run = await connect({ formHash: approved, claim });
    await run('snapshot');
    for (const ref of ['e4', 'e5']) {
      const refused = await run('click', { ref });
      expect(refused.isError, ref).toBe(true);
      expect(refused.content[0]!.text, ref).toMatch(/final action/);
    }
    expect(claim).not.toHaveBeenCalled();
    expect(calls.filter(({ name }) => name === 'act')).toEqual([]);
  });

  it('refuses a non-button control that matches the submit pattern, without claiming', async () => {
    const form = [...FIELDS, 'link "Send me job alerts" [ref=e6]'].join('\n');
    const { provider, calls, connect, claimFor } = await setup(form);
    const approved = (await provider.formSnapshot('read-1')).hash;
    const claim = claimFor(approved);
    const run = await connect({ formHash: approved, claim });
    await run('snapshot');
    const refused = await run('click', { ref: 'e6' });
    expect(refused.isError).toBe(true);
    expect(claim).not.toHaveBeenCalled();
    expect(calls.filter(({ name }) => name === 'act')).toEqual([]);
  });

  it('classifies submit, never and neutral labels as specified', () => {
    for (const label of ['Submit application', 'Send']) expect(SUBMIT_ACTION.test(label), label).toBe(true);
    for (const label of ['Submit application', 'Send']) expect(NEVER_ACTION.test(label), label).toBe(false);
    expect(NEVER_ACTION.test('Confirm and pay')).toBe(true);
    for (const label of ['Show more', 'Next']) {
      expect(NEVER_ACTION.test(label), label).toBe(false);
      expect(SUBMIT_ACTION.test(label), label).toBe(false);
    }
  });
});

describe('form hash is canonical and fails closed', () => {
  const form = (...lines: string[]) => lines.join('\n');
  const hash = (text: string) => computeFormHash(text);

  it('keeps URL values and values with colons whole', () => {
    expect(extractFormFields('textbox "Portfolio" [ref=e1]: https://example.com/a:b').map((f) => f.value)).toEqual([
      'https://example.com/a:b',
    ]);
    expect(extractFormFields('textbox "Time" [ref=e2]: 10:30:00').map((f) => f.value)).toEqual(['10:30:00']);
  });

  it('distinguishes URL values and colon-suffixed values that a last-colon parser would conflate', () => {
    expect(hash('textbox "Site" [ref=e1]: https://a.example')).not.toBe(
      hash('textbox "Site" [ref=e1]: https://b.example'),
    );
    expect(hash('textbox "Note" [ref=e1]: ratio 1:2')).not.toBe(hash('textbox "Note" [ref=e1]: ratio 1:3'));
  });

  it('distinguishes near-identical forms: one value, one checked state, one type', () => {
    const base = form('textbox "Name" [ref=e1]: Sara', 'checkbox "Sponsorship" [ref=e2] [checked]: ');
    expect(hash(base)).toBe(hash(base));
    expect(hash(base)).not.toBe(
      hash(form('textbox "Name" [ref=e1]: Sarah', 'checkbox "Sponsorship" [ref=e2] [checked]: ')),
    );
    expect(hash(base)).not.toBe(hash(form('textbox "Name" [ref=e1]: Sara', 'checkbox "Sponsorship" [ref=e2]: ')));
    expect(hash('textbox "A" [ref=e1]: x')).not.toBe(hash('combobox "A" [ref=e1]: x'));
  });

  it('is independent of line order and page chrome, but sees a field that changes after approval', () => {
    const a = form('heading "Apply"', 'textbox "Name" [ref=e1]: Sara', 'textbox "Email" [ref=e2]: s@example.com');
    const reordered = form(
      'textbox "Email" [ref=e2]: s@example.com',
      'link "Home" [ref=e9]',
      'textbox "Name" [ref=e1]: Sara',
    );
    expect(hash(a)).toBe(hash(reordered));
    expect(hash(a)).not.toBe(hash(a.replace('s@example.com', 's@example.org')));
  });

  it('has no hash for a snapshot without recognisable inputs', () => {
    expect(() => computeFormHash('heading "Apply"\nbutton "Submit" [ref=e3]')).toThrow(/structured/);
    expect(() => computeFormHash('')).toThrow(/structured/);
  });
});

describe('Neo tabs tool replies in plain text (live test of #111)', () => {
  const text = (...parts: string[]) => ({ content: parts.map((part) => ({ text: part })) });
  it('reads the new page id and the tab list, ignoring the trailing tips', () => {
    expect(tabsReply({ action: 'new' }, text('opened page 5', '\n--- Additional context (auto-included) ---'))).toEqual(
      {
        page: 5,
      },
    );
    expect(
      tabsReply(
        { action: 'list' },
        text(
          "User's tabs:\n[1] chrome://newtab/ (BrowserOS neo)\n\nOther agents' tabs:\n[2] https://a.example/jobs/1 (T), owned by jobpilot",
        ),
      ),
    ).toEqual({
      pages: [
        { page: 1, url: 'chrome://newtab/' },
        { page: 2, url: 'https://a.example/jobs/1' },
      ],
    });
  });
  it('prefers structured content when a build sends it, and yields nothing for an unreadable open', () => {
    expect(tabsReply({ action: 'new' }, { structuredContent: { page: 9 } })).toEqual({ page: 9 });
    expect(tabsReply({ action: 'new' }, text('something else'))).toBeUndefined();
  });
});

describe('Neo upload_cv attaches only the stored CV (live test of #111)', () => {
  async function setup(upload?: { path: string; fileName: string }) {
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    const provider = new NeoBrowserProvider({ debug() {}, warn() {} } as unknown as Logger, 'http://127.0.0.1:59999');
    (provider as unknown as { mcp: { call: (m: string, p: never) => Promise<unknown> } }).mcp = {
      call: async (_method, params: { name: string; arguments: Record<string, unknown> }) => {
        calls.push(params);
        if (params.name === 'tabs') return { content: [], structuredContent: { page: 7 } };
        return {
          content: [
            {
              type: 'text',
              text: params.name === 'snapshot' ? 'button "Attach" [ref=e5]\n  input file [ref=e6]' : 'ok',
            },
          ],
        };
      },
    };
    await provider.openTab('run-1', 'https://example.com/jobs/1');
    const server = (await provider.mcpServerConfig(
      'run-1',
      new AbortController().signal,
      undefined,
      upload,
    )) as unknown as {
      instance: {
        _registeredTools: Record<string, { handler: (a: object, e: object) => Promise<{ isError?: boolean }> }>;
      };
    };
    return { calls, tools: server.instance._registeredTools };
  }

  it('is absent unless main gave a file', async () => {
    expect((await setup()).tools.upload_cv).toBeUndefined();
  });

  it('always sends the configured path, never one from the agent, and needs a snapshot first', async () => {
    const { calls, tools } = await setup({ path: '/data/run-1/Sara_Benali_CV.pdf', fileName: 'Sara_Benali_CV.pdf' });
    expect((await tools.upload_cv!.handler({ ref: 'e6' }, {})).isError).toBe(true);
    await tools.snapshot!.handler({}, {});
    await tools.upload_cv!.handler({ ref: 'e6', file: '/etc/passwd', files: ['/Users/x/.ssh/id_rsa'] }, {});
    const sent = calls.filter(({ name }) => name === 'upload');
    expect(sent).toHaveLength(1);
    expect(sent[0]!.arguments).toEqual({ ref: 'e6', file: '/data/run-1/Sara_Benali_CV.pdf', page: 7 });
  });
});

describe('read-back of a real Greenhouse snapshot (live test of #111)', () => {
  const text = [
    '    - textbox "First Name" [required] [ref=e3]: "Sara"',
    '    - group "Resume/CV*"',
    '      - button "Remove file" [ref=e43]',
    '    - group "Cover Letter"',
    '      - button "Attach" [ref=e13]',
    '    - textbox "LinkedIn Profile" [ref=e38]',
  ].join('\n');
  it("shows an attached file as a field and prints values without Neo's quotes", () => {
    expect(attachedFiles(text)).toEqual([
      { field: 'group:Resume/CV', value: 'File attached', kind: 'file', state: '' },
    ]);
    const form = snapshotForm({ content: [{ type: 'text', text }] });
    expect(form.fields).toContainEqual({ label: 'First Name', value: 'Sara' });
    expect(form.fields).toContainEqual({ label: 'Resume/CV', value: 'File attached' });
  });
  it('changes the hash when the file is removed', () => {
    const without = text.replace('      - button "Remove file" [ref=e43]\n', '      - button "Attach" [ref=e43]\n');
    expect(snapshotForm({ content: [{ type: 'text', text }] }).hash).not.toBe(
      snapshotForm({ content: [{ type: 'text', text: without }] }).hash,
    );
  });
});

describe('Neo owner take-over holds the agent (#243)', () => {
  async function setup() {
    const calls: string[] = [];
    const provider = new NeoBrowserProvider({ debug() {}, warn() {} } as unknown as Logger, 'http://127.0.0.1:59999');
    (provider as unknown as { mcp: { call: (m: string, p: never) => Promise<unknown> } }).mcp = {
      call: async (_method, params: { name: string; arguments: Record<string, unknown> }) => {
        calls.push(params.name);
        if (params.name === 'tabs')
          return { content: [], structuredContent: { page: 7, pages: [{ page: 7, url: 'https://x.example/a' }] } };
        return { content: [{ type: 'text', text: 'ok' }] };
      },
    };
    await provider.openTab('run-1', 'https://x.example/a');
    const abort = new AbortController();
    const server = (await provider.mcpServerConfig('run-1', abort.signal)) as unknown as {
      instance: { _registeredTools: Record<string, { handler: (a: object, e: object) => Promise<unknown> }> };
    };
    return { provider, calls, abort, snapshot: () => server.instance._registeredTools.snapshot!.handler({}, {}) };
  }
  const settled = (p: Promise<unknown>) =>
    Promise.race([
      p.then(
        () => true,
        () => true,
      ),
      new Promise((r) => setTimeout(() => r(false), 30)),
    ]);

  it('parks an agent call until the owner hands the tab back', async () => {
    const { provider, calls, snapshot } = await setup();
    expect(provider.holdTab('run-1')).toBe(true);
    expect(provider.isHeld('run-1')).toBe(true);
    const before = calls.length;
    const pending = snapshot();
    expect(await settled(pending)).toBe(false);
    expect(calls.length).toBe(before);
    provider.releaseTab('run-1');
    await pending;
    expect(provider.isHeld('run-1')).toBe(false);
    expect(calls.length).toBe(before + 1);
  });

  it('ends the wait when the run is cancelled, and when the tab closes', async () => {
    const first = await setup();
    first.provider.holdTab('run-1');
    const waiting = first.snapshot();
    first.abort.abort(new Error('cancelled'));
    await expect(waiting).rejects.toThrow('cancelled');
    const second = await setup();
    second.provider.holdTab('run-1');
    await second.provider.closeTab('run-1');
    expect(second.provider.isHeld('run-1')).toBe(false);
  });

  it('refuses a hold without an open tab and reports the tab by page and address', async () => {
    const { provider } = await setup();
    expect(provider.holdTab('other-run')).toBe(false);
    expect(await provider.tabLocation('run-1')).toEqual({ tabId: '7', url: 'https://x.example/a' });
    expect(await provider.tabLocation('other-run')).toBeNull();
  });
});

describe('Neo openTab leaves no stray tab behind (#236)', () => {
  const textReply = (text: string) => ({ content: [{ type: 'text', text }] });

  function setup(newReply: string) {
    const closedPages: unknown[] = [];
    const provider = new NeoBrowserProvider({ debug() {}, warn() {} } as unknown as Logger, 'http://127.0.0.1:59999');
    let opened = false;
    (provider as unknown as { mcp: { call: (m: string, p: never) => Promise<unknown> } }).mcp = {
      call: async (_method, params: { name: string; arguments: Record<string, unknown> }) => {
        const { action } = params.arguments;
        if (action === 'new') {
          opened = true;
          return textReply(newReply);
        }
        if (action === 'close') closedPages.push(params.arguments.page);
        if (action === 'list')
          return textReply(
            [
              '[1] https://example.com/owner-tab (Owner)',
              '[2] https://jobs.example.com/other (Other host)',
              ...(opened ? ['[9] https://jobs.example.com/role/1 (Role)'] : []),
            ].join('\n'),
          );
        return textReply('ok');
      },
    };
    return { provider, closedPages };
  }

  it('closes the tab Neo opened when its reply carries no readable page id', async () => {
    const { provider, closedPages } = setup('Opened a tab');
    await expect(provider.openTab('run-1', 'https://jobs.example.com/role/1')).rejects.toThrow();
    expect(closedPages).toEqual([9]);
  });

  it('never closes a tab that was already open, even on the same host', async () => {
    const { provider, closedPages } = setup('Opened a tab');
    await expect(provider.openTab('run-1', 'https://example.com/owner-tab')).rejects.toThrow();
    expect(closedPages).toEqual([]);
  });

  it('keeps the tab when the reply is readable', async () => {
    const { provider, closedPages } = setup('opened page 9');
    await expect(provider.openTab('run-1', 'https://jobs.example.com/role/1')).resolves.toEqual({ tabId: '9' });
    expect(closedPages).toEqual([]);
  });
});
