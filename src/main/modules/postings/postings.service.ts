import { PostingFormSchema, type FillPlanDto, type IngestResult } from '../../../shared/dto';
import { fetchPosting, NotAJobPageError } from './ats';
import { ApplicationsService } from '../applications/applications.service';
import { PostingsRepository, type PostingsDb } from './postings.repository';

export interface PostingsLogger {
  warn(fields: { host: string | null; error_type: string }, message: string): void;
}

export class PostingService {
  private readonly repository: PostingsRepository;

  constructor(
    private readonly db: PostingsDb,
    private readonly logger: PostingsLogger,
  ) {
    this.repository = new PostingsRepository(db);
  }

  async ingest(url: string): Promise<IngestResult> {
    try {
      const parsed = PostingFormSchema.parse(await fetchPosting(url));
      if (parsed.ats === 'custom' && !parsed.description && !parsed.questions.length) {
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
      };
    } catch (error) {
      if (error instanceof NotAJobPageError)
        return { ok: false, code: 'UNSUPPORTED_ATS', message: 'This page does not look like a job posting.' };
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

  get(postingId: string) {
    return this.repository.get(postingId);
  }
}
