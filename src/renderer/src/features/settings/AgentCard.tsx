import { useEffect, useState } from 'react';
import { AgentModelSchema, type AgentState } from '../../../../shared/dto';
import { Button, Field, Input } from '../../components/ui';

export function AgentCard() {
  const [state, setState] = useState<AgentState>();
  const [path, setPath] = useState('');
  const [model, setModel] = useState<AgentState['model']>('haiku');
  const [auth, setAuth] = useState<AgentState['auth']>('api_key');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function update(value: AgentState) {
    setState(value);
    setPath(value.path ?? '');
    setModel(value.model);
    setAuth(value.auth);
  }
  useEffect(() => {
    let active = true;
    void window.jobpilot?.agent.get().then(
      (value) => {
        if (active) update(value);
      },
      () => active && setError('Could not read Agent settings.'),
    );
    return () => {
      active = false;
    };
  }, []);
  async function act(action: 'detect' | 'save') {
    if (!window.jobpilot || busy) return;
    setBusy(true);
    setError('');
    try {
      update(
        await (action === 'detect'
          ? window.jobpilot.agent.detect()
          : window.jobpilot.agent.save({ path, model, auth })),
      );
    } catch {
      setError('Choose an absolute, executable Claude path that responds to --version.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="border-t border-line py-2.5 text-[13px]" aria-label="Agent settings">
      <h2 className="text-[15px] font-semibold">Agent</h2>
      <p data-testid="agent-status">Claude · {state?.status.replaceAll('_', ' ') ?? 'Detecting…'}</p>
      <p className="break-all">
        {state?.path ?? 'No Claude executable detected'} · {state?.version ?? 'Version unavailable'}
      </p>
      <p>
        Login:{' '}
        {state?.login === 'ok'
          ? 'ok'
          : state?.login === 'not_logged_in'
            ? 'not logged in'
            : 'unverified (--version cannot check login)'}
      </p>
      {state?.login !== 'ok' && <p>Open Terminal and run `claude` once to sign in</p>}
      <Field label="Claude executable path" hint="Confirm your installed CLI once. Runs use this saved path.">
        <Input
          id="claude-path"
          value={path}
          onChange={(event) => setPath(event.target.value)}
          disabled={busy}
          spellCheck={false}
        />
      </Field>
      <div className="mt-2 flex gap-4">
        <label>
          Model{' '}
          <select
            aria-label="Agent model"
            value={model}
            disabled={busy}
            onChange={(event) => setModel(AgentModelSchema.parse(event.target.value))}
          >
            <option value="haiku">Haiku</option>
            <option value="sonnet">Sonnet</option>
            <option value="opus">Opus</option>
          </select>
        </label>
        <label>
          Authentication{' '}
          <select
            aria-label="Agent authentication"
            value={auth}
            disabled={busy}
            onChange={(event) => setAuth(event.target.value === 'login' ? 'login' : 'api_key')}
          >
            <option value="api_key">API key</option>
            <option value="login">Own CLI login (personal use)</option>
          </select>
        </label>
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => void act('detect')}>
          Re-detect
        </Button>
        <Button size="sm" disabled={busy || !path.startsWith('/')} onClick={() => void act('save')}>
          Confirm path and save
        </Button>
      </div>
      {state?.status === 'api_key_required' && <p>Save an API key below to enable runs.</p>}
      <p role="status">
        {error ||
          (state?.confirmed
            ? 'Path confirmed. Model and authentication saved.'
            : 'Confirm a path before starting a run.')}
      </p>
    </section>
  );
}
