import { describe, expect, it, vi } from 'vitest';
import { RemoveAllDataSchema } from '../src/shared/dto';
import { keychainCommand, removeKeychainItem, usesOsKeychain } from '../src/main/platform/secrets/keychain';
import { removeAllData, type RemoveAllDataSteps } from '../src/main/modules/settings/remove-data.service';

function steps(order: string[], overrides: Partial<RemoveAllDataSteps> = {}): RemoveAllDataSteps {
  const record = (name: string) => () => {
    order.push(name);
  };
  return {
    log: record('log'),
    stopOwnedWork: async () => record('stop')(),
    closeDatabase: record('db'),
    closeLogs: record('logs'),
    deleteUserData: async () => record('rm')(),
    removeKeychainItem: async () => record('keychain')(),
    exit: (code) => order.push(`exit:${code}`),
    ...overrides,
  };
}

describe('Remove all data (ADR 0016 rule 3)', () => {
  it('accepts only the exact confirm word', () => {
    expect(RemoveAllDataSchema.safeParse({ confirm: 'DELETE' }).success).toBe(true);
    for (const bad of [{}, { confirm: 'delete' }, { confirm: '' }, { confirm: true }, undefined])
      expect(RemoveAllDataSchema.safeParse(bad).success).toBe(false);
  });

  it('runs log -> stop -> close db -> close logs -> rm -> keychain -> exit', async () => {
    const order: string[] = [];
    await removeAllData(steps(order));
    expect(order).toEqual(['log', 'stop', 'db', 'logs', 'rm', 'keychain', 'exit:0']);
  });

  it('keeps the Keychain item and exits non-zero when deletion fails', async () => {
    const order: string[] = [];
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await removeAllData(
      steps(order, {
        deleteUserData: async () => {
          throw new Error('EBUSY');
        },
      }),
    );
    write.mockRestore();
    expect(order).toEqual(['log', 'stop', 'db', 'logs', 'exit:1']);
  });
});

describe('keychain removal', () => {
  it('builds argv per platform without a shell', () => {
    expect(keychainCommand('darwin', 'JobPilot')).toEqual({
      file: '/usr/bin/security',
      args: ['delete-generic-password', '-s', 'JobPilot Safe Storage', '-a', 'JobPilot'],
    });
    expect(keychainCommand('linux', 'JobPilot')).toEqual({
      file: 'secret-tool',
      args: ['clear', 'application', 'JobPilot'],
    });
    expect(keychainCommand('win32', 'JobPilot')).toBeUndefined();
  });

  it('leaves the OS item alone when safeStorage runs on a mock or basic store', () => {
    const line = (switches: Record<string, string>) => ({
      hasSwitch: (name: string) => name in switches,
      getSwitchValue: (name: string) => switches[name] ?? '',
    });
    expect(usesOsKeychain('darwin', line({}))).toBe(true);
    expect(usesOsKeychain('darwin', line({ 'use-mock-keychain': '' }))).toBe(false);
    expect(usesOsKeychain('linux', line({}))).toBe(true);
    expect(usesOsKeychain('linux', line({ 'password-store': 'gnome-libsecret' }))).toBe(true);
    expect(usesOsKeychain('linux', line({ 'password-store': 'basic' }))).toBe(false);
    expect(usesOsKeychain('win32', line({ 'use-mock-keychain': '' }))).toBe(true);
  });

  const fake = (error: unknown) =>
    vi.fn((_file: string, _args: string[], _options: object, callback: (error: unknown) => void) => callback(error));

  it('treats macOS exit 44 as already removed and success as removed', async () => {
    const missing = fake(Object.assign(new Error('not found'), { code: 44 }));
    await expect(removeKeychainItem('JobPilot', 'darwin', missing as never)).resolves.toBe('absent');
    await expect(removeKeychainItem('JobPilot', 'darwin', fake(null) as never)).resolves.toBe('removed');
  });

  it('rejects other failures, skips a missing secret-tool and does nothing on Windows', async () => {
    const other = fake(Object.assign(new Error('denied'), { code: 1 }));
    await expect(removeKeychainItem('JobPilot', 'darwin', other as never)).rejects.toThrow('denied');
    const absent = fake(Object.assign(new Error('spawn'), { code: 'ENOENT' }));
    await expect(removeKeychainItem('JobPilot', 'linux', absent as never)).resolves.toBe('skipped');
    const never = fake(null);
    await expect(removeKeychainItem('JobPilot', 'win32', never as never)).resolves.toBe('skipped');
    expect(never).not.toHaveBeenCalled();
  });
});
