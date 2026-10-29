import type { IngestResult } from '../../../../../shared/dto';

export type Row = {
  id: number;
  /** The URL as pasted; identity of the row across textarea edits. */
  source: string;
  /** The URL being ingested; differs from `source` after the user edits a failed row. */
  url: string;
  result?: IngestResult;
  added?: boolean;
  addError?: string;
};

export const MAX_LINKS = 50;

let seq = 0;
/** Row ids are unique for the renderer's lifetime so React keys never collide across dialogs. */
export const nextRowId = () => seq++;

/** Unique http(s) URLs in pasted text, with invisible format characters and trailing punctuation removed. */
export function candidateUrls(text: string): string[] {
  const urls = (text.match(/https?:\/\/[^\s,<>"'“”]+/gi) ?? []).map((url) =>
    url.replace(/\p{Cf}/gu, '').replace(/[.!?;:)}\]]+$/, ''),
  );
  return [...new Set(urls)];
}

/**
 * Derive rows from the textarea while keeping per-row user state: rows are matched by pasted URL (so edits,
 * results and errors survive), and removed URLs stay dismissed until they disappear from the text.
 */
export function reconcileRows(
  text: string,
  current: readonly Row[],
  dismissed: ReadonlySet<string>,
): { rows: Row[]; dismissed: Set<string> } {
  const all = candidateUrls(text);
  const rows = all
    .filter((url) => !dismissed.has(url))
    .slice(0, MAX_LINKS)
    .map((url) => current.find((row) => row.source === url) ?? { id: nextRowId(), source: url, url });
  return { rows, dismissed: new Set(all.filter((url) => dismissed.has(url))) };
}
