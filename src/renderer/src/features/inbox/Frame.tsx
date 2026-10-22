import type { ReactNode } from 'react';
import { KeyCap } from '../../components/KeyCap';

const ELLIPSIS = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

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
    <div
      className="flex items-center gap-[16px] flex-nowrap justify-between flex-none p-[16px_28px] [border-bottom:1px_solid_var(--line)] bg-bg min-w-[0px]"
      
    >
      <div className="flex items-center gap-[12px] flex-nowrap min-w-[0px]" >
        {lead}
        <div className="min-w-[0px]">
          <div className="font-[600] text-[15px] whitespace-nowrap overflow-hidden text-ellipsis" >
            {title}
          </div>
          <div className="text-[12.5px] text-muted whitespace-nowrap overflow-hidden text-ellipsis" >
            {sub}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-[8px] flex-nowrap flex-none" >
        {children}
      </div>
    </div>
  );
}

/** "You have control of …" bar above the thread while the owner drives. */
export function ControlBanner({ agent }: { agent: string }) {
  return (
    <div
      className="flex items-center gap-[12px] flex-nowrap flex-none p-[12px_28px] bg-pri text-on-pri"
      role="status"
      
    >
      <span
        className="w-[26px] h-[26px] rounded-[50%] grid place-items-center bg-on-pri text-pri flex-none"
      >
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
      <span className="text-[13px] opacity-[0.75] ml-[auto] whitespace-nowrap">
        The rest of the crew keeps working
      </span>
    </div>
  );
}

export interface Shortcut {
  keys: readonly string[];
  label: string;
}

export function ShortcutBar({ shortcuts }: { shortcuts: readonly Shortcut[] }) {
  return (
    <div
      className="flex-none flex items-center gap-[22px] p-[11px_24px] [border-top:1px_solid_var(--line)] bg-bg text-[12.5px] text-muted whitespace-nowrap overflow-hidden"
    >
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
