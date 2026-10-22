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
  return <aside className="relative bg-bg [border-left:1px_solid_var(--line)] p-[22px_24px_28px] flex flex-col gap-[18px] min-w-[0px] min-h-[0px] overflow-hidden">{children}</aside>;
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
      className="flex-none [border-top:1px_solid_var(--line)] pt-[12px] flex flex-col gap-[6px]"
    >
      <button
        type="button"
        className="flex items-center gap-[12px] flex-nowrap justify-between [background:none] [border:0] p-[0px] w-[100%] text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        
      >
        <span className="font-mono text-[11px] font-[500] tracking-[.08em] uppercase text-muted" >
          {label}
        </span>
        <span className="text-[12.5px] text-muted" >
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
      className="w-[54px] h-[72px] flex-none rounded-[6px] [border:1px_solid_rgb(228_224_214)] [background:rgb(255_255_255)] p-[8px_7px] box-border flex flex-col gap-[4px] shadow-[0_1px_2px_rgb(0_0_0/.08)]"
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
      <div className="flex items-center gap-[12px] flex-nowrap justify-between flex-none" >
        <span className="font-mono text-[11.5px] font-[500] tracking-[.08em] uppercase text-muted">What will be sent · {r.fieldCount}</span>
        <span className="text-[12.5px] text-muted" >
          {r.site}
        </span>
      </div>
      <div className="text-[12.5px] text-muted flex-none leading-[1.5] mt-[-6px]" >
        Exactly what the form receives. Nothing is sent until you accept.
      </div>
      <div
        className="min-w-[0px] bg-bg [border:1px_solid_var(--line)] rounded-[18px] p-[14px] flex flex-row gap-[14px] items-center flex-none"
        
      >
        <CvThumb />
        <div className="min-w-[0px] flex flex-col gap-[3px]">
          <div className="font-[600] text-[14.5px]">{r.cv.name}</div>
          <div className="text-[12.5px] text-muted" >
            {r.cv.meta}
          </div>
          <div className="text-[12.5px] text-muted underline mt-[4px]" >
            Change CV before sending
          </div>
        </div>
      </div>
      <div
        className="flex-none [border:1.5px_solid_var(--need-line)] bg-need-tint rounded-[18px] p-[14px_16px] flex flex-col gap-[8px]"
      >
        <div className="flex items-center gap-[12px] flex-nowrap justify-between">
          <span className="st need h-[24px] text-[12px] p-[0_10px_0_8px]" >
            Draft to review
          </span>
          <span className="text-[12px] text-muted" >
            1 of {r.fieldCount} fields
          </span>
        </div>
        <div className="font-[600] text-[14.5px]">{r.question}</div>
        <div className="text-[13px] text-ink-2 leading-[1.45]" >
          Cap’s draft, {words} words. Accept it, edit it, or skip it.
        </div>
        <div className="flex items-center gap-[8px] flex-nowrap mt-[2px]" >
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
        className="flex-none [border-top:1px_solid_var(--line)] pt-[12px] flex flex-col gap-[6px]"
      >
        <div className="flex items-center gap-[12px] flex-nowrap justify-between">
          <span className="font-mono text-[11px] font-[500] tracking-[.08em] uppercase text-muted" >
            Saved answers · {r.saved.length}
          </span>
          <span className="text-[12.5px] text-muted" >
            Hide ▴
          </span>
        </div>
        <div className="flex flex-col gap-[7px]">
          {r.saved.map((a) => (
            <div key={a.label} className="flex items-center gap-[10px] flex-nowrap justify-between text-[13.5px] min-w-[0px]" >
              <span className="text-[13.5px] text-muted whitespace-nowrap" >
                {a.label}
              </span>
              {a.note ? (
                <span className="flex items-center gap-[6px] flex-nowrap whitespace-nowrap" >
                  <span
                    className="text-[12.5px] text-ink-2 [border:1px_dashed_var(--line-2)] rounded-[8px] p-[1px_8px]"
                  >
                    {a.value}
                  </span>
                  <MonoLabel className="text-need">{a.note}</MonoLabel>
                </span>
              ) : (
                <span>{a.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-[8px] flex-nowrap flex-none mt-[auto]" >
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
      <div className="flex items-center gap-[12px] flex-nowrap justify-between flex-none" >
        <span className="font-mono text-[11.5px] font-[500] tracking-[.08em] uppercase text-muted">What Cap needs · 1</span>
        <span className="text-[12.5px] text-muted" >
          Notion · Ashby
        </span>
      </div>
      <div
        className="flex-none [border:1.5px_solid_var(--need-line)] bg-need-tint rounded-[18px] p-[14px_16px] flex flex-col gap-[8px]"
      >
        <span
          className="st need h-[24px] text-[12px] p-[0_10px_0_8px] self-start"
          
        >
          Consent
        </span>
        <div className="font-[600] text-[14.5px]">Allow an AI notetaker in your Oct 23 interview?</div>
        <div className="text-[13px] text-ink-2 leading-[1.45]" >
          Cap won’t answer this for you. Nothing is sent until you choose.
        </div>
        <div className="flex items-center gap-[8px] flex-nowrap mt-[2px]" >
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
      <div className="flex items-center gap-[12px] flex-nowrap justify-between">
        <span className="font-mono text-[11px] font-[500] tracking-[.08em] uppercase text-muted" >
          Rules · {PILOT_RULES.filter((r) => !r.suggested).length}
        </span>
        <button className="btn sm ghost" type="button">
          Add rule
        </button>
      </div>
      <div className="flex flex-wrap gap-[8px]">
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
            <i className="w-[7px] h-[7px] rounded-[50%] bg-brand block"></i>
            {rule.text}
            {rule.suggested && (
              <>
                {' '}
                <MonoLabel className="text-brand-text">suggested</MonoLabel>
              </>
            )}
          </span>
        ))}
      </div>
      <div
        className="[border-top:1px_solid_var(--line)] pt-[16px] flex flex-col gap-[8px]"
      >
        <span className="font-mono text-[11px] font-[500] tracking-[.08em] uppercase text-muted" >
          What Cap can do
        </span>
        <div className="text-[13px] text-muted leading-[1.6]" >
          Add jobs · create and edit rules · change crew size · answer from Analytics · write the brief · open any job
        </div>
      </div>
      <div
        className="[border-top:1px_solid_var(--line)] pt-[16px] flex flex-col gap-[8px]"
      >
        <span className="font-mono text-[11px] font-[500] tracking-[.08em] uppercase text-muted" >
          What Cap remembers
        </span>
        <div className="text-[13px] text-muted leading-[1.6]" >
          42 profile keys · 27 facts · 182 saved answers · 9 pilot notes. Stored records, not chat history.
        </div>
      </div>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------- live tab (take over)

function FilledField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <MonoLabel>{label}</MonoLabel>
      <div
        className="flex items-center gap-[12px] flex-nowrap justify-between h-[34px] p-[0_11px] [border:1px_solid_var(--line-2)] rounded-[9px] text-[13.5px] bg-bg"
        
      >
        <span>{value}</span>
        <span className="text-brand-text font-[700]">✓</span>
      </div>
    </div>
  );
}

/** Built-in sample of the stuck Brex tab (V17_TakeOver). Replaced by the live view through browserSeam. */
function TabSnapshot({ driving }: { driving: boolean }) {
  return (
    <div
      className="flex-none [border:1px_solid_var(--line-2)] rounded-[16px] overflow-hidden bg-bg shadow-[var(--float)]"
    >
      <div
        className="flex items-center gap-[7px] flex-nowrap p-[10px_12px] [border-bottom:1px_solid_var(--line)] bg-panel"
        
      >
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            className="w-[9px] h-[9px] rounded-[50%] bg-line-2 block"
          ></i>
        ))}
        <span
          className="ml-[6px] flex-1 min-w-[0px] font-mono text-[11.5px] text-muted h-[24px] flex items-center p-[0_10px] rounded-[99px] bg-bg [border:1px_solid_var(--line)] whitespace-nowrap overflow-hidden text-ellipsis"
        >
          job-boards.greenhouse.io/brex/jobs/81…
        </span>
      </div>
      <div className="p-[18px_18px_16px] flex flex-col gap-[12px]">
        <div>
          <div className="font-serif text-[24px] leading-[1.1]">Software Engineer, New Grad</div>
          <div className="text-[12.5px] text-muted" >
            Brex · New York, NY
          </div>
        </div>
        <FilledField label="Full name" value="Abdelhadi Marjane" />
        <FilledField label="Email" value="a•••••98@gmail.com" />
        <div className="flex flex-col gap-[5px] relative">
          <MonoLabel>Education *</MonoLabel>
          <div
            className="flex items-center gap-[12px] flex-nowrap justify-between h-[34px] p-[0_11px] [border:1.5px_solid_var(--bad)] rounded-[9px] text-[13.5px] text-muted bg-bg"
            
          >
            <span>Select…</span>
            <span>▾</span>
          </div>
          <div
            className="[border:1px_solid_var(--line)] rounded-[10px] p-[10px_12px] text-[12.5px] text-muted bg-panel"
          >
            No options loaded · <u>retry</u>
          </div>
          {driving && (
            <>
              <svg
                className="absolute left-[56%] top-[44px]"
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
                className="absolute left-[calc(56%_+_20px)] top-[50px] text-[11px] p-[2px_8px] rounded-[99px] bg-pri text-on-pri"
              >
                you
              </span>
            </>
          )}
        </div>
        <FilledField label="Resume" value="AI / ML CV v4.pdf" />
        <div className="btn justify-center opacity-[0.4] mt-[4px]" >
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
      <div className="flex items-center gap-[12px] flex-nowrap justify-between flex-none" >
        <span className="font-mono text-[11.5px] font-[500] tracking-[.08em] uppercase text-muted before:content-[''] before:inline-block before:size-[7px] before:mr-2 before:rounded-full before:bg-brand before:align-[1px] before:animate-jp-pulse">Live · {agent} tab</span>
        <span className="font-mono text-[11.5px] text-muted">1 s ago · 2 s refresh</span>
      </div>
      {live ?? <TabSnapshot driving={driving} />}
      <div className="text-[12.5px] text-muted flex-none leading-[1.5]" >
        A screenshot, not video. When you hand back, the agent re-reads this page before its next step.
      </div>
      {driving && (
        <div
          className="absolute left-[16px] right-[16px] bottom-[24px] flex items-center justify-between gap-[8px] p-[6px_6px_6px_16px] rounded-[99px] bg-pri text-on-pri shadow-[var(--float)] whitespace-nowrap z-[4]"
        >
          <b className="text-[13.5px]">You’re driving</b>
          <button type="button" className="[font:inherit]! text-[13px]! font-[600]! p-[8px_14px] rounded-[99px] cursor-pointer bg-transparent [color:inherit]! [border:1px_solid_currentColor]" onClick={onHandBack}>
            Hand back&nbsp;<KeyCap>H</KeyCap>
          </button>
          <button
            type="button"
            className="[font:inherit]! text-[13px]! font-[600]! p-[8px_14px] rounded-[99px] cursor-pointer bg-on-pri text-pri! [border:1px_solid_currentColor] border-on-pri"
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
          className="flex items-center gap-[12px] flex-nowrap p-[10px_0] [border-top:1px_solid_var(--line)] flex-none"
          
        >
          <CritterBot agent={q.agent} state={q.critter} size={34} />
          <div className="min-w-[0px] flex-1">
            <div className="text-[14px] whitespace-nowrap">
              <b className="font-[600]">{q.agent}</b>
              <span className="text-[12.5px] text-muted" >
                {' '}
                · {q.site}
              </span>
            </div>
            <div
              className="text-[12.5px] text-muted whitespace-nowrap overflow-hidden text-ellipsis"
              
            >
              {q.role}
            </div>
          </div>
          <span className="text-[12px] text-muted flex-none" >
            {q.status}
          </span>
        </div>
      ))}
      <div
        className="flex-none [border-top:1px_solid_var(--line)] pt-[14px] flex items-center gap-[12px]"
      >
        <span className="inline-flex">
          {UP_NEXT.filter((q) => q.critter === 'work').map((q, i) => (
            <span key={q.agent} style={{ marginLeft: i === 0 ? 0 : -10, display: 'inline-flex', borderRadius: '50%' }}>
              <CritterBot agent={q.agent} state="work" size={26} />
            </span>
          ))}
        </span>
        <div className="min-w-[0px]">
          <div className="font-[600] text-[14px]">2 working · 7 queued</div>
          <div className="text-[12.5px] text-muted" >
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
      className="flex flex-col items-center justify-center gap-[26px] p-[32px_48px] min-w-[0px] min-h-[0px] bg-ground text-center"
    >
      <div
        className="relative w-[min(600px,100%)] h-[300px] rounded-[28px] [border:1px_solid_var(--line)] bg-bg overflow-hidden flex-none"
      >
        <svg
          viewBox="0 0 600 300"
          width="100%"
          height="100%"
          className="absolute inset-[0px]"
          aria-hidden="true"
        >
          <path
            className="animate-[v17Dash_3s_linear_infinite]"
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
        <div className="absolute left-[50%] top-[50%] [transform:translate(-50%,-50%)]">
          <div className="animate-[v17Bob_3.4s_ease-in-out_infinite]">
            <CapOnDartArt size={190} flying />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-[12px] items-center">
        <div className="font-mono text-[11.5px] font-[500] tracking-[.08em] uppercase text-muted">Inbox · all clear</div>
        <h1 className="font-serif font-[350] text-[64px] tracking-[-.025em] leading-[1.02] m-[0px]" >
          All clear, <span className="font-serif italic font-[300] text-[1em] tracking-[-.01em]">for now.</span>
        </h1>
        <p className="text-[16px] text-muted leading-[1.6] max-w-[520px] m-[0px]" >
          Nothing needs you. The crew is filling 2 applications with 7 more lined up. I’ll flag the next question the
          moment it comes in.
        </p>
      </div>
      <div className="flex items-center gap-[12px] flex-nowrap w-[min(560px,100%)]" >
        {CLEAR_STATS.map((s) => (
          <div
            key={s.label}
            className="min-w-[0px] bg-bg [border:1px_solid_var(--line)] rounded-[24px] p-[16px_18px] flex flex-col gap-[4px] flex-1 items-start"
            
          >
            <MonoLabel>{s.label}</MonoLabel>
            <b className="font-serif font-[400] text-[34px] leading-[1]">{s.value}</b>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-[10px] flex-nowrap justify-center" >
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
