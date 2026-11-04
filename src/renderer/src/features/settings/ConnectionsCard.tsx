import { useState } from 'react';
import type { AgentTool, BrowserTool } from '../../../../shared/dto';
import { Button, Status } from '../../components/ui';
import {
  hasBridge,
  useAllowConnections,
  useBrowserTools,
  useGrants,
  usePreflight,
  useRevokeGrant,
  useRuns,
} from '../../lib/api';
import { ConsentSheet } from '../onboarding/ConsentSheet';
import { S } from '../shared-ui';
import { hasLiveRun } from './liveRun';

type Target = { agent: AgentTool } | { browser: BrowserTool };

/** What the owner allowed, with an off switch for each, and an Allow for tools found but not yet allowed. */
export function ConnectionsCard() {
  const grants = useGrants();
  const preflight = usePreflight();
  const browsers = useBrowserTools();
  const allow = useAllowConnections();
  const revoke = useRevokeGrant();
  const runs = useRuns();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [error, setError] = useState('');
  if (!hasBridge()) return null;

  const active = grants.data ?? [];
  const rows = [
    ...(preflight.data?.agents ?? [])
      .filter((a) => a.state === 'found' && a.runnable)
      .map((a) => ({
        key: `agent:${a.id}`,
        kind: 'agent' as const,
        id: a.id,
        name: a.name,
        target: { agent: a } as Target,
      })),
    ...(browsers.data ?? [])
      .filter((b) => b.state === 'running')
      .map((b) => ({
        key: `browser:${b.id}`,
        kind: 'browser' as const,
        id: b.id,
        name: b.name,
        target: { browser: b } as Target,
      })),
  ];
  // Custom agents and tools that are off or gone still show their grant so it can be revoked.
  const known = new Set(rows.map((r) => `${r.kind}:${r.id}`));
  const orphans = active.filter((g) => !known.has(`${g.kind}:${g.provider}`));

  const turnOff = (grantId: string) => {
    if (hasLiveRun(runs.data) && confirming !== grantId) return setConfirming(grantId);
    setConfirming(null);
    revoke.mutate(grantId);
  };
  const offButton = (grantId: string) =>
    confirming === grantId ? (
      <span className="flex items-center gap-1.5">
        <span className={S}>A job is in progress. Turn off anyway?</span>
        <Button size="sm" variant="danger" disabled={revoke.isPending} onClick={() => turnOff(grantId)}>
          Turn off
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
          Keep on
        </Button>
      </span>
    ) : (
      <Button size="sm" variant="ghost" disabled={revoke.isPending} onClick={() => turnOff(grantId)}>
        Turn off
      </Button>
    );

  const submit = async () => {
    if (!target) return;
    setError('');
    try {
      const result = await allow.mutateAsync(
        'agent' in target ? { agent: { id: target.agent.id, model: null } } : { browser: { id: target.browser.id } },
      );
      const failure = [result.agent, result.browser].find((r) => r && !r.ok);
      if (failure) setError(failure.message ?? 'That did not answer.');
      else setTarget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work. Try again.');
    }
  };

  return (
    <section className="border-t border-line py-2.5 text-[13px]" aria-label="Connections">
      <h2 className="m-0 font-sans text-[15px] font-[650] tracking-[0]">Connections</h2>
      <p className={`${S} mt-0.5 leading-[1.45]`}>
        Nothing runs unless you allowed it here. Turn a connection off any time; running jobs finish cleaning up.
      </p>
      <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
        {rows.map((row) => {
          const grant = active.find((g) => g.kind === row.kind && g.provider === row.id);
          return (
            <li key={row.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                {row.name}
                <Status kind={grant ? 'done' : 'idle'}>{grant ? 'Allowed' : 'Off'}</Status>
              </span>
              {grant ? (
                offButton(grant.id)
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setError('');
                    setTarget(row.target);
                  }}
                >
                  Allow
                </Button>
              )}
            </li>
          );
        })}
        {orphans.map((grant) => (
          <li key={grant.id} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{grant.executablePath ?? grant.provider}</span>
              <Status kind="done">Allowed</Status>
            </span>
            {offButton(grant.id)}
          </li>
        ))}
        {rows.length === 0 && orphans.length === 0 && <li className={S}>No AI or browser tool found yet.</li>}
      </ul>
      {error && (
        <p role="alert" className="mt-1.5 text-bad">
          {error}
        </p>
      )}
      <ConsentSheet
        open={target !== null}
        agent={target && 'agent' in target ? target.agent : undefined}
        browser={target && 'browser' in target ? target.browser : undefined}
        busy={allow.isPending}
        onAllow={() => void submit()}
        onClose={() => !allow.isPending && setTarget(null)}
      />
    </section>
  );
}
