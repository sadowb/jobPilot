import type { ReactNode } from 'react';
import { KeyCap } from '../../../components/KeyCap';
import { Btn } from '../Btn';
import { STATUS_CHIP, type JobStatus } from '../../cmdk/jobs';

export type SetBy = 'email' | 'agent' | 'you';

const SET_BY: Record<SetBy, { label: string; dot: string }> = {
  email: { label: 'set by email', dot: 'bg-work' },
  agent: { label: 'set by agent', dot: 'bg-muted' },
  you: { label: 'set by you', dot: 'bg-brand' },
};

/** "set by email / agent / you": who made an automatic change. Provenance is always shown, never colour-only. */
export function SetByChip({ by }: { by: SetBy }) {
  const s = SET_BY[by];
  return (
    <span className="inline-flex flex-none items-center gap-1.5 rounded-full border border-line-2 py-[3px] pr-[9px] pl-[7px] font-mono text-[11px] whitespace-nowrap text-ink-2">
      <i className={`size-1.5 flex-none rounded-full ${s.dot}`}></i>
      {s.label}
    </span>
  );
}

const PILL = 'inline-block rounded-full px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap';

/** Colours come from the job-status table in `cmdk/jobs`, so they stay dynamic (inline) here. */
export function StatusPill({ status }: { status: JobStatus }) {
  const c = STATUS_CHIP[status];
  return (
    <span className={PILL} style={{ color: c.color, background: c.background }}>
      {status}
    </span>
  );
}

/** Neutral pill for states that are not a job status (e.g. "Back in Up next"). */
export function NeutralPill({ children }: { children: ReactNode }) {
  return <span className={`${PILL} bg-line text-muted`}>{children}</span>;
}

export function Icon({
  size = 16,
  children,
  strokeWidth = 1.8,
}: {
  size?: number;
  children: ReactNode;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="block flex-none"
    >
      {children}
    </svg>
  );
}

export function DonePill({ children }: { children: ReactNode }) {
  return (
    <span className="flex flex-none items-center gap-[5px] rounded-full bg-brand-tint py-[3px] pr-2.5 pl-2 text-[12px] font-semibold whitespace-nowrap text-brand-text">
      <Icon size={12} strokeWidth={2.6}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </Icon>
      {children}
    </span>
  );
}

export function UndoButton() {
  return (
    <Btn size="sm" variant="ghost">
      <Icon>
        <path d="M9 14L4 9l5-5" />
        <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
      </Icon>
      Undo <KeyCap>⌘Z</KeyCap>
    </Btn>
  );
}

const BOX = 'flex min-w-0 flex-col gap-2 rounded-2xl px-3 py-2.5';
const SPEC = 'font-mono text-[10.5px] tracking-[0.06em]';

export function BeforeBox({ children }: { children: ReactNode }) {
  return (
    <div className={`${BOX} border border-line bg-panel`}>
      <span className={`${SPEC} text-muted`}>BEFORE · AUTO</span>
      {children}
    </div>
  );
}

export function AfterBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`${BOX} border border-brand bg-bg`}>
      <span className={`${SPEC} text-brand-text`}>AFTER · SET BY YOU · {label}</span>
      {children}
    </div>
  );
}

export const Note = ({ children }: { children: ReactNode }) => (
  <span className="text-[12px] leading-[1.4] text-muted">{children}</span>
);

export const ItemTitle = ({ children }: { children: ReactNode }) => (
  <div className="min-w-0 truncate text-[13.5px] font-semibold">{children}</div>
);

export const WrapRow = ({ children }: { children: ReactNode }) => (
  <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5">{children}</div>
);

export function FixCard({
  n,
  by,
  title,
  body,
  before,
  after,
}: {
  n: string;
  by: SetBy;
  title: string;
  body: string;
  before: ReactNode;
  after: ReactNode;
}) {
  return (
    <div className="row-[span_5] grid min-w-0 grid-rows-subgrid gap-y-2.5 rounded-[22px] border border-line bg-bg p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11.5px] tracking-[0.06em] text-muted">{n}</span>
        <SetByChip by={by} />
      </div>
      <div>
        <div className="text-[15.5px] leading-[1.25] font-[650]">{title}</div>
        <div className="mt-1 text-[13px] leading-[1.45] text-muted">{body}</div>
      </div>
      {before}
      <div aria-hidden="true" className="text-center font-mono text-[11px] leading-none tracking-[0.02em] text-muted">
        ↓
      </div>
      {after}
    </div>
  );
}
