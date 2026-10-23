import { URL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseHTML } from 'linkedom';
import { z } from 'zod';

const html = z
  .string()
  .min(1)
  .parse(await readFile(new URL('./form.html', import.meta.url), 'utf8'));
const { document } = parseHTML(html);
const server = new McpServer({ name: 'local-form', version: '1.0.0' });
server.registerTool('fill', { inputSchema: { name: z.string() } }, async ({ name }) => {
  document.querySelector('input').value = name;
  return { content: [{ type: 'text', text: document.querySelector('form').outerHTML }] };
});
await server.connect(new StdioServerTransport());
