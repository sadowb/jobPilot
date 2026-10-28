import { useState } from 'react';
import { Button, Dialog, Input } from '../../components/ui';
import { useRemoveAllData } from '../../lib/api';

const CONFIRM_WORD = 'DELETE';

/** Typed confirmation for the irreversible reset (ADR 0016 rule 3); main does the work and quits the app. */
export function RemoveDataDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [typed, setTyped] = useState('');
  const removeAll = useRemoveAllData();
  const ready = typed === CONFIRM_WORD && !removeAll.isPending;
  const close = () => {
    if (removeAll.isPending) return;
    setTyped('');
    removeAll.reset();
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      eyebrow="Danger zone"
      title="Remove all JobPilot data"
      description="Deletes your profile, applications, documents, memory, logs and backups, removes JobPilot's Keychain item, then quits. This cannot be undone."
      closeLabel="Close"
      onSubmit={() => ready && removeAll.mutate()}
      note={
        removeAll.isError ? (
          <span role="alert">Removal failed. Quit and reopen JobPilot, then try again.</span>
        ) : undefined
      }
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={close} disabled={removeAll.isPending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="danger-fill" disabled={!ready}>
            {removeAll.isPending ? 'Removing…' : 'Remove everything'}
          </Button>
        </>
      }
    >
      <p className="mt-0 text-[13px] leading-[1.5] text-ink-2">
        Export your recovery key first if you may want to restore a copy of your database later. Applications already
        sent stay with the employers.
      </p>
      <label className="mt-3 block text-[13px]">
        Type <b>{CONFIRM_WORD}</b> to confirm
        <Input
          className="mt-1.5 w-full"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
    </Dialog>
  );
}
