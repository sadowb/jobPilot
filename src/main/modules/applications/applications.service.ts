import type { OwnerStatus } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import { emitDataChanged } from '../../platform/ipc/events';
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
    const item = this.repository.create(postingId, (applicationId) =>
      AuditService.record({
        applicationId,
        type: 'created',
        actor: 'owner',
        fromStatus: null,
        toStatus: 'queued',
      }),
    );
    emitDataChanged({ entity: 'application', id: item.id });
    return item;
  }

  /** Owner-recorded outcome. Idempotent: setting the current status writes no event. */
  setStatus(id: string, status: OwnerStatus) {
    const { item, changed } = this.repository.setStatus(id, status, (from) =>
      AuditService.record({
        applicationId: id,
        type: 'status_changed',
        actor: 'owner',
        fromStatus: from,
        toStatus: status,
      }),
    );
    if (changed) emitDataChanged({ entity: 'application', id });
    return item;
  }
}
