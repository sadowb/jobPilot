import { Channels } from '../../../shared/ipc';
import { IngestUrlSchema, type IngestResult } from '../../../shared/dto';
import { db } from '../../platform/db/database';
import { defineHandler } from '../../platform/ipc/registry';
import { loggerFor } from '../observability/log.service';
import { PostingService } from './postings.service';

export const postingsHandlers = [
  defineHandler(Channels.ingestPosting, IngestUrlSchema, async (url): Promise<IngestResult> => {
    return new PostingService(db, loggerFor('postings')).ingest(url);
  }),
];
