import { useEffect, useState } from 'react';
import { AgentModelSchema, type AgentState } from '../../../../shared/dto';
import { Button, Field, Input, Select, Status, type StatusKind } from '../../components/ui';
import { S } from '../shared-ui';

const STATUS: Record<AgentState['status'], { kind: StatusKind; label: string; help: string }> = {
  ready: { kind: 'done', label: 'Ready', help: 'Runs use the Claude you are signed into on this Mac.' },
  needs_confirmation: { kind: 'need', label: 'Confirm Claude', help: 'Save once so runs use this copy of Claude.' },
  tool_not_installed: {
    kind: 'bad',
    label: 'Claude not found',
    help: 'Install Claude Code, then run claude once in Terminal to sign in.',
  },
  not_logged_in: { kind: 'need', label: 'Sign in needed', help: 'Open Terminal and run claude once to sign in.' },
  api_key_required: { kind: 'need', label: 'API key needed', help: 'Save an API key below to enable runs.' },
};

export function AgentCard() {
  const [state, setState] = useState<AgentState>();
  const [path, setPath] = useState('');
  const [model, setModel] = useState<AgentState['model']>('haiku');
  const [auth, setAuth] = useState<AgentState['auth']>('login');
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function update(value: AgentState) {
    setState(value);
    setPath(value.path ?? '');
    setModel(value.model);
    setAuth(value.auth);
    if (!value.confirmed) setManual(true);
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
      setManual(true);
      setError('That location is not a working copy of Claude. Choose the claude file itself.');
    } finally {
      setBusy(false);
    }
  }
  const status = state ? STATUS[state.status] : undefined;
  return (
    <section className="border-t border-line py-2.5 text-[13px]" aria-label="Agent settings">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="m-0 font-sans text-[15px] font-[650] tracking-[0]">Agent</h2>
          <p className={`${S} mt-0.5 leading-[1.45]`}>{status?.help ?? 'Looking for Claude on this Mac…'}</p>
          {state?.path && (
            <p className={`${S} mt-0.5 truncate font-mono text-[11px]`} title={state.path}>
              {state.version ? `${state.version} · ` : ''}
              {state.path}
            </p>
          )}
        </div>
        <Status kind={status?.kind ?? 'idle'} data-testid="agent-status">
          {status?.label ?? 'Detecting…'}
        </Status>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-[7px] font-semibold">
          Model
          <Select
            size="sm"
            aria-label="Agent model"
            value={model}
            disabled={busy}
            onChange={(event) => setModel(AgentModelSchema.parse(event.target.value))}
          >
            <option value="haiku">Haiku (fastest)</option>
            <option value="sonnet">Sonnet</option>
            <option value="opus">Opus</option>
          </Select>
        </label>
        <label className="flex min-w-0 flex-col gap-[7px] font-semibold">
          Sign-in
          <Select
            size="sm"
            aria-label="Agent authentication"
            value={auth}
            disabled={busy}
            onChange={(event) => setAuth(event.target.value === 'login' ? 'login' : 'api_key')}
          >
            <option value="login">Your Claude login</option>
            <option value="api_key">API key</option>
          </Select>
        </label>
      </div>
      <details className="mt-2.5" open={manual} onToggle={(event) => setManual(event.currentTarget.open)}>
        <summary className={`${S} cursor-pointer select-none`}>Choose location manually</summary>
        <div className="mt-2">
          <Field label="Claude executable path" hint="The claude file on this Mac. Runs use this saved location.">
            <Input
              id="claude-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              disabled={busy}
              spellCheck={false}
            />
          </Field>
        </div>
      </details>
      <div className="mt-2.5 flex items-center gap-2">
        <Button size="sm" variant="primary" disabled={busy || !path.startsWith('/')} onClick={() => void act('save')}>
          Save
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act('detect')}>
          Find again
        </Button>
        <p role="status" className={`${S} ml-1`}>
          {error || (state?.confirmed ? 'Saved.' : 'Save once before starting a run.')}
        </p>
      </div>
    </section>
  );
}
