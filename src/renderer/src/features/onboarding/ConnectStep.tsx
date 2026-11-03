import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AgentTool, AllowConnectionsResult, BrowserTool } from '../../../../shared/dto';
import { CapDartArt } from '../../components/CapDartArt';
import { Button, Select, cn } from '../../components/ui';
import { useAllowConnections, useBrowserTools, useChooseCustomAgent, usePreflight } from '../../lib/api';
import { A_RISE, BUBBLE, H1, IT, REDUCE_ALL } from '../shared-ui';
import { ConsentSheet } from './ConsentSheet';
import { OnboardingHeader } from './OnboardingHeader';
import { Cap, OkDot, PRESS, Spinner, ToolTile } from './parts';
import { stepPath } from './steps';

type Phase = 'pick' | 'testing' | 'ok' | 'error';

const monoOf = (tool: AgentTool) => (tool.id === 'claude' ? 'CC' : tool.id === 'codex' ? 'CX' : '>_');
const browserMono = (tool: BrowserTool) =>
  tool.name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

function agentSub(tool: AgentTool): string {
  if (tool.state === 'not_installed') return tool.id === 'custom' ? 'Not found at that path' : 'Not installed';
  if (tool.id === 'custom') return tool.path ?? '';
  const plan = tool.id === 'claude' ? 'Found · uses your own Claude plan' : 'Found · uses your own plan';
  return tool.runnable ? plan : `${plan} · jobs with Codex arrive soon`;
}

const browserSub = (tool: BrowserTool) =>
  tool.state === 'running'
    ? 'Running · found automatically'
    : tool.state === 'not_running'
      ? 'Installed but not running. Open it, then check again.'
      : 'Not installed';

/** A radio row: the whole left side picks it, the trailing slot shows the model, the test and its result. */
function PickRow({
  selected,
  disabled,
  mono,
  name,
  sub,
  delay,
  dimmed,
  trailing,
  onPick,
}: {
  selected: boolean;
  disabled: boolean;
  mono: string;
  name: string;
  sub: string;
  delay: string;
  dimmed: boolean;
  trailing: ReactNode;
  onPick: () => void;
}) {
  return (
    <li
      style={{ ['--d' as string]: delay }}
      className={cn(
        'flex min-h-14 items-center gap-2.5 border-t border-line pr-3.5 pl-1 transition-[background-color,opacity] duration-300 first:border-t-0',
        A_RISE,
        selected && !disabled && 'bg-brand-tint',
        dimmed && 'opacity-40',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={`${name}. ${sub}`}
        disabled={disabled}
        onClick={onPick}
        className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-xl bg-transparent px-2.5 text-left text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-[18px] flex-none place-items-center rounded-full border-[1.5px] transition-colors',
            selected ? 'border-brand' : 'border-line-2',
          )}
        >
          <span
            className={cn(
              'size-2 rounded-full bg-brand transition-transform duration-300',
              selected ? 'scale-100' : 'scale-0',
            )}
          />
        </span>
        <ToolTile>{mono}</ToolTile>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">{name}</span>
          <span className="block truncate text-[12.5px] text-muted">{sub}</span>
        </span>
      </button>
      {trailing}
    </li>
  );
}

const outcomeText = (ok: boolean, ms: number | null, what: 'agent' | 'browser') =>
  ok ? (what === 'agent' ? `Replied${ms !== null ? ` in ${(ms / 1000).toFixed(1)} s` : ''}` : 'Answered') : '';

/** Cap's route map: AI and browser nodes joined to Cap by dashed wires; packets run while testing, wires turn solid when both answer. */
function RouteMap({
  aiName,
  aiMono,
  browserName,
  browserMono: bMono,
  phase,
  scanning,
  capLine,
}: {
  aiName: string;
  aiMono: string;
  browserName: string;
  browserMono: string;
  phase: Phase;
  scanning: boolean;
  capLine: string;
}) {
  const ok = phase === 'ok';
  const testing = phase === 'testing';
  const node = (side: 'ai' | 'browser') => (
    <div
      className={cn(
        'absolute flex h-[78px] w-[260px] items-center gap-3 rounded-2xl border bg-panel px-4 transition-colors duration-500',
        A_RISE,
        ok ? 'border-brand' : 'border-line',
        side === 'ai' ? 'top-0 left-0 [--d:.5s]' : 'top-[392px] right-0 [--d:.65s]',
      )}
    >
      <ToolTile>{side === 'ai' ? aiMono : bMono}</ToolTile>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Cap className="text-[10.5px]">{side === 'ai' ? 'YOUR AI' : 'BROWSER TOOL'}</Cap>
        <span className="truncate text-[15px] font-semibold">
          {scanning ? 'Looking…' : side === 'ai' ? aiName : browserName}
        </span>
      </span>
      {(scanning || testing) && <Spinner />}
      {ok && <OkDot />}
    </div>
  );
  const wire = (d: string, delay?: string) => (
    <>
      <path d={d} fill="none" strokeWidth="1.5" strokeDasharray="3 6" className="stroke-line-2" />
      {testing && (
        <path
          d={d}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ ['--d' as string]: delay }}
          className="animate-ob-packet stroke-brand [stroke-dasharray:14_420] [stroke-dashoffset:14] motion-reduce:animate-none"
        />
      )}
      {ok && (
        <path
          d={d}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ ['--d' as string]: delay }}
          className="animate-ob-wire stroke-brand [stroke-dasharray:220] motion-reduce:animate-none"
        />
      )}
    </>
  );
  return (
    <div className="relative h-[470px] w-[460px] flex-none max-lg:hidden" aria-hidden="true">
      <svg width="460" height="470" viewBox="0 0 460 470" className="absolute top-0 left-0 overflow-visible">
        {wire('M 130 78 C 130 150, 170 200, 222 214')}
        {wire('M 316 268 C 330 310, 330 350, 330 392', '.2s')}
      </svg>
      {node('ai')}
      <div className="absolute top-[158px] left-[196px] size-[150px] animate-ob-arrive motion-reduce:animate-none">
        <div className="absolute inset-1.5 rounded-full border border-line bg-panel" />
        <div className="relative animate-jp-bob motion-reduce:animate-none">
          <CapDartArt size={150} gust />
        </div>
      </div>
      {node('browser')}
      <div
        className={cn(
          BUBBLE,
          'absolute top-[200px] left-1 max-w-[168px] border-0 bg-hover px-3.5 py-2.5 text-sm',
          A_RISE,
          '[--d:1.2s]',
        )}
      >
        {capLine}
      </div>
    </div>
  );
}

/** P1 Pre-flight: Cap finds an AI and a browser tool on this computer, the owner presses one Allow. */
export function ConnectStep() {
  const navigate = useNavigate();
  const preflight = usePreflight();
  const chooseCustom = useChooseCustomAgent();
  const allow = useAllowConnections();
  const [phase, setPhase] = useState<Phase>('pick');
  const [pickedAi, setAiId] = useState<AgentTool['id'] | null>(null);
  const [pickedBrowser, setBrowserId] = useState<BrowserTool['id'] | null>(null);
  const [models, setModels] = useState<Record<string, string>>({});
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AllowConnectionsResult | null>(null);

  const agents = useMemo(() => preflight.data?.agents ?? [], [preflight.data]);
  const browserTools = useBrowserTools();
  const browsers = useMemo(() => browserTools.data ?? [], [browserTools.data]);
  const scanning = preflight.isPending || preflight.isFetching;

  // Best usable pair until the owner picks; their own pick always wins.
  const aiId =
    pickedAi ??
    (agents.find((a) => a.state === 'found' && a.runnable) ?? agents.find((a) => a.state === 'found'))?.id ??
    null;
  const browserId = pickedBrowser ?? (browsers.find((b) => b.state === 'running') ?? browsers[0])?.id ?? null;

  const ai = agents.find((a) => a.id === aiId);
  const browser = browsers.find((b) => b.id === browserId);
  const model = ai ? (models[ai.id] ?? ai.defaultModel ?? ai.models[0]?.value ?? null) : null;
  const modelLabel = ai?.models.find((m) => m.value === model)?.label;
  const aiReady = ai !== undefined && ai.state === 'found' && ai.runnable;
  const browserReady = browser?.state === 'running';
  const canAllow = !scanning && phase === 'pick' && aiReady && browserReady;

  const blocker = scanning
    ? null
    : !ai || ai.state !== 'found'
      ? 'No AI found yet. Install Claude Code, or add another agent below, then check again.'
      : !ai.runnable
        ? `${ai.name} is found, but running jobs with it is not ready yet. Pick Claude Code to continue.`
        : !browser
          ? 'No browser tool found yet.'
          : browser.state !== 'running'
            ? `${browser.name} ${browser.state === 'not_running' ? 'is not running. Open it, then check again.' : 'is not installed.'}`
            : null;

  const statusLine = scanning
    ? 'Looking for an AI and a browser tool on this computer…'
    : phase === 'testing'
      ? 'Testing: one short reply, one answer from the browser.'
      : phase === 'ok'
        ? 'Both work. Next I read your CV.'
        : phase === 'error'
          ? 'One of them did not answer. Details below.'
          : `Found ${agents.filter((a) => a.state === 'found').length} AI${agents.filter((a) => a.state === 'found').length === 1 ? '' : 's'} and ${browsers.filter((b) => b.state === 'running').length} browser tool${browsers.filter((b) => b.state === 'running').length === 1 ? '' : 's'}. I picked the best pair.`;
  const capLine = scanning
    ? 'Looking around…'
    : phase === 'testing'
      ? 'Sending a test…'
      : phase === 'ok'
        ? 'Both answered.'
        : phase === 'error'
          ? 'Something needs a look.'
          : 'Change my picks if you like.';

  const runAllow = async () => {
    if (!ai || !browser || busy) return;
    setBusy(true);
    setSheet(false);
    setPhase('testing');
    const outcome = await allow
      .mutateAsync({ agent: { id: ai.id, model }, browser: { id: browser.id } })
      .catch((error: unknown): AllowConnectionsResult => ({
        agent: { ok: false, ms: null, message: error instanceof Error ? error.message : 'Could not allow.' },
        browser: null,
      }));
    setBusy(false);
    setResult(outcome);
    setPhase(outcome.agent?.ok !== false && outcome.browser?.ok !== false ? 'ok' : 'error');
  };

  const row = (tool: AgentTool, i: number) => {
    const selected = tool.id === aiId;
    const usable = tool.state === 'found';
    const trailing =
      selected && phase === 'pick' && usable && tool.models.length > 0 ? (
        <Select
          size="sm"
          aria-label={`${tool.name} model (listed by ${tool.name})`}
          className="w-auto flex-none"
          value={model ?? ''}
          onChange={(event) => setModels((current) => ({ ...current, [tool.id]: event.target.value }))}
        >
          {tool.models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      ) : selected && phase === 'testing' ? (
        <Spinner label="Testing" />
      ) : selected && result?.agent ? (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap',
            result.agent.ok ? 'text-brand-text' : 'text-bad',
          )}
        >
          {result.agent.ok ? <OkDot size={18} /> : '✕'}{' '}
          {result.agent.ok ? outcomeText(true, result.agent.ms, 'agent') : 'No answer'}
        </span>
      ) : null;
    return (
      <PickRow
        key={tool.id}
        selected={selected}
        disabled={!usable || phase !== 'pick'}
        mono={monoOf(tool)}
        name={tool.name}
        sub={agentSub(tool)}
        delay={`${0.35 + i * 0.1}s`}
        dimmed={!usable || (phase === 'ok' && !selected)}
        trailing={trailing}
        onPick={() => setAiId(tool.id)}
      />
    );
  };

  return (
    <>
      <OnboardingHeader step={1} />
      <main
        className={cn(
          'relative flex min-h-[calc(100dvh-var(--app-toolbar-height,56px))] items-center justify-center gap-20 px-14 py-8',
          REDUCE_ALL,
        )}
      >
        <div className="relative flex w-[520px] max-w-full flex-col gap-6">
          <div className={cn('flex flex-col gap-3', A_RISE)}>
            <Cap>Welcome · about 2 minutes</Cap>
            <h1 className={cn(H1, 'text-[48px] leading-[1.04]')}>
              Hi, I’m Cap. <span className={IT}>I do the applying, you approve.</span>
            </h1>
            <p aria-live="polite" className="m-0 flex min-h-[22px] items-center gap-2.5 text-[15px] text-muted">
              {scanning && <Spinner label="Looking" />}
              {statusLine}
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-2">
              <Cap className={cn(A_RISE, '[--d:.2s]')}>YOUR AI</Cap>
              <ul
                role="radiogroup"
                aria-label="Your AI"
                className={cn(
                  'm-0 list-none overflow-hidden rounded-2xl border border-line bg-panel p-0',
                  A_RISE,
                  '[--d:.25s]',
                )}
              >
                {agents.map(row)}
                {!scanning && !agents.some((a) => a.id === 'custom') && (
                  <li>
                    <button
                      type="button"
                      disabled={chooseCustom.isPending || phase !== 'pick'}
                      onClick={() =>
                        chooseCustom.mutate(undefined, {
                          onSuccess: (p) => setAiId(p.agents.find((a) => a.id === 'custom')?.id ?? null),
                        })
                      }
                      className="flex h-11 w-full items-center gap-2.5 border-t border-line bg-transparent px-[18px] text-left text-sm font-medium text-muted hover:bg-hover hover:text-ink disabled:opacity-50"
                    >
                      <span className="text-lg">+</span>Another agent (any command-line AI)
                    </button>
                  </li>
                )}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Cap className={cn(A_RISE, '[--d:.3s]')}>A BROWSER TOOL (MCP)</Cap>
              <ul
                role="radiogroup"
                aria-label="A browser tool"
                className={cn(
                  'm-0 list-none overflow-hidden rounded-2xl border border-line bg-panel p-0',
                  A_RISE,
                  '[--d:.35s]',
                )}
              >
                {browsers.map((tool, i) => (
                  <PickRow
                    key={tool.id}
                    selected={tool.id === browserId}
                    disabled={tool.state !== 'running' || phase !== 'pick'}
                    mono={browserMono(tool)}
                    name={tool.name}
                    sub={browserSub(tool)}
                    delay={`${0.6 + i * 0.1}s`}
                    dimmed={tool.state !== 'running' || (phase === 'ok' && tool.id !== browserId)}
                    trailing={
                      tool.id === browserId && phase === 'testing' ? (
                        <Spinner label="Testing" />
                      ) : tool.id === browserId && result?.browser ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-[13px] font-semibold',
                            result.browser.ok ? 'text-brand-text' : 'text-bad',
                          )}
                        >
                          {result.browser.ok ? <OkDot size={18} /> : '✕'}{' '}
                          {result.browser.ok ? outcomeText(true, null, 'browser') : 'No answer'}
                        </span>
                      ) : null
                    }
                    onPick={() => setBrowserId(tool.id)}
                  />
                ))}
              </ul>
            </div>
          </div>

          {(blocker || chooseCustom.isError || phase === 'error') && (
            <p role="alert" className="m-0 text-[13.5px] leading-snug text-need">
              {phase === 'error'
                ? [
                    result?.agent?.ok === false ? result.agent.message : null,
                    result?.browser?.ok === false ? result.browser.message : null,
                  ]
                    .filter(Boolean)
                    .join(' ')
                : chooseCustom.isError
                  ? 'Choose an executable file.'
                  : blocker}
            </p>
          )}

          <div className="flex min-h-12 flex-wrap items-center gap-[18px]">
            {phase === 'ok' ? (
              <Button
                variant="primary"
                className={cn('h-12 px-6 text-[15px] font-semibold', PRESS)}
                onClick={() => void navigate(stepPath(2))}
              >
                Next: about you →
              </Button>
            ) : phase === 'testing' ? (
              <Button variant="primary" disabled className="h-12 px-6 text-[15px] font-semibold">
                <Spinner className="border-on-pri/40 border-t-on-pri" />
                Testing both…
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  disabled={!canAllow}
                  onClick={() => {
                    setResult(null);
                    setPhase('pick');
                    setSheet(true);
                  }}
                  className={cn('h-12 px-6 text-[15px] font-semibold', PRESS)}
                >
                  {scanning ? 'Looking…' : `Allow ${ai?.name ?? 'AI'} + ${browser?.name ?? 'browser'}`}
                </Button>
                {(phase === 'error' || blocker) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setPhase('pick');
                      setResult(null);
                      void preflight.refetch();
                    }}
                  >
                    Check again
                  </Button>
                )}
              </>
            )}
            <span className="text-[13.5px] leading-snug text-muted">Nothing connects until you allow it.</span>
          </div>
        </div>

        <RouteMap
          aiName={ai ? `${ai.name}${modelLabel ? ` · ${modelLabel}` : ''}` : '—'}
          aiMono={ai ? monoOf(ai) : '··'}
          browserName={browser?.name ?? '—'}
          browserMono={browser ? browserMono(browser) : '··'}
          phase={phase}
          scanning={scanning}
          capLine={capLine}
        />
      </main>

      <ConsentSheet
        open={sheet}
        agent={ai}
        model={modelLabel ?? model ?? undefined}
        browser={browser}
        busy={busy}
        onAllow={() => void runAllow()}
        onClose={() => !busy && setSheet(false)}
      />
    </>
  );
}
