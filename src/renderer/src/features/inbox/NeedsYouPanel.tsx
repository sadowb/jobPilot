import { useState } from 'react';
import type { NeedsYouItem } from '../../../../shared/dto';
import { Button, Eyebrow, Field, Select, Status, Textarea } from '../../components/ui';
import { runErrorMessage } from '../dashboard/upnext/rowActions';
import { useAnswerRun, useStartRun } from '../../lib/api';

/** A run that stopped: answer what it asked, or just try again when it was blocked. */
export function NeedsYouPanel({ item }: { item: NeedsYouItem }) {
  const answer = useAnswerRun();
  const retry = useStartRun();
  const [values, setValues] = useState<Record<string, string>>({});
  const complete = item.questions.every((q) => (values[q.fieldKey] ?? '').trim().length > 0);
  const failure = answer.error ?? retry.error;
  const busy = answer.isPending || retry.isPending;
  return (
    <section aria-labelledby="needs-title" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-8 py-5">
        <div className="min-w-0">
          <Eyebrow>
            {item.questions.length > 0 ? 'Needs your answer' : 'Needs you'} · {item.siteHost}
          </Eyebrow>
          <h2
            id="needs-title"
            className="m-0 mt-1 font-serif text-[30px] leading-[1.1] font-normal tracking-[-0.015em]"
          >
            {item.company}
          </h2>
          <p className="m-0 mt-1 text-[14.5px] text-ink-2">{item.title}</p>
        </div>
        <Status kind={item.questions.length > 0 ? 'need' : 'bad'}>
          {item.questions.length > 0 ? 'Question' : 'Stuck'}
        </Status>
      </header>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!complete || busy) return;
          answer.mutate({
            runId: item.runId,
            answers: item.questions.map((q) => ({ fieldKey: q.fieldKey, answer: (values[q.fieldKey] ?? '').trim() })),
          });
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-6">
          {failure && (
            <div role="alert" className="rounded-2xl border border-line bg-panel px-4 py-3 text-[13.5px]">
              {runErrorMessage(failure, 'Something went wrong.')}
            </div>
          )}
          {item.reason && <p className="m-0 text-[14px] text-ink-2">{item.reason}</p>}
          {item.blockers.map((b) => (
            <p key={`${b.kind}-${b.message}`} className="m-0 text-[14px] text-ink-2">
              <span className="font-semibold">{b.kind}</span>: {b.message}
            </p>
          ))}
          {item.questions.map((q) => (
            <Field key={q.fieldKey} label={q.question}>
              {q.options ? (
                <Select
                  value={values[q.fieldKey] ?? ''}
                  onChange={(e) => setValues({ ...values, [q.fieldKey]: e.target.value })}
                >
                  <option value="">Choose…</option>
                  {q.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : (
                <Textarea
                  rows={3}
                  maxLength={10000}
                  value={values[q.fieldKey] ?? ''}
                  onChange={(e) => setValues({ ...values, [q.fieldKey]: e.target.value })}
                />
              )}
            </Field>
          ))}
          {item.questions.length === 0 && (
            <p className="m-0 text-[14px] text-muted">
              Fix whatever is blocking it in your browser if needed, then run it again.
            </p>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-line bg-panel px-8 py-4">
          {item.questions.length > 0 ? (
            <Button type="submit" variant="primary" size="sm" disabled={!complete || busy}>
              {answer.isPending ? 'Saving…' : 'Save answers and fill again'}
            </Button>
          ) : (
            <Button variant="primary" size="sm" disabled={busy} onClick={() => retry.mutate(item.applicationId)}>
              {retry.isPending ? 'Starting…' : 'Run again'}
            </Button>
          )}
        </footer>
      </form>
    </section>
  );
}
