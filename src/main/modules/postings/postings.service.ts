import { PostingFormSchema, type FillPlanDto, type IngestResult } from '../../../shared/dto';
import { fetchPosting, NotAJobPageError, type CustomPageReader } from './ats';
import { ApplicationsService } from '../applications/applications.service';
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

  confirm(postingId: string) {
    this.repository.confirm(postingId);
  }

  get(postingId: string) {
    return this.repository.get(postingId);
  }
}
