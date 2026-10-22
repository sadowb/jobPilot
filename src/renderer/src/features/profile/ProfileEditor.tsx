import type { ReactNode } from 'react';
import { Dialog } from '../../components/ui';
import { PButton } from './buttons';

/**
 * A native modal dialog, centred over a blurred scrim, so keyboard focus stays inside it.
 * Without `onSave` it is a read-and-navigate dialog and the footer shows a single "Done" button.
 */
export function ProfileEditor({
  title,
  titleAdornment,
  eyebrow = 'Profile & documents',
  description,
  children,
  onCancel,
  onSave,
  dirty = false,
  error = '',
  note,
  saveLabel = 'Save changes',
}: {
  title: string;
  /** Rendered before the title, e.g. a country badge. */
  titleAdornment?: ReactNode;
  eyebrow?: string;
  description: string;
  children: ReactNode;
  onCancel: () => void;
  onSave?: () => void;
  dirty?: boolean;
  error?: string;
  /** Replaces the default "Unsaved changes / Saved on this device" status text. */
  note?: ReactNode;
  saveLabel?: string;
}) {
  return (
    <Dialog
      open
      onClose={onCancel}
      className="[&>form_button]:font-semibold! [&>form>header>button]:h-[34px]! [&>form>header>button]:min-h-[34px]! [&>form>header>button]:w-9! [&>form>header>button]:min-w-9! [&>form>header>button]:focus:outline-none! [&>form>header>button]:focus-visible:outline-3! [&>form>header>button]:focus-visible:outline-offset-2! [&>form>header>button]:focus-visible:outline-ink!"
      title={title}
      titleAdornment={titleAdornment}
      eyebrow={eyebrow}
      description={description}
      onSubmit={onSave ? () => onSave() : undefined}
      note={
        error ? (
          <span className="text-bad" role="alert">
            {error}
          </span>
        ) : (
          (note ?? (dirty ? 'Unsaved changes' : 'Saved on this device'))
        )
      }
      actions={
        onSave ? (
          <>
            <PButton onClick={onCancel}>Cancel</PButton>
            <PButton type="submit" variant="primary" disabled={!dirty}>
              {saveLabel}
            </PButton>
          </>
        ) : undefined
      }
    >
      {children}
    </Dialog>
  );
}
