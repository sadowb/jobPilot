import { z } from 'zod';
import { AtsKind, QuestionType } from './enums';

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

export const PostingPreviewSchema = PostingFormSchema.extend({ postingId: z.ulid() });
export type PostingPreview = z.infer<typeof PostingPreviewSchema>;
export const IngestResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), posting: PostingPreviewSchema, alreadyTracked: z.boolean() }),
  z.object({ ok: z.literal(false), code: z.enum(['UNSUPPORTED_ATS', 'FETCH_FAILED']), message: z.string() }),
]);
export type IngestResult = z.infer<typeof IngestResultSchema>;
