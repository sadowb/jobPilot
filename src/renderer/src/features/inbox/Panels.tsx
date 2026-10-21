import { useState, type CSSProperties, type ReactNode } from 'react';
import { CapOnDartArt } from '../../components/CapOnDartArt';
import { CritterBot } from '../../components/CritterBot';
import { KeyCap } from '../../components/KeyCap';
import { MonoLabel } from '../../components/MonoLabel';
import { useLiveTabView } from './browserSeam';
import { CLEAR_STATS, PILOT_RULES, UP_NEXT } from './model';
import { FIGMA_REVIEW } from './sampleReview';

const PANEL: CSSProperties = {
  position: 'relative',
  background: 'var(--bg)',
  borderLeft: '1px solid var(--line)',
  padding: '22px 24px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
};

export function PanelFrame({ children }: { children: ReactNode }) {
  return <aside style={PANEL}>{children}</aside>;
}

// ---------------------------------------------------------------- Figma review

function Collapsible({
  label,
  summary,
  defaultOpen = false,
}: {
  label: string;
  summary: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        flex: 'none',
        borderTop: '1px solid var(--line)',
        paddingTop: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <button
        type="button"
        className="row sp nw"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ background: 'none', border: 0, padding: 0, width: '100%', textAlign: 'left' }}
      >
        <span className="eyebrow" style={{ fontSize: 11 }}>
          {label}
        </span>
        <span className="s" style={{ fontSize: 12.5 }}>
          {open ? 'Hide ▴' : 'Show ▾'}
        </span>
      </button>
      <div
        className="s"
        style={{
          fontSize: 13,
          ...(open ? {} : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
        }}
      >
        {summary}
      </div>
    </div>
  );
}

function CvThumb() {
  const line = (key: number, w: string, h = 3, bg = 'rgb(168 163 144)') => (
    <i key={key} style={{ height: h, width: w, borderRadius: 2, background: bg, display: 'block' }}></i>
  );
  return (
    <div
      aria-hidden="true"
      style={{
        width: 54,
        height: 72,
        flex: 'none',
        borderRadius: 6,
        border: '1px solid rgb(228 224 214)',
        background: 'rgb(255 255 255)',
        padding: '8px 7px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        boxShadow: '0 1px 2px rgb(0 0 0/.08)',
      }}
    >
      {line(0, '55%', 6, 'rgb(17 17 17)')}
      {['92%', '100%', '84%', '96%', '70%', '100%', '88%'].map((w, i) => line(i + 1, w))}
    </div>
  );
}

export interface ReviewPanelProps {
  /** Current word count of the draft. */
  words: number;
  editing: boolean;
  onAccept: () => void;
  onToggleEdit: () => void;
}

/** Right column while reviewing the Figma draft: exactly what the form will receive. */
export function ReviewPanel({ words, editing, onAccept, onToggleEdit }: ReviewPanelProps) {
  const r = FIGMA_REVIEW;
  return (
    <PanelFrame>
      <div className="row sp nw" style={{ flex: 'none' }}>
        <span className="eyebrow">What will be sent · {r.fieldCount}</span>
        <span className="s" style={{ fontSize: 12.5 }}>
          {r.site}
        </span>
      </div>
      <div className="s" style={{ flex: 'none', fontSize: 12.5, lineHeight: 1.5, marginTop: -6 }}>
        Exactly what the form receives. Nothing is sent until you accept.
      </div>
      <div
        className="mcell"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, flex: 'none' }}
      >
        <CvThumb />
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.cv.name}</div>
          <div className="s" style={{ fontSize: 12.5 }}>
            {r.cv.meta}
          </div>
          <div className="s" style={{ fontSize: 12.5, textDecoration: 'underline', marginTop: 4 }}>
            Change CV before sending
          </div>
        </div>
      </div>
      <div
        style={{
          flex: 'none',
          border: '1.5px solid var(--need-line)',
          background: 'var(--need-tint)',
          borderRadius: 18,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div className="row sp nw">
          <span className="st need" style={{ height: 24, fontSize: 12, padding: '0 10px 0 8px' }}>
            Draft to review
          </span>
          <span className="s" style={{ fontSize: 12 }}>
            1 of {r.fieldCount} fields
          </span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.question}</div>
        <div className="s" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
          Cap’s draft, {words} words. Accept it, edit it, or skip it.
        </div>
        <div className="row nw" style={{ gap: 8, marginTop: 2 }}>
          <button className="btn sm pri" type="button" onClick={onAccept}>
            Accept <KeyCap>↵</KeyCap>
          </button>
          <button className="btn sm" type="button" onClick={onToggleEdit}>
            {editing ? 'Done' : 'Edit'} <KeyCap>E</KeyCap>
          </button>
        </div>
      </div>
      <Collapsible label={`Filled from profile · ${r.filled.length}`} summary={r.filled.join(', ')} />
      <Collapsible label={`Files · ${r.files.length}`} summary={`${r.files.join(', ')} · ${r.filesNote}`} />
      <div
        style={{
          flex: 'none',
          borderTop: '1px solid var(--line)',
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div className="row sp nw">
          <span className="eyebrow" style={{ fontSize: 11 }}>
            Saved answers · {r.saved.length}
          </span>
          <span className="s" style={{ fontSize: 12.5 }}>
            Hide ▴
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {r.saved.map((a) => (
            <div key={a.label} className="row sp nw" style={{ gap: 10, fontSize: 13.5, minWidth: 0 }}>
              <span className="s" style={{ whiteSpace: 'nowrap' }}>
                {a.label}
              </span>
              {a.note ? (
                <span className="row nw" style={{ gap: 6, whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: 'var(--ink-2)',
                      border: '1px dashed var(--line-2)',
                      borderRadius: 8,
                      padding: '1px 8px',
                    }}
                  >
                    {a.value}
                  </span>
                  <MonoLabel style={{ color: 'var(--need)' }}>{a.note}</MonoLabel>
                </span>
              ) : (
                <span>{a.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="row nw" style={{ flex: 'none', gap: 8, marginTop: 'auto' }}>
        <button className="btn sm grow" type="button">
          Open CV
        </button>
        <button className="btn sm pri grow" type="button" onClick={onAccept}>
          Accept and fill
        </button>
      </div>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------- Notion consent (derived: no board)

export function ConsentPanel({ onAnswer }: { onAnswer: (allow: boolean) => void }) {
  return (
    <PanelFrame>
      <div className="row sp nw" style={{ flex: 'none' }}>
        <span className="eyebrow">What Cap needs · 1</span>
        <span className="s" style={{ fontSize: 12.5 }}>
          Notion · Ashby
        </span>
      </div>
      <div
        style={{
          flex: 'none',
          border: '1.5px solid var(--need-line)',
          background: 'var(--need-tint)',
          borderRadius: 18,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span
          className="st need"
          style={{ height: 24, fontSize: 12, padding: '0 10px 0 8px', alignSelf: 'flex-start' }}
        >
          Consent
        </span>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>Allow an AI notetaker in your Oct 23 interview?</div>
        <div className="s" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
          Cap won’t answer this for you. Nothing is sent until you choose.
        </div>
        <div className="row nw" style={{ gap: 8, marginTop: 2 }}>
          <button className="btn sm pri" type="button" onClick={() => onAnswer(true)}>
            Allow
          </button>
          <button className="btn sm" type="button" onClick={() => onAnswer(false)}>
            Don’t allow
          </button>
        </div>
      </div>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------- Cap pilot

const CHIP: CSSProperties = {
  gap: 7,
  padding: '7px 12px',
  borderRadius: 99,
  fontSize: 13,
  whiteSpace: 'nowrap',
};

export function PilotPanel() {
  return (
    <PanelFrame>
      <div className="row sp nw">
        <span className="eyebrow" style={{ fontSize: 11 }}>
          Rules · {PILOT_RULES.filter((r) => !r.suggested).length}
        </span>
        <button className="btn sm ghost" type="button">
          Add rule
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {PILOT_RULES.map((rule) => (
          <span
            key={rule.text}
            className="row nw"
            style={
              rule.suggested
                ? { ...CHIP, border: '1px dashed var(--brand)', background: 'var(--brand-tint)' }
                : { ...CHIP, border: '1px solid var(--line-2)', background: 'var(--bg)' }
            }
          >
            <i style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)', display: 'block' }}></i>
            {rule.text}
            {rule.suggested && (
              <>
                {' '}
                <MonoLabel style={{ color: 'var(--brand-text)' }}>suggested</MonoLabel>
              </>
            )}
          </span>
        ))}
      </div>
      <div
        style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <span className="eyebrow" style={{ fontSize: 11 }}>
          What Cap can do
        </span>
        <div className="s" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Add jobs · create and edit rules · change crew size · answer from Analytics · write the brief · open any job
        </div>
      </div>
      <div
        style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <span className="eyebrow" style={{ fontSize: 11 }}>
          What Cap remembers
        </span>
        <div className="s" style={{ fontSize: 13, lineHeight: 1.6 }}>
          42 profile keys · 27 facts · 182 saved answers · 9 pilot notes. Stored records, not chat history.
        </div>
      </div>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------- live tab (take over)

function FilledField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <MonoLabel>{label}</MonoLabel>
      <div
        className="row sp nw"
        style={{
          height: 34,
          padding: '0 11px',
          border: '1px solid var(--line-2)',
          borderRadius: 9,
          fontSize: 13.5,
          background: 'var(--bg)',
        }}
      >
        <span>{value}</span>
        <span style={{ color: 'var(--brand-text)', fontWeight: 700 }}>✓</span>
      </div>
    </div>
  );
}

/** Built-in sample of the stuck Brex tab (V17_TakeOver). Replaced by the live view through browserSeam. */
function TabSnapshot({ driving }: { driving: boolean }) {
  return (
    <div
      style={{
        flex: 'none',
        border: '1px solid var(--line-2)',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'var(--bg)',
        boxShadow: 'var(--float)',
      }}
    >
      <div
        className="row nw"
        style={{ gap: 7, padding: '10px 12px', borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}
      >
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--line-2)', display: 'block' }}
          ></i>
        ))}
        <span
          style={{
            marginLeft: 6,
            flex: 1,
            minWidth: 0,
            fontFamily: 'var(--mono)',
            fontSize: 11.5,
            color: 'var(--muted)',
            height: 24,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            borderRadius: 99,
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          job-boards.greenhouse.io/brex/jobs/81…
        </span>
      </div>
      <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1.1 }}>Software Engineer, New Grad</div>
          <div className="s" style={{ fontSize: 12.5 }}>
            Brex · New York, NY
          </div>
        </div>
        <FilledField label="Full name" value="Abdelhadi Marjane" />
        <FilledField label="Email" value="a•••••98@gmail.com" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative' }}>
          <MonoLabel>Education *</MonoLabel>
          <div
            className="row sp nw"
            style={{
              height: 34,
              padding: '0 11px',
              border: '1.5px solid var(--bad)',
              borderRadius: 9,
              fontSize: 13.5,
              color: 'var(--muted)',
              background: 'var(--bg)',
            }}
          >
            <span>Select…</span>
            <span>▾</span>
          </div>
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 12.5,
              color: 'var(--muted)',
              background: 'var(--panel)',
            }}
          >
            No options loaded · <u>retry</u>
          </div>
          {driving && (
            <>
              <svg
                style={{ position: 'absolute', left: '56%', top: 44 }}
                width="22"
                height="22"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z"
                  fill="var(--ink)"
                  stroke="var(--bg)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  left: 'calc(56% + 20px)',
                  top: 50,
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: 'var(--pri)',
                  color: 'var(--on-pri)',
                }}
              >
                you
              </span>
            </>
          )}
        </div>
        <FilledField label="Resume" value="AI / ML CV v4.pdf" />
        <div className="btn" style={{ justifyContent: 'center', opacity: 0.4, marginTop: 4 }}>
          Submit application
        </div>
      </div>
    </div>
  );
}

const DRIVE_BTN: CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: 99,
  cursor: 'pointer',
  background: 'transparent',
  color: 'inherit',
  border: '1px solid currentColor',
};

export interface LiveTabPanelProps {
  itemId: string;
  agent: string;
  driving: boolean;
  onHandBack: () => void;
  onFinish: () => void;
}

/** Right column for a stuck job's tab. `driving` adds the owner's cursor and the hand-back bar. */
export function LiveTabPanel({ itemId, agent, driving, onHandBack, onFinish }: LiveTabPanelProps) {
  const slot = useLiveTabView();
  const live = slot.render({ itemId, url: 'https://job-boards.greenhouse.io/brex/jobs/81', driving });
  return (
    <PanelFrame>
      <div className="row sp nw" style={{ flex: 'none' }}>
        <span className="eyebrow v17live">Live · {agent} tab</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}>1 s ago · 2 s refresh</span>
      </div>
      {live ?? <TabSnapshot driving={driving} />}
      <div className="s" style={{ flex: 'none', fontSize: 12.5, lineHeight: 1.5 }}>
        A screenshot, not video. When you hand back, the agent re-reads this page before its next step.
      </div>
      {driving && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '6px 6px 6px 16px',
            borderRadius: 99,
            background: 'var(--pri)',
            color: 'var(--on-pri)',
            boxShadow: 'var(--float)',
            whiteSpace: 'nowrap',
            zIndex: 4,
          }}
        >
          <b style={{ fontSize: 13.5 }}>You’re driving</b>
          <button type="button" style={DRIVE_BTN} onClick={onHandBack}>
            Hand back&nbsp;<KeyCap>H</KeyCap>
          </button>
          <button
            type="button"
            style={{ ...DRIVE_BTN, background: 'var(--on-pri)', color: 'var(--pri)', borderColor: 'var(--on-pri)' }}
            onClick={onFinish}
          >
            I’ll finish it
          </button>
        </div>
      )}
    </PanelFrame>
  );
}

// ---------------------------------------------------------------- all clear

export function UpNextPanel() {
  return (
    <PanelFrame>
      <MonoLabel>Up next · {CLEAR_STATS[1].value}</MonoLabel>
      {UP_NEXT.map((q) => (
        <div
          key={q.agent}
          className="row nw"
          style={{ gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', flex: 'none' }}
        >
          <CritterBot agent={q.agent} state={q.critter} size={34} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
              <b style={{ fontWeight: 600 }}>{q.agent}</b>
              <span className="s" style={{ fontSize: 12.5 }}>
                {' '}
                · {q.site}
              </span>
            </div>
            <div
              className="s"
              style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {q.role}
            </div>
          </div>
          <span className="s" style={{ fontSize: 12, flex: 'none' }}>
            {q.status}
          </span>
        </div>
      ))}
      <div
        style={{
          flex: 'none',
          borderTop: '1px solid var(--line)',
          paddingTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ display: 'inline-flex' }}>
          {UP_NEXT.filter((q) => q.critter === 'work').map((q, i) => (
            <span key={q.agent} style={{ marginLeft: i === 0 ? 0 : -10, display: 'inline-flex', borderRadius: '50%' }}>
              <CritterBot agent={q.agent} state="work" size={26} />
            </span>
          ))}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>2 working · 7 queued</div>
          <div className="s" style={{ fontSize: 12.5 }}>
            Open Up next to reorder or hold
          </div>
        </div>
      </div>
    </PanelFrame>
  );
}

export function ClearCenter({ onDashboard, onAddJobs }: { onDashboard: () => void; onAddJobs: () => void }) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        padding: '32px 48px',
        minWidth: 0,
        minHeight: 0,
        background: 'var(--ground)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 'min(600px,100%)',
          height: 300,
          borderRadius: 28,
          border: '1px solid var(--line)',
          background: 'var(--bg)',
          overflow: 'hidden',
          flex: 'none',
        }}
      >
        <svg
          viewBox="0 0 600 300"
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0 }}
          aria-hidden="true"
        >
          <path
            className="v17path"
            d="M-20 236 C 110 214, 190 120, 300 150 S 470 58, 620 46"
            fill="none"
            stroke="var(--line-2)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2 10"
          />
          <ellipse cx="96" cy="72" rx="48" ry="13" fill="var(--panel)" />
          <ellipse cx="500" cy="236" rx="62" ry="14" fill="var(--panel)" />
        </svg>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <div className="v17fly">
            <CapOnDartArt size={190} flying />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div className="eyebrow">Inbox · all clear</div>
        <h1 className="h1" style={{ fontSize: 64 }}>
          All clear, <span className="it">for now.</span>
        </h1>
        <p className="s" style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
          Nothing needs you. The crew is filling 2 applications with 7 more lined up. I’ll flag the next question the
          moment it comes in.
        </p>
      </div>
      <div className="row nw" style={{ gap: 12, width: 'min(560px,100%)' }}>
        {CLEAR_STATS.map((s) => (
          <div
            key={s.label}
            className="mcell"
            style={{ flex: 1, gap: 4, padding: '16px 18px', alignItems: 'flex-start' }}
          >
            <MonoLabel>{s.label}</MonoLabel>
            <b style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 34, lineHeight: 1 }}>{s.value}</b>
          </div>
        ))}
      </div>
      <div className="row nw" style={{ gap: 10, justifyContent: 'center' }}>
        <button className="btn pri" type="button" onClick={onDashboard}>
          Back to Dashboard
        </button>
        <button className="btn" type="button" onClick={onAddJobs}>
          Add jobs&nbsp;<KeyCap>⌘V</KeyCap>
        </button>
      </div>
    </section>
  );
}
