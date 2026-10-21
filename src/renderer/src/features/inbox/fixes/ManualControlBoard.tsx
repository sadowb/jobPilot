import { CritterBot } from '../../../components/CritterBot';
import { KeyCap } from '../../../components/KeyCap';
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
  <div className="s" style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>
    {children}
  </div>
);

/** V17 "manual control": every automatic change shows who made it and has one fix. Static states, no store. */
export function ManualControlBoard() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: '28px 40px 40px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      <div className="row sp nw" style={{ alignItems: 'flex-end', gap: 32 }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">V17 · manual control</div>
          <h1 className="h1" style={{ fontSize: 36, marginTop: 6 }}>
            Auto does the work. <span className="it">You keep the last word.</span>
          </h1>
          <div className="s" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.5 }}>
            Every automatic change shows who made it and has one fix. Only what already reached an employer is locked,
            and the card says why.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flex: 'none' }}>
          <span className="spec" style={{ letterSpacing: '.06em' }}>
            SET BY
          </span>
          <div className="row nw" style={{ gap: 8 }}>
            <SetByChip by="email" />
            <SetByChip by="agent" />
            <SetByChip by="you" />
          </div>
          <span className="s" style={{ fontSize: 12.5 }}>
            Undo is always one step. Nothing an email or the crew sets is final.
          </span>
        </div>
      </div>
      <div
        className="manual-control-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', columnGap: 16, rowGap: 16 }}
      >
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
              <div className="s" style={{ fontSize: 12, lineHeight: 1.4 }}>
                matched to <b style={{ color: 'var(--ink)' }}>Linear · Software Engineer</b>
              </div>
              <div>
                <button className="btn sm neg" type="button">
                  Not this job
                </button>
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
              <div className="row nw" style={{ gap: 8 }}>
                <button className="btn sm ghost" type="button">
                  Not a duplicate
                </button>
                <button className="btn sm pri" type="button">
                  <Icon>
                    <circle cx="6" cy="5.5" r="2.2" />
                    <circle cx="6" cy="18.5" r="2.2" />
                    <circle cx="18" cy="8" r="2.2" />
                    <path d="M6 7.7v8.6M18 10.2c0 4.5-6 3.6-11 6.4" />
                  </Icon>
                  Merge
                </button>
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
                <span className="row nw" style={{ gap: 8, minWidth: 0 }}>
                  <Icon>
                    <path d="M7 3h7l5 5v13H7z" />
                    <path d="M14 3v5h5" />
                  </Icon>
                  <b style={{ fontSize: 13.5 }}>AI / ML CV v4</b>
                </span>
                <button className="btn sm ghost" type="button">
                  <Icon>
                    <path d="M6 9l6 6 6-6" />
                  </Icon>
                  Change CV
                </button>
              </WrapRow>
              <Note>Picked for Asana · Greenhouse</Note>
            </BeforeBox>
          }
          after={
            <AfterBox label="BEFORE SEND">
              <b style={{ fontSize: 13.5 }}>Base CV</b>
              <div
                className="row nw"
                style={{
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: 'var(--hover)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ marginTop: 1 }}>
                  <Icon>
                    <rect x="5" y="11" width="14" height="10" rx="2.5" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </Icon>
                </span>
                <span style={{ minWidth: 0 }}>Locks at submit: the employer gets this exact file.</span>
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
                <button className="btn sm neg" type="button">
                  Didn’t go through
                </button>
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
              <div style={{ fontSize: 13.5, minWidth: 0, lineHeight: 1.4 }}>
                Removed <b style={{ fontWeight: 650 }}>Coinbase</b> · Software Engineer, New Grad
              </div>
              <div className="row nw" style={{ gap: 10 }}>
                <UndoButton />
                <span className="s" style={{ fontSize: 12, textDecoration: 'underline' }}>
                  Show deleted (3)
                </span>
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
              <div className="row sp nw" style={{ gap: 8 }}>
                <b style={{ fontSize: 14 }}>Remote · US</b>
                <span
                  role="button"
                  title="Edit"
                  aria-label="Edit"
                  style={{
                    display: 'inline-grid',
                    placeItems: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    color: 'var(--ink-2)',
                    border: '1px solid var(--line)',
                    background: 'var(--bg)',
                    flex: 'none',
                  }}
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
              <div className="inp f" style={{ height: 38, borderRadius: 10, fontSize: 14 }}>
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
              <div className="row nw" style={{ gap: 10 }}>
                <CritterBot agent="Brex" state="block" size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>Brex · Human check</div>
                  <div className="s" style={{ fontSize: 12 }}>
                    Education dropdown · Greenhouse step 3
                  </div>
                </div>
              </div>
              <div className="row nw" style={{ gap: 8 }}>
                <button className="btn sm pri" type="button">
                  <Icon>
                    <path d="M5 12h12" />
                    <path d="M12 6l6 6-6 6" />
                  </Icon>
                  Take over
                </button>
                <KeyCap>T</KeyCap>
              </div>
            </BeforeBox>
          }
          after={
            <AfterBox label="9:38">
              <div className="row nw" style={{ gap: 10 }}>
                <CritterBot agent="Brex" state="work" size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>You’re driving</div>
                  <div className="s" style={{ fontSize: 12 }}>
                    Agent paused · resumes from your page
                  </div>
                </div>
              </div>
              <span className="row nw s" style={{ gap: 6, fontSize: 12 }}>
                Hand back <KeyCap>H</KeyCap>
              </span>
            </AfterBox>
          }
        />
      </div>
    </div>
  );
}
