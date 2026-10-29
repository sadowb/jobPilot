import { dialog, type BrowserWindow } from 'electron';
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
import { UserFacingError } from '../../platform/ipc/user-facing-error';
import { loggerFor } from '../observability/log.service';
import { exportRecoveryKey, importRecoveryKey, recoveryState, restoreFromBackup } from './recovery.service';
import { claudeKeyService, getSettings, setTheme, themeState, updateSettings } from './settings.service';

export const recoveryHandlers = [
  defineHandler(Channels.importRecoveryKey, RecoveryKeySchema, (key) => importRecoveryKey(key)),
  defineHandler(Channels.getRecoveryState, z.void(), () => recoveryState()),
  defineHandler(Channels.restoreBackup, RestoreBackupSchema, (input) => restoreFromBackup(input)),
];

/** Main is the trust boundary: switching to Auto needs a native confirmation the renderer cannot fake. Cancel keeps review. */
let consentOpen = false;

// shortcut: application_event rows are per-application (FK), so the owner's decision goes to the structured log; give settings its own audit table if this needs querying in-app.
export async function confirmAutoSubmit(window: BrowserWindow | null): Promise<boolean> {
  const options = {
    type: 'warning' as const,
    message: 'Submit without review?',
    detail:
      'In Auto the crew presses the final Submit button itself once every answer is set. Nothing is shown to you first. The hard limits under Advanced still apply.',
    buttons: ['Keep review', 'Submit automatically'],
    defaultId: 0,
    cancelId: 0,
  };
  if (consentOpen) throw new UserFacingError('Answer the open dialog first.');
  consentOpen = true;
  try {
    const { response } = await (window ? dialog.showMessageBox(window, options) : dialog.showMessageBox(options));
    const approved = response === 1;
    loggerFor('audit').info(
      { actor: 'owner', type: 'submit_mode_consent', decision: approved ? 'approved' : 'declined' },
      'Owner answered the auto-submit consent dialog',
    );
    return approved;
  } finally {
    consentOpen = false;
  }
}

export const settingsHandlers = [
  defineHandler(Channels.exportRecoveryKey, z.void(), (_input, { window }) => exportRecoveryKey(window)),
  defineHandler(Channels.getTheme, z.void(), () => themeState()),
  defineHandler(Channels.setTheme, ThemeSourceSchema, (source) => setTheme(source)),
  defineHandler(Channels.getSettings, z.void(), () => getSettings()),
  defineHandler(Channels.updateSettings, UpdateSettingsSchema, async (input, { window }) => {
    if (input.submitMode === 'auto' && getSettings().submitMode !== 'auto' && !(await confirmAutoSubmit(window))) {
      return updateSettings({ ...input, submitMode: undefined });
    }
    return updateSettings(input);
  }),
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
