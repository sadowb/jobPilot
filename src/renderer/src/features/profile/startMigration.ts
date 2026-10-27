import { MARKETS_KEY, readMarkets } from './markets';
import type { JobPilotBridge } from '../../../../shared/ipc';
import type { ProfileData } from '../../../../shared/dto';
import { ANSWERS_V2_KEY, readAnswersV2, type Answer } from './answers';
import { parseNoticeText } from './notice';
import { ANSWERS_KEY, PROFILE_KEY, readProfile, type PersonalProfile } from './personal';
import { commitSaved, type KeyValueStore } from './savedStorage';

const START_QUESTION = /^\s*when can you start\??\s*$/i;
const isStart = (a: Answer) => a.id === 'start' || START_QUESTION.test(a.question);

export interface StartMigrationPlan {
  profile?: PersonalProfile;
  answers?: Answer[];
}

/**
 * "When can you start?" is now derived from Notice, so a free-text answer must not live on as a duplicate.
 * - An empty start answer is removed.
 * - A written one moves into Notice when Notice is empty (parsed when unambiguous, otherwise kept verbatim as
 *   the flagged legacy text), then the answer is removed.
 * - When Notice is already set, the text is kept as an ordinary question under another name. Nothing is lost.
 * Returns an empty plan when there is nothing to do, which makes the migration idempotent.
 */
export function planStartMigration(profile: PersonalProfile, answers: readonly Answer[]): StartMigrationPlan {
  const starts = answers.filter(isStart);
  if (!starts.length) return {};
  const text = starts.map((a) => a.default.trim()).find(Boolean);
  const plan: StartMigrationPlan = {};
  let keepAsNote = false;
  if (text) {
    if (!profile.notice && !profile.startDate.trim()) {
      const notice = parseNoticeText(text);
      plan.profile = notice ? { ...profile, notice } : { ...profile, startDate: text.slice(0, 2000) };
    } else {
      keepAsNote = true;
    }
  }
  plan.answers = answers.flatMap((a) => {
    if (!isStart(a)) return [a];
    if (keepAsNote && a.default.trim())
      return [{ ...a, id: 'start-note', question: 'Your earlier start-date wording' }];
    return [];
  });
  return plan;
}

/**
 * Applies the plan to storage. Unreadable data is never touched (the editors report it and back it up on save).
 * The profile is written first, so a failure part-way can only leave the text in both places, never in neither.
 */
export function migrateStartAnswer(store: KeyValueStore = localStorage): void {
  try {
    const rawAnswers = store.getItem(ANSWERS_V2_KEY);
    const legacy = store.getItem(ANSWERS_KEY);
    if (rawAnswers === null && legacy === null) return;
    const answers = readAnswersV2(rawAnswers, legacy);
    const profile = readProfile(store.getItem(PROFILE_KEY));
    const plan = planStartMigration(profile, answers);
    if (plan.profile) commitSaved(store, PROFILE_KEY, plan.profile, null);
    if (plan.answers) commitSaved(store, ANSWERS_V2_KEY, plan.answers, null);
  } catch {
    /* unreadable or unwritable storage: leave everything as it is */
  }
}

/** Only remove legacy values after the main-process transaction has committed. */
export async function initializeProfile(
  bridge: JobPilotBridge['profile'],
  store: Pick<Storage, 'getItem' | 'removeItem'>,
): Promise<ProfileData> {
  const keys = [PROFILE_KEY, MARKETS_KEY, ANSWERS_KEY, ANSWERS_V2_KEY];
  if (await bridge.migrationDone()) {
    const data = await bridge.get();
    for (const key of keys) store.removeItem(key);
    return data;
  }
  const personal = readProfile(store.getItem(PROFILE_KEY));
  const answers = readAnswersV2(store.getItem(ANSWERS_V2_KEY), store.getItem(ANSWERS_KEY));
  const plan = planStartMigration(personal, answers);
  const data = await bridge.migrate({
    personal: plan.profile ?? (store.getItem(PROFILE_KEY) === null ? null : personal),
    markets: readMarkets(store.getItem(MARKETS_KEY)),
    answers: plan.answers ?? answers,
  });
  for (const key of keys) store.removeItem(key);
  return data;
}
