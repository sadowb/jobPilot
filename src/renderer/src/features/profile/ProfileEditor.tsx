import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { V17Icon } from '../../components/V17Icon';

/** A native modal keeps keyboard focus inside the same side-sheet pattern as Settings. */
export function ProfileEditor({
  title,
  description,
  children,
  onCancel,
  onSave,
  dirty,
  error,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onCancel: () => void;
  onSave: () => void;
  dirty: boolean;
  error: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return createPortal(
    <dialog
      className="profile-editor"
      ref={dialog}
      aria-labelledby="profile-editor-title"
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
          onSave();
        }}
      >
        <header>
          <div>
            <div className="v17x">Profile & documents</div>
            <h2 id="profile-editor-title">{title}</h2>
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
            ) : dirty ? (
              'Unsaved changes'
            ) : (
              'Saved on this device'
            )}
          </span>
          <div className="profile-actions">
            <button type="button" className="btn sm" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn sm pri" disabled={!dirty}>
              Save changes
            </button>
          </div>
        </footer>
      </form>
    </dialog>,
    document.body,
  );
}
