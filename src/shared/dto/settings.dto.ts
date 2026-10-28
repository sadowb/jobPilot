import { z } from 'zod';

export const SubmitModeSchema = z.enum(['auto', 'review']);
export type SubmitMode = z.infer<typeof SubmitModeSchema>;

export const SiteModeSchema = z.enum(['auto', 'assisted', 'manual']);
export type SiteMode = z.infer<typeof SiteModeSchema>;

export const SettingsLimitsSchema = z.object({
  openTabs: z.number().int().min(1).max(32).default(8),
  costPerDay: z.number().int().min(1).max(1000).default(5),
  runSeconds: z.number().int().min(30).max(3600).default(540),
  stuckSeconds: z.number().int().min(30).max(3600).default(120),
});
export type SettingsLimits = z.infer<typeof SettingsLimitsSchema>;

export const SitesConfigSchema = z.record(z.string().min(1).max(64), SiteModeSchema);
export type SitesConfig = z.infer<typeof SitesConfigSchema>;

export const AppSettingsSchema = z.object({
  autopilot: z.boolean().default(false),
  crew: z.number().int().min(1).max(32).default(4),
  submitMode: SubmitModeSchema.default('review'),
  sites: SitesConfigSchema.default({}),
  limits: SettingsLimitsSchema.default({
    openTabs: 8,
    costPerDay: 5,
    runSeconds: 540,
    stuckSeconds: 120,
  }),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

/** Typed confirmation for the irreversible reset; the renderer never sends paths. */
export const RemoveAllDataSchema = z.object({ confirm: z.literal('DELETE') });
export type RemoveAllDataInput = z.infer<typeof RemoveAllDataSchema>;

export const UpdateSettingsSchema = z.object({
  autopilot: z.boolean().optional(),
  crew: z.number().int().min(1).max(32).optional(),
  submitMode: SubmitModeSchema.optional(),
  sites: SitesConfigSchema.optional(),
  limits: SettingsLimitsSchema.partial().optional(),
});
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
