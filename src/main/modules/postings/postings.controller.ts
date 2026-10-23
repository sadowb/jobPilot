import { Channels } from '../../../shared/ipc';
import { IngestUrlSchema, type IngestResult } from '../../../shared/dto';
import { db } from '../../platform/db/database';
import { defineHandler } from '../../platform/ipc/registry';
import { loggerFor } from '../observability/log.service';
import { matchPostingUrl } from './ats';
import { PostingService } from './postings.service';

const input = IngestUrlSchema.transform((url) => ({ url, supported: matchPostingUrl(new URL(url)) !== null }));
export const postingsHandlers = [
  defineHandler(Channels.ingestPosting, input, async ({ url, supported }): Promise<IngestResult> => {
    if (!supported)
      return {
        ok: false,
        code: 'UNSUPPORTED_ATS',
        message: 'Use a Greenhouse, Lever, Ashby, Workable, SmartRecruiters, or BambooHR job URL.',
      };
    try {
      return { ok: true, posting: await new PostingService(db, loggerFor('postings')).ingest(url) };
    } catch {
      return { ok: false, code: 'FETCH_FAILED', message: 'Could not read this posting. Check the URL and try again.' };
    }
  }),
];
