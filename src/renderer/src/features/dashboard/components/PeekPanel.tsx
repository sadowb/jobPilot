import type { CSSProperties } from 'react';
import { V17AgentBot } from '../../../components/V17AgentBot';
import { V17Kbd } from '../../../components/V17Kbd';
import { V17MiniPaper } from '../../../components/V17MiniPaper';
import { V17StatusChip } from '../../../components/V17StatusChip';
import { longDate, shortDate } from '../format';
import { STATUS_META } from '../status';
import type { Application, TimelineEvent } from '../types';

const factCell: CSSProperties = { padding: '4px 0 3px', borderTop: '1px solid var(--line)', minWidth: 0 };
const factLabel: CSSProperties = { fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase' };
const factValue: CSSProperties = { fontSize: 13, lineHeight: 1.3, marginTop: 1 };
const dot: CSSProperties = { position: 'absolute', left: 0, top: 6, width: 9, height: 9, borderRadius: '50%' };

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <div style={factCell}>
      <div className="spec" style={factLabel}>
        {label}
      </div>
      <div className="cut" style={factValue}>
        {children}
      </div>
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map((ev, i) => (
        <div key={i} style={{ position: 'relative', paddingLeft: 20 }}>
          {i < events.length - 1 && (
            <i style={{ position: 'absolute', left: 4, top: 15, bottom: -12, width: 1.5, background: 'var(--line)' }} />
          )}
          <i
            style={{
              ...dot,
              background: ev.tone === 'screening' ? 'var(--st-teal-fg)' : 'var(--muted)',
              boxShadow: '0 0 0 3px var(--bg)',
            }}
          />
          <div className="row sp nw" style={{ gap: 10, fontSize: 13, lineHeight: '20px' }}>
            <span className="cut">{ev.title}</span>
            {ev.undoLabel && (
              <a
                href="#"
                style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'underline', whiteSpace: 'nowrap' }}
              >
                {ev.undoLabel}
              </a>
            )}
          </div>
          <div className="s" style={{ fontSize: 12, lineHeight: '16px' }}>
            {shortDate(ev.on)} · {ev.by === 'the agent' ? 'by the agent' : `set by ${ev.by}`}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Docked inspector for the selected application (400px, right of the table). It is the only place that shows
 * the exact CV that was sent, and the entry point to the full-size viewer.
 */
export function PeekPanel({
  app,
  position,
  total,
  canUndo,
  onClose,
  onUndo,
  onOpenCv,
  onOpenPosting,
}: {
  app: Application;
  position: number;
  total: number;
  canUndo: boolean;
  onClose: () => void;
  onUndo: () => void;
  onOpenCv: () => void;
  onOpenPosting: () => void;
}) {
  const meta = STATUS_META[app.status];
  const d = app.detail;
  const timeline: TimelineEvent[] =
    d.timeline.length > 0
      ? d.timeline
      : [{ title: `Submitted by the ${app.company} agent`, on: app.appliedOn, by: 'the agent', tone: 'neutral' }];
  return (
    <aside
      aria-label="Application peek"
      className="pkr"
      style={{
        width: 400,
        flex: 'none',
        boxSizing: 'border-box',
        padding: '18px 24px 24px',
        borderLeft: '1px solid var(--line)',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div className="row sp nw" style={{ flex: 'none' }}>
        <span className="spec">
          Peek · {position} of {total}
        </span>
        <span className="row nw" style={{ gap: 8 }}>
          <span className="row nw s" style={{ gap: 4, fontSize: 12 }}>
            <V17Kbd>J</V17Kbd>
            <V17Kbd>K</V17Kbd>
          </span>
          <button
            type="button"
            aria-label="Close peek"
            onClick={onClose}
            style={{
              flex: 'none',
              width: 28,
              height: 28,
              borderRadius: 99,
              border: 0,
              background: 'var(--hover)',
              color: 'var(--ink-2)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              padding: 0,
            }}
          >
            ✕
          </button>
        </span>
      </div>
      <div
        className="pkbody"
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <div className="row nw" style={{ gap: 14, alignItems: 'center' }}>
          <V17AgentBot name={app.company} state={app.agent} size={44} />
          <div style={{ minWidth: 0 }}>
            <div className="h2" style={{ fontSize: 22, lineHeight: 1.15 }}>
              {app.role}
            </div>
            <div className="s" style={{ fontSize: 13, marginTop: 3 }}>
              {app.company} · {app.location} · {app.site}
            </div>
          </div>
        </div>
        <div>
          <div className="row nw" style={{ gap: 8 }}>
            <V17StatusChip fg={meta.fg} bg={meta.bg}>
              {meta.longLabel}
            </V17StatusChip>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flex: 'none' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <div className="row nw s" style={{ gap: 8, fontSize: 12.5, marginTop: 6 }}>
            set by {app.statusSource} · {shortDate(app.statusSetOn)}
            <span style={{ flex: 1 }} />
            {canUndo && (
              <button
                className="btn sm"
                type="button"
                onClick={onUndo}
                style={{ minHeight: 28, padding: '0 12px', fontSize: 12.5 }}
              >
                Undo
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', columnGap: 20 }}>
          <Fact label="Applied">{longDate(app.appliedOn)}</Fact>
          <Fact label="Location">{app.location}</Fact>
          <Fact label="Remote / on-site">{app.workMode}</Fact>
          <Fact label="Type">{d.jobType}</Fact>
          <Fact label="Level">{d.level}</Fact>
          <Fact label="Salary">{app.salary}</Fact>
          <Fact label="Applied via">{`JobPilot · ${app.site}`}</Fact>
          <Fact label="CV used">{d.cvName}</Fact>
          <Fact label="Follow up">{d.followUpOn ? shortDate(d.followUpOn) : '—'}</Fact>
          <Fact label="Sponsorship">{d.sponsorship}</Fact>
        </div>
        <div
          className="row nw"
          style={{
            gap: 14,
            padding: '8px 12px 8px 10px',
            border: '1px solid var(--line)',
            borderRadius: 18,
            alignItems: 'center',
          }}
        >
          <V17MiniPaper />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3 }}>
              Sent {shortDate(app.appliedOn)} · {d.cvName}
            </div>
            <div className="s" style={{ fontSize: 12 }}>
              {d.cvMeta}
            </div>
            <div className="row nw" style={{ gap: 8, marginTop: 4 }}>
              <button className="btn pri sm" type="button" style={{ minHeight: 30 }} onClick={onOpenCv}>
                View full size
              </button>
            </div>
            <a
              href="#"
              style={{
                fontSize: 12.5,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                color: 'var(--ink-2)',
                marginTop: 2,
              }}
            >
              Compare with current
            </a>
          </div>
        </div>
        <div>
          <div className="row sp nw" style={{ marginBottom: 4 }}>
            <span className="eyebrow">About the job</span>
            <a href="#" className="s" style={{ fontSize: 12, textDecoration: 'underline' }}>
              Full description
            </a>
          </div>
          <div className="s" style={{ lineHeight: 1.55, fontSize: 12.5, color: 'var(--ink-2)' }}>
            {d.description}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Your notes
          </div>
          <div
            className="inp"
            style={{ height: 34, borderRadius: 12, fontSize: 13, color: d.notes ? 'var(--ink)' : 'var(--muted)' }}
          >
            {d.notes || 'Add a note'}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Timeline
          </div>
          <Timeline events={timeline} />
        </div>
      </div>
      <div className="row nw" style={{ flex: 'none', gap: 8, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
        <button className="btn sm grow" type="button" onClick={onOpenPosting}>
          Open posting · O
        </button>
        <button className="btn sm grow" type="button">
          Answers sent
        </button>
      </div>
    </aside>
  );
}
