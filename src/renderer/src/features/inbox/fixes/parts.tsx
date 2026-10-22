import type { CSSProperties, ReactNode } from 'react';
import { KeyCap } from '../../../components/KeyCap';
import { STATUS_CHIP, type JobStatus } from '../../cmdk/jobs';

export type SetBy = 'email' | 'agent' | 'you';

const SET_BY: Record<SetBy, { label: string; dot: string }> = {
  email: { label: 'set by email', dot: 'var(--work)' },
  agent: { label: 'set by agent', dot: 'var(--muted)' },
  you: { label: 'set by you', dot: 'var(--brand)' },
};

/** "set by email / agent / you": who made an automatic change. Provenance is always shown, never colour-only. */
export function SetByChip({ by }: { by: SetBy }) {
  const s = SET_BY[by];
  return (
    <span
      className="flex-nowrap inline-flex items-center gap-[6px] font-mono text-[11px] text-ink-2 [border:1px_solid_var(--line-2)] rounded-[99px] p-[3px_9px_3px_7px] whitespace-nowrap flex-none"
      
    >
      <i style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flex: 'none' }}></i>
      {s.label}
    </span>
  );
}

const PILL: CSSProperties = {
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 99,
  padding: '3px 10px',
  whiteSpace: 'nowrap',
};

export function StatusPill({ status }: { status: JobStatus }) {
  const c = STATUS_CHIP[status];
  return <span style={{ ...PILL, color: c.color, background: c.background }}>{status}</span>;
}

/** Neutral pill for states that are not a job status (e.g. "Back in Up next"). */
export function NeutralPill({ children }: { children: ReactNode }) {
  return <span className="inline-block text-[12px] font-[600] rounded-[99px] p-[3px_10px] whitespace-nowrap text-muted bg-line">{children}</span>;
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
      className="flex-none block"
    >
      {children}
    </svg>
  );
}

export function DonePill({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex items-center gap-[5px] flex-nowrap text-[12px] font-[600] text-brand-text bg-brand-tint rounded-[99px] p-[3px_10px_3px_8px] whitespace-nowrap flex-none"
      
    >
      <Icon size={12} strokeWidth={2.6}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </Icon>
      {children}
    </span>
  );
}

export function UndoButton() {
  return (
    <button className="btn sm ghost" type="button">
      <Icon>
        <path d="M9 14L4 9l5-5" />
        <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
      </Icon>
      Undo <KeyCap>⌘Z</KeyCap>
    </button>
  );
}

const BOX: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  borderRadius: 16,
  padding: '10px 12px',
  minWidth: 0,
};

const SPEC: CSSProperties = { fontSize: 10.5, letterSpacing: '.06em' };

export function BeforeBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[8px] rounded-[16px] p-[10px_12px] min-w-[0px] [border:1px_solid_var(--line)] bg-panel">
      <span className="font-mono text-[10.5px] text-muted tracking-[.06em]" >
        BEFORE · AUTO
      </span>
      {children}
    </div>
  );
}

export function AfterBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[8px] rounded-[16px] p-[10px_12px] min-w-[0px] [border:1px_solid_var(--brand)] bg-bg">
      <span className="font-mono text-[10.5px] text-brand-text tracking-[.06em]" >
        AFTER · SET BY YOU · {label}
      </span>
      {children}
    </div>
  );
}

export const Note = ({ children }: { children: ReactNode }) => (
  <span className="text-[12px] text-muted leading-[1.4]" >
    {children}
  </span>
);

export const ItemTitle = ({ children }: { children: ReactNode }) => (
  <div
    className="text-[13.5px] font-[600] overflow-hidden text-ellipsis whitespace-nowrap min-w-[0px]"
  >
    {children}
  </div>
);

export const WrapRow = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-[6px_8px] flex-wrap justify-between min-w-[0px]" >
    {children}
  </div>
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
    <div
      className="bg-bg [border:1px_solid_var(--line)] rounded-[22px] p-[16px] grid grid-rows-[subgrid] row-[span_5] gap-y-[10px] min-w-[0px]"
    >
      <div className="flex items-center gap-[8px] flex-nowrap justify-between" >
        <span className="font-mono text-[11.5px] text-muted tracking-[.06em]" >
          {n}
        </span>
        <SetByChip by={by} />
      </div>
      <div>
        <div className="font-[650] text-[15.5px] leading-[1.25]">{title}</div>
        <div className="text-[13px] text-muted leading-[1.45] mt-[4px]" >
          {body}
        </div>
      </div>
      {before}
      <div
        className="font-mono text-[11px] text-muted tracking-[.06em] text-center leading-[1]"
        aria-hidden="true"
        
      >
        ↓
      </div>
      {after}
    </div>
  );
}
