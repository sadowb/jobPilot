import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseInput } from '../src/shared/invalid-request';

describe('parseInput (N4)', () => {
  const schema = z.object({ name: z.string().regex(/^[a-z]+$/) });
  it('returns parsed data', () => {
    expect(parseInput(schema, { name: 'abc' })).toEqual({ name: 'abc' });
  });
  it('throws one short sentence, not zod issue JSON', () => {
    expect(() => parseInput(schema, { name: '1' })).toThrow(/^Invalid request: name: /);
    expect(() => parseInput(schema, { name: '1' })).not.toThrow('"code"');
  });
});
