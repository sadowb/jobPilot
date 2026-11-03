import { SCOPE_OF, type Grant, type GrantKind } from '../../../shared/dto';
import type { JobPilotDb } from '../../platform/db/database';
import { fingerprint, type ExecutableFingerprint } from '../../platform/agents/fingerprint';
import { UserFacingError } from '../../platform/ipc/user-facing-error';
import { loggerFor } from '../observability/log.service';
import { GrantsRepository } from './grants.repository';

const LABEL: Record<GrantKind, string> = { agent: 'the AI', browser: 'the browser tool' };

export class GrantsService {
  private readonly repository: GrantsRepository;
  constructor(db: JobPilotDb) {
    this.repository = new GrantsRepository(db);
  }

  list(): Grant[] {
    return this.repository.active();
  }

  /**
   * Records the owner's Allow. Idempotent for the same provider, scope and file; anything else replaces the active
   * row, so a changed custom agent needs a new Allow of its own. `executable` is main's own fingerprint, never renderer input.
   */
  allow(kind: GrantKind, provider: string, executable?: ExecutableFingerprint): Grant {
    const scope = SCOPE_OF[kind];
    const current = this.repository.activeRow(kind, provider);
    if (
      current &&
      current.scope === scope &&
      current.executablePath === (executable?.path ?? null) &&
      current.executableSha256 === (executable?.sha256 ?? null)
    )
      return this.repository.active().find((item) => item.id === current.id)!;
    const now = Date.now();
    this.repository.revokeActive(kind, provider, now);
    const created = this.repository.insert({
      kind,
      provider,
      scope,
      executablePath: executable?.path ?? null,
      executableSha256: executable?.sha256 ?? null,
    });
    loggerFor('audit').info(
      { actor: 'owner', type: 'grant_allowed', kind, provider, scope },
      'Owner allowed a connection',
    );
    return created;
  }

  revoke(id: string): Grant {
    const revoked = this.repository.revoke(id, Date.now());
    if (!revoked) throw new UserFacingError('That connection is already off.');
    loggerFor('audit').info(
      { actor: 'owner', type: 'grant_revoked', kind: revoked.kind, provider: revoked.provider },
      'Owner turned a connection off',
    );
    return revoked;
  }

  /** Revokes the active grant for a provider (a failed test must not leave the connection allowed). */
  withdraw(kind: GrantKind, provider: string): void {
    this.repository.revokeActive(kind, provider, Date.now());
  }

  async isGranted(kind: GrantKind, provider: string): Promise<boolean> {
    const row = this.repository.activeRow(kind, provider);
    if (!row || row.scope !== SCOPE_OF[kind]) return false;
    if (!row.executablePath) return true;
    try {
      const now = await fingerprint(row.executablePath);
      return now.path === row.executablePath && now.sha256 === row.executableSha256;
    } catch {
      return false;
    }
  }

  async assert(kind: GrantKind, provider: string): Promise<void> {
    if (await this.isGranted(kind, provider)) return;
    throw new UserFacingError(
      `You have not allowed ${LABEL[kind]} yet (or the file changed). Allow it in Settings → Connections.`,
    );
  }
}
