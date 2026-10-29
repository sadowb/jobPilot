import { useState, type FormEvent } from 'react';
import { RecoveryKeySchema, type RecoveryState } from '../../../shared/ipc';
import { Button } from '../components/ui';
import { useImportRecoveryKey, useRecoveryState, useRestoreBackup } from '../lib/api';

const COPY: Record<RecoveryState['reason'], string> = {
  unlock:
    'JobPilot could not open jobpilot.db: the file may be damaged, or the stored key may be wrong. Restore a backup, or enter your recovery key if you have it.',
  empty: 'jobpilot.db is damaged (it is empty). Restore a backup to continue.',
  corrupt: 'jobpilot.db is damaged. Restore a backup to continue.',
  missing: 'jobpilot.db is missing. Restore a backup to continue.',
};

const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function RecoveryPage() {
  const [error, setError] = useState('');
  const state = useRecoveryState();
  const importKey = useImportRecoveryKey();
  const restore = useRestoreBackup();
  const pending = importKey.isPending || restore.isPending;
  const reason = state.data?.reason ?? 'unlock';

  // Empty means "use the stored key"; anything else must be a well-formed recovery key.
  function readKey(form: HTMLFormElement): string | undefined | null {
    const input = form.elements.namedItem('recoveryKey') as HTMLInputElement;
    const value = input.value.trim();
    input.value = '';
    if (!value) return undefined;
    const key = RecoveryKeySchema.safeParse(value);
    return key.success ? key.data : null;
  }

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = readKey(event.currentTarget);
    if (!key) {
      setError('Enter the 32-byte base64 recovery key from your main Bitwarden vault.');
      return;
    }
    try {
      if (!(await importKey.mutateAsync(key))) {
        setError('The key could not unlock jobpilot.db or OS secure storage is unavailable. Try again.');
      }
    } catch {
      setError('Recovery could not finish. Try again.');
    }
  }

  async function restoreFrom(name: string, form: HTMLFormElement) {
    const recoveryKey = readKey(form);
    if (recoveryKey === null) {
      setError('That recovery key is not valid. Leave the field empty to use the stored key.');
      return;
    }
    try {
      if (!(await restore.mutateAsync({ name, recoveryKey }))) {
        setError('That backup could not be verified with this key, or restoring failed. Your files were not changed.');
      }
    } catch {
      setError('Restore could not finish. Your files were not changed.');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ground p-8 text-ink">
      <form
        onSubmit={(event) => void recover(event)}
        role="dialog"
        aria-label="Recover database"
        className="grid max-w-lg gap-4"
      >
        <h1>Recover your database</h1>
        <p>{COPY[reason]} Your current database file is always kept.</p>
        <label htmlFor="recovery-key">Recovery key{reason === 'unlock' ? '' : ' (optional)'}</label>
        <input
          id="recovery-key"
          name="recoveryKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
          className="rounded border border-line p-3"
        />
        {reason === 'unlock' && (
          <Button type="submit" disabled={pending}>
            Unlock database
          </Button>
        )}
        <h2>Restore from backup</h2>
        {state.isError && <p role="alert">Backups could not be listed.</p>}
        {state.data && state.data.backups.length === 0 && <p>No backups were found.</p>}
        <ul className="grid gap-2">
          {state.data?.backups.map((backup) => (
            <li key={backup.name} className="flex items-center justify-between gap-4">
              <span>
                {new Date(backup.modifiedAt).toLocaleString()} ({formatSize(backup.size)})
              </span>
              <Button
                type="button"
                disabled={pending}
                onClick={(event) => void restoreFrom(backup.name, event.currentTarget.form as HTMLFormElement)}
              >
                Restore
              </Button>
            </li>
          ))}
        </ul>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
