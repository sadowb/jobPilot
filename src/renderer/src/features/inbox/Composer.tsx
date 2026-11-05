import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { BARE_INPUT, FOCUS_WITHIN } from './styles';

const ICON = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/**
 * Bottom message pill (`.comp`). It never locks: typing stays possible while a reply streams. Enter sends,
 * Shift+Enter adds a line, Esc (or the stop button) cancels the reply in flight. `onSend` gets trimmed, non-empty text
 * and the field clears at once: the thread shows the message (and keeps it with a retry if sending fails).
 */
export function Composer({
  placeholder,
  onSend,
  onStop,
  replying = false,
  chips = [],
}: {
  placeholder: string;
  onSend: (text: string) => void;
  onStop: () => void;
  replying?: boolean;
  /** Quick replies offered while the field is empty and nothing is being written. */
  chips?: readonly string[];
}) {
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);
  const send = (value: string) => {
    const message = value.trim();
    if (!message || replying) return;
    onSend(message);
    setText('');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(text);
    } else if (e.key === 'Escape' && replying) {
      e.preventDefault();
      onStop();
    }
  };
  return (
    <div className="flex flex-none flex-col">
      {chips.length > 0 && trimmed === '' && !replying ? (
        <div
          className="mx-auto mb-2 flex w-[calc(100%_-_96px)] max-w-[724px] flex-wrap gap-2"
          aria-label="Quick replies"
        >
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="min-h-8 rounded-full border border-line-2 bg-bg px-3 text-[13px] text-ink-2 hover:border-ink"
              onClick={() => send(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className={`mx-auto mb-[18px] flex min-h-[54px] w-[calc(100%_-_96px)] max-w-[724px] flex-none items-end gap-2.5 rounded-[27px] border border-line-2 bg-bg py-2 pr-2 pl-[18px] text-[15px] text-muted ${FOCUS_WITHIN}`}
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <svg className="mb-2.5 flex-none" strokeWidth="1.8" {...ICON}>
          <path d="M12 5v14M5 12h14" />
        </svg>
        <textarea
          ref={field}
          rows={1}
          className={`${BARE_INPUT} h-auto! max-h-40 resize-none py-2 leading-[1.4]`}
          value={text}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {replying ? (
          <button
            className="grid size-[38px] flex-none place-items-center rounded-full border-0 bg-ink text-bg"
            type="button"
            aria-label="Stop reply"
            title="Stop (Esc)"
            onClick={onStop}
          >
            <svg {...ICON} fill="currentColor" strokeWidth="0">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            className="grid size-[38px] flex-none place-items-center rounded-full border-0 bg-pri text-on-pri! disabled:opacity-40"
            type="submit"
            disabled={trimmed === ''}
            aria-label="Send"
          >
            <svg strokeWidth="2.4" {...ICON}>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}
