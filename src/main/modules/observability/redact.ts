const sensitiveKey = /password|secret|token|cookie|authorization|key|session|otp|code/i;
const censored = '[REDACTED]';

/** Copy only data properties: getters/toJSON must not bypass redaction during serialization. */
export function redact(value: unknown, depth = 0, ancestors = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') return typeof value === 'function' ? censored : value;
  if (depth >= 20) return '[Depth limit]';
  if (ancestors.has(value)) return '[Circular]';
  ancestors.add(value);
  const result = Array.isArray(value)
    ? Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, index);
        return descriptor && 'value' in descriptor ? redact(descriptor.value, depth + 1, ancestors) : censored;
      })
    : Object.fromEntries(
        Object.entries(Object.getOwnPropertyDescriptors(value))
          .filter(([, descriptor]) => descriptor.enumerable)
          .map(([key, descriptor]) => [
            key,
            sensitiveKey.test(key) || !('value' in descriptor)
              ? censored
              : redact(descriptor.value, depth + 1, ancestors),
          ]),
      );
  ancestors.delete(value);
  return result;
}
