/** Single source of truth for IPC channel names and the renderer bridge (imported by main, preload and renderer). */
import type { ApplicationListItem, IngestResult, ProfileData, ProfileSave, ThemeSource, ThemeState } from './dto';
import { z } from 'zod';

export type { ThemeSource, ThemeState };

export const Channels = {
  ingestPosting: 'postings:ingest',
  listApplications: 'applications:list',
  createApplication: 'applications:create',
  getProfile: 'profile:get',
  profileMigrationDone: 'profile:migration-done',
  saveProfile: 'profile:save',
  migrateProfile: 'profile:migrate',
  exportRecoveryKey: 'recovery:export',
  importRecoveryKey: 'recovery:import',
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

export const RecoveryKeySchema = z.string().regex(/^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/);

export interface JobPilotBridge {
  postings: { ingest(url: string): Promise<IngestResult> };
  applications: { list(): Promise<ApplicationListItem[]>; create(postingId: string): Promise<ApplicationListItem> };
  profile: {
    get(): Promise<ProfileData>;
    migrationDone(): Promise<boolean>;
    save(input: ProfileSave): Promise<ProfileData>;
    migrate(input: ProfileData): Promise<ProfileData>;
  };
  recovery: {
    export(): Promise<void>;
    import(key: string): Promise<boolean>;
  };
  platform: string;
  reportRendererError(error: z.input<typeof RendererErrorInputSchema>): Promise<void>;
  documents: { save(name: string, bytes: Uint8Array): Promise<boolean> };
  theme: {
    get(): Promise<ThemeState>;
    set(source: ThemeSource): Promise<ThemeState>;
    onChange(listener: (state: ThemeState) => void): () => void;
  };
}
