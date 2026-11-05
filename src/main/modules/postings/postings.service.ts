import { PostingFormSchema, type FillPlanDto, type IngestResult, type ProfileData } from '../../../shared/dto';
import { BoardUrlError, fetchPosting, NotAJobPageError, type CustomPageReader } from './ats';
import { ApplicationsService } from '../applications/applications.service';
import { fetchFormSchema } from './ats/schema';
import { canonicalKey } from './canonical';
import { buildFillPlan, postingCountry } from './fill-plan';
import { toPostingForm, type PostingReader } from './posting-reader.service';
import { PostingsRepository, type PostingsDb } from './postings.repository';

const SETUP_HINT = 'Set up Claude in Settings → Agent to read custom career sites.';
const FAILED_NOTE = "Couldn't read this page with the agent. Try again or confirm it.";

export interface PostingsLogger {
  warn(fields: { host: string | null; error_type: string }, message: string): void;
}

export class PostingService {
  private readonly repository: PostingsRepository;

  constructor(
    private readonly db: PostingsDb,
    private readonly logger: PostingsLogger,
    private readonly reader?: PostingReader,
    /** Called with the pasted URL when the agent starts reading it (the add-jobs row shows "Reading with agent"). */
    private readonly onAgentReading?: (url: string) => void,
  ) {
    this.repository = new PostingsRepository(db);
  }

  async ingest(url: string, signal: AbortSignal = new AbortController().signal): Promise<IngestResult> {
    // Why the agent did not decide this page; shown to the owner next to the heuristic's outcome.
    let note: string | undefined;
    const readCustom: CustomPageReader = async (page) => {
      const cached = this.repository.findAgentRead(page.href);
      if (cached) return cached;
      if (!this.reader || !(await this.reader.available())) {
        note = SETUP_HINT;
        return null;
      }
      signal.throwIfAborted();
      this.onAgentReading?.(url);
      try {
        return toPostingForm(await this.reader.read(page.href, signal), page);
      } catch (error) {
        if (error instanceof NotAJobPageError || signal.aborted) throw error;
        this.logger.warn(
          { host: page.hostname, error_type: error instanceof Error ? error.name : 'unknown' },
          'Agent read failed',
        );
        note = FAILED_NOTE;
        return null;
      }
    };
    try {
      const parsed = PostingFormSchema.parse(await fetchPosting(url, readCustom));
      if (parsed.ats === 'custom' && parsed.verified && !parsed.description && !parsed.questions.length) {
        return {
          ok: false,
          code: 'UNSUPPORTED_ATS',
          message: 'No job description or application form was found on this page.',
        };
      }
      const postingId = this.repository.ingest(parsed);
      return {
        ok: true,
        posting: { ...parsed, postingId },
        alreadyTracked: new ApplicationsService(this.db).hasPosting(postingId),
        ...(note && !parsed.verified ? { note } : {}),
      };
    } catch (error) {
      if (error instanceof BoardUrlError)
        return {
          ok: false,
          code: 'JOB_BOARD',
          message: `This is ${error.company}'s job board. Paste a link to one job from it.`,
        };
      if (error instanceof NotAJobPageError)
        return {
          ok: false,
          code: 'UNSUPPORTED_ATS',
          message: ['This page does not look like a job posting.', error.reason, note].filter(Boolean).join(' '),
        };
      const host = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return null;
        }
      })();
      this.logger.warn(
        { host, error_type: error instanceof Error ? error.name : 'unknown' },
        'Posting ingestion failed',
      );
      return { ok: false, code: 'FETCH_FAILED', message: 'Could not read this posting. Check the URL and try again.' };
    }
  }

  resolveFillPlan(applicationId: string): FillPlanDto {
    return this.repository.resolveFillPlan(applicationId);
  }

  /**
   * The plan for a run, from the ATS's own form definition fetched before any browser opens. Without an adapter, or when
   * the definition cannot be fetched (404, timeout, invalid), the page-reading plan is returned and the agent reads the page.
   */
  async planFill(
    applicationId: string,
    input: { profile: ProfileData; cv: { fileName: string; text: string | null } | null },
    signal?: AbortSignal,
  ): Promise<FillPlanDto> {
    const inputs = this.repository.planInputs(applicationId);
    try {
      const schema = await fetchFormSchema(inputs.canonicalUrl, signal, undefined, {
        school: input.profile.personal?.school || null,
      });
      if (schema)
        return buildFillPlan(applicationId, schema, {
          ...input,
          library: inputs.library,
          owner: inputs.owner,
          postingCountry: postingCountry(inputs.location),
        });
    } catch (error) {
      if (signal?.aborted) throw error;
      this.logger.warn(
        { host: new URL(inputs.canonicalUrl).hostname, error_type: error instanceof Error ? error.name : 'unknown' },
        'Form definition unavailable; the agent reads the page',
      );
    }
    return this.resolveFillPlan(applicationId);
  }

  /** Answers the owner gave to stable, repeated questions (notice period, LinkedIn...) are kept for every later job. */
  rememberAnswers(answers: Array<{ questionText: string; answer: string }>): void {
    const keep = new Set([
      'notice_period',
      'linkedin_url',
      'website_url',
      'salary_expectation',
      'relocation',
      'referral_source',
      'eeo_gender',
      'eeo_race_ethnicity',
      'eeo_veteran_status',
      'eeo_disability_status',
    ]);
    const rows = answers.flatMap(({ questionText, answer }) => {
      const key = canonicalKey(questionText);
      return key && keep.has(key) ? [{ canonicalKey: key, questionText, answer }] : [];
    });
    if (rows.length) this.repository.remember(rows);
  }

  confirm(postingId: string) {
    this.repository.confirm(postingId);
  }

  get(postingId: string) {
    return this.repository.get(postingId);
  }
}
