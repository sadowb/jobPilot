import { z } from 'zod';

const Message = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.number().optional(),
  result: z.unknown().optional(),
  error: z.object({ code: z.number(), message: z.string() }).optional(),
});
const ProtocolVersion = '2025-03-26';

/** Only the request/response subset needed by Neo's tabs tool; no listener or subprocess. */
export class NeoMcp {
  private sessionId?: string;
  private initialized = false;
  private nextId = 0;

  constructor(readonly endpoint: string) {}

  async call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.initialized) {
      const result = await this.send('initialize', {
        protocolVersion: ProtocolVersion,
        capabilities: {},
        clientInfo: { name: 'jobpilot', version: '0.1.0' },
      });
      z.object({ protocolVersion: z.literal(ProtocolVersion), capabilities: z.object({}) }).parse(result);
      await this.send('notifications/initialized');
      this.initialized = true;
    }
    return this.send(method, params);
  }

  private async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = method.startsWith('notifications/') ? undefined : ++this.nextId;
    const response = await fetch(this.endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': ProtocolVersion,
        ...(this.sessionId ? { 'Mcp-Session-Id': this.sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 404) {
        this.sessionId = undefined;
        this.initialized = false;
      }
      throw new Error(`Neo MCP request failed (HTTP ${response.status})`);
    }
    if (method === 'initialize') {
      this.sessionId = z
        .string()
        .regex(/^[\x21-\x7e]+$/)
        .optional()
        .parse(response.headers.get('mcp-session-id') ?? undefined);
    }
    if (id === undefined) {
      await response.body?.cancel();
      return;
    }
    const check = (raw: unknown) => {
      const message = Message.parse(raw);
      if (message.id !== id) return undefined;
      // Do not include server text: it can contain page content or credentials.
      if (message.error) throw new Error(`Neo MCP error (${message.error.code})`);
      if (!('result' in message)) throw new Error('Neo MCP response has no result');
      return message;
    };
    if (response.headers.get('content-type')?.includes('application/json')) {
      const message = check(await response.json());
      if (!message) throw new Error('Neo MCP response id mismatch');
      return message.result;
    }
    if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
      await response.body?.cancel();
      throw new Error('Unsupported Neo MCP response');
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += chunk.value;
        if (buffer.length > 8 * 1024 * 1024) throw new Error('Neo MCP event exceeds size limit');
        // MCP events are UTF-8 SSE data, possibly split across network chunks.
        for (;;) {
          const boundary = /\r?\n\r?\n/.exec(buffer);
          if (!boundary) break;
          const event = buffer.slice(0, boundary.index);
          buffer = buffer.slice(boundary.index + boundary[0].length);
          const data = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).replace(/^ /, ''))
            .join('\n');
          if (!data) continue;
          const message = check(JSON.parse(data));
          if (message) return message.result;
        }
      }
      throw new Error('Neo MCP stream ended without a response');
    } finally {
      await reader.cancel();
    }
  }
}
