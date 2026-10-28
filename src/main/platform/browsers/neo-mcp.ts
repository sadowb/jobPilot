import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport, StreamableHTTPError } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpError, ResultSchema } from '@modelcontextprotocol/sdk/types.js';

export function allowlistedErrorCode(error: unknown): string | number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  let current: unknown = error;
  let depth = 0;
  while (current && typeof current === 'object' && depth < 3) {
    const raw =
      'code' in current && current.code !== undefined && current.code !== null
        ? current.code
        : 'status' in current && typeof current.status === 'number'
          ? current.status
          : undefined;
    if (typeof raw === 'number' && Number.isInteger(raw)) return raw;
    if (typeof raw === 'string' && /^[A-Z0-9_-]{1,64}$/i.test(raw)) return raw;
    current = 'cause' in current ? current.cause : undefined;
    depth++;
  }
  return undefined;
}

export class NeoMcp {
  private client?: Client;

  constructor(readonly endpoint: string) {}

  async call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    try {
      if (!this.client) {
        this.client = new Client({ name: 'jobpilot', version: '0.1.0' });
        await this.client.connect(
          new StreamableHTTPClientTransport(new URL(this.endpoint), {
            // Apply to every SDK fetch, including its background SSE GET.
            fetch: (url, init) =>
              fetch(url, {
                ...init,
                redirect: 'error',
                signal: init?.signal
                  ? AbortSignal.any([init.signal, AbortSignal.timeout(30_000)])
                  : AbortSignal.timeout(30_000),
              }),
          }),
          { timeout: 30_000 },
        );
      }
      return await this.client.request({ method, params }, ResultSchema, { timeout: 30_000 });
    } catch (error) {
      await this.client?.close().catch(() => undefined);
      this.client = undefined;
      const code = allowlistedErrorCode(error);
      // SDK errors can include server/page text; never retain it as a cause.
      if (error instanceof StreamableHTTPError) {
        throw new StreamableHTTPError(error.code, 'Neo MCP request failed');
      }
      if (error instanceof McpError) throw new McpError(error.code, 'Neo MCP request failed');
      const err = new Error('Neo MCP request failed') as Error & { code?: string | number };
      if (code !== undefined) err.code = code;
      throw err;
    }
  }
}
