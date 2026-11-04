import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGreenhouseSchema } from '../src/main/modules/postings/ats/schema';
import {
  buildFillPlan,
  careerYears,
  mapNumberToOption,
  matchOption,
  postingCountry,
  type PlanContext,
} from '../src/main/modules/postings/fill-plan';
import { saraProfile } from './helpers-profile';

const schema = parseGreenhouseSchema(
  JSON.parse(readFileSync('tests/fixtures/greenhouse-perpay-5003430007.json', 'utf8')),
);
const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({
  profile: saraProfile(),
  cv: { fileName: 'Sara_Benali_CV.pdf', text: 'Sara Benali\nlinkedin.com/in/sara-benali\ngithub.com/sarab' },
  library: new Map(),
  owner: new Map(),
  postingCountry: 'US',
  ...over,
});
const entry = (plan: ReturnType<typeof buildFillPlan>, key: string) => plan.entries.find((e) => e.field_key === key)!;

describe('mapping values onto the form’s options', () => {
  it('maps years onto ranges, preferring the range that starts highest where they touch', () => {
    const options = ['0', '1', '2-5', '5+'];
    expect(mapNumberToOption(0.4, options)).toBe('0');
    expect(mapNumberToOption(1.5, options)).toBe('1');
    expect(mapNumberToOption(4, options)).toBe('2-5');
    expect(mapNumberToOption(5, options)).toBe('5+');
    expect(mapNumberToOption(12, options)).toBe('5+');
    expect(mapNumberToOption(3, ['Less than 2 years', '2 to 4 years', 'More than 4 years'])).toBe('2 to 4 years');
    expect(mapNumberToOption(1, ['Alpha', 'Beta'])).toBeNull();
  });

  it('matches free values to option labels, never guessing between two', () => {
    expect(matchOption('yes', ['Yes', 'No'])).toBe('Yes');
    expect(matchOption('true', ['Yes', 'No'])).toBe('Yes');
    expect(matchOption('linkedin', ['Career fair', 'Google', 'LinkedIn'])).toBe('LinkedIn');
    expect(matchOption('Word of mouth', ['Word of mouth', 'Other'])).toBe('Word of mouth');
    expect(matchOption('social', ['Social media', 'Social event'])).toBeNull();
    expect(matchOption('Sometimes', ['Yes', 'No'])).toBeNull();
  });

  it('sums career years once across overlapping spells', () => {
    const profile = saraProfile({
      career: [
        { id: 'a', role: 'r', organisation: 'o', start: '2020-01', end: '2021-12' },
        { id: 'b', role: 'r', organisation: 'o', start: '2021-01', end: '2022-12' },
        { id: 'c', role: 'r', organisation: 'o', start: '2024-01', end: '2024-12' },
      ],
    });
    expect(careerYears(profile)).toBeCloseTo(4, 5);
    expect(careerYears(saraProfile({ career: [] }))).toBeNull();
  });

  it('reads a posting country only from a spelled-out name', () => {
    expect(postingCountry('Philadelphia, Pennsylvania, United States')).toBe('US');
    expect(postingCountry('Philadelphia, PA')).toBeNull();
    expect(postingCountry('Berlin, Germany')).toBe('DE');
    expect(postingCountry(null)).toBeNull();
  });
});

describe('Greenhouse plan for the Perpay posting (#237, #233)', () => {
  const plan = buildFillPlan('app-1', schema, ctx());

  it('keys every entry by the real field name and keeps the order of the form', () => {
    expect(plan.origin).toBe('ats_schema');
    expect(plan.entries.map((e) => e.field_key)).toEqual(schema.fields.map((f) => f.name));
  });

  it('fills identity fields from the confirmed profile and attaches the CV file', () => {
    expect(entry(plan, 'first_name')).toMatchObject({ action: 'fill', value: 'Sara', source: 'profile' });
    expect(entry(plan, 'email')).toMatchObject({ value: 'sara.benali@example.com', source: 'profile' });
    expect(entry(plan, 'phone')).toMatchObject({ value: '+1 215 555 0100', source: 'profile' });
    expect(entry(plan, 'resume')).toMatchObject({ action: 'upload_cv', value: 'Sara_Benali_CV.pdf' });
    expect(entry(plan, 'resume_text').action).toBe('skip');
  });

  it('maps 4 years of experience to the "2-5" option, and answers authorization from markets', () => {
    expect(entry(plan, 'question_10963304007')).toMatchObject({ action: 'select', value: '2-5', source: 'derived' });
    expect(entry(plan, 'question_10963305007')).toMatchObject({ action: 'select', value: 'Yes', source: 'profile' });
    expect(entry(plan, 'question_10963306007')).toMatchObject({ action: 'select', value: 'No', source: 'profile' });
  });

  it('takes website from the profile and LinkedIn from the CV when the profile has none', () => {
    expect(entry(plan, 'question_10962930007')).toMatchObject({ value: 'https://sara.example.com', source: 'profile' });
    expect(entry(plan, 'question_10963309007')).toMatchObject({
      value: 'https://linkedin.com/in/sara-benali',
      source: 'cv',
    });
  });

  it('asks only what is genuinely unanswerable, with the real options as a select', () => {
    expect(plan.unresolved_required.map((u) => u.field_key)).toEqual(['question_10963307007', 'question_10963310007']);
    expect(entry(plan, 'question_10963307007')).toMatchObject({ action: 'ask', kind: 'select' });
    expect(entry(plan, 'question_10963307007').options).toEqual([
      'Career fair',
      'Google',
      'Handshake',
      'LinkedIn',
      'Word of mouth',
      "I'm a customer",
      'Other',
    ]);
    expect(entry(plan, 'question_10963310007').options).toEqual(['Yes', 'No']);
  });

  it('drafts open-ended required text for owner review instead of asking', () => {
    expect(entry(plan, 'question_10963308007')).toMatchObject({ action: 'draft', value: null });
  });

  it('never drops an optional field silently: it is listed as skipped with a reason', () => {
    expect(entry(plan, 'cover_letter')).toMatchObject({ action: 'skip' });
    expect(entry(plan, 'cover_letter_text')).toMatchObject({ action: 'skip', note: 'Optional.' });
  });

  it('uses an owner answer over everything and resolves the ask', () => {
    const answered = buildFillPlan(
      'app-1',
      schema,
      ctx({
        owner: new Map([
          ['question_10963307007', 'Google'],
          ['question_10963310007', 'Yes'],
        ]),
      }),
    );
    expect(answered.unresolved_required).toEqual([]);
    expect(entry(answered, 'question_10963307007')).toMatchObject({
      action: 'select',
      value: 'Google',
      source: 'owner',
    });
  });

  it('remembers a library answer, but only if it is one of the offered options', () => {
    const good = buildFillPlan('a', schema, ctx({ library: new Map([['referral_source', 'LinkedIn']]) }));
    expect(entry(good, 'question_10963307007')).toMatchObject({ value: 'LinkedIn', source: 'library' });
    const stale = buildFillPlan('a', schema, ctx({ library: new Map([['referral_source', 'A podcast']]) }));
    expect(entry(stale, 'question_10963307007').action).toBe('ask');
  });

  it('lets the confirmed profile win over a different phone in the CV', () => {
    const withCv = buildFillPlan(
      'a',
      schema,
      ctx({ cv: { fileName: 'cv.pdf', text: 'Phone: +44 20 7946 0000 sara@old.example.org' } }),
    );
    expect(entry(withCv, 'phone').value).toBe('+1 215 555 0100');
    expect(entry(withCv, 'email').value).toBe('sara.benali@example.com');
    const noPhone = buildFillPlan('a', schema, ctx({ profile: saraProfile({ phone: '' }) }));
    expect(entry(noPhone, 'phone').action).toBe('ask');
  });

  it('asks when the profile has no market for the country the question names', () => {
    const uk = buildFillPlan(
      'a',
      schema,
      ctx({ profile: { ...saraProfile(), markets: [{ code: 'GB', workAuth: 'authorized' }] } }),
    );
    expect(entry(uk, 'question_10963305007').action).toBe('ask');
  });

  it('reports a missing CV as a required file ask instead of skipping the upload', () => {
    const none = buildFillPlan('a', schema, ctx({ cv: null }));
    expect(entry(none, 'resume')).toMatchObject({ action: 'ask', kind: 'file' });
  });
});
