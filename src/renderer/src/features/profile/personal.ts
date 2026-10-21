export const PROFILE_KEY = 'jobpilot.profile.v1';
export const ANSWERS_KEY = 'jobpilot.answers.v1';

export const EMPTY_PROFILE = {
  firstName: 'Abdelhadi',
  lastName: 'Marjane',
  preferredName: '',
  headline: '',
  email: '',
  phone: '',
  alternatePhone: '',
  address: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
  website: '',
  linkedin: '',
  github: '',
  bio: '',
  school: '',
  degree: '',
  fieldOfStudy: '',
  graduation: '',
  role: '',
  workMode: '',
  locations: '',
  startDate: '',
  salary: '',
};
export type PersonalProfile = typeof EMPTY_PROFILE;
export type ProfileField = keyof PersonalProfile;

export interface CommonAnswer {
  id: string;
  question: string;
  answer: string;
}
export const EMPTY_ANSWERS: CommonAnswer[] = [
  { id: 'start', question: 'When can you start?', answer: '' },
  { id: 'authorization', question: 'Where are you authorized to work?', answer: '' },
  { id: 'sponsorship', question: 'Will you need visa sponsorship?', answer: '' },
  { id: 'relocate', question: 'Are you willing to relocate?', answer: '' },
  { id: 'salary', question: 'What are your salary expectations?', answer: '' },
  { id: 'intro', question: 'Tell us about yourself.', answer: '' },
];

/** Reject malformed saved data rather than letting it replace the user's defaults. */
export function readProfile(raw: string | null): PersonalProfile {
  if (!raw) return { ...EMPTY_PROFILE };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid profile');
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(EMPTY_PROFILE).map(([key, fallback]) => {
      const field = record[key];
      if (field !== undefined && typeof field !== 'string') throw new Error('Invalid profile field');
      return [key, field ?? fallback];
    }),
  ) as PersonalProfile;
}

export function readAnswers(raw: string | null): CommonAnswer[] {
  if (!raw) return EMPTY_ANSWERS.map((a) => ({ ...a }));
  const value: unknown = JSON.parse(raw);
  if (
    !Array.isArray(value) ||
    !value.every(
      (a) =>
        a &&
        typeof a === 'object' &&
        typeof a.id === 'string' &&
        typeof a.question === 'string' &&
        typeof a.answer === 'string',
    ) ||
    new Set(value.map((a) => a.id)).size !== value.length
  )
    throw new Error('Invalid saved answers');
  return value;
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ME'
  );
}

export function documentError(file: Pick<File, 'name' | 'size'>): string | null {
  if (!/\.(pdf|docx)$/i.test(file.name)) return 'Choose a PDF or DOCX file.';
  if (!file.size) return 'This file is empty. Choose another file.';
  return file.size > 20 * 1024 * 1024 ? 'Choose a file smaller than 20 MB.' : null;
}
