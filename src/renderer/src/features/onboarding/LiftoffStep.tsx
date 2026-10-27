import { cn } from '../../components/ui';
import { useApplications } from '../../lib/api';
import { ANSWERS_V2_KEY, readAnswersV2 } from '../profile/answers';
import { readProfileData } from '../profile/profileStorage';
import { useDocumentCount } from '../profile/useDocumentCount';
import { GoButton, S } from '../shared-ui';
import { FACT_QUESTIONS } from './data';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';

function answeredFacts(): number {
  try {
    const stored = readAnswersV2(readProfileData(ANSWERS_V2_KEY));
    return FACT_QUESTIONS.filter((q) => stored.some((a) => a.id === q.id && a.default.trim())).length;
  } catch {
    return 0;
  }
}

function Row({ done, title, detail, to }: { done: boolean; title: string; detail: string; to: string }) {
  return (
    <li className="flex items-center gap-3.5 border-t border-line py-3 first:border-t-0">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-5 flex-none place-items-center rounded-md border-2 text-[12px] leading-none',
          done ? 'border-ink bg-ink text-ground' : 'border-line-2',
        )}
      >
        {done && '✓'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <div className={cn(S, 'text-[13px]')}>{detail}</div>
      </div>
      {!done && (
        <GoButton to={to} variant="ghost" size="sm">
          Add now
        </GoButton>
      )}
    </li>
  );
}

export function LiftoffStep() {
  const cvs = useDocumentCount();
  const facts = answeredFacts();
  const jobs = useApplications().data?.length ?? null;
  return (
    <OnboardingFrame step={5} minHeight={682}>
      <StepHeading
        eyebrow="Step 5 · Ready"
        lead="You’re set up,"
        tail="here’s where things stand."
        lede="Anything you skipped can be added now or later in Profile."
      />
      <ul className="m-0 list-none rounded-2xl border border-line bg-bg p-0 px-5 dark:bg-panel">
        <Row done={!!cvs} title="CV" detail={cvs ? `${cvs} saved on this device` : 'No CV yet'} to="/welcome/2" />
        <Row done={!!jobs} title="Jobs" detail={jobs ? `${jobs} in your list` : 'No jobs added yet'} to="/" />
        <Row
          done={facts > 0}
          title="Answers"
          detail={facts ? `${facts} of ${FACT_QUESTIONS.length} answered` : 'No answers saved yet'}
          to="/welcome/4"
        />
      </ul>
      <div className="flex gap-4">
        <GoButton to="/" variant="primary">
          Open dashboard
        </GoButton>
      </div>
    </OnboardingFrame>
  );
}
