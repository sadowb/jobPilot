import { z } from 'zod';
import { Channels, RecoveryKeySchema } from '../../../shared/ipc';
import { ThemeSourceSchema } from '../../../shared/dto';
import { defineHandler } from '../../platform/ipc/registry';
import { exportRecoveryKey, importRecoveryKey } from './recovery.service';
import { setTheme, themeState } from './settings.service';

export const recoveryHandlers = [
  defineHandler(Channels.importRecoveryKey, RecoveryKeySchema, (key) => importRecoveryKey(key)),
];

export const settingsHandlers = [
  defineHandler(Channels.exportRecoveryKey, z.void(), (_input, { window }) => exportRecoveryKey(window)),
  defineHandler(Channels.getTheme, z.void(), () => themeState()),
  defineHandler(Channels.setTheme, ThemeSourceSchema, (source) => setTheme(source)),
];
