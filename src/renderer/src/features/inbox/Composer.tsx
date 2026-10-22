import { useState, type FormEvent } from 'react';

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
    <form className="m-[0_auto_18px] max-w-[724px] w-[calc(100%_-_96px)] flex items-center gap-[10px] min-h-[54px] p-[0_8px_0_18px] [border:1px_solid_var(--line-2)] rounded-[99px] bg-bg text-muted text-[15px] flex-none focus-within:border-ink focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ink)_14%,transparent)]"  onSubmit={submit}>
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
        className="flex-1 min-w-[0px] h-[100%] [border:0] [outline:0] bg-transparent text-ink [font:inherit] p-[0px] placeholder:text-muted placeholder:opacity-100 focus-visible:outline-none!"
        value={text}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="ml-[auto] w-[38px] h-[38px] rounded-[50%] bg-pri text-on-pri! grid place-items-center [border:0]" type="submit" aria-label="Send">
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
