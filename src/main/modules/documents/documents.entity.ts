import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { DocumentKind } from '../../../shared/dto';
import { createdAt, deletedAt, id, oneOf, timestamps } from '../../platform/db/columns';

export const document = sqliteTable(
  'document',
  {
    id: id(),
    kind: text('kind', { enum: DocumentKind.values }).notNull(),
    name: text('name').notNull(),
    ...timestamps(),
    deletedAt: deletedAt(),
  },
  (t) => [oneOf('document_kind_ck', t.kind, DocumentKind.values)],
);

/** Immutable: an edit creates a new version, so an approved application keeps pointing at the exact CV it used. */
export const documentVersion = sqliteTable(
  'document_version',
  {
    id: id(),
    documentId: text('document_id')
      .notNull()
      .references(() => document.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    fileName: text('file_name').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256').notNull(),
    /** Path relative to userData/documents. */
    storagePath: text('storage_path').notNull(),
    parsedText: text('parsed_text'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('document_version_doc_version_uq').on(t.documentId, t.version), index('document_version_sha256_idx').on(t.sha256)],
);
