import { Channels } from '../../../shared/ipc';
import { ConfirmPostingSchema, IngestUrlSchema, type IngestResult, type PostingReadState } from '../../../shared/dto';
import { db } from '../../platform/db/database';
import { emitDataChanged } from '../../platform/ipc/events';
import { defineHandler } from '../../platform/ipc/registry';
import { loggerFor } from '../observability/log.service';
import type { PostingReader } from './posting-reader.service';
import { PostingService } from './postings.service';

export function postingsHandlers(reader?: PostingReader) {
  // Pasted URL -> its in-flight ingests, so closing the dialog or removing a row can abort an agent read.
  const inflight = new Map<string, Set<AbortController>>();
  return [
    defineHandler(Channels.ingestPosting, IngestUrlSchema, async (url, { window }): Promise<IngestResult> => {
      const controller = new AbortController();
      const set = inflight.get(url) ?? new Set();
      inflight.set(url, set.add(controller));
      const service = new PostingService(db, loggerFor('postings'), reader, (readUrl) => {
        const state: PostingReadState = { url: readUrl, state: 'reading_with_agent' };
        if (window && !window.isDestroyed()) window.webContents.send(Channels.postingReadState, state);
      });
      try {
        return await service.ingest(url, controller.signal);
      } finally {
        set.delete(controller);
        if (!set.size) inflight.delete(url);
      }
    }),
    defineHandler(Channels.cancelIngestPosting, IngestUrlSchema, (url) => {
      for (const controller of inflight.get(url) ?? []) controller.abort();
      return true;
    }),
    defineHandler(Channels.confirmPosting, ConfirmPostingSchema, ({ postingId }) => {
      new PostingService(db, loggerFor('postings')).confirm(postingId);
      emitDataChanged({ entity: 'application', id: postingId });
      return true;
    }),
  ];
}
