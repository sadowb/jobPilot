import { useState, type FormEvent } from 'react';
import { RecoveryKeySchema } from '../../../shared/ipc';
import { Button } from '../components/ui';

export function RecoveryPage() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('recoveryKey') as HTMLInputElement;
    const key = RecoveryKeySchema.safeParse(input.value.trim());
    input.value = '';
    if (!key.success) {
      setError('Enter the 32-byte base64 recovery key from your main Bitwarden vault.');
      return;
    }
    setPending(true);
    try {
      if (!(await window.jobpilot?.recovery.import(key.data))) {
        setError('The key could not unlock jobpilot.db or OS secure storage is unavailable. Try again.');
      }
    } catch {
      setError('Recovery could not finish. Try again.');
    } finally {
      setPending(false);
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
        <p>
          JobPilot could not unlock jobpilot.db. Enter the recovery key saved in your main Bitwarden vault. Your
          database will be kept.
        </p>
        <label htmlFor="recovery-key">Recovery key</label>
        <input
          id="recovery-key"
          name="recoveryKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
          className="rounded border border-line p-3"
        />
        <Button type="submit" disabled={pending}>
          Unlock database
        </Button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
