/** Single source of truth for IPC channel names and the renderer bridge (imported by main, preload and renderer). */
import type { ThemeSource, ThemeState } from './dto';
import { z } from 'zod';

export type { ThemeSource, ThemeState };

export const Channels = {
  getTheme: 'theme:get',
  saveDocument: 'documents:save',
  setTheme: 'theme:set',
  themeChanged: 'theme:changed',
  rendererError: 'observability:renderer-error',
} as const;

export const RendererErrorInputSchema = z.object({
  kind: z.enum(['error', 'unhandledrejection']),
  message: z.string().min(1).max(4000),
  stack: z.string().max(12000).optional(),
});

export interface JobPilotBridge {
  platform: string;
  reportRendererError(error: z.input<typeof RendererErrorInputSchema>): Promise<void>;
  documents: { save(name: string, bytes: Uint8Array): Promise<boolean> };
  theme: {
    get(): Promise<ThemeState>;
    set(source: ThemeSource): Promise<ThemeState>;
    onChange(listener: (state: ThemeState) => void): () => void;
  };
}
