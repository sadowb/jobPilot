import { dialog } from 'electron';
import type { AgentSettingsService } from './agent.service';
import type { MemorySettingsService } from './memory.service';
import { z } from 'zod';
import { Channels, RecoveryKeySchema, RestoreBackupSchema } from '../../../shared/ipc';
import {
  ClaudeApiKeySchema,
  ThemeSourceSchema,
  SaveAgentSchema,
  UpdateSettingsSchema,
  RemoveAllDataSchema,
} from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import { exportRecoveryKey, importRecoveryKey, recoveryState, restoreFromBackup } from './recovery.service';
import { claudeKeyService, getSettings, setTheme, themeState, updateSettings } from './settings.service';

export const recoveryHandlers = [
  defineHandler(Channels.importRecoveryKey, RecoveryKeySchema, (key) => importRecoveryKey(key)),
  defineHandler(Channels.getRecoveryState, z.void(), () => recoveryState()),
  defineHandler(Channels.restoreBackup, RestoreBackupSchema, (input) => restoreFromBackup(input)),
];

export const settingsHandlers = [
  defineHandler(Channels.exportRecoveryKey, z.void(), (_input, { window }) => exportRecoveryKey(window)),
  defineHandler(Channels.getTheme, z.void(), () => themeState()),
  defineHandler(Channels.setTheme, ThemeSourceSchema, (source) => setTheme(source)),
  defineHandler(Channels.getSettings, z.void(), () => getSettings()),
  defineHandler(Channels.updateSettings, UpdateSettingsSchema, (input) => updateSettings(input)),
];

export function claudeKeyHandlers(service: ReturnType<typeof claudeKeyService>) {
  return [
    defineHandler(Channels.setClaudeKey, ClaudeApiKeySchema, (key) => service.set(key)),
    defineHandler(Channels.getClaudeKeyStatus, z.void(), () => service.status()),
    defineHandler(Channels.removeClaudeKey, z.void(), () => service.remove()),
    defineHandler(Channels.testClaudeKey, z.void(), () => service.test()),
  ];
}

export function agentHandlers(service: AgentSettingsService) {
  return [
    defineHandler(Channels.getAgent, z.void(), () => service.state()),
    defineHandler(Channels.detectAgent, z.void(), () => service.detect()),
    defineHandler(Channels.chooseAgentPath, z.void(), async (_input, { window }) => {
      const options = { title: 'Choose the claude executable', properties: ['openFile' as const] };
      const result = await (window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options));
      return result.canceled || !result.filePaths[0] ? service.state() : service.chooseCandidate(result.filePaths[0]);
    }),
    defineHandler(Channels.saveAgent, SaveAgentSchema, (input) => service.save(input)),
  ];
}

export function memoryHandlers(service: MemorySettingsService) {
  return [
    defineHandler(Channels.getMemory, z.void(), () => service.status()),
    defineHandler(Channels.installMemory, z.void(), () => service.install()),
    defineHandler(Channels.removeMemory, z.void(), () => service.remove()),
  ];
}

export function dataHandlers(removeAll: () => Promise<void>) {
  return [defineHandler(Channels.removeAllData, RemoveAllDataSchema, () => removeAll())];
}
