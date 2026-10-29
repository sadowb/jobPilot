import { AnthropicKeyStore } from '../../platform/secrets/anthropic-key';
import { z } from 'zod';
import { db, type JobPilotDb } from '../../platform/db/database';
import { SettingsRepository } from './settings.repository';
import { app, BrowserWindow, nativeTheme } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Channels } from '../../../shared/ipc';
import {
  AgentPreferencesSchema,
  AppSettingsSchema,
  CREW_DEFAULT,
  CREW_MAX,
  SettingsLimitsSchema,
  ThemeSourceSchema,
  UpdateSettingsSchema,
  type AppSettings,
  type ThemeSource,
  type ThemeState,
  type UpdateSettingsInput,
} from '../../../shared/dto';

// Phase 1 moves this into the `settings` table.
const themeFile = () => join(app.getPath('userData'), 'theme-preference');

export const themeState = (): ThemeState => ({
  source: nativeTheme.themeSource,
  dark: nativeTheme.shouldUseDarkColors,
});

export function loadTheme(): void {
  try {
    const saved = ThemeSourceSchema.safeParse(readFileSync(themeFile(), 'utf8').trim());
    if (saved.success) nativeTheme.themeSource = saved.data;
  } catch {
    /* First launch or an unreadable preference uses the system appearance. */
  }
}

export function setTheme(source: ThemeSource): ThemeState {
  writeFileSync(themeFile(), source, 'utf8');
  nativeTheme.themeSource = source;
  return themeState();
}

export function broadcastThemeChanges(): void {
  nativeTheme.on('updated', () => {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(Channels.themeChanged, themeState());
  });
}

export function profileMigrationDone(database: JobPilotDb): boolean {
  const value = new SettingsRepository(database).profileMigrationValue();
  return value === undefined ? false : z.literal(true).parse(value);
}

export function markProfileMigrated(database: JobPilotDb): void {
  new SettingsRepository(database).markProfileMigrated();
}

export function applyConcurrency(database: JobPilotDb): number {
  return z
    .number()
    .int()
    .min(1)
    .max(CREW_MAX)
    .default(CREW_DEFAULT)
    .parse(new SettingsRepository(database).applyConcurrency());
}

export function getSettings(database: JobPilotDb = db): AppSettings {
  const repository = new SettingsRepository(database);
  return AppSettingsSchema.parse({
    // Normalised on read: a `true` stored by an older build or a direct write must not reach the app.
    autopilot: false,
    crew: applyConcurrency(database),
    submitMode: repository.submitMode(),
    sites: repository.sites(),
    limits: repository.limits(),
  });
}

export function updateSettings(input: UpdateSettingsInput, database: JobPilotDb = db): AppSettings {
  const validated = UpdateSettingsSchema.parse(input);
  return database.transaction((tx) => {
    const repository = new SettingsRepository(tx);
    const current = getSettings(tx);

    const nextLimits = validated.limits ? { ...current.limits, ...validated.limits } : current.limits;
    const nextSites = validated.sites ? { ...current.sites, ...validated.sites } : current.sites;

    const next = AppSettingsSchema.parse({
      autopilot: validated.autopilot ?? current.autopilot,
      crew: validated.crew ?? current.crew,
      submitMode: validated.submitMode ?? current.submitMode,
      sites: nextSites,
      limits: nextLimits,
    });

    if (validated.autopilot !== undefined) repository.storeAutopilot(next.autopilot);
    if (validated.crew !== undefined) repository.storeApplyConcurrency(next.crew);
    if (validated.submitMode !== undefined) repository.storeSubmitMode(next.submitMode);
    if (validated.sites !== undefined) repository.storeSites(next.sites);
    if (validated.limits !== undefined) repository.storeLimits(next.limits);

    return next;
  });
}

export function runPreferences(database: JobPilotDb) {
  const repository = new SettingsRepository(database);
  const limits = SettingsLimitsSchema.parse(repository.limits() ?? {});
  return {
    model: AgentPreferencesSchema.parse(repository.agentPreferences() ?? {}).model,
    timeoutMs: limits.runSeconds * 1000,
    stuckMs: limits.stuckSeconds * 1000,
  };
}

export function claudeKeyService(database: JobPilotDb): AnthropicKeyStore {
  return new AnthropicKeyStore(new SettingsRepository(database));
}

export function lastConsolidation(database: JobPilotDb): number | undefined {
  return z.number().int().optional().parse(new SettingsRepository(database).lastConsolidation());
}

export function markConsolidated(database: JobPilotDb, at: number): void {
  new SettingsRepository(database).markConsolidated(at);
}
