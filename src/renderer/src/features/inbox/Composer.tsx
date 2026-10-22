import { useState, type FormEvent } from 'react';
import { BARE_INPUT, FOCUS_WITHIN } from './styles';

/** Bottom message pill (`.comp`). `onSend` receives trimmed, non-empty text only. */
export function Composer({ placeholder, onSend }: { placeholder: string; onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };
  return (
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
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="ml-auto grid size-[38px] place-items-center rounded-full border-0 bg-pri text-on-pri!"
        type="submit"
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
  );
}
