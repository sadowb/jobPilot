import { useState } from 'react';
import type { ApprovalItem, NeedsYouItem } from '../../../../shared/dto';
import { Field, Select, Textarea } from '../../components/ui';
import { useAnswerRun, useStartRun } from '../../lib/api';
import { runErrorMessage } from '../dashboard/upnext/rowActions';
import { Btn } from './Btn';
import { KeyHint as KeyCap } from './KeyHint';
import { ACTIVE_WIDGET, WIDGET_FOOT, WIDGET_HEAD, WIDGET_TITLE, WidgetPill } from './Messages';
import type { ApprovalFlow } from './useApprovalFlow';

/** The review card in the thread. The right column lists every field; this is where the decision is made. */
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
            : 'Check “What will be sent” on the right. If the page changes before you send, nothing is sent and you review it again.'}
        </div>
      </div>
      <div className={WIDGET_FOOT}>
        <Btn size="sm" variant="ghost" disabled={flow.busy} onClick={flow.reject}>
          Reject&nbsp;<KeyCap>R</KeyCap>
        </Btn>
        {flow.confirming ? (
          <>
            <Btn size="sm" disabled={flow.busy} onClick={flow.back}>
              Back
            </Btn>
            <Btn size="sm" variant="primary" disabled={flow.busy} onClick={flow.send}>
              {flow.sending ? 'Sending…' : `Yes, send to ${item.company}`}
            </Btn>
          </>
        ) : (
          <Btn size="sm" variant="primary" disabled={flow.busy} onClick={flow.ask}>
            {submitting ? 'Submitting…' : 'Approve'}&nbsp;<KeyCap>↵</KeyCap>
          </Btn>
        )}
      </div>
    </div>
  );
}

/** The run's own questions, one card per job. No suggested answer exists yet, so none is prefilled. */
export function QuestionsWidget({ item }: { item: NeedsYouItem }) {
  const answer = useAnswerRun();
  const retry = useStartRun();
  const [values, setValues] = useState<Record<string, string>>({});
  const complete = item.questions.every((q) => (values[q.fieldKey] ?? '').trim().length > 0);
  const busy = answer.isPending || retry.isPending;
  const failure = answer.error ?? retry.error;
  const stuck = item.questions.length === 0;
  return (
    <form
      className={ACTIVE_WIDGET}
      onSubmit={(event) => {
        event.preventDefault();
        if (stuck || !complete || busy) return;
        answer.mutate({
          runId: item.runId,
          answers: item.questions.map((q) => ({ fieldKey: q.fieldKey, answer: (values[q.fieldKey] ?? '').trim() })),
        });
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
        {stuck ? (
          <Btn size="sm" variant="primary" disabled={busy} onClick={() => retry.mutate(item.applicationId)}>
            {retry.isPending ? 'Starting…' : 'Run again'}
          </Btn>
        ) : (
          <Btn type="submit" size="sm" variant="primary" disabled={!complete || busy}>
            {answer.isPending ? 'Saving…' : 'Save and fill again'}
          </Btn>
        )}
      </div>
    </form>
  );
}
