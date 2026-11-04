import { useState, type FormEvent } from 'react';
import { BARE_INPUT, FOCUS_WITHIN } from './styles';

/** Bottom message pill (`.comp`). `onSend` receives trimmed, non-empty text only. */
export function Composer({
  placeholder,
  onSend,
  pending = false,
  error,
}: {
  placeholder: string;
  /** Resolves when the message is saved; the text stays in the field (and the error shows) when it rejects. */
  onSend: (text: string) => Promise<unknown>;
  pending?: boolean;
  error?: string | null;
}) {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    onSend(trimmed).then(
      () => setText(''),
      () => undefined,
    );
  };
  return (
    <div className="flex flex-none flex-col">
      {error ? (
        <div role="alert" className="mx-auto mb-1.5 w-[calc(100%_-_96px)] max-w-[724px] text-[13px] text-bad">
          {error}
        </div>
      ) : null}
      <form
        className={`mx-auto mb-[18px] flex min-h-[54px] w-[calc(100%_-_96px)] max-w-[724px] flex-none items-center gap-2.5 rounded-full border border-line-2 bg-bg pr-2 pl-[18px] text-[15px] text-muted ${FOCUS_WITHIN}`}
        onSubmit={submit}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <input
          className={BARE_INPUT}
          value={text}
          placeholder={placeholder}
          aria-label={placeholder}
          disabled={pending}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="ml-auto grid size-[38px] place-items-center rounded-full border-0 bg-pri text-on-pri! disabled:opacity-40"
          type="submit"
          disabled={pending || text.trim() === ''}
          aria-label="Send"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}
