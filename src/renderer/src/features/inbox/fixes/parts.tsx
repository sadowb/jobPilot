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
      className="nw"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--mono)',
        fontSize: 11,
        color: 'var(--ink-2)',
        border: '1px solid var(--line-2)',
        borderRadius: 99,
        padding: '3px 9px 3px 7px',
        whiteSpace: 'nowrap',
        flex: 'none',
      }}
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
  return <span style={{ ...PILL, color: 'var(--muted)', background: 'var(--line)' }}>{children}</span>;
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
      style={{ flex: 'none', display: 'block' }}
    >
      {children}
    </svg>
  );
}

export function DonePill({ children }: { children: ReactNode }) {
  return (
    <span
      className="row nw"
      style={{
        gap: 5,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--brand-text)',
        background: 'var(--brand-tint)',
        borderRadius: 99,
        padding: '3px 10px 3px 8px',
        whiteSpace: 'nowrap',
        flex: 'none',
      }}
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
    <div style={{ ...BOX, border: '1px solid var(--line)', background: 'var(--panel)' }}>
      <span className="spec" style={{ ...SPEC, color: 'var(--muted)' }}>
        BEFORE · AUTO
      </span>
      {children}
    </div>
  );
}

export function AfterBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ ...BOX, border: '1px solid var(--brand)', background: 'var(--bg)' }}>
      <span className="spec" style={{ ...SPEC, color: 'var(--brand-text)' }}>
        AFTER · SET BY YOU · {label}
      </span>
      {children}
    </div>
  );
}

export const Note = ({ children }: { children: ReactNode }) => (
  <span className="s" style={{ fontSize: 12, lineHeight: 1.4 }}>
    {children}
  </span>
);

export const ItemTitle = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      fontSize: 13.5,
      fontWeight: 600,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      minWidth: 0,
    }}
  >
    {children}
  </div>
);

export const WrapRow = ({ children }: { children: ReactNode }) => (
  <div className="row sp" style={{ gap: '6px 8px', minWidth: 0, flexWrap: 'wrap' }}>
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
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        borderRadius: 22,
        padding: 16,
        display: 'grid',
        gridTemplateRows: 'subgrid',
        gridRow: 'span 5',
        rowGap: 10,
        minWidth: 0,
      }}
    >
      <div className="row sp nw" style={{ gap: 8 }}>
        <span className="spec" style={{ letterSpacing: '.06em' }}>
          {n}
        </span>
        <SetByChip by={by} />
      </div>
      <div>
        <div style={{ fontWeight: 650, fontSize: 15.5, lineHeight: 1.25 }}>{title}</div>
        <div className="s" style={{ fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>
          {body}
        </div>
      </div>
      {before}
      <div
        className="spec"
        aria-hidden="true"
        style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, lineHeight: 1 }}
      >
        ↓
      </div>
      {after}
    </div>
  );
}
