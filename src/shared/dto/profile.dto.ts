import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const text = z.string().max(10000);
// C0 controls (NUL, ESC/ANSI...) and DEL are never legitimate profile text; tab, LF and CR are.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const hasControl = (value: unknown): boolean =>
  typeof value === 'string'
    ? CONTROL.test(value)
    : typeof value === 'object' && value !== null && Object.values(value).some(hasControl);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const country = z
  .string()
  .regex(/^[A-Z]{2}$/)
  .refine((code) => {
    if (code === 'EU') return true;
    const name = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' }).of(code);
    return Boolean(name && name !== code && code !== 'ZZ');
  });
const shortText = z
  .string()
  .max(80)
  .refine((value) => Boolean(value.trim()));
const careerText = z
  .string()
  .max(200)
  .refine((value) => Boolean(value.trim()));
const period = z.enum(['year', 'month']);
const amount = z.number().int().min(0).max(1_000_000_000);
const unique = (values: { id: string }[]) => new Set(values.map((value) => value.id)).size === values.length;
export const EmailSchema = z.union([z.literal(''), z.email().max(254)]);
const phone = text.refine((value) => !value || isValidPhoneNumber(value), 'Invalid phone number');

export const PersonalProfileSchema = z.object({
  firstName: text,
  lastName: text,
  preferredName: text,
  headline: text,
  email: text,
  phone: text,
  alternatePhone: text,
  address: text,
  city: text,
  region: text,
  postalCode: text,
  country: text,
  countryCode: z.union([z.literal(''), country.refine((code) => code !== 'EU')]),
  website: text,
  linkedin: text,
  github: text,
  bio: text,
  school: text,
  degree: text,
  fieldOfStudy: text,
  role: text,
  workMode: text,
  locations: text,
  startDate: text,
  salary: text,
  salaryCurrency: text,
  schoolStart: text,
  graduation: text,
  career: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        role: careerText,
        organisation: careerText,
        start: month,
        end: z.union([month, z.literal('present')]),
      }),
    )
    .max(50)
    .refine(unique)
    .refine((values) => values.every((value) => value.end === 'present' || value.end >= value.start)),
  languages: z
    .array(
      z
        .object({
          id: z.string().min(1).max(200),
          language: z.string().max(20),
          level: z.enum(['', 'Native', 'Fluent', 'Professional', 'Basic']),
          raw: z.string().max(200).optional(),
        })
        .refine((value) => Boolean(value.language) || value.raw !== undefined),
    )
    .max(60)
    .refine(unique),
  salaryAmount: amount.nullable(),
  salaryPeriod: period,
  notice: z
    .discriminatedUnion('kind', [
      z.object({ kind: z.literal('period'), days: z.number().int().min(0).max(730) }),
      z.object({ kind: z.literal('date'), iso: z.iso.date() }),
    ])
    .nullable(),
});

export const MarketsSchema = z
  .array(
    z.object({
      code: country,
      workAuth: z.enum(['authorized', 'sponsorship']),
      phone: shortText.optional(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .optional(),
      cvLanguage: shortText.optional(),
      photo: z.boolean().optional(),
      salary: z.object({ amount, period }).optional(),
    }),
  )
  .max(300)
  .refine((values) => new Set(values.map((value) => value.code)).size === values.length);

export const AnswersSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(200),
      question: z.string().max(500),
      default: text,
      overrides: z.record(
        country,
        z
          .string()
          .max(10000)
          .refine((value) => Boolean(value.trim())),
      ),
    }),
  )
  .max(500)
  .refine(unique);

export const ProfileDataSchema = z.object({
  personal: PersonalProfileSchema.nullable(),
  markets: MarketsSchema,
  answers: AnswersSchema.nullable(),
  onboardingCompletedAt: z.number().int().positive().nullable().default(null),
});
export const ProfileSaveSchema = z
  .discriminatedUnion('section', [
    z.object({
      section: z.literal('personal'),
      value: PersonalProfileSchema.extend({ email: EmailSchema, phone, alternatePhone: phone }),
    }),
    z.object({ section: z.literal('markets'), value: MarketsSchema }),
    z.object({ section: z.literal('answers'), value: AnswersSchema }),
    z.object({ section: z.literal('onboardingCompletedAt'), value: z.number().int().positive().nullable() }),
  ])
  // Saves only: 0.2.1 stored such text, and reads must keep loading it so the owner can fix it.
  .refine((input) => !hasControl(input.value), 'Control characters are not allowed');
export type ProfileData = z.infer<typeof ProfileDataSchema>;
export type ProfileSave = z.infer<typeof ProfileSaveSchema>;
