import { NavButton } from '../../components/NavButton';
import { AgentBotArt } from '../../components/AgentBotArt';
import { CapDartArt } from '../../components/CapDartArt';
import { KbdKey } from '../../components/KbdKey';
import { cssVars } from '../../lib/css-vars';
import { FIRST_JOBS, type QueuedJob } from './data';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';
import { nextPath } from './steps';

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;
const fmt = (n: number) => `${Math.round(n * 100) / 100}s`;

function ReadingRow({ job, first }: { job: QueuedJob; first: boolean }) {
  const d = job.delay;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: first ? 0 : 18 }}>
      <div className="v17-collapse" style={cssVars({ '--d': fmt(0.7 + d) })}>
        <div
          className="v17-rise"
          style={cssVars(
            { '--d': fmt(d) },
            { paddingBottom: 12, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', ...ellipsis },
          )}
        >
          {job.url}
        </div>
      </div>
      <div style={{ height: 2, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          className="v17-bar"
          style={cssVars({ '--d': fmt(0.1 + d), '--dur': '.3s' }, { height: 2, background: 'var(--brand)' })}
        />
      </div>
      <div
        className="v17-cardin"
        style={cssVars(
          { '--d': fmt(0.35 + d) },
          {
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            border: '1px solid var(--line)',
            borderRadius: 18,
            padding: '16px 18px',
            background: 'var(--bg)',
          },
        )}
      >
        <AgentBotArt company={job.company} state={first ? 'work' : 'idle'} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{job.company}</div>
          <div className="s" style={ellipsis}>
            {job.role} · {job.site}
          </div>
        </div>
        <span
          style={{
            display: 'inline-block',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--muted)',
            background: 'var(--line)',
            borderRadius: 99,
            padding: '3px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          Queued
        </span>
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
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: 40,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <div
            style={{
              border: '1.5px solid var(--ink)',
              borderRadius: 24,
              background: 'var(--bg)',
              padding: '22px 24px',
              boxShadow: '0 0 0 5px var(--brand-tint)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minWidth: 0,
            }}
          >
            <div className="row sp nw">
              <span className="spec" style={{ color: 'var(--muted)' }}>
                Paste here · any job board
              </span>
              <span className="spec">⌘V</span>
            </div>
            {FIRST_JOBS.map((j) => (
              <div
                key={j.url}
                className="v17-rise"
                style={cssVars(
                  { '--d': fmt(j.delay) },
                  { fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--ink-2)', ...ellipsis },
                )}
              >
                {j.url}
              </div>
            ))}
            <span className="v17-caret" style={{ display: 'block', width: 2, height: 18, background: 'var(--ink)' }} />
          </div>
          <div className="row nw" style={{ gap: 14 }}>
            <NavButton className="btn pri" to={nextPath(3)} style={{ minHeight: 52, padding: '0 26px', fontSize: 16 }}>
              Add {n} jobs · ↵
            </NavButton>
            <span className="s">Duplicates and non-job pages are skipped.</span>
          </div>
          <div
            className="v17-rise"
            style={cssVars(
              { '--d': '.3s' },
              {
                display: 'flex',
                gap: 18,
                alignItems: 'flex-start',
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 24,
                padding: '22px 24px',
              },
            )}
          >
            <CapDartArt size={64} />
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="row nw" style={{ gap: 10 }}>
                <span className="spec" style={{ color: 'var(--brand-text)' }}>
                  Tip
                </span>
                <span className="spec" style={{ color: 'var(--muted)' }}>
                  Browser extension
                </span>
              </div>
              <b style={{ fontSize: 18 }}>Send a whole page of jobs at once</b>
              <div className="s" style={{ lineHeight: 1.6 }}>
                On any job board, press the shortcut. I list every job link on the page; tick the ones you want and they
                join the queue in one go.
              </div>
              <div className="row nw" style={{ gap: 6, marginTop: 4 }}>
                <KbdKey>ALT</KbdKey>
                <KbdKey>⇧</KbdKey>
                <KbdKey>J</KbdKey>
                <span className="s" style={{ fontSize: 13 }}>
                  on a board page
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mcell" style={{ gap: 18, minWidth: 0, padding: 28 }}>
          <div className="row sp nw">
            <b style={{ fontSize: 17 }}>Reading each link</b>
            <span className="spec" style={{ color: 'var(--muted)' }}>
              link → company card
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {FIRST_JOBS.map((j, i) => (
              <ReadingRow key={j.url} job={j} first={i === 0} />
            ))}
          </div>
          <div className="row sp nw" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <span className="s">{n} queued · about 6 min of crew time</span>
            <span className="s" style={{ fontSize: 13 }}>
              Nothing is sent unless your submit rule allows it.
            </span>
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
