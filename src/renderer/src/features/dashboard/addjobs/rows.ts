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

export const isWebUrl = (url: string) => /^https?:\/\//i.test(url);

const SCHEME_REASON = 'Only http:// and https:// job links are supported.';

/** A row for `url`; links that are not web URLs are rejected up front so they show a reason instead of vanishing. */
export function newRow(source: string, url = source): Row {
  const row: Row = { id: nextRowId(), source, url };
  if (!isWebUrl(url)) row.result = { ok: false, code: 'UNSUPPORTED_ATS', message: SCHEME_REASON };
  return row;
}

let seq = 0;
/** Row ids are unique for the renderer's lifetime so React keys never collide across dialogs. */
export const nextRowId = () => seq++;

/** Drops trailing punctuation; a closing parenthesis goes only when unbalanced, so `alert(1)` survives. */
function trimTrailing(url: string): string {
  let end = url.replace(/[.!?;:}\]]+$/, '');
  while (end.endsWith(')') && end.split(')').length > end.split('(').length)
    end = end.slice(0, -1).replace(/[.!?;:}\]]+$/, '');
  return end;
}

/**
 * Unique links in pasted text, with invisible format characters and trailing punctuation removed. Besides
 * http(s), other well-known schemes are kept so the dialog can reject them visibly (see newRow).
 */
export function candidateUrls(text: string): string[] {
  const urls = (text.match(/\b(?:https?:\/\/|(?:file|javascript|data|ftp|mailto):)[^\s,<>"'“”]+/gi) ?? []).map((url) =>
    trimTrailing(url.replace(/\p{Cf}/gu, '')),
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
    .map((url) => current.find((row) => row.source === url) ?? newRow(url));
  return { rows, dismissed: new Set(all.filter((url) => dismissed.has(url))) };
}

/**
 * Replace the link of a row the user edited, in the textarea as well as the rows, so both stay consistent.
 * Anything that is not itself a single link keeps the old source and only changes the row's url.
 */
export function editRow(
  text: string,
  current: readonly Row[],
  dismissed: ReadonlySet<string>,
  row: Row,
  url: string,
): { text: string; rows: Row[]; dismissed: Set<string> } {
  if (candidateUrls(url)[0] !== url) {
    return {
      text,
      rows: current.map((item) => (item.id === row.id ? newRow(item.source, url) : item)),
      dismissed: new Set(dismissed),
    };
  }
  const at = text.indexOf(row.source);
  const next = at < 0 ? `${text.trimEnd()}\n${url}` : text.slice(0, at) + url + text.slice(at + row.source.length);
  return {
    text: next,
    ...reconcileRows(
      next,
      current.filter((item) => item.id !== row.id),
      dismissed,
    ),
  };
}
