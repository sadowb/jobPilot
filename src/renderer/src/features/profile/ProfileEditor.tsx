import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { V17Icon } from '../../components/V17Icon';

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
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);
  return createPortal(
    <dialog
      className="profile-editor"
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (onSave) onSave();
          else onCancel();
        }}
      >
        <header>
          <div>
            <div className="v17x">{eyebrow}</div>
            <h2 id={titleId}>
              {titleAdornment}
              {title}
            </h2>
            <p>{description}</p>
          </div>
          <button type="button" className="btn ghost ic sm" aria-label="Close editor" onClick={onCancel}>
            <V17Icon name="close" />
          </button>
        </header>
        <div className="profile-editor-body">{children}</div>
        <footer>
          <span aria-live="polite">
            {error ? (
              <span className="profile-error" role="alert">
                {error}
              </span>
            ) : (
              (note ?? (dirty ? 'Unsaved changes' : 'Saved on this device'))
            )}
          </span>
          <div className="profile-actions">
            {onSave ? (
              <>
                <button type="button" className="btn sm" onClick={onCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn sm pri" disabled={!dirty}>
                  {saveLabel}
                </button>
              </>
            ) : (
              <button type="submit" className="btn sm pri">
                Done
              </button>
            )}
          </div>
        </footer>
      </form>
    </dialog>,
    document.body,
  );
}
