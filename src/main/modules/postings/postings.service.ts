import { PostingFormSchema, type FillPlanDto, type PostingFormDto } from '../../../shared/dto';
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

  async ingest(url: string): Promise<PostingFormDto> {
    try {
      const parsed = PostingFormSchema.parse(await fetchPosting(url));
      this.repository.ingest(parsed);
      return parsed;
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
