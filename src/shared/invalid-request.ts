import type { ZodError, ZodType, output } from 'zod';

/** One short sentence for a failed input parse: never the raw zod issue JSON. Shared by main and preload. */
export function invalidRequestMessage(error: ZodError): string {
  const issue = error.issues[0];
  const where = issue?.path.map(String).join('.');
  return issue ? `Invalid request: ${where ? `${where}: ` : ''}${issue.message}` : 'Invalid request.';
}

/** Parses bridge input, throwing a short Error instead of the ZodError. */
export function parseInput<S extends ZodType>(schema: S, input: unknown): output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(invalidRequestMessage(parsed.error));
  return parsed.data;
}
