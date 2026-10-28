const MASK = '[REDACTED]';
// Stderr is diagnostic only; bound memory while keeping enough to scrub a key that straddles the 200-char log cut.
export const STDERR_CAP = 64 * 1024;

/** Every textual form the key can take inside a string: raw, JSON-escaped, URL-encoded, base64 and base64url. */
function forms(secret: string): string[] {
  const b64 = Buffer.from(secret).toString('base64');
  const variants = [
    secret,
    JSON.stringify(secret).slice(1, -1),
    encodeURIComponent(secret),
    b64,
    b64.replace(/=+$/, ''),
    b64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''),
  ];
  // Longest first so a longer form is not left half-masked by a shorter overlapping one.
  return [...new Set(variants)].sort((a, b) => b.length - a.length);
}

/**
 * Mask every occurrence of `secret` (and its common encodings) in `text`.
 * shortcut: base64 only matches when the key starts at a 3-byte boundary of the encoded source, upgrade if keys get re-encoded mid-string.
 */
export function redactSecret(text: string, secret: string): string {
  return secret ? forms(secret).reduce((out, form) => out.replaceAll(form, MASK), text) : text;
}

/** Collected stderr -> at most 200 chars, key masked before truncation so a key cannot be cut in half. */
export function stderrDiagnostic(stderr: Buffer, secret: string): string {
  return redactSecret(stderr.subarray(0, STDERR_CAP).toString('utf8'), secret).slice(0, 200);
}
