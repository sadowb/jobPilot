import { useState, type ReactNode } from 'react';
import { CapOnDartArt } from '../../components/CapOnDartArt';
import { CritterBot } from '../../components/CritterBot';
import { Eyebrow } from '../../components/ui';
import { Btn } from './Btn';
import { useLiveTabView } from './browserSeam';
import { CLEAR_STATS, PILOT_RULES, UP_NEXT } from './model';
import { FIGMA_REVIEW } from './sampleReview';
import { ELLIPSIS, EYEBROW, MONO, NEED_CARD, NEED_PILL_SM } from './styles';
import { KeyHint as KeyCap } from './KeyHint';

/** Right column shell. Scrolls when the window is short so the review actions stay reachable. */
export function PanelFrame({ children }: { children: ReactNode }) {
  return (
    <aside className="relative flex min-h-0 min-w-0 flex-col gap-[18px] overflow-x-hidden overflow-y-auto border-l border-line bg-bg px-6 pt-[22px] pb-7 *:shrink-0">
      {children}
    </aside>
  );
}

const RULE = 'border-t border-line';

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
    <div className={`flex flex-none flex-col gap-1.5 pt-3 ${RULE}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 border-0 bg-transparent p-0 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={EYEBROW}>{label}</span>
        <span className="text-[12.5px] text-muted">{open ? 'Hide ▴' : 'Show ▾'}</span>
      </button>
      <div className={`text-[13px] text-muted ${open ? '' : ELLIPSIS}`}>{summary}</div>
    </div>
  );
}

const CV_LINE_WIDTHS = ['w-[92%]', 'w-full', 'w-[84%]', 'w-[96%]', 'w-[70%]', 'w-full', 'w-[88%]'];

function CvThumb() {
  return (
    <div
      aria-hidden="true"
      className="flex h-[72px] w-[54px] flex-none flex-col gap-1 rounded-md border border-[rgb(228_224_214)] bg-[rgb(255_255_255)] px-[7px] py-2 shadow-[0_1px_2px_rgb(0_0_0/.08)]"
    >
      <i className="block h-1.5 w-[55%] rounded-xs bg-[rgb(17_17_17)]"></i>
      {CV_LINE_WIDTHS.map((w, i) => (
        <i key={i} className={`block h-[3px] rounded-xs bg-[rgb(168_163_144)] ${w}`}></i>
      ))}
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
      <div className="flex flex-none items-center justify-between gap-3">
        <Eyebrow>What will be sent · {r.fieldCount}</Eyebrow>
        <span className="text-[12.5px] text-muted">{r.site}</span>
      </div>
      <div className="-mt-1.5 flex-none text-[12.5px] leading-[1.5] text-muted">
        Exactly what the form receives. Nothing is sent until you accept.
      </div>
      <div className="flex min-w-0 flex-none flex-row items-center gap-3.5 rounded-[18px] border border-line bg-bg p-3.5">
        <CvThumb />
        <div className="flex min-w-0 flex-col gap-[3px]">
          <div className="text-[14.5px] font-semibold">{r.cv.name}</div>
          <div className="text-[12.5px] text-muted">{r.cv.meta}</div>
          <div className="mt-1 text-[12.5px] text-muted underline">Change CV before sending</div>
        </div>
      </div>
      <div className={NEED_CARD}>
        <div className="flex items-center justify-between gap-3">
          <span className={NEED_PILL_SM}>Draft to review</span>
          <span className="text-[12px] text-muted">1 of {r.fieldCount} fields</span>
        </div>
        <div className="text-[14.5px] font-semibold">{r.question}</div>
        <div className="text-[13px] leading-[1.45] text-ink-2">
          Cap’s draft, {words} words. Accept it, edit it, or skip it.
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <Btn size="sm" variant="primary" onClick={onAccept}>
            Accept <KeyCap>↵</KeyCap>
          </Btn>
          <Btn size="sm" onClick={onToggleEdit}>
            {editing ? 'Done' : 'Edit'} <KeyCap>E</KeyCap>
          </Btn>
        </div>
      </div>
      <Collapsible label={`Filled from profile · ${r.filled.length}`} summary={r.filled.join(', ')} />
      <Collapsible label={`Files · ${r.files.length}`} summary={`${r.files.join(', ')} · ${r.filesNote}`} />
      <div className={`flex flex-none flex-col gap-1.5 pt-3 ${RULE}`}>
        <div className="flex items-center justify-between gap-3">
          <span className={EYEBROW}>Saved answers · {r.saved.length}</span>
          <span className="text-[12.5px] text-muted">Hide ▴</span>
        </div>
        <div className="flex flex-col gap-[7px]">
          {r.saved.map((a) => (
            <div key={a.label} className="flex min-w-0 items-center justify-between gap-2.5 text-[13.5px]">
              <span className="whitespace-nowrap text-muted">{a.label}</span>
              {a.note ? (
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="rounded-lg border border-dashed border-line-2 px-2 py-px text-[12.5px] text-ink-2">
                    {a.value}
                  </span>
                  <span className={`${MONO} text-need`}>{a.note}</span>
                </span>
              ) : (
                <span>{a.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto flex flex-none items-center gap-2">
        <Btn size="sm" className="min-w-0 flex-1">
          Open CV
        </Btn>
        <Btn size="sm" variant="primary" className="min-w-0 flex-1" onClick={onAccept}>
          Accept and fill
        </Btn>
      </div>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------- Notion consent (derived: no board)

export function ConsentPanel({ onAnswer }: { onAnswer: (allow: boolean) => void }) {
  return (
    <PanelFrame>
      <div className="flex flex-none items-center justify-between gap-3">
        <Eyebrow>What Cap needs · 1</Eyebrow>
        <span className="text-[12.5px] text-muted">Notion · Ashby</span>
      </div>
      <div className={NEED_CARD}>
        <span className={`${NEED_PILL_SM} self-start`}>Consent</span>
        <div className="text-[14.5px] font-semibold">Allow an AI notetaker in your Oct 23 interview?</div>
        <div className="text-[13px] leading-[1.45] text-ink-2">
          Cap won’t answer this for you. Nothing is sent until you choose.
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <Btn size="sm" variant="primary" onClick={() => onAnswer(true)}>
            Allow
          </Btn>
          <Btn size="sm" onClick={() => onAnswer(false)}>
            Don’t allow
          </Btn>
        </div>
      </div>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------- Cap pilot

const CHIP = 'flex items-center gap-[7px] flex-nowrap rounded-full px-3 py-[7px] text-[13px] whitespace-nowrap';

export function PilotPanel() {
  return (
    <PanelFrame>
      <div className="flex items-center justify-between gap-3">
        <span className={EYEBROW}>Rules · {PILOT_RULES.filter((r) => !r.suggested).length}</span>
        <Btn size="sm" variant="ghost">
          Add rule
        </Btn>
      </div>
      <div className="flex flex-wrap gap-2">
        {PILOT_RULES.map((rule) => (
          <span
            key={rule.text}
            className={`${CHIP} ${
              rule.suggested ? 'border border-dashed border-brand bg-brand-tint' : 'border border-line-2 bg-bg'
            }`}
          >
            <i className="block size-[7px] rounded-full bg-brand"></i>
            {rule.text}
            {rule.suggested && (
              <>
                {' '}
                <span className={`${MONO} text-brand-text`}>suggested</span>
              </>
            )}
          </span>
        ))}
      </div>
      <div className={`flex flex-col gap-2 pt-4 ${RULE}`}>
        <span className={EYEBROW}>What Cap can do</span>
        <div className="text-[13px] leading-[1.6] text-muted">
          Add jobs · create and edit rules · change crew size · answer from Analytics · write the brief · open any job
        </div>
      </div>
      <div className={`flex flex-col gap-2 pt-4 ${RULE}`}>
        <span className={EYEBROW}>What Cap remembers</span>
        <div className="text-[13px] leading-[1.6] text-muted">
          42 profile keys · 27 facts · 182 saved answers · 9 pilot notes. Stored records, not chat history.
        </div>
      </div>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------- live tab (take over)

const FIELD_BOX = 'flex h-[34px] items-center justify-between gap-3 rounded-[9px] bg-bg px-[11px] text-[13.5px]';

function FilledField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <span className={MONO}>{label}</span>
      <div className={`${FIELD_BOX} border border-line-2`}>
        <span>{value}</span>
        <span className="font-bold text-brand-text">✓</span>
      </div>
    </div>
  );
}

/** Built-in sample of the stuck Brex tab (V17_TakeOver). Replaced by the live view through browserSeam. */
function TabSnapshot({ driving }: { driving: boolean }) {
  return (
    <div className="flex-none overflow-hidden rounded-2xl border border-line-2 bg-bg shadow-float">
      <div className="flex items-center gap-[7px] border-b border-line bg-panel px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <i key={i} className="block size-[9px] rounded-full bg-line-2"></i>
        ))}
        <span
          className={`ml-1.5 flex h-6 min-w-0 flex-1 items-center rounded-full border border-line bg-bg px-2.5 font-mono text-[11.5px] text-muted ${ELLIPSIS}`}
        >
          job-boards.greenhouse.io/brex/jobs/81…
        </span>
      </div>
      <div className="flex flex-col gap-3 px-[18px] pt-[18px] pb-4">
        <div>
          <div className="font-serif text-[24px] leading-[1.1]">Software Engineer, New Grad</div>
          <div className="text-[12.5px] text-muted">Brex · New York, NY</div>
        </div>
        <FilledField label="Full name" value="Sara Benali" />
        <FilledField label="Email" value="a•••••98@gmail.com" />
        <div className="relative flex flex-col gap-[5px]">
          <span className={MONO}>Education *</span>
          <div className={`${FIELD_BOX} border-[1.5px] border-bad text-muted`}>
            <span>Select…</span>
            <span>▾</span>
          </div>
          <div className="rounded-[10px] border border-line bg-panel px-3 py-2.5 text-[12.5px] text-muted">
            No options loaded · <u>retry</u>
          </div>
          {driving && (
            <>
              <svg className="absolute top-11 left-[56%]" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z"
                  fill="var(--ink)"
                  stroke="var(--bg)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute top-[50px] left-[calc(56%_+_20px)] rounded-full bg-pri px-2 py-0.5 text-[11px] text-on-pri">
                you
              </span>
            </>
          )}
        </div>
        <FilledField label="Resume" value="AI / ML CV v4.pdf" />
        <div className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-ink px-5 text-[14.5px] font-semibold whitespace-nowrap text-ink opacity-40">
          Submit application
        </div>
      </div>
    </div>
  );
}

/** Pill buttons on the "You're driving" bar. `!` beats the unlayered global `button { font; color }`. */
const DRIVE_BTN = 'cursor-pointer rounded-full border px-3.5 py-2 text-[13px]! font-semibold!';

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
      <div className="flex flex-none items-center justify-between gap-3">
        <span
          className={`font-mono text-[11.5px] font-medium tracking-[0.08em] text-muted uppercase before:mr-2 before:inline-block before:size-[7px] before:animate-jp-pulse before:rounded-full before:bg-brand before:align-[1px] before:content-['']`}
        >
          Live · {agent} tab
        </span>
        <span className="font-mono text-[11.5px] text-muted">1 s ago · 2 s refresh</span>
      </div>
      {live ?? <TabSnapshot driving={driving} />}
      <div className="flex-none text-[12.5px] leading-[1.5] text-muted">
        A screenshot, not video. When you hand back, the agent re-reads this page before its next step.
      </div>
      {driving && (
        <div className="absolute inset-x-4 bottom-6 z-[4] flex items-center justify-between gap-2 rounded-full bg-pri py-1.5 pr-1.5 pl-4 whitespace-nowrap text-on-pri shadow-float">
          <b className="text-[13.5px]">You’re driving</b>
          <button type="button" className={`${DRIVE_BTN} border-current bg-transparent`} onClick={onHandBack}>
            Hand back&nbsp;<KeyCap>H</KeyCap>
          </button>
          <button type="button" className={`${DRIVE_BTN} border-on-pri bg-on-pri text-pri!`} onClick={onFinish}>
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
      <span className={MONO}>Up next · {CLEAR_STATS[1].value}</span>
      {UP_NEXT.map((q) => (
        <div key={q.agent} className={`flex flex-none items-center gap-3 py-2.5 ${RULE}`}>
          <CritterBot agent={q.agent} state={q.critter} size={34} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] whitespace-nowrap">
              <b className="font-semibold">{q.agent}</b>
              <span className="text-[12.5px] text-muted"> · {q.site}</span>
            </div>
            <div className={`text-[12.5px] text-muted ${ELLIPSIS}`}>{q.role}</div>
          </div>
          <span className="flex-none text-[12px] text-muted">{q.status}</span>
        </div>
      ))}
      <div className={`flex flex-none items-center gap-3 pt-3.5 ${RULE}`}>
        <span className="inline-flex">
          {UP_NEXT.filter((q) => q.critter === 'work').map((q, i) => (
            <span key={q.agent} className={`inline-flex rounded-full ${i === 0 ? '' : '-ml-2.5'}`}>
              <CritterBot agent={q.agent} state="work" size={26} />
            </span>
          ))}
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold">2 working · 7 queued</div>
          <div className="text-[12.5px] text-muted">Open Up next to reorder or hold</div>
        </div>
      </div>
    </PanelFrame>
  );
}

export function ClearCenter({ onDashboard, onAddJobs }: { onDashboard: () => void; onAddJobs: () => void }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-[26px] bg-ground px-12 py-8 text-center">
      <div className="relative h-[300px] w-[min(600px,100%)] flex-none overflow-hidden rounded-[28px] border border-line bg-bg">
        <svg className="absolute inset-0" viewBox="0 0 600 300" width="100%" height="100%" aria-hidden="true">
          <path
            className="animate-jp-dash"
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-jp-bob">
            <CapOnDartArt size={190} flying />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Eyebrow>Inbox · all clear</Eyebrow>
        <h1 className="m-0 font-serif text-[64px] leading-[1.02] font-[350] tracking-[-0.025em]">
          All clear, <span className="font-serif text-[1em] font-light tracking-[-0.01em] italic">for now.</span>
        </h1>
        <p className="m-0 max-w-[520px] text-[16px] leading-[1.6] text-muted">
          Nothing needs you. The crew is filling 2 applications with 7 more lined up. I’ll flag the next question the
          moment it comes in.
        </p>
      </div>
      <div className="flex w-[min(560px,100%)] items-center gap-3">
        {CLEAR_STATS.map((s) => (
          <div
            key={s.label}
            className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-3xl border border-line bg-bg px-[18px] py-4"
          >
            <span className={MONO}>{s.label}</span>
            <b className="font-serif text-[34px] leading-none font-normal">{s.value}</b>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2.5">
        <Btn variant="primary" onClick={onDashboard}>
          Back to Dashboard
        </Btn>
        <Btn onClick={onAddJobs}>
          Add jobs&nbsp;<KeyCap>⌘V</KeyCap>
        </Btn>
      </div>
    </section>
  );
}
