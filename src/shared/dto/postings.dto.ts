import { z } from 'zod';
import { AtsKind, QuestionType } from './enums';

export const IsoCountryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, 'Country must be a 2-letter uppercase ISO 3166-1 alpha-2 code')
  .refine((code) => {
    try {
      const name = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' }).of(code);
      return Boolean(name && name !== code && code !== 'ZZ');
    } catch {
      return false;
    }
  }, 'Invalid ISO 3166-1 alpha-2 country code');

export const PostingQuestionSchema = z.object({
  external_id: z.string().min(1),
  label: z.string().min(1).max(400),
  type: QuestionType.schema,
  required: z.boolean(),
  options: z.array(z.string()).default([]),
  position: z.number().int().nonnegative(),
  canonical_key: z.string().nullable().default(null),
});
export type PostingQuestionDto = z.infer<typeof PostingQuestionSchema>;

export const PostingFormSchema = z.object({
  company: z.string().min(1).max(400),
  title: z.string().min(1).max(400),
  location: z.string().max(1000).nullable(),
  country: IsoCountryCodeSchema.nullable().optional(),
  salary: z.string().max(500).nullable(),
  salary_min: z.number().int().nullable().default(null),
  salary_max: z.number().int().nullable().default(null),
  salary_currency: z.string().length(3).nullable().default(null),
  description: z.string().max(30000).nullable(),
  canonical_url: z.string().url(),
  ats: AtsKind.schema,
  ats_tenant: z.string().nullable(),
  ats_job_id: z.string().nullable(),
  questions: z.array(PostingQuestionSchema).max(200),
  /** false for custom pages without JobPosting JSON-LD (see htmlFallback); ATS adapters and JSON-LD pages are verified. */
  verified: z.boolean().default(true),
});
export type PostingFormDto = z.infer<typeof PostingFormSchema>;

export const FillPlanEntrySchema = z.object({
  field_key: z.string(),
  label: z.string(),
  value: z.string().nullable(),
  source: z.enum(['library', 'profile']).nullable(),
  required: z.boolean(),
});
export type FillPlanEntry = z.infer<typeof FillPlanEntrySchema>;

export const FillPlanSchema = z.object({
  application_id: z.string(),
  entries: z.array(FillPlanEntrySchema),
  unresolved_required: z.array(z.object({ field_key: z.string(), label: z.string() })),
});
export type FillPlanDto = z.infer<typeof FillPlanSchema>;

export const IngestUrlSchema = z
  .string()
  .max(2048)
  .url()
  .pipe(
    z.string().refine((raw) => {
      const url = new URL(raw);
      return url.protocol === 'https:' && !url.username && !url.password && !url.port;
    }, 'Use an HTTPS URL without credentials or a custom port.'),
  );

export const ConfirmPostingSchema = z.object({ postingId: z.ulid() });

export const PostingPreviewSchema = PostingFormSchema.extend({ postingId: z.ulid() });
export type PostingPreview = z.infer<typeof PostingPreviewSchema>;
export const IngestResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), posting: PostingPreviewSchema, alreadyTracked: z.boolean() }),
  z.object({ ok: z.literal(false), code: z.enum(['UNSUPPORTED_ATS', 'FETCH_FAILED']), message: z.string() }),
]);
export type IngestResult = z.infer<typeof IngestResultSchema>;
