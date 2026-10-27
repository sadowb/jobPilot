import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Segmented, cn } from '../../components/ui';
import { ANSWERS_V2_KEY, readAnswersV2, type Answer } from '../profile/answers';
import { readProfileData, saveProfileData } from '../profile/profileStorage';
import { MONO_CAPS, S } from '../shared-ui';
import { FACT_QUESTIONS, FACT_USES } from './data';
import { AsidePanel, OnboardingFrame, StepHeading } from './OnboardingFrame';

/** Options the stored answers already hold, so Back and re-entry show earlier choices. */
function savedChoices(): Record<string, string> {
  try {
    const stored = readAnswersV2(readProfileData(ANSWERS_V2_KEY));
    return Object.fromEntries(
      FACT_QUESTIONS.flatMap((q) => {
        const value = stored.find((a) => a.id === q.id)?.default;
        return value && q.options.includes(value) ? [[q.id, value]] : [];
      }),
    );
  } catch {
    return {};
  }
}

/** Upserts the answered questions into the common answers; unanswered ones leave stored text untouched. */
async function saveChoices(choices: Record<string, string>): Promise<void> {
  const answers: Answer[] = readAnswersV2(readProfileData(ANSWERS_V2_KEY));
  for (const q of FACT_QUESTIONS) {
    const text = choices[q.id];
    if (!text) continue;
    const at = answers.findIndex((a) => a.id === q.id);
    if (at === -1) answers.push({ id: q.id, question: q.prompt, default: text, overrides: {} });
    else answers[at] = { ...answers[at]!, default: text };
  }
  await saveProfileData(ANSWERS_V2_KEY, answers);
}

export function FactsStep() {
  const navigate = useNavigate();
  const [choices, setChoices] = useState(savedChoices);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const count = FACT_QUESTIONS.filter((q) => choices[q.id]).length;
  // Navigate only after the save succeeds, so a failed write never looks saved.
  const next = async () => {
    if (count) {
      setSaving(true);
      try {
        await saveChoices(choices);
      } catch {
        setError('Could not save your answers. Please try again.');
        setSaving(false);
        return;
      }
    }
    void navigate('/welcome/5');
  };
  return (
    <OnboardingFrame
      step={4}
      minHeight={682}
      aside={
        <AsidePanel className="flex h-[420px] flex-col gap-4">
          <div className={cn(MONO_CAPS, 'text-muted')}>Saved to Profile · Common answers</div>
          <b className="text-[15px]">What I do with these</b>
          {FACT_USES.map((u) => (
            <div key={u.tag} className="flex items-baseline gap-3 text-[13.5px]">
              <span className="w-14 flex-none font-mono text-[11px] tracking-[0.06em] text-brand-text">{u.tag}</span>
              <span className={S}>{u.text}</span>
            </div>
          ))}
          <div className="mt-auto text-[13px]">
            <div className="mb-1.5 flex justify-between">
              <span>Answered</span>
              <span className="font-mono">{count} of 3</span>
            </div>
            <div className="h-1.5 rounded-full bg-line">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(count / 3) * 100}%` }} />
            </div>
          </div>
        </AsidePanel>
      }
    >
      <StepHeading
        eyebrow="Step 4 · Your answers"
        lead="Three facts,"
        tail="then I stop asking."
        lede="Pick an answer for each, or leave any blank. They apply to every job and you can change them in Profile."
      />
      <div className="flex flex-col gap-4">
        {FACT_QUESTIONS.map((q) => (
          <div key={q.id} className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold">{q.prompt}</span>
            <Segmented
              label={q.prompt}
              options={q.options.map((o) => ({ value: o, label: o }))}
              value={choices[q.id] ?? ''}
              onChange={(v) => setChoices((c) => ({ ...c, [q.id]: v }))}
            />
          </div>
        ))}
      </div>
      <p role="alert" className="m-0 min-h-5 text-[13px] text-bad">
        {error}
      </p>
      <div className="flex gap-4">
        <Button variant="primary" disabled={saving} onClick={() => void next()}>
          Continue
        </Button>
      </div>
    </OnboardingFrame>
  );
}
