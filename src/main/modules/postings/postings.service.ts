import { PostingFormSchema, type FillPlanDto, type PostingPreview } from '../../../shared/dto';
import { fetchPosting } from './ats';
import { PostingsRepository, type PostingsDb } from './postings.repository';

export interface PostingsLogger {
  warn(fields: { host: string | null; error_type: string }, message: string): void;
}

export class PostingService {
  private readonly repository: PostingsRepository;

  constructor(
    db: PostingsDb,
    private readonly logger: PostingsLogger,
  ) {
    this.repository = new PostingsRepository(db);
  }

  async ingest(url: string): Promise<PostingPreview> {
    try {
      const parsed = PostingFormSchema.parse(await fetchPosting(url));
      const postingId = this.repository.ingest(parsed);
      return { ...parsed, postingId };
    } catch (error) {
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
      throw error;
    }
  }

  resolveFillPlan(applicationId: string): FillPlanDto {
    return this.repository.resolveFillPlan(applicationId);
  }
}
