import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobPilotDb } from '../src/main/platform/db/database';
import * as schema from '../src/main/platform/db/schema';
import { AuditService } from '../src/main/modules/observability/observability.service';
import { ApplicationsService } from '../src/main/modules/applications/applications.service';
import { emitDataChanged } from '../src/main/platform/ipc/events';
import { SetApplicationStatusSchema } from '../src/shared/dto';

vi.mock('../src/main/modules/observability/observability.service', () => ({ AuditService: { record: vi.fn() } }));
vi.mock('../src/main/platform/ipc/events', () => ({ emitDataChanged: vi.fn() }));

let db: JobPilotDb;
let service: ApplicationsService;

function seed(appliedAt: number | null): string {
  const company = db.insert(schema.company).values({ name: 'Acme', nameKey: 'acme' }).returning().get();
  const posting = db
    .insert(schema.jobPosting)
    .values({
      companyId: company.id,
      url: 'https://jobs.lever.co/acme/1',
      canonicalUrl: 'https://jobs.lever.co/acme/1',
      ats: 'lever',
      title: 'Engineer',
    })
    .returning()
    .get();
  return db
    .insert(schema.application)
    .values({ postingId: posting.id, status: appliedAt ? 'applied' : 'queued', queueRank: 1, appliedAt })
    .returning()
    .get().id;
}

beforeEach(() => {
  vi.clearAllMocks();
  db = drizzle(new Database(':memory:'), { schema }) as JobPilotDb;
  migrate(db, { migrationsFolder: 'drizzle' });
  service = new ApplicationsService(db);
});

describe('ApplicationsService.setStatus', () => {
  it('records an owner outcome with an audit event and a change notification', () => {
    const id = seed(1_760_000_000_000);
    expect(service.setStatus(id, 'interviewing')).toMatchObject({ id, status: 'interviewing' });
    expect(AuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: id,
        actor: 'owner',
        fromStatus: 'applied',
        toStatus: 'interviewing',
      }),
    );
    expect(emitDataChanged).toHaveBeenCalledWith({ entity: 'application', id });
  });

  it('is idempotent: the same status writes no event', () => {
    const id = seed(1_760_000_000_000);
    service.setStatus(id, 'applied');
    expect(AuditService.record).not.toHaveBeenCalled();
    expect(emitDataChanged).not.toHaveBeenCalled();
  });

  it('refuses an application that was never submitted and an unknown id', () => {
    const queued = seed(null);
    expect(() => service.setStatus(queued, 'offer')).toThrow('Only a submitted application');
    expect(() => service.setStatus('01HZZZZZZZZZZZZZZZZZZZZZZZ', 'offer')).toThrow('not found');
  });
});

describe('SetApplicationStatusSchema (trust boundary)', () => {
  it('accepts owner outcomes only', () => {
    const id = '01HZZZZZZZZZZZZZZZZZZZZZZZ';
    expect(SetApplicationStatusSchema.parse({ id, status: 'rejected' }).status).toBe('rejected');
    for (const status of ['queued', 'running', 'submitting', 'blocked', 'nope'])
      expect(() => SetApplicationStatusSchema.parse({ id, status })).toThrow();
    expect(() => SetApplicationStatusSchema.parse({ id: 'x', status: 'offer' })).toThrow();
  });
});
