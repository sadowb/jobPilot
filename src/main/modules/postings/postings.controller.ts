import { Channels } from '../../../shared/ipc';
import { ConfirmPostingSchema, IngestUrlSchema, type IngestResult } from '../../../shared/dto';
import { db } from '../../platform/db/database';
import { emitDataChanged } from '../../platform/ipc/events';
import { defineHandler } from '../../platform/ipc/registry';
import { loggerFor } from '../observability/log.service';
import { PostingService } from './postings.service';

export const postingsHandlers = [
  defineHandler(Channels.ingestPosting, IngestUrlSchema, async (url): Promise<IngestResult> => {
    return new PostingService(db, loggerFor('postings')).ingest(url);
  }),
  defineHandler(Channels.confirmPosting, ConfirmPostingSchema, ({ postingId }) => {
    new PostingService(db, loggerFor('postings')).confirm(postingId);
    emitDataChanged({ entity: 'application', id: postingId });
    return true;
  }),
];
