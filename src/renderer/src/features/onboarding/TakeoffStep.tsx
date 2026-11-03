import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CapDartArt } from '../../components/CapDartArt';
import { Button, cn } from '../../components/ui';
import { useAgent, useApplications, useGrants, usePreflight, useStartRun } from '../../lib/api';
import { A_RISE, BUBBLE, H1, IT, REDUCE_ALL } from '../shared-ui';
import { MARKETS_KEY, readMarkets } from '../profile/markets';
import { PROFILE_KEY, readProfile } from '../profile/personal';
import { onboardingPending, readProfileData, saveProfileData } from '../profile/profileStorage';
import { OnboardingHeader } from './OnboardingHeader';
import { Cap, OkDot, PRESS, Spinner } from './parts';
import { SplitFlap } from './SplitFlap';

const ROWS = 4;

/** P3 Take-off: "You're ready" with the departures board for the queue. Completing setup is saved here. */
export function TakeoffStep() {
  const navigate = useNavigate();
  const applications = useApplications();
  const agent = useAgent();
  const grants = useGrants();
  const preflight = usePreflight();
  const start = useStartRun();
  const [saveError, setSaveError] = useState(false);
  const [launched, setLaunched] = useState(false);

  // Setup is done once this screen shows (skip does the same). Idempotent: a reload does not rewrite the time.
  useEffect(() => {
    if (!onboardingPending()) return;
    saveProfileData('onboardingCompletedAt', Date.now()).catch(() => setSaveError(true));
  }, [saveError]);

  const profile = useMemo(() => {
    try {
      return readProfile(readProfileData(PROFILE_KEY));
    } catch {
      return null;
    }
  }, []);
  const markets = useMemo(() => {
    try {
      return readMarkets(readProfileData(MARKETS_KEY));
    } catch {
      return [];
    }
  }, []);

  const queue = (applications.data ?? [])
    .filter((a) => a.status === 'queued' || a.status === 'running')
    .sort((a, b) => a.queueRank - b.queueRank);
  const first = queue[0];
  const aiGrant = grants.data?.find((g) => g.kind === 'agent');
  const browserGrant = grants.data?.find((g) => g.kind === 'browser');
  const aiTool = preflight.data?.agents.find((a) => a.id === aiGrant?.provider);
  const model = aiTool?.models.find((m) => m.value === agent.data?.model)?.label ?? agent.data?.model;
  const browserTool = preflight.data?.browsers.find((b) => b.id === browserGrant?.provider);
  const manifest = [
    aiGrant && { k: 'AI', v: [aiTool?.name ?? aiGrant.provider, model].filter(Boolean).join(' · ') },
    browserGrant && { k: 'Browser', v: browserTool?.name ?? browserGrant.provider },
    profile && { k: 'Profile', v: 'checked by you' },
    markets.length > 0 && { k: 'Applying in', v: markets.map((m) => m.code).join(' · ') },
  ].filter((item): item is { k: string; v: string } => Boolean(item));

  const launch = () => {
    if (!first || launched) return;
    setLaunched(true);
    start.mutate(first.id, { onError: () => setLaunched(false) });
  };

  const name = profile?.firstName.trim();
  const capLine = launched
    ? `Opening ${first?.companyName ?? 'the first job'} in its own tab. I’ll ping you when it needs you.`
    : first
      ? `Engines warm. ${first.companyName} first?`
      : 'All set. Paste job links from your dashboard any time.';

  return (
    <>
      <OnboardingHeader step={3} />
      <main
        className={cn(
          'relative flex min-h-[calc(100dvh-var(--app-toolbar-height,56px))] flex-col gap-6 px-[88px] py-8 max-lg:px-8',
          REDUCE_ALL,
        )}
      >
        <div className="flex items-center justify-between gap-10">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <span className={cn('font-mono text-xs font-medium tracking-[0.08em] text-brand-text', A_RISE)}>
              ✓ ALL SET
            </span>
            <h1 className={cn(H1, 'text-[58px] leading-[1.02]', A_RISE, '[--d:.08s]')}>
              Cleared for take-off{name ? ',' : '.'} {name && <span className={IT}>{name}.</span>}
            </h1>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {manifest.map((item, i) => (
                <li
                  key={item.k}
                  style={{ ['--d' as string]: `${0.35 + i * 0.1}s` }}
                  className={cn(
                    'inline-flex h-[34px] items-center gap-2 rounded-full border border-line bg-panel pr-3.5 pl-2 text-[13.5px] whitespace-nowrap',
                    'animate-v17pop motion-reduce:animate-none',
                  )}
                >
                  <OkDot size={20} delay={`${0.55 + i * 0.1}s`} />
                  <span className="text-muted">{item.k}</span>
                  {item.v}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative h-[250px] w-[400px] flex-none max-lg:hidden">
            <div
              className={cn(
                'absolute top-[30px] left-[120px] size-[170px]',
                launched
                  ? 'animate-ob-takeoff motion-reduce:animate-none'
                  : 'animate-v17lift motion-reduce:animate-none',
              )}
            >
              <div className="animate-jp-bob motion-reduce:animate-none">
                <CapDartArt size={170} gust={!launched} />
              </div>
            </div>
            <div
              aria-live="polite"
              className={cn(
                BUBBLE,
                'absolute top-0 right-0 max-w-[250px] border-0 bg-hover px-3.5 py-2.5 text-sm',
                A_RISE,
                '[--d:1.3s]',
              )}
            >
              {capLine}
            </div>
          </div>
        </div>

        <section
          aria-label="Your job queue"
          className={cn(
            'flex flex-col gap-2.5 rounded-[18px] border border-line bg-panel px-[22px] pt-4 pb-[18px]',
            A_RISE,
            '[--d:.3s]',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2.5 font-mono text-[13px] font-semibold tracking-[0.14em]">
              <span className="size-2 animate-blink rounded-full bg-brand motion-reduce:animate-none" />
              DEPARTURES · YOUR QUEUE
            </span>
            <Cap>ONE JOB AT A TIME</Cap>
          </div>
          <div className="grid grid-cols-[200px_minmax(0,1fr)_260px_200px] items-center gap-x-6 pt-1 max-lg:hidden">
            <Cap className="text-[11px]">JOB</Cap>
            <Cap className="text-[11px]">ROLE</Cap>
            <Cap className="text-[11px]">WHERE</Cap>
            <Cap className="text-[11px]">STATUS</Cap>
          </div>
          {queue.length === 0 && (
            <p className="m-0 border-t border-line py-4 text-[15px] text-muted">
              No jobs lined up yet. Paste links from your dashboard and they appear here.
            </p>
          )}
          {queue.slice(0, ROWS).map((job, i) => {
            const filling = launched && i === 0;
            return (
              <div
                key={job.id}
                className="grid grid-cols-[200px_minmax(0,1fr)_260px_200px] items-center gap-x-6 border-t border-line py-2.5 max-lg:grid-cols-1 max-lg:gap-1"
              >
                <SplitFlap text={job.companyName} width={9} settleFrom={6 + i * 5} salt={i + 1} />
                <span className="truncate text-[15px] text-ink-2">{job.title}</span>
                <SplitFlap
                  text={job.location ?? '—'}
                  width={12}
                  settleFrom={10 + i * 5}
                  salt={i + 7}
                  className="text-muted"
                />
                <SplitFlap
                  text={filling ? 'FILLING' : i === 0 ? 'BOARDING' : 'QUEUED'}
                  width={9}
                  settleFrom={filling ? 4 : 16 + i * 5}
                  salt={i + 13}
                  className={i === 0 ? 'text-brand-text' : 'text-ink-2'}
                />
              </div>
            );
          })}
          {queue.length > ROWS && <p className="m-0 text-[13px] text-muted">+ {queue.length - ROWS} more waiting</p>}
        </section>

        <div className={cn('flex flex-wrap items-center gap-[22px]', A_RISE, '[--d:1.4s]')}>
          {first && !launched && (
            <Button variant="primary" onClick={launch} className={cn('h-12 px-6 text-[15px] font-semibold', PRESS)}>
              Start the first job
            </Button>
          )}
          {first && launched && (
            <span
              aria-disabled="true"
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-pri/55 px-6 text-[15px] font-semibold text-on-pri"
            >
              <Spinner label="Filling" className="border-on-pri/40 border-t-on-pri" />
              Filling {first.companyName}…
            </span>
          )}
          <Button
            variant={first ? 'ghost' : 'primary'}
            onClick={() => void navigate('/')}
            className={cn(!first && 'h-12 px-6 text-[15px] font-semibold', PRESS)}
          >
            {launched ? 'Go to my dashboard' : first ? 'Go to my dashboard' : 'Go to my dashboard →'}
          </Button>
          <span className="ml-auto text-[13.5px] text-muted">
            You check every answer. Nothing is sent until you press Send.
          </span>
        </div>
        {start.isError && (
          <p role="alert" className="m-0 text-sm text-bad">
            {start.error instanceof Error ? start.error.message : 'Could not start the first job.'}
          </p>
        )}
        {saveError && (
          <p role="alert" className="m-0 text-sm text-bad">
            Could not save that setup is done.{' '}
            <button type="button" className="underline" onClick={() => setSaveError(false)}>
              Try again
            </button>
          </p>
        )}
      </main>
    </>
  );
}
