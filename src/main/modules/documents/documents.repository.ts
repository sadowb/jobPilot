import { desc, eq, isNull } from 'drizzle-orm';
import type { JobPilotDb } from '../../platform/db/database';
import { document, documentVersion } from './documents.entity';

export interface CvVersionRow {
  id: string;
  fileName: string;
  mime: string;
  storagePath: string;
  parsedText: string | null;
}

export class DocumentsRepository {
  constructor(private readonly db: JobPilotDb) {}

  /** Adds `fileName` as a new immutable version of the owner's CV, or returns the one with the same content. */
  addCvVersion(input: {
    fileName: string;
    mime: string;
    sizeBytes: number;
    sha256: string;
    storagePath: string;
    parsedText: string | null;
  }): string {
    return this.db.transaction((tx) => {
      const same = tx.select().from(documentVersion).where(eq(documentVersion.sha256, input.sha256)).get();
      if (same) return same.id;
      const doc =
        tx.select().from(document).where(eq(document.kind, 'cv')).orderBy(desc(document.createdAt)).get() ??
        tx.insert(document).values({ kind: 'cv', name: 'CV' }).returning().get();
      const last = tx
        .select({ version: documentVersion.version })
        .from(documentVersion)
        .where(eq(documentVersion.documentId, doc.id))
        .orderBy(desc(documentVersion.version))
        .get();
      return tx
        .insert(documentVersion)
        .values({ ...input, documentId: doc.id, version: (last?.version ?? 0) + 1 })
        .returning({ id: documentVersion.id })
        .get().id;
    });
  }

  version(id: string): CvVersionRow | undefined {
    return this.db.select().from(documentVersion).where(eq(documentVersion.id, id)).get();
  }

  /** The newest version of the newest CV document that is not deleted. */
  latestCv(): CvVersionRow | undefined {
    return this.db
      .select({
        id: documentVersion.id,
        fileName: documentVersion.fileName,
        mime: documentVersion.mime,
        storagePath: documentVersion.storagePath,
        parsedText: documentVersion.parsedText,
      })
      .from(documentVersion)
      .innerJoin(document, eq(document.id, documentVersion.documentId))
      .where(isNull(document.deletedAt))
      .orderBy(desc(documentVersion.createdAt), desc(documentVersion.version))
      .limit(1)
      .get();
  }
}
