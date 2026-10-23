import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const text = z.string().max(10000);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const period = z.enum(['year', 'month']);
const amount = z.number().int().min(0).max(1_000_000_000);
const unique = (values: { id: string }[]) => new Set(values.map((value) => value.id)).size === values.length;
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
  countryCode: text,
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
        role: text,
        organisation: text,
        start: month,
        end: z.union([month, z.literal('present')]),
      }),
    )
    .max(50)
    .refine(unique)
    .refine((values) => values.every((value) => value.end === 'present' || value.end >= value.start)),
  languages: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        language: z.string().max(20),
        level: z.enum(['', 'Native', 'Fluent', 'Professional', 'Basic']),
        raw: text.optional(),
      }),
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
      code: z.string().regex(/^[A-Z]{2}$/),
      workAuth: z.enum(['authorized', 'sponsorship']),
      phone: text.optional(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .optional(),
      cvLanguage: z.string().max(80).optional(),
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
        z.string().regex(/^[A-Z]{2}$/),
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
});
export const ProfileSaveSchema = z.discriminatedUnion('section', [
  z.object({ section: z.literal('personal'), value: PersonalProfileSchema.extend({ phone, alternatePhone: phone }) }),
  z.object({ section: z.literal('markets'), value: MarketsSchema }),
  z.object({ section: z.literal('answers'), value: AnswersSchema }),
]);
export type ProfileData = z.infer<typeof ProfileDataSchema>;
export type ProfileSave = z.infer<typeof ProfileSaveSchema>;
