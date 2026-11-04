import { useState } from 'react';
import type { ApprovalItem, NeedsYouItem } from '../../../../shared/dto';
import { Field, Select, Textarea } from '../../components/ui';
import { runErrorMessage } from '../dashboard/upnext/rowActions';
import { Btn } from './Btn';
import { ACTIVE_WIDGET, WIDGET_FOOT, WIDGET_HEAD, WIDGET_TITLE, WidgetPill } from './Messages';
import type { ApprovalFlow } from './useApprovalFlow';

/**
 * The review card in the thread. It carries no decision button: the one Approve / Reject / confirm control lives in
 * "What will be sent", next to the fields it decides on, so there is never a second Yes to hit by accident.
 */
export function ApprovalWidget({ item, flow }: { item: ApprovalItem; flow: ApprovalFlow }) {
  const submitting = item.state === 'submitting';
  return (
    <div className={ACTIVE_WIDGET}>
      <div className={WIDGET_HEAD}>
        <WidgetPill>{submitting ? 'Submitting' : 'Ready to review'}</WidgetPill>
        <span>{item.summary.fields.length} fields</span>
      </div>
      <div className="p-[18px]">
        <div className={WIDGET_TITLE}>Send this application to {item.company}?</div>
        <div className="mt-2 text-[13.5px] leading-[1.5] text-muted">
          {submitting
            ? 'You approved it. JobPilot is clicking submit now, once. This card goes away when it is done.'
            : flow.confirming
              ? 'Confirm with the button in “What will be sent”. Escape backs out.'
              : 'Check “What will be sent”, then approve or reject it there. If the page changes before you send, nothing is sent and you review it again.'}
        </div>
      </div>
    </div>
  );
}

export interface AnswerState {
  pending: boolean;
  error: unknown;
  submit: (answers: Array<{ fieldKey: string; answer: string }>) => void;
}

/** The run's own questions, one card per job. No suggested answer exists yet, so none is prefilled. */
export function QuestionsWidget({
  item,
  answer,
  restart,
}: {
  item: NeedsYouItem;
  answer: AnswerState;
  restart: { pending: boolean; error: unknown; run: () => void };
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const missing = item.questions.filter((q) => (values[q.fieldKey] ?? '').trim().length === 0).length;
  const busy = answer.pending || restart.pending;
  const failure = answer.error ?? restart.error;
  const stuck = item.questions.length === 0;
  return (
    <form
      className={ACTIVE_WIDGET}
      onSubmit={(event) => {
        event.preventDefault();
        if (stuck || missing > 0 || busy) return;
        answer.submit(item.questions.map((q) => ({ fieldKey: q.fieldKey, answer: (values[q.fieldKey] ?? '').trim() })));
      }}
    >
      <div className={WIDGET_HEAD}>
        <WidgetPill>{stuck ? 'Needs a hand' : `Question${item.questions.length > 1 ? 's' : ''} · required`}</WidgetPill>
        <span>Your call</span>
      </div>
      <div className="flex flex-col gap-4 p-[18px]">
        {failure ? (
          <div role="alert" className="rounded-2xl border border-line bg-panel px-3.5 py-2.5 text-[13px]">
            {runErrorMessage(failure, 'Something went wrong.')}
          </div>
        ) : null}
        {stuck && <div className={WIDGET_TITLE}>Fix what blocks it in your browser, then run it again.</div>}
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
      </div>
      <div className={WIDGET_FOOT}>
        {!stuck && missing > 0 && (
          <span className="mr-auto text-[12.5px] text-muted">
            {missing === 1 ? 'Answer the last question to continue.' : `Answer ${missing} more questions to continue.`}
          </span>
        )}
        {stuck ? (
          <Btn size="sm" variant="primary" disabled={busy} onClick={restart.run}>
            {restart.pending ? 'Starting…' : 'Run again'}
          </Btn>
        ) : (
          <Btn type="submit" size="sm" variant="primary" disabled={missing > 0 || busy}>
            {answer.pending ? 'Saving…' : 'Save and fill again'}
          </Btn>
        )}
      </div>
    </form>
  );
}
