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

/** The fact kinds Cap may write from a free-text answer. Anything else is dropped by main. */
export const CapFactSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('language'),
    language: z.string().trim().min(1).max(20),
    level: z.enum(['Native', 'Fluent', 'Professional', 'Basic']),
  }),
  z.object({ kind: z.literal('market'), code: z.string().trim().length(2) }),
  z.object({
    kind: z.literal('work_auth'),
    code: z.string().trim().length(2),
    value: z.enum(['authorized', 'sponsorship']),
  }),
  z.object({ kind: z.literal('nationality'), code: z.string().trim().length(2) }),
]);
export type CapFact = z.infer<typeof CapFactSchema>;

export const CapTurnInputSchema = z.object({
  /** What Cap just asked, in the owner's terms; the answer is read against it. */
  question: z.string().trim().min(1).max(300),
  text: z.string().trim().min(1).max(1000),
});
export const CapTurnSchema = z.object({
  reply: z.string().trim().min(1).max(400),
  facts: z.array(CapFactSchema).max(6),
});
export type CapTurn = z.infer<typeof CapTurnSchema>;
