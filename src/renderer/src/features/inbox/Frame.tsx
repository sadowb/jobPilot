import type { ReactNode } from 'react';
import { ELLIPSIS } from './styles';
import { KeyHint as KeyCap } from './KeyHint';

/** Thread header bar: avatar + title/sub on the left, actions on the right. */
export function ThreadHeader({
  lead,
  title,
  sub,
  children,
}: {
  lead: ReactNode;
  title: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-none items-center justify-between gap-4 border-b border-line bg-bg px-7 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {lead}
        <div className="min-w-0">
          <div className={`text-[15px] font-semibold ${ELLIPSIS}`}>{title}</div>
          <div className={`text-[12.5px] text-muted ${ELLIPSIS}`}>{sub}</div>
        </div>
      </div>
      <div className="flex flex-none items-center gap-2">{children}</div>
    </div>
  );
}

/** "You have control of …" bar above the thread while the owner drives. */
export function ControlBanner({ agent }: { agent: string }) {
  return (
    <div role="status" className="flex flex-none items-center gap-3 bg-pri px-7 py-3 text-on-pri">
      <span className="grid size-[26px] flex-none place-items-center rounded-full bg-on-pri text-pri">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 3l14 8-6 2-3 6z" />
        </svg>
      </span>
      <b className="text-[14.5px]">You have control of {agent} · its agent is paused</b>
      <span className="ml-auto text-[13px] whitespace-nowrap opacity-75">The rest of the crew keeps working</span>
    </div>
  );
}

export interface Shortcut {
  keys: readonly string[];
  label: string;
}

export function ShortcutBar({ shortcuts }: { shortcuts: readonly Shortcut[] }) {
  return (
    <div className="flex flex-none items-center gap-[22px] overflow-hidden border-t border-line bg-bg px-6 py-[11px] text-[12.5px] whitespace-nowrap text-muted">
      {shortcuts.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-[7px]">
          {s.keys.map((k) => (
            <KeyCap key={k}>{k}</KeyCap>
          ))}
          {s.label}
        </span>
      ))}
    </div>
  );
}
