import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  showMessageBox: vi.fn(),
  info: vi.fn(),
}));
vi.mock('electron', () => ({
  dialog: { showMessageBox: mocks.showMessageBox, showOpenDialog: vi.fn() },
  BrowserWindow: { fromWebContents: () => null },
  ipcMain: { handle: vi.fn() },
}));
vi.mock('../src/main/modules/observability/log.service', () => ({ loggerFor: () => ({ info: mocks.info }) }));
vi.mock('../src/main/modules/settings/recovery.service', () => ({}));
vi.mock('../src/main/modules/settings/settings.service', () => ({}));

import { confirmAutoSubmit } from '../src/main/modules/settings/settings.controller';
import { UserFacingError } from '../src/main/platform/ipc/user-facing-error';

beforeEach(() => vi.clearAllMocks());

describe('confirmAutoSubmit (N2)', () => {
  it('refuses a second request while a dialog is open', async () => {
    let answer!: (r: { response: number }) => void;
    mocks.showMessageBox.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const first = confirmAutoSubmit(null);
    await expect(confirmAutoSubmit(null)).rejects.toThrow(new UserFacingError('Answer the open dialog first.'));
    expect(mocks.showMessageBox).toHaveBeenCalledTimes(1);
    answer({ response: 0 });
    await expect(first).resolves.toBe(false);
    mocks.showMessageBox.mockResolvedValueOnce({ response: 0 });
    await expect(confirmAutoSubmit(null)).resolves.toBe(false); // lock released
  });

  it('defaults to Keep review and audits a decline', async () => {
    mocks.showMessageBox.mockResolvedValueOnce({ response: 0 });
    await expect(confirmAutoSubmit(null)).resolves.toBe(false);
    expect(mocks.showMessageBox.mock.calls[0]![0]).toMatchObject({ defaultId: 0, cancelId: 0 });
    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'owner', decision: 'declined' }),
      expect.any(String),
    );
  });

  it('approves and audits', async () => {
    mocks.showMessageBox.mockResolvedValueOnce({ response: 1 });
    await expect(confirmAutoSubmit(null)).resolves.toBe(true);
    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'owner', decision: 'approved' }),
      expect.any(String),
    );
  });
});
