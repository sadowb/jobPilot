import { AgentBotArt } from '../../components/AgentBotArt';
import { CapDartArt } from '../../components/CapDartArt';
import { KbdKey } from '../../components/KbdKey';
import { cn } from '../../components/ui';
import { cssVars } from '../../lib/css-vars';
import { A_BAR, A_CARDIN, A_COLLAPSE, A_RISE, CELL, GoButton, PILL, S, SPEC } from '../shared-ui';
import { FIRST_JOBS, type QueuedJob } from './data';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';
import { nextPath } from './steps';

const fmt = (n: number) => `${Math.round(n * 100) / 100}s`;

function ReadingRow({ job, first }: { job: QueuedJob; first: boolean }) {
  const d = job.delay;
  return (
    <div className={cn('flex flex-col', first ? 'pt-0' : 'pt-[18px]')}>
      <div className={A_COLLAPSE} style={cssVars({ '--d': fmt(0.7 + d) })}>
        <div
          className={cn('truncate pb-3 font-mono text-[13px] text-muted', A_RISE)}
          style={cssVars({ '--d': fmt(d) })}
        >
          {job.url}
        </div>
      </div>
      <div className="h-0.5 overflow-hidden rounded-xs bg-line">
        <div className={cn('h-0.5 bg-brand [--dur:.3s]', A_BAR)} style={cssVars({ '--d': fmt(0.1 + d) })} />
      </div>
      <div
        className={cn(
          'mt-3 flex items-center gap-3.5 rounded-[18px] border border-line bg-bg px-[18px] py-4',
          A_CARDIN,
        )}
        style={cssVars({ '--d': fmt(0.35 + d) })}
      >
        <AgentBotArt company={job.company} state={first ? 'work' : 'idle'} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold">{job.company}</div>
          <div className={cn(S, 'truncate text-[13.5px]')}>
            {job.role} · {job.site}
          </div>
        </div>
        <span className={cn(PILL, 'bg-line text-muted')}>Queued</span>
      </div>
    </div>
  );
}

export function LinksStep() {
  const n = FIRST_JOBS.length;
  return (
    <OnboardingFrame step={3} minHeight={682}>
      <StepHeading
        eyebrow="Step 3 · First jobs"
        lead={`Paste ${n} job links`}
        tail="you like."
        lede="Ashby, Greenhouse, Lever or Workday. I read each link, then queue it for my next free slot."
      />
      <div className="grid min-h-0 flex-1 grid-cols-2 items-start gap-10">
        <div className="flex min-w-0 flex-col gap-[22px]">
          <div className="flex min-w-0 flex-col gap-3 rounded-3xl border-[1.5px] border-ink bg-bg px-6 py-[22px] shadow-[0_0_0_5px_var(--brand-tint)]">
            <div className="flex items-center justify-between gap-3">
              <span className={cn(SPEC, 'text-muted tracking-[0.02em]!')}>Paste here · any job board</span>
              <span className={cn(SPEC, 'text-muted tracking-[0.02em]!')}>⌘V</span>
            </div>
            {FIRST_JOBS.map((j) => (
              <div
                key={j.url}
                className={cn('truncate font-mono text-[14px] text-ink-2', A_RISE)}
                style={cssVars({ '--d': fmt(j.delay) })}
              >
                {j.url}
              </div>
            ))}
            <span className="block h-[18px] w-0.5 animate-[v17caret_1s_steps(1)_infinite] bg-ink motion-reduce:animate-none" />
          </div>
          <div className="flex items-center gap-3.5">
            <GoButton to={nextPath(3)} variant="primary" className="min-h-[52px]! px-[26px]! text-[16px]! text-on-pri!">
              Add {n} jobs · ↵
            </GoButton>
            <span className={cn(S, 'text-[13.5px]')}>Duplicates and non-job pages are skipped.</span>
          </div>
          <div
            className={cn(
              'flex items-start gap-[18px] rounded-3xl border border-line bg-panel px-6 py-[22px] [--d:.3s]',
              A_RISE,
            )}
          >
            <CapDartArt size={64} />
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <span className={cn(SPEC, 'text-brand-text tracking-[0.02em]!')}>Tip</span>
                <span className={cn(SPEC, 'text-muted tracking-[0.02em]!')}>Browser extension</span>
              </div>
              <b className="text-[18px]">Send a whole page of jobs at once</b>
              <div className={cn(S, 'text-[13.5px] leading-[1.6]')}>
                On any job board, press the shortcut. I list every job link on the page; tick the ones you want and they
                join the queue in one go.
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <KbdKey>ALT</KbdKey>
                <KbdKey>⇧</KbdKey>
                <KbdKey>J</KbdKey>
                <span className={cn(S, 'text-[13px]')}>on a board page</span>
              </div>
            </div>
          </div>
        </div>
        <div className={cn(CELL, 'gap-[18px] p-7')}>
          <div className="flex items-center justify-between gap-3">
            <b className="text-[17px]">Reading each link</b>
            <span className={cn(SPEC, 'text-muted tracking-[0.02em]!')}>link → company card</span>
          </div>
          <div className="flex flex-col">
            {FIRST_JOBS.map((j, i) => (
              <ReadingRow key={j.url} job={j} first={i === 0} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className={cn(S, 'text-[13.5px]')}>{n} queued · about 6 min of crew time</span>
            <span className={cn(S, 'text-[13px]')}>Nothing is sent unless your submit rule allows it.</span>
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
