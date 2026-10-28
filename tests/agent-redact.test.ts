import { describe, expect, it } from 'vitest';
import { redactSecret, stderrDiagnostic } from '../src/main/platform/agents/redact';

const key = 'sk-ant-api03-AbC_dEf-123456789xyz';

describe('redactSecret', () => {
  it('masks every occurrence', () => {
    expect(redactSecret(`a ${key} b ${key}`, key)).toBe('a [REDACTED] b [REDACTED]');
  });

  it('masks JSON-escaped, URL-encoded and base64 forms', () => {
    const tricky = 'sk-"q"\\/é';
    expect(redactSecret(JSON.stringify({ t: tricky }), tricky)).toBe('{"t":"[REDACTED]"}');
    expect(redactSecret(`?k=${encodeURIComponent(tricky)}`, tricky)).toBe('?k=[REDACTED]');
    const b64 = Buffer.from(key).toString('base64');
    expect(redactSecret(`x${b64}y`, key)).toBe('x[REDACTED]y');
    expect(redactSecret(b64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''), key)).toBe('[REDACTED]');
  });

  it('leaves text untouched without a key', () => {
    expect(redactSecret('plain', '')).toBe('plain');
  });
});

describe('stderrDiagnostic', () => {
  it('masks a key split across chunks', () => {
    const stderr = Buffer.concat([Buffer.from(`boom ${key.slice(0, 10)}`), Buffer.from(`${key.slice(10)} end`)]);
    expect(stderrDiagnostic(stderr, key)).toBe('boom [REDACTED] end');
  });

  it('never emits a partial key when it straddles the 200-char cut', () => {
    const out = stderrDiagnostic(Buffer.from('x'.repeat(190) + key), key);
    expect(out).toBe('x'.repeat(190) + '[REDACTED]');
    expect(out).not.toContain('sk-ant');
  });

  it('masks a multi-byte-adjacent key', () => {
    expect(stderrDiagnostic(Buffer.from(`é${key}é`), key)).toBe('é[REDACTED]é');
  });
});
