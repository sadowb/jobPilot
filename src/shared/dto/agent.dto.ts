import { z } from 'zod';

export const AgentModelSchema = z.enum(['haiku', 'sonnet', 'opus']);
export const AgentPreferencesSchema = z.object({
  path: z
    .string()
    .max(4096)
    .refine((path) => path.startsWith('/') && !path.includes('\0'))
    .nullable()
    .default(null),
  version: z.string().max(256).nullable().default(null),
  confirmed: z.boolean().default(false),
  model: AgentModelSchema.default('haiku'),
  auth: z.enum(['login', 'api_key']).default('login'),
});
export const AgentStateSchema = AgentPreferencesSchema.extend({
  tool: z.literal('claude'),
  status: z.enum(['ready', 'needs_confirmation', 'tool_not_installed', 'not_logged_in', 'api_key_required']),
  login: z.enum(['unknown', 'ok', 'not_logged_in']),
});
/** Preferences only: the executable is never renderer-supplied, main confirms the candidate it found itself. */
export const SaveAgentSchema = z.object({
  model: AgentModelSchema,
  auth: z.enum(['login', 'api_key']),
});
export type AgentState = z.infer<typeof AgentStateSchema>;
