import type { JobPilotDb } from '../../platform/db/database';
import { AuditService } from '../observability/observability.service';
import { ApplicationsRepository } from './applications.repository';

export class ApplicationsService {
  private readonly repository: ApplicationsRepository;
  constructor(db: JobPilotDb) {
    this.repository = new ApplicationsRepository(db);
  }

  list() {
    return this.repository.list();
  }

  hasPosting(postingId: string): boolean {
    return this.repository.hasPosting(postingId);
  }

  create(postingId: string) {
    return this.repository.create(postingId, (applicationId) =>
      AuditService.record({
        applicationId,
        type: 'created',
        actor: 'owner',
        fromStatus: null,
        toStatus: 'queued',
      }),
    );
  }
}
