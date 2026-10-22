import { CritterBot } from '../../../components/CritterBot';
import { KeyCap } from '../../../components/KeyCap';
import { Eyebrow } from '../../../components/ui';
import { Btn } from '../Btn';
import {
  AfterBox,
  BeforeBox,
  DonePill,
  FixCard,
  Icon,
  ItemTitle,
  NeutralPill,
  Note,
  SetByChip,
  StatusPill,
  UndoButton,
  WrapRow,
} from './parts';

const MonoCaption = ({ children }: { children: string }) => (
  <div className="font-mono text-[11px] tracking-[0.06em] text-muted">{children}</div>
);

/** V17 "manual control": every automatic change shows who made it and has one fix. Static states, no store. */
export function ManualControlBoard() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[22px] px-10 pt-7 pb-10">
      <div className="flex items-end justify-between gap-8">
        <div className="min-w-0">
          <Eyebrow>V17 · manual control</Eyebrow>
          <h1 className="m-0 mt-1.5 font-serif text-[36px] leading-[1.02] font-[350] tracking-[-0.025em]">
            Auto does the work.{' '}
            <span className="font-serif text-[1em] font-light tracking-[-0.01em] italic">You keep the last word.</span>
          </h1>
          <div className="mt-2 text-[13.5px] leading-[1.5] text-muted">
            Every automatic change shows who made it and has one fix. Only what already reached an employer is locked,
            and the card says why.
          </div>
        </div>
        <div className="flex flex-none flex-col items-end gap-2">
          <span className="font-mono text-[11.5px] tracking-[0.06em] text-muted">SET BY</span>
          <div className="flex items-center gap-2">
            <SetByChip by="email" />
            <SetByChip by="agent" />
            <SetByChip by="you" />
          </div>
          <span className="text-[12.5px] text-muted">
            Undo is always one step. Nothing an email or the crew sets is final.
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-4 [@media(max-width:1194px)]:grid-cols-[repeat(2,minmax(0,1fr))]">
        <FixCard
          n="01"
          by="email"
          title="Status set by an email"
          body="The recruiter reply moved the job to Screening. One undo puts it back; the status picker sets anything else."
          before={
            <BeforeBox>
              <WrapRow>
                <StatusPill status="Screening" />
                <UndoButton />
              </WrapRow>
            </BeforeBox>
          }
          after={
            <AfterBox label="OCT 20">
              <div>
                <StatusPill status="Interview" />
              </div>
              <Note>Later emails won’t overwrite a status you set.</Note>
            </AfterBox>
          }
        />
        <FixCard
          n="02"
          by="email"
          title="Email matched the wrong job"
          body="Matching uses company and subject. When it guesses wrong, unlink it and pick the right job."
          before={
            <BeforeBox>
              <ItemTitle>Re: next steps · Dana, recruiter</ItemTitle>
              <div className="text-[12px] leading-[1.4] text-muted">
                matched to <b className="text-ink">Linear · Software Engineer</b>
              </div>
              <div>
                <Btn size="sm" variant="danger">
                  Not this job
                </Btn>
              </div>
            </BeforeBox>
          }
          after={
            <AfterBox label="OCT 19">
              <div>
                <DonePill>Moved to Ramp</DonePill>
              </div>
              <Note>Ramp · Software Engineer, New Grad now shows this email.</Note>
            </AfterBox>
          }
        />
        <FixCard
          n="03"
          by="agent"
          title="Duplicate detected"
          body="Two postings with the same company and title. Say which is real, or merge them into one timeline."
          before={
            <BeforeBox>
              <ItemTitle>Perpay · SWE New Grad (Super Day)</ItemTitle>
              <Note>Oct 19 · Greenhouse</Note>
              <ItemTitle>Perpay · Software Engineer, New Grad</ItemTitle>
              <Note>Oct 19 · flagged duplicate?</Note>
              <div className="flex items-center gap-2">
                <Btn size="sm" variant="ghost">
                  Not a duplicate
                </Btn>
                <Btn size="sm" variant="primary">
                  <Icon>
                    <circle cx="6" cy="5.5" r="2.2" />
                    <circle cx="6" cy="18.5" r="2.2" />
                    <circle cx="18" cy="8" r="2.2" />
                    <path d="M6 7.7v8.6M18 10.2c0 4.5-6 3.6-11 6.4" />
                  </Icon>
                  Merge
                </Btn>
              </div>
            </BeforeBox>
          }
          after={
            <AfterBox label="OCT 19">
              <div>
                <DonePill>Merged</DonePill>
              </div>
              <Note>One timeline, both sent links kept.</Note>
            </AfterBox>
          }
        />
        <FixCard
          n="04"
          by="agent"
          title="Agent picked the CV"
          body="Before send, change it in one click. After submit it is locked, and the card says why."
          before={
            <BeforeBox>
              <WrapRow>
                <span className="flex min-w-0 items-center gap-2">
                  <Icon>
                    <path d="M7 3h7l5 5v13H7z" />
                    <path d="M14 3v5h5" />
                  </Icon>
                  <b className="text-[13.5px]">AI / ML CV v4</b>
                </span>
                <Btn size="sm" variant="ghost">
                  <Icon>
                    <path d="M6 9l6 6 6-6" />
                  </Icon>
                  Change CV
                </Btn>
              </WrapRow>
              <Note>Picked for Asana · Greenhouse</Note>
            </BeforeBox>
          }
          after={
            <AfterBox label="BEFORE SEND">
              <b className="text-[13.5px]">Base CV</b>
              <div className="flex items-start gap-2 rounded-xl bg-hover px-2.5 py-2 text-[12px] text-ink-2">
                <span className="mt-px">
                  <Icon>
                    <rect x="5" y="11" width="14" height="10" rx="2.5" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </Icon>
                </span>
                <span className="min-w-0">Locks at submit: the employer gets this exact file.</span>
              </div>
            </AfterBox>
          }
        />
        <FixCard
          n="05"
          by="agent"
          title="Marked submitted"
          body="The agent saw a confirmation page. If it was a dead end, say so and the job goes back to Up next."
          before={
            <BeforeBox>
              <ItemTitle>Duolingo · Software Engineer, New Grad</ItemTitle>
              <WrapRow>
                <StatusPill status="Submitted" />
                <Note>Oct 19 · no ack yet</Note>
              </WrapRow>
              <div>
                <Btn size="sm" variant="danger">
                  Didn’t go through
                </Btn>
              </div>
            </BeforeBox>
          }
          after={
            <AfterBox label="OCT 19">
              <div>
                <NeutralPill>Back in Up next</NeutralPill>
              </div>
              <Note>Position 1. The crew opens it next.</Note>
            </AfterBox>
          }
        />
        <FixCard
          n="06"
          by="agent"
          title="Deleted by a rule"
          body="Removal is archive, not erase. Undo stays in the toast for 8 seconds; after that, Show deleted brings it back."
          before={
            <BeforeBox>
              <div className="min-w-0 text-[13.5px] leading-[1.4]">
                Removed <b className="font-[650]">Coinbase</b> · Software Engineer, New Grad
              </div>
              <div className="flex items-center gap-2.5">
                <UndoButton />
                <span className="text-[12px] text-muted underline">Show deleted (3)</span>
              </div>
            </BeforeBox>
          }
          after={
            <AfterBox label="OCT 19">
              <div>
                <DonePill>Restored</DonePill>
              </div>
              <Note>Back in Up next, last in line.</Note>
            </AfterBox>
          }
        />
        <FixCard
          n="07"
          by="agent"
          title="Misread location"
          body="The parser read the posting header as Remote. Edit the field in place; your value sticks."
          before={
            <BeforeBox>
              <MonoCaption>LOCATION</MonoCaption>
              <div className="flex items-center justify-between gap-2">
                <b className="text-[14px]">Remote · US</b>
                <span
                  role="button"
                  title="Edit"
                  aria-label="Edit"
                  className="inline-grid size-[30px] flex-none place-items-center rounded-[9px] border border-line bg-bg text-ink-2"
                >
                  <Icon>
                    <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                  </Icon>
                </span>
              </div>
              <Note>Parsed from the posting header.</Note>
            </BeforeBox>
          }
          after={
            <AfterBox label="NOW">
              <MonoCaption>LOCATION</MonoCaption>
              <div className="flex h-[38px] min-w-0 items-center gap-2.5 rounded-[10px] border border-ink bg-bg px-3.5 text-[14px] text-ink shadow-[0_0_0_3px_color-mix(in_srgb,var(--ink)_14%,transparent)]">
                Austin, TX
              </div>
              <Note>↵ save · Esc cancel</Note>
            </AfterBox>
          }
        />
        <FixCard
          n="08"
          by="agent"
          title="Agent stuck"
          body="The education dropdown didn’t load after 3 tries. Take over, pick it yourself, hand it back. Press T on the card."
          before={
            <BeforeBox>
              <div className="flex items-center gap-2.5">
                <CritterBot agent="Brex" state="block" size={34} />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold">Brex · Human check</div>
                  <div className="text-[12px] text-muted">Education dropdown · Greenhouse step 3</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Btn size="sm" variant="primary">
                  <Icon>
                    <path d="M5 12h12" />
                    <path d="M12 6l6 6-6 6" />
                  </Icon>
                  Take over
                </Btn>
                <KeyCap>T</KeyCap>
              </div>
            </BeforeBox>
          }
          after={
            <AfterBox label="9:38">
              <div className="flex items-center gap-2.5">
                <CritterBot agent="Brex" state="work" size={34} />
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold">You’re driving</div>
                  <div className="text-[12px] text-muted">Agent paused · resumes from your page</div>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[12px] text-muted">
                Hand back <KeyCap>H</KeyCap>
              </span>
            </AfterBox>
          }
        />
      </div>
    </div>
  );
}
