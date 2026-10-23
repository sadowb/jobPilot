import { isNativeError } from 'node:util/types';

const sensitiveKey =
  /^(password|passwd|passphrase|secret|token|access_?token|refresh_?token|cookie|authorization|api_?key|hexkey|private_?key|key|session|session_?id|BW_SESSION|otp|totp|code)$/i;
const censored = '[REDACTED]';

/** Copy data properties plus native error diagnostics; never invoke toJSON. */
export function redact(value: unknown, depth = 0, ancestors = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') return typeof value === 'function' ? censored : value;
  if (depth >= 20) return '[Depth limit]';
  if (ancestors.has(value)) return '[Circular]';
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (isNativeError(value)) {
    // V8 can expose the native stack through a lazy accessor.
    try {
      descriptors.stack = { value: value.stack, enumerable: true };
    } catch {
      descriptors.stack = { value: censored, enumerable: true };
    }
    descriptors.type = {
      value:
        descriptors.name?.value ??
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(value), 'name')?.value ??
        'Error',
      enumerable: true,
    };
    for (const key of ['message', 'stack', 'code']) {
      if (descriptors[key]) descriptors[key].enumerable = true;
    }
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
            (sensitiveKey.test(key) && !(isNativeError(value) && key === 'code')) || !('value' in descriptor)
              ? censored
              : redact(descriptor.value, depth + 1, ancestors),
          ]),
      );
  ancestors.delete(value);
  return result;
}
