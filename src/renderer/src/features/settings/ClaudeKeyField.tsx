import { useEffect, useRef, useState } from 'react';
import type { ClaudeKeyStatus } from '../../../../shared/dto';
import { Button, Input } from '../../components/ui';

export function ClaudeKeyField() {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ClaudeKeyStatus>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void window.jobpilot?.claudeKey.status().then(
      (value) => active && setStatus(value),
      () => active && setMessage('Could not read Claude API key status.'),
    );
    return () => {
      active = false;
    };
  }, []);

  async function act(action: 'save' | 'test' | 'remove') {
    if (!window.jobpilot || busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (action === 'save') {
        const pending = window.jobpilot.claudeKey.set(input.current?.value ?? '');
        if (input.current) input.current.value = '';
        await pending;
        setMessage('Claude API key saved.');
      } else if (action === 'remove') {
        await window.jobpilot.claudeKey.remove();
        if (input.current) input.current.value = '';
        setMessage('Claude API key removed.');
      } else {
        const result = await window.jobpilot.claudeKey.test();
        setMessage(
          result === 'ok'
            ? 'Claude API key works.'
            : result === 'not_set'
              ? 'Save a key first.'
              : 'Claude API test failed. Check your key, credits, and connection.',
        );
      }
      setStatus(await window.jobpilot.claudeKey.status());
    } catch {
      setMessage('Could not update or test the Claude API key.');
    } finally {
      if (input.current) input.current.value = '';
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-line py-2.5" aria-label="Claude API key settings">
      <label className="text-[15px] font-semibold" htmlFor="claude-api-key">
        Claude API key
      </label>
      <p className="my-2 text-[13px] text-muted">
        Encrypted on this Mac. Test sends a one-token request to Claude Haiku.
      </p>
      <p className="text-[13px]" data-testid="claude-key-status">
        {status ? (status.set ? `Saved · ••••${status.last4}` : 'No key saved') : 'Status unavailable'}
      </p>
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
      <p role="status" className="text-[13px]">
        {message}
      </p>
    </section>
  );
}
