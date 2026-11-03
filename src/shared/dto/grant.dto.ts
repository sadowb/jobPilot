import { z } from 'zod';
import { AgentToolId, BrowserId, GrantKind, GrantScope } from './enums';

/** Closed scope per kind; the service refuses a mismatched pair. */
export const SCOPE_OF = { agent: 'agent_run', browser: 'browser_tab' } as const satisfies Record<GrantKind, GrantScope>;

export const GrantSchema = z.object({
  id: z.string().min(1).max(64),
  kind: GrantKind.schema,
  /** Agent id or browser id. */
  provider: z.string().min(1).max(64),
  scope: GrantScope.schema,
  /** Custom agents only: the resolved absolute path the owner allowed. A different file there needs a new grant. */
  executablePath: z.string().max(4096).nullable(),
  grantedAt: z.number().int().positive(),
});
export type Grant = z.infer<typeof GrantSchema>;
export const GrantListSchema = z.array(GrantSchema);

export const RevokeGrantSchema = z.object({ id: z.string().min(1).max(64) });

/** What the owner picked on the consent sheet. The custom agent's path never comes from the renderer. */
export const AgentChoiceSchema = z.object({ id: AgentToolId.schema, model: z.string().min(1).max(128).nullable() });
export const BrowserChoiceSchema = z.object({ id: BrowserId.schema });

/** "Allow both" sends both; Settings may allow one side. */
export const AllowConnectionsSchema = z
  .object({ agent: AgentChoiceSchema.optional(), browser: BrowserChoiceSchema.optional() })
  .refine((input) => input.agent !== undefined || input.browser !== undefined, 'Choose something to allow.');
export type AllowConnectionsInput = z.infer<typeof AllowConnectionsSchema>;

export const ConnectionTestSchema = z.object({
  ok: z.boolean(),
  /** Round trip in ms when ok. */
  ms: z.number().int().nonnegative().nullable(),
  /** Short, owner-facing reason when not ok. */
  message: z.string().max(300).nullable(),
});
export const AllowConnectionsResultSchema = z.object({
  agent: ConnectionTestSchema.nullable(),
  browser: ConnectionTestSchema.nullable(),
});
export type AllowConnectionsResult = z.infer<typeof AllowConnectionsResultSchema>;
