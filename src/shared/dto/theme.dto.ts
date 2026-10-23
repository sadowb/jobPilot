import { z } from 'zod';

export const ThemeSourceSchema = z.enum(['system', 'light', 'dark']);
export type ThemeSource = z.infer<typeof ThemeSourceSchema>;

export interface ThemeState {
  source: ThemeSource;
  dark: boolean;
}
