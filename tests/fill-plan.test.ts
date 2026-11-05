import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGreenhouseSchema } from '../src/main/modules/postings/ats/schema';
import {
  buildFillPlan,
  careerYears,
  degreeOption,
  monthValue,
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
    expect(entry(plan, 'phone')).toMatchObject({ value: '(215) 555-0100', source: 'profile' });
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
    expect(entry(withCv, 'phone').phone?.e164).toBe('+12155550100');
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

const fixture = (name: string): unknown => JSON.parse(readFileSync(`tests/fixtures/${name}.json`, 'utf8'));
const names = (file: string) => (fixture(file) as { items: Array<{ text: string }> }).items.map((i) => i.text);
const withEducation = (profile = saraProfile()) => ({
  ...profile,
  personal: {
    ...profile.personal!,
    school: 'Drexel University',
    degree: 'BSc Computer Science',
    fieldOfStudy: 'Computer Science',
    schoolStart: '2018-09',
    graduation: '2022-06',
  },
});
const perpayWithEducation = (lookups = {}) =>
  parseGreenhouseSchema(fixture('greenhouse-perpay-5003430007'), {
    degrees: names('greenhouse-education-degrees'),
    disciplines: names('greenhouse-education-disciplines'),
    schools: names('greenhouse-education-schools-drexel'),
    ...lookups,
  });

describe('education block and phone country (#257)', () => {
  it('adds the five education inputs the API leaves out of `questions`, optional when the job says so', () => {
    const fields = perpayWithEducation().fields.filter((f) => f.name.startsWith('education.'));
    expect(fields.map((f) => f.role)).toEqual(['school', 'degree', 'discipline', 'education_start', 'education_end']);
    expect(fields.every((f) => !f.required)).toBe(true);
    expect(fields[1]!.options).toContain("Bachelor's Degree");
    expect(schema.fields.some((f) => f.name.startsWith('education.'))).toBe(true);
  });

  it('resolves school, degree, discipline and dates from the profile against the form’s own lists', () => {
    const plan = buildFillPlan('a', perpayWithEducation(), ctx({ profile: withEducation() }));
    expect(entry(plan, 'education.school')).toMatchObject({ action: 'select', value: 'Drexel University' });
    expect(entry(plan, 'education.degree')).toMatchObject({ action: 'select', value: "Bachelor's Degree" });
    expect(entry(plan, 'education.discipline')).toMatchObject({ action: 'select', value: 'Computer Science' });
    expect(entry(plan, 'education.start')).toMatchObject({ action: 'fill', value: '2018-09' });
    expect(entry(plan, 'education.end')).toMatchObject({ action: 'fill', value: '2022-06' });
    expect(entry(plan, 'education.school').note).toMatch(/Autocomplete/);
  });

  it('turns a school that is not in the list into an owner question carrying the real options', () => {
    const profile = withEducation();
    profile.personal!.school = 'Example State University';
    const required = perpayWithEducation({ schools: ['Example University', 'State College'] });
    required.fields.filter((f) => f.name.startsWith('education.')).forEach((f) => (f.required = true));
    const plan = buildFillPlan('a', required, ctx({ profile }));
    expect(entry(plan, 'education.school')).toMatchObject({
      action: 'ask',
      options: ['Example University', 'State College'],
    });
    expect(entry(plan, 'education.school').question).toMatch(/Example State University.*not in the form’s list/);
    // And the owner’s pick resolves it on the next pass.
    const answered = buildFillPlan(
      'a',
      required,
      ctx({ profile, owner: new Map([['education.school', 'State College']]) }),
    );
    expect(entry(answered, 'education.school')).toMatchObject({ action: 'select', value: 'State College' });
  });

  it('maps degree names onto the form’s labels', () => {
    const options = names('greenhouse-education-degrees');
    expect(degreeOption('MSc Data Science', options)).toBe("Master's Degree");
    expect(degreeOption('MBA', options)).toBe('Master of Business Administration (M.B.A.)');
    expect(degreeOption('PhD', options)).toBe('Doctor of Philosophy (Ph.D.)');
    expect(degreeOption('Bachelor of Science', options)).toBe("Bachelor's Degree");
    expect(degreeOption('Diploma in Underwater Welding', options)).toBeNull();
  });

  it('reads months in the formats a profile holds', () => {
    expect(monthValue('2024-06')).toEqual({ value: '2024-06', yearOnly: false });
    expect(monthValue('06/2024')).toEqual({ value: '2024-06', yearOnly: false });
    expect(monthValue('June 2024')).toEqual({ value: '2024-06', yearOnly: false });
    expect(monthValue('2024')).toEqual({ value: '2024', yearOnly: true });
    expect(monthValue('soon')).toBeNull();
  });

  it('splits the profile phone for a country selector, deterministically', () => {
    const uk = buildFillPlan('a', schema, ctx({ profile: saraProfile({ phone: '+44 20 7946 0958' }) }));
    expect(entry(uk, 'phone').phone).toEqual({
      country: 'GB',
      country_name: 'United Kingdom',
      calling_code: '44',
      national: '020 7946 0958',
      e164: '+442079460958',
    });
    expect(entry(uk, 'phone').note).toMatch(/United Kingdom \(\+44\) first/);
    const bad = buildFillPlan('a', schema, ctx({ profile: saraProfile({ phone: '12345' }) }));
    expect(entry(bad, 'phone')).toMatchObject({ action: 'ask' });
  });

  it('does not ask upfront for a conditional question; it tells the agent to handle it if it appears', () => {
    const conditional = parseGreenhouseSchema({
      questions: [
        { label: 'Do you need a visa?', required: true, fields: [{ name: 'q1', type: 'input_text' }] },
        { label: 'If yes, which visa?', required: true, fields: [{ name: 'q2', type: 'input_text' }] },
      ],
    });
    const plan = buildFillPlan('a', conditional, ctx());
    expect(entry(plan, 'q1').action).toBe('ask');
    expect(entry(plan, 'q2')).toMatchObject({ action: 'skip', note: expect.stringMatching(/after another answer/) });
    expect(plan.unresolved_required.map((u) => u.field_key)).toEqual(['q1']);
  });
});

describe('Discord and Figma definitions (#257)', () => {
  const discord = parseGreenhouseSchema(fixture('greenhouse-discord-8722538002'));
  const figma = parseGreenhouseSchema(fixture('greenhouse-figma-5426468004'));

  it('reads the demographic block, which has answer_options and no input names', () => {
    const demo = discord.fields.filter((f) => f.name.startsWith('demographic_'));
    expect(demo.map((f) => f.label)).toContain('Gender');
    const gender = demo.find((f) => f.label === 'Gender')!;
    expect(gender).toMatchObject({ kind: 'select', required: true });
    expect(gender.options).toContain("I don't wish to answer");
    expect(demo.find((f) => f.label.startsWith('Race or Ethnicity'))!.kind).toBe('multiselect');
  });

  it('keeps the location text input and drops the hidden coordinates', () => {
    expect(discord.fields.find((f) => f.name === 'location')).toMatchObject({ kind: 'text', required: true });
    expect(discord.fields.some((f) => f.name === 'latitude')).toBe(false);
    const plan = buildFillPlan('d', discord, ctx());
    expect(entry(plan, 'location')).toMatchObject({ action: 'fill', value: 'Philadelphia, PA, United States' });
    expect(entry(plan, 'location').note).toMatch(/Autocomplete/);
  });

  it('asks required self-identification once with the real options, and a remembered answer resolves it', () => {
    const plan = buildFillPlan('d', discord, ctx());
    const gender = discord.fields.find((f) => f.label === 'Gender')!;
    expect(entry(plan, gender.name)).toMatchObject({ action: 'ask', kind: 'select' });
    expect(entry(plan, gender.name).options).toContain("I don't wish to answer");
    const remembered = buildFillPlan(
      'd',
      discord,
      ctx({ library: new Map([['eeo_gender', "I don't wish to answer"]]) }),
    );
    expect(entry(remembered, gender.name)).toMatchObject({ action: 'select', value: "I don't wish to answer" });
    // Optional self-identification is left alone and listed, never asked.
    const optional = discord.fields.find((f) => f.label.startsWith('Gender Identity'))!;
    expect(entry(plan, optional.name).action).toBe('skip');
  });

  it('plans the Figma EEO compliance field and its optional fields without asking', () => {
    expect(figma.fields.find((f) => f.name === 'veteran_status')).toMatchObject({ kind: 'select', required: false });
    const plan = buildFillPlan('f', figma, ctx());
    expect(entry(plan, 'veteran_status').action).toBe('skip');
    // Optional LinkedIn (Figma) with nothing on file is skipped, not asked.
    const linkedin = figma.fields.find((f) => f.label === 'LinkedIn Profile')!;
    const none = buildFillPlan('f', figma, ctx({ cv: null }));
    expect(entry(none, linkedin.name).action).toBe('skip');
  });
});
