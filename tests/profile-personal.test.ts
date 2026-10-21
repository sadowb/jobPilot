import { describe, expect, it } from 'vitest';
import {
  documentError,
  EMPTY_PROFILE,
  initials,
  readAnswers,
  readProfile,
} from '../src/renderer/src/features/profile/personal';

describe('saved personal information', () => {
  it('restores profile edits while filling missing fields from defaults', () => {
    const profile = readProfile(JSON.stringify({ firstName: 'Ada', phone: '+44 123', bio: 'I build tools.' }));
    expect(profile).toEqual({ ...EMPTY_PROFILE, firstName: 'Ada', phone: '+44 123', bio: 'I build tools.' });
    expect(readProfile(JSON.stringify(profile))).toEqual(profile);
  });
  it('does not accept corrupt storage as editable profile data', () => {
    for (const raw of ['{', 'null', '[]', '{"phone":123}']) expect(() => readProfile(raw)).toThrow();
    expect(readProfile(null).email).toBe('');
  });
  it('preserves custom and cleared answers, without accepting duplicate ids', () => {
    const answers = [{ id: 'custom', question: 'Notice period?', answer: 'Two weeks' }];
    expect(readAnswers(JSON.stringify(answers))).toEqual(answers);
    expect(readAnswers('[]')).toEqual([]);
    for (const raw of ['null', '{}', '[{"id":"x","answer":1}]', JSON.stringify([...answers, ...answers])])
      expect(() => readAnswers(raw)).toThrow();
  });
  it('uses the saved name for the account initials', () => {
    expect(initials('  Ada Lovelace  ')).toBe('AL');
    expect(initials('')).toBe('ME');
  });
});

describe('profile document validation', () => {
  it('accepts PDF and DOCX and rejects unsupported, empty, and oversized files', () => {
    expect(documentError({ name: 'CV.PDF', size: 1024 })).toBeNull();
    expect(documentError({ name: 'CV.docx', size: 2048 })).toBeNull();
    expect(documentError({ name: 'CV.exe', size: 100 })).toMatch(/PDF or DOCX/);
    expect(documentError({ name: 'CV.pdf', size: 0 })).toMatch(/empty/);
    expect(documentError({ name: 'CV.pdf', size: 21 * 1024 * 1024 })).toMatch(/20 MB/);
  });
});
