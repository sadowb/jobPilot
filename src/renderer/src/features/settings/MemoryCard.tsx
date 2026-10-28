import { useEffect, useState } from 'react';
import type { MemoryStatus } from '../../../../shared/dto';
import { Button, Status, type StatusKind } from '../../components/ui';
import { S } from '../shared-ui';

const KIND: Record<MemoryStatus['state'], { kind: StatusKind; label: string }> = {
  not_installed: { kind: 'idle', label: 'Not installed' },
  installing: { kind: 'need', label: 'Installing…' },
  ready: { kind: 'done', label: 'Ready' },
  failed: { kind: 'bad', label: 'Failed' },
};

// Small on purpose: moves onto TanStack Query hooks with the #89 renderer lane.
export function MemoryCard() {
  const [state, setState] = useState<MemoryStatus>();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const installing = state?.state === 'installing';

  useEffect(() => {
    let active = true;
    const read = () =>
      void window.jobpilot?.memory.status().then(
        (value) => active && setState(value),
        () => active && setError('Could not read memory status.'),
      );
    read();
    const timer = installing ? setInterval(read, 1000) : undefined;
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [installing]);

  async function act(action: 'install' | 'remove') {
    if (!window.jobpilot) return;
    setError('');
    setConfirming(false);
    try {
      setState(await window.jobpilot.memory[action]());
    } catch {
      setError('That did not work. Try again.');
    }
  }

  const status = state ? KIND[state.state] : undefined;
  const help =
    state?.state === 'ready'
      ? 'Agents recall your answers and each site’s quirks, and remember new ones. Stored only in JobPilot’s data folder.'
      : 'Agents remember your answers and each site’s quirks so the next application on a site goes faster. Installing downloads about 150 MB once, into JobPilot’s data folder, and nothing runs in the background.';
  return (
    <section className="border-t border-line py-2.5 text-[13px]" aria-label="Memory settings">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 font-sans text-[15px] font-[650] tracking-[0]">Memory</h2>
          <p className={`${S} mt-0.5 leading-[1.45]`}>{help}</p>
          {installing && (
            <p className={`${S} mt-0.5 font-mono text-[11px]`} role="status">
              {state.step}
              {state.percent === null ? '' : ` · ${state.percent}%`}
            </p>
          )}
          {state?.state === 'failed' && (
            <p className="mt-0.5 text-[12px] text-bad" role="alert">
              {state.error}
            </p>
          )}
        </div>
        <Status kind={status?.kind ?? 'idle'} data-testid="memory-status">
          {status?.label ?? 'Checking…'}
        </Status>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {(state?.state === 'not_installed' || state?.state === 'failed') && (
          <Button size="sm" variant="primary" onClick={() => void act('install')}>
            {state.state === 'failed' ? 'Retry install' : 'Install memory'}
          </Button>
        )}
        {state?.state === 'ready' &&
          (confirming ? (
            <>
              <Button size="sm" variant="primary" onClick={() => void act('remove')}>
                Remove everything
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
              Remove memory and its data
            </Button>
          ))}
        {error && (
          <p role="alert" className={`${S} ml-1`}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
