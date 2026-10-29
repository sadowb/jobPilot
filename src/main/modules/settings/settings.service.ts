import { AnthropicKeyStore } from '../../platform/secrets/anthropic-key';
import { z } from 'zod';
import { db, type JobPilotDb } from '../../platform/db/database';
import { SettingsRepository } from './settings.repository';
import { app, BrowserWindow, nativeTheme } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Channels } from '../../../shared/ipc';
import { loggerFor } from '../observability/log.service';
import {
  AgentPreferencesSchema,
  AppSettingsSchema,
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

/**
 * Stored values come from disk (hand edits, other builds), so reads never throw: an invalid value logs a warning
 * and falls back to the default. Writes stay strict (UpdateSettingsSchema).
 */
function tolerantRead<S extends z.ZodType>(schema: S, raw: unknown, empty: unknown, name: string): z.output<S> {
  const parsed = schema.safeParse(raw ?? empty);
  if (parsed.success) return parsed.data;
  loggerFor('settings').warn({ setting: name }, 'Stored setting is invalid; using the default');
  return schema.parse(empty);
}

export function applyConcurrency(database: JobPilotDb): number {
  return tolerantRead(
    AppSettingsSchema.shape.crew,
    new SettingsRepository(database).applyConcurrency(),
    undefined,
    'runs.concurrency',
  );
}

export function getSettings(database: JobPilotDb = db): AppSettings {
  const repository = new SettingsRepository(database);
  return AppSettingsSchema.parse({
    // Normalised on read: a `true` stored by an older build or a direct write must not reach the app.
    autopilot: false,
    crew: applyConcurrency(database),
    submitMode: tolerantRead(AppSettingsSchema.shape.submitMode, repository.submitMode(), undefined, 'runs.submitMode'),
    sites: tolerantRead(AppSettingsSchema.shape.sites, repository.sites(), undefined, 'runs.sites'),
    limits: tolerantRead(SettingsLimitsSchema, repository.limits(), {}, 'runs.limits'),
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
  const limits = tolerantRead(SettingsLimitsSchema, repository.limits(), {}, 'runs.limits');
  return {
    model: tolerantRead(AgentPreferencesSchema, repository.agentPreferences(), {}, 'agents.claude').model,
    timeoutMs: limits.runSeconds * 1000,
    stuckMs: limits.stuckSeconds * 1000,
  };
}

/** The owner's queue pause survives relaunch; anything but a stored `true` reads as not paused. */
export function runsPaused(database: JobPilotDb): boolean {
  return new SettingsRepository(database).runsPaused() === true;
}

export function storeRunsPaused(database: JobPilotDb, paused: boolean): void {
  new SettingsRepository(database).storeRunsPaused(paused);
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
