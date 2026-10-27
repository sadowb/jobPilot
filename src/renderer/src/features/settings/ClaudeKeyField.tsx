import { useRef, useState } from 'react';
import { Button, Field, Input } from '../../components/ui';
import { hasBridge, useClaudeKeyStatus, useRemoveClaudeKey, useSetClaudeKey, useTestClaudeKey } from '../../lib/api';
import { S } from '../shared-ui';

export function ClaudeKeyField() {
  const input = useRef<HTMLInputElement>(null);
  const query = useClaudeKeyStatus();
  const status = query.data;
  const setKey = useSetClaudeKey();
  const removeKey = useRemoveClaudeKey();
  const testKey = useTestClaudeKey();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  // Open by default when a key is already saved; once the owner toggles it, their choice wins.
  const [toggled, setToggled] = useState<boolean>();
  const open = toggled ?? !!status?.set;

  async function act(action: 'save' | 'test' | 'remove') {
    if (!hasBridge() || busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (action === 'save') {
        const pending = setKey.mutateAsync(input.current?.value ?? '');
        if (input.current) input.current.value = '';
        await pending;
        setMessage('Claude API key saved.');
      } else if (action === 'remove') {
        await removeKey.mutateAsync();
        if (input.current) input.current.value = '';
        setMessage('Claude API key removed.');
      } else {
        const result = await testKey.mutateAsync();
        setMessage(
          result === 'ok'
            ? 'Claude API key works.'
            : result === 'not_set'
              ? 'Save a key first.'
              : result === 'invalid'
                ? 'This key was rejected. Check it in the Anthropic Console.'
                : "Couldn't reach Anthropic. Check your connection and try again.",
        );
      }
    } catch {
      setMessage('Could not update or test the Claude API key.');
    } finally {
      if (input.current) input.current.value = '';
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-line py-2.5 text-[13px]" aria-label="Claude API key settings">
      <details open={open} onToggle={(event) => setToggled(event.currentTarget.open)}>
        <summary className="flex cursor-pointer items-center justify-between gap-4 select-none">
          <span className="font-semibold">Use an API key instead (optional)</span>
          <span className={S} data-testid="claude-key-status">
            {status ? (status.set ? `Saved · ••••${status.last4}` : 'No key saved') : 'Status unavailable'}
          </span>
        </summary>
        <div className="mt-2.5">
          <Field
            label="Claude API key (optional)"
            hint="JobPilot uses the Claude you're signed into on this Mac. Add a key only to use API billing instead."
          >
            <Input
              id="claude-api-key"
              ref={input}
              type="password"
              autoComplete="off"
              spellCheck={false}
              maxLength={512}
              disabled={busy}
              placeholder="Enter a new key"
            />
          </Field>
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={busy || !status} onClick={() => void act('save')}>
              Save key
            </Button>
            <Button size="sm" disabled={busy || !status?.set} onClick={() => void act('test')}>
              Test
            </Button>
            <Button size="sm" disabled={busy || !status?.set} onClick={() => void act('remove')}>
              Remove
            </Button>
          </div>
          <p role="status" className={S}>
            {message || (query.isError ? 'Could not read Claude API key status.' : '')}
          </p>
        </div>
      </details>
    </section>
  );
}
