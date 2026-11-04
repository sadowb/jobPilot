import { z } from 'zod';

/** A value read from the CV plus how sure the agent is. Low confidence is asked in the chat, never silently trusted. */
const field = <T extends z.ZodType>(value: T) => z.object({ value, confidence: z.enum(['high', 'low']) });
const line = z.string().trim().max(200);

/**
 * What the tool-less agent may return for a CV. Strings are capped; the app maps this onto the profile only after
 * the owner confirms. `markets` are ISO-3166 alpha-2 codes guessed from where the person lives and works.
 */
export const CvExtractionSchema = z.object({
  firstName: field(line),
  lastName: field(line),
  headline: field(line),
  email: field(z.string().trim().max(254)),
  /** International format with country code when the CV states one. */
  phone: field(z.string().trim().max(40)),
  city: field(line),
  countryCode: field(z.string().trim().max(2)),
  nationalities: field(z.array(z.string().trim().max(2)).max(4)),
  education: field(
    z.array(z.object({ school: line, degree: line, fieldOfStudy: line, graduation: z.string().trim().max(7) })).max(10),
  ),
  career: field(
    z
      .array(
        z.object({
          role: line,
          organisation: line,
          start: z.string().trim().max(7),
          end: z.string().trim().max(7),
        }),
      )
      .max(30),
  ),
  languages: field(
    z
      .array(
        z.object({
          language: z.string().trim().max(20),
          level: z.enum(['', 'Native', 'Fluent', 'Professional', 'Basic']),
        }),
      )
      .max(12),
  ),
  markets: field(z.array(z.string().trim().max(2)).max(6)),
});
export type CvExtraction = z.infer<typeof CvExtractionSchema>;

/** The CV leaves the renderer once, as bytes, and is read in main. 20 MB matches the Profile upload limit. */
export const CV_MAX_BYTES = 20 * 1024 * 1024;
export const ExtractCvSchema = z.object({
  name: z.string().min(1).max(255),
  bytes: z.instanceof(Uint8Array).refine((b) => b.byteLength > 0 && b.byteLength <= CV_MAX_BYTES, 'CV too large'),
});

/** The fact kinds Cap may write from the owner's words. Anything else is dropped by main; the renderer re-validates values. */
export const CapFactSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('language'),
    language: z.string().trim().min(1).max(20),
    level: z.enum(['Native', 'Fluent', 'Professional', 'Basic']),
  }),
  z.object({ kind: z.literal('market'), code: z.string().trim().length(2), remove: z.boolean().optional() }),
  z.object({
    kind: z.literal('work_auth'),
    code: z.string().trim().length(2),
    value: z.enum(['authorized', 'sponsorship']),
  }),
  z.object({ kind: z.literal('nationality'), code: z.string().trim().length(2), remove: z.boolean().optional() }),
  z.object({
    kind: z.literal('personal'),
    field: z.enum(['firstName', 'lastName', 'headline', 'email', 'phone', 'city', 'countryCode']),
    value: z.string().trim().min(1).max(200),
  }),
]);
export type CapFact = z.infer<typeof CapFactSchema>;

/** One thing the app still needs from the owner. The app decides this list; the agent only works through it. */
export const CapMissingSchema = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
});
export type CapMissing = z.infer<typeof CapMissingSchema>;

export const CapTurnInputSchema = z.object({
  /** The recent conversation, oldest first; the current owner message is `text`, not part of it. */
  history: z.array(z.object({ role: z.enum(['cap', 'owner']), text: z.string().max(1000) })).max(24),
  /** Plain-text summary of the draft so far, so the agent never re-asks what is known. */
  known: z.string().max(3000),
  missing: z.array(CapMissingSchema).max(40),
  /** `null` = Cap opens the conversation right after the CV is read. */
  text: z.string().trim().min(1).max(1000).nullable(),
});
export type CapTurnInput = z.infer<typeof CapTurnInputSchema>;
export const CapTurnSchema = z.object({
  reply: z.string().trim().min(1).max(600),
  facts: z.array(CapFactSchema).max(16),
  /** Keys from `missing` the owner answered or explicitly declined. Main drops any other key. */
  settled: z.array(z.string().max(64)).max(40),
  /** Short quick replies the owner can tap; may be empty. */
  suggestions: z.array(z.string().trim().min(1).max(60)).max(4),
});
export type CapTurn = z.infer<typeof CapTurnSchema>;
