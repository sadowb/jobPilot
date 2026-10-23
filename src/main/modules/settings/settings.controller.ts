import { z } from 'zod';
import { Channels, RecoveryKeySchema } from '../../../shared/ipc';
import { ClaudeApiKeySchema, ThemeSourceSchema } from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import { exportRecoveryKey, importRecoveryKey } from './recovery.service';
import { claudeKeyService, setTheme, themeState } from './settings.service';

export const recoveryHandlers = [
  defineHandler(Channels.importRecoveryKey, RecoveryKeySchema, (key) => importRecoveryKey(key)),
];

export const settingsHandlers = [
  defineHandler(Channels.exportRecoveryKey, z.void(), (_input, { window }) => exportRecoveryKey(window)),
  defineHandler(Channels.getTheme, z.void(), () => themeState()),
  defineHandler(Channels.setTheme, ThemeSourceSchema, (source) => setTheme(source)),
];

export function claudeKeyHandlers(service: ReturnType<typeof claudeKeyService>) {
  return [
    defineHandler(Channels.setClaudeKey, ClaudeApiKeySchema, (key) => service.set(key)),
    defineHandler(Channels.getClaudeKeyStatus, z.void(), () => service.status()),
    defineHandler(Channels.removeClaudeKey, z.void(), () => service.remove()),
    defineHandler(Channels.testClaudeKey, z.void(), () => service.test()),
  ];
}
