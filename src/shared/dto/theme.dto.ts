import { z } from 'zod';

export const ThemeSourceSchema = z.enum(['system', 'light', 'dark']);
export type ThemeSource = z.infer<typeof ThemeSourceSchema>;

export const ThemeStateSchema = z.object({ source: ThemeSourceSchema, dark: z.boolean() });
export type ThemeState = z.infer<typeof ThemeStateSchema>;
