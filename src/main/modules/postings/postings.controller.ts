import { Channels } from '../../../shared/ipc';
import { IngestUrlSchema, type IngestResult } from '../../../shared/dto';
import { db } from '../../platform/db/database';
import { defineHandler } from '../../platform/ipc/registry';
import { loggerFor } from '../observability/log.service';
import { PostingService } from './postings.service';

export const postingsHandlers = [
  defineHandler(Channels.ingestPosting, IngestUrlSchema, async (url): Promise<IngestResult> => {
    const logger = loggerFor('postings');
    try {
      return { ok: true, posting: await new PostingService(db, logger).ingest(url) };
    } catch (error) {
      logger.warn({ err: error, host: new URL(url).hostname }, 'Posting ingest failed');
      return { ok: false, code: 'FETCH_FAILED', message: 'Could not read this posting. Check the URL and try again.' };
    }
  }),
];
