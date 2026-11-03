import type { ReactNode } from 'react';
import type { AgentTool, BrowserTool } from '../../../../shared/dto';
import { Button, Dialog, cn } from '../../components/ui';
import { Cap, ToolTile } from './parts';

const BARS = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 2, 1, 3, 1, 4];

/** Exactly what each connection can and cannot do. Kept next to the grant scopes in `shared/dto/enums.ts`: a wider scope needs new copy here. */
const AGENT_CAN = ['Read job pages and your profile', 'Write answers you approve'];
const AGENT_CANNOT = ['See your passwords or files', 'Run when JobPilot is closed'];
const BROWSER_CAN = ['Open its own tab for each job', 'Fill the form in that tab'];
const BROWSER_CANNOT = ['See your other tabs', 'Submit anything before you approve it'];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

function Stub({
  caption,
  mono,
  name,
  sub,
  can,
  cannot,
  stamped,
  stampDelay,
  children,
}: {
  caption: string;
  mono: string;
  name: string;
  sub: string;
  can: readonly string[];
  cannot: readonly string[];
  stamped: boolean;
  stampDelay?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative flex min-w-0 flex-1 flex-col gap-3.5 p-1" aria-label={caption}>
      <Cap>{caption}</Cap>
      <div className="flex items-center gap-3">
        <ToolTile size={40}>{mono}</ToolTile>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[17px] font-semibold">{name}</span>
          <span className="truncate text-[13px] text-muted">{sub}</span>
        </span>
      </div>
      {children}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {can.map((text) => (
          <li key={text} className="flex gap-2.5 text-sm leading-[1.45] text-ink-2">
            <span className="text-brand-text" aria-label="Can">
              ✓
            </span>
            {text}
          </li>
        ))}
        {cannot.map((text) => (
          <li key={text} className="flex gap-2.5 text-sm leading-[1.45] text-ink-2">
            <span className="text-muted" aria-label="Cannot">
              ✕
            </span>
            {text}
          </li>
        ))}
      </ul>
      {stamped && (
        <span
          aria-hidden="true"
          style={{ ['--d' as string]: stampDelay }}
          className="absolute top-0 right-0 -rotate-10 animate-ob-stamp rounded-lg border-[2.5px] border-brand bg-brand-tint/70 px-3.5 py-1.5 font-mono text-[17px] font-semibold tracking-[0.14em] text-brand motion-reduce:animate-none"
        >
          ALLOWED
        </span>
      )}
    </section>
  );
}

/**
 * The boarding-pass consent sheet. One Allow covers every connection shown on it; the grant is written by main
 * when `onAllow` runs, and nothing connects before that. Custom agents show the resolved path they will run.
 */
export function ConsentSheet({
  open,
  agent,
  model,
  browser,
  stamped,
  leaving,
  busy,
  onAllow,
  onClose,
}: {
  open: boolean;
  agent?: AgentTool;
  model?: string;
  browser?: BrowserTool;
  stamped: boolean;
  leaving: boolean;
  busy: boolean;
  onAllow: () => void;
  onClose: () => void;
}) {
  const count = Number(agent !== undefined) + Number(browser !== undefined);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow={`JobPilot · Boarding pass · ${count} connection${count === 1 ? '' : 's'}`}
      title={count === 1 ? 'Allow this one?' : 'Allow these two?'}
      titleAdornment={
        <span aria-hidden="true" className="flex items-end gap-0.5">
          {BARS.map((w, i) => (
            <span key={i} className="inline-block h-6 bg-line-2" style={{ width: w }} />
          ))}
        </span>
      }
      note="Turn either off any time in Settings."
      closeLabel="Not now"
      className={cn(
        'w-[min(720px,calc(100vw-32px))]',
        leaving && 'animate-ob-leave! motion-reduce:animate-none!',
        stamped && !leaving && 'animate-ob-thud!',
      )}
      bodyClassName="flex flex-col gap-6 sm:flex-row"
      onSubmit={() => !busy && onAllow()}
      actions={
        <>
          <Button size="sm" onClick={onClose} disabled={busy}>
            Not now
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={busy || stamped}>
            {count === 1 ? 'Allow' : 'Allow both'}
          </Button>
        </>
      }
    >
      {agent && (
        <Stub
          caption="YOUR AI"
          mono={agent.id === 'claude' ? 'CC' : agent.id === 'codex' ? 'CX' : '>_'}
          name={agent.name}
          sub={`${model ?? 'default model'} · uses your own plan`}
          can={AGENT_CAN}
          cannot={AGENT_CANNOT}
          stamped={stamped}
        >
          {agent.id === 'custom' && agent.path && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted">Runs exactly this file. I ask again if it changes.</span>
              <code className="rounded-[9px] border border-line bg-bg px-2.5 py-2 font-mono text-[12.5px] break-all">
                {agent.path}
              </code>
            </div>
          )}
        </Stub>
      )}
      {browser && (
        <Stub
          caption="BROWSER TOOL"
          mono={initials(browser.name)}
          name={browser.name}
          sub="Found automatically · MCP"
          can={BROWSER_CAN}
          cannot={BROWSER_CANNOT}
          stamped={stamped}
          stampDelay=".14s"
        />
      )}
    </Dialog>
  );
}
