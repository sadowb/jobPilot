import { describe, expect, it } from 'vitest';
import { isNetworkError, isRetryableStatus, retryDelayMs } from '../src/main/modules/postings/ats/common';

describe('ATS retry delay and headers (#143)', () => {
  it('honours Retry-After with seconds value', () => {
    const headers = new Headers({ 'retry-after': '2' });
    // Without jitter (factor 1.0)
    const delay = retryDelayMs({ headers }, 0, { random: () => 0.5 });
    expect(delay).toBe(2000);

    // With min jitter (-20%)
    const minDelay = retryDelayMs({ headers }, 0, { random: () => 0 });
    expect(minDelay).toBe(1600);

    // With max jitter (+20%)
    const maxDelay = retryDelayMs({ headers }, 0, { random: () => 1 });
    expect(maxDelay).toBe(2400);
  });

  it('honours Retry-After with HTTP-date', () => {
    const now = 1_700_000_000_000;
    const targetDate = new Date(now + 5_000).toUTCString();
    const headers = new Headers({ 'retry-after': targetDate });

    const delay = retryDelayMs({ headers }, 0, { now, random: () => 0.5 });
    expect(delay).toBe(5000);

    // Past date produces 0 delay
    const pastDate = new Date(now - 10_000).toUTCString();
    const pastHeaders = new Headers({ 'retry-after': pastDate });
    expect(retryDelayMs({ headers: pastHeaders }, 0, { now, random: () => 0.5 })).toBe(0);
  });

  it('falls back to exponential backoff when no Retry-After header is present', () => {
    // Attempt 0: 250ms * 2^0 = 250ms
    expect(retryDelayMs(undefined, 0, { random: () => 0.5 })).toBe(250);
    // Attempt 1: 250ms * 2^1 = 500ms
    expect(retryDelayMs(undefined, 1, { random: () => 0.5 })).toBe(500);
    // Attempt 2: 250ms * 2^2 = 1000ms
    expect(retryDelayMs(undefined, 2, { random: () => 0.5 })).toBe(1000);

    const emptyHeaders = new Headers();
    expect(retryDelayMs({ headers: emptyHeaders }, 0, { random: () => 0.5 })).toBe(250);
  });

  it('caps delay at 30 seconds before jitter', () => {
    const headers = new Headers({ 'retry-after': '120' });
    const delay = retryDelayMs({ headers }, 0, { random: () => 0.5 });
    expect(delay).toBe(30_000);

    const now = 1_700_000_000_000;
    const farFuture = new Date(now + 120_000).toUTCString();
    const futureHeaders = new Headers({ 'retry-after': farFuture });
    expect(retryDelayMs({ headers: futureHeaders }, 0, { now, random: () => 0.5 })).toBe(30_000);
  });
});

describe('ATS retryable status codes (#143)', () => {
  it('identifies 408, 429, and 5xx as retryable', () => {
    expect(isRetryableStatus(408)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(504)).toBe(true);
    expect(isRetryableStatus(520)).toBe(true);
  });

  it('identifies 2xx, 3xx, and 4xx (except 408/429) as non-retryable', () => {
    expect(isRetryableStatus(200)).toBe(false);
    expect(isRetryableStatus(301)).toBe(false);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(403)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });
});

describe('ATS network error detection (#143)', () => {
  it('detects connection, timeout, and fetch errors as network errors', () => {
    expect(isNetworkError(new TypeError('fetch failed'))).toBe(true);
    expect(isNetworkError({ name: 'TimeoutError' })).toBe(true);
    expect(isNetworkError({ name: 'AbortError' })).toBe(true);
    expect(isNetworkError({ code: 'ECONNREFUSED' })).toBe(true);
    expect(isNetworkError({ code: 'ECONNRESET' })).toBe(true);
    expect(isNetworkError({ code: 'ENOTFOUND' })).toBe(true);
    expect(isNetworkError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isNetworkError({ cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } })).toBe(true);
  });

  it('does not treat validation or programming errors as network errors', () => {
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(new Error('Validation failed'))).toBe(false);
    expect(isNetworkError(new TypeError('Cannot read properties of undefined'))).toBe(false);
    expect(isNetworkError(new RangeError('Out of range'))).toBe(false);
  });
});
