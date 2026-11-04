import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { JobPilotDb } from '../../platform/db/database';
import { DocumentsRepository } from './documents.repository';

/** A CV file ready to hand to the browser: a private copy under its real, readable name. */
export interface RunCv {
  versionId: string;
  fileName: string;
  text: string | null;
  /** Absolute path of the copy made for this run. Only this path can ever be uploaded. */
  path: string;
}

const safeName = (name: string) =>
  basename(name)
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 120) || 'CV.pdf';

/** The owner's CV as onboarding read it: stored once under userData, handed to runs as text and as a file to attach. */
export class CvDocumentsService {
  private readonly repository: DocumentsRepository;

  constructor(
    db: JobPilotDb,
    private readonly userData: string,
  ) {
    this.repository = new DocumentsRepository(db);
  }

  store(input: { name: string; bytes: Uint8Array; parsedText: string | null }): string {
    const sha256 = createHash('sha256').update(input.bytes).digest('hex');
    const dir = join(this.userData, 'documents');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const storagePath = `${sha256}.pdf`;
    writeFileSync(join(dir, storagePath), input.bytes, { mode: 0o600 });
    return this.repository.addCvVersion({
      fileName: safeName(input.name),
      mime: 'application/pdf',
      sizeBytes: input.bytes.byteLength,
      sha256,
      storagePath,
      parsedText: input.parsedText,
    });
  }

  /** The CV a run uses: the application's pinned version, else the newest one. Copies it to `into` for the run. */
  forRun(pinnedVersionId: string | null, into: string): RunCv | null {
    const row = (pinnedVersionId ? this.repository.version(pinnedVersionId) : undefined) ?? this.repository.latestCv();
    if (!row) return null;
    mkdirSync(into, { recursive: true, mode: 0o700 });
    const path = join(into, safeName(row.fileName));
    copyFileSync(join(this.userData, 'documents', row.storagePath), path);
    return { versionId: row.id, fileName: row.fileName, text: row.parsedText, path };
  }
}
