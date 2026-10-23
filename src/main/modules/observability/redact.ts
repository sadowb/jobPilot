import { isNativeError } from 'node:util/types';

function sensitiveKey(key: string): boolean {
  const words = key
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[_-]+/);
  return (
    /^(key|code)$/i.test(key) ||
    words.some((word) =>
      /^(password|passwd|passphrase|secret|token|cookie|authorization|session|otp|totp)$/.test(word),
    ) ||
    /^(apikey|privatekey|hexkey)$/.test(words.slice(-2).join(''))
  );
}
const censored = '[REDACTED]';

/** Copy data properties plus native error diagnostics; never invoke toJSON. */
export function redact(value: unknown, depth = 0, ancestors = new WeakSet<object>()): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/(hexkey|key|password|token)=[^&\s'"]+/gi, '$1=[REDACTED]')
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
  }
  if (value === null || typeof value !== 'object') return typeof value === 'function' ? censored : value;
  if (depth >= 20) return '[Depth limit]';
  if (ancestors.has(value)) return '[Circular]';
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (isNativeError(value)) {
    // V8 can expose native error diagnostics through lazy accessors.
    for (const key of ['message', 'stack', 'code'] as const) {
      if (!(key in value)) continue;
      try {
        descriptors[key] = { value: (value as Error & { code?: unknown })[key], enumerable: true };
      } catch {
        descriptors[key] = { value: censored, enumerable: true };
      }
    }
    descriptors.type = {
      value:
        descriptors.name?.value ??
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(value), 'name')?.value ??
        'Error',
      enumerable: true,
    };
  }
  const result = Array.isArray(value)
    ? Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, index);
        return descriptor && 'value' in descriptor ? redact(descriptor.value, depth + 1, ancestors) : censored;
      })
    : Object.fromEntries(
        Object.entries(descriptors)
          .filter(([, descriptor]) => descriptor.enumerable)
          .map(([key, descriptor]) => [
            key,
            (sensitiveKey(key) && !(isNativeError(value) && key === 'code')) || !('value' in descriptor)
              ? censored
              : redact(descriptor.value, depth + 1, ancestors),
          ]),
      );
  ancestors.delete(value);
  return result;
}
