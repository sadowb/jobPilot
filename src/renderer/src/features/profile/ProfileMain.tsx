import { forwardRef, useReducer, useState, type ReactNode } from 'react';
import { SegmentedChoice } from '../../components/SegmentedChoice';
import { SwitchToggle } from '../../components/SwitchToggle';
import '../../styles/v17-surfaces.css';
import {
  BASE_LETTER,
  CV_DOCS,
  INITIAL_FACTS,
  LINKS,
  SAVED_ANSWERS,
  SAVED_SPLIT,
  SAVED_TOTAL,
  THUMB_LINES,
  TRANSCRIPT,
  type CvDoc,
} from './data';
import { confirmedTotal, factsReducer, type FactsState } from './model';

const card = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: '18px 22px',
  boxSizing: 'border-box',
  minHeight: 0,
  flex: 'none',
  overflow: 'hidden',
} as const;
const hdTitle = { fontSize: 16, fontWeight: 650, letterSpacing: '-.01em' } as const;
const tag = (color: string) => ({ color, whiteSpace: 'nowrap', flex: 'none' }) as const;

function NewBadge() {
  return (
    <span
      className="v17x"
      style={{ color: 'var(--brand-text)', border: '1px solid var(--brand-text)', borderRadius: 6, padding: '0 6px' }}
    >
      New
    </span>
  );
}

function CardHead({ title, sub, badge }: { title: string; sub: string; badge?: boolean }) {
  return (
    <div className="row sp nw" style={{ alignItems: 'flex-start', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div className="row nw" style={{ gap: 8 }}>
          <b style={hdTitle}>{title}</b>
          {badge && <NewBadge />}
        </div>
        <div className="s" style={{ fontSize: 13, marginTop: 3 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

/** White paper preview of a CV; always white, in both themes. */
function CvThumb({ accent }: { accent: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        flex: 'none',
        width: 104,
        height: 136,
        border: '1px solid var(--line-2)',
        borderRadius: 8,
        background: 'rgb(255 255 255)',
        color: 'rgb(17 17 17)',
        padding: '12px 10px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflow: 'hidden',
      }}
    >
      <i
        style={{
          display: 'block',
          height: 8,
          width: '62%',
          borderRadius: 2,
          background: accent ? 'var(--brand)' : 'currentColor',
        }}
      />
      <i
        style={{
          display: 'block',
          height: 3,
          width: '40%',
          borderRadius: 2,
          background: 'currentColor',
          opacity: 0.18,
          marginBottom: 4,
        }}
      />
      {THUMB_LINES.map((w) => (
        <i
          key={w}
          style={{ display: 'block', height: 3, borderRadius: 2, background: 'currentColor', opacity: 0.18, width: w }}
        />
      ))}
    </div>
  );
}

function CvCard({ doc }: { doc: CvDoc }) {
  return (
    <div className="v17c" style={{ display: 'flex', gap: 20, padding: '20px 22px', boxSizing: 'border-box' }}>
      <CvThumb accent={doc.accent} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="row sp nw" style={{ gap: 8 }}>
          <b style={{ fontSize: 16, fontWeight: 650 }}>{doc.name}</b>
          <span className="v17x">{doc.version}</span>
        </div>
        <div className="s" style={{ fontSize: 13 }}>
          {doc.meta}
        </div>
        <div className="s" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          {doc.blurb}
        </div>
        <div className="row nw" style={{ gap: 8, paddingTop: 4, marginTop: 'auto' }}>
          <span
            className="v17x"
            style={{ border: '1px solid var(--line-2)', borderRadius: 99, padding: '3px 10px', color: 'var(--ink-2)' }}
          >
            {doc.defaultFor}
          </span>
        </div>
        <div className="row nw" style={{ gap: 8 }}>
          <button className="btn sm" type="button">
            Preview
          </button>
          <button className="btn sm ghost" type="button">
            Edit source
          </button>
        </div>
      </div>
    </div>
  );
}

const placeholder = {
  padding: '0 6px',
  borderRadius: 6,
  background: 'var(--brand-tint)',
  color: 'var(--brand-text)',
  fontFamily: 'var(--mono)',
  fontSize: 12,
  whiteSpace: 'nowrap',
} as const;

function CoverLetterCard() {
  const [drafts, setDrafts] = useState(true);
  const [tone, setTone] = useState<string>('direct');
  return (
    <section className="v17c" style={card}>
      <CardHead title="Cover letters" sub="One base letter, tailored per job" badge />
      <div
        className="row sp nw"
        style={{ gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 14 }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Cap drafts per job</div>
          <div className="s" style={{ fontSize: 13 }}>
            Writes a letter for each job that asks for one. You approve it in the inbox.
          </div>
        </div>
        <SwitchToggle label="Cap drafts per job" on={drafts} onChange={setDrafts} />
      </div>
      <div style={{ border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', background: 'var(--bg)' }}>
        <div className="row sp nw">
          <b style={{ fontSize: 14 }}>Base letter</b>
          <span className="v17x">{BASE_LETTER.template}</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
          Dear <span style={placeholder}>company</span> team, I build agents that do real work, and I ship small changes
          every day. Your posting asks for <span style={placeholder}>what the role needs</span>, and that is how I work.
          …
        </div>
      </div>
      <div className="row nw" style={{ gap: 12 }}>
        <span className="s" style={{ fontSize: 13 }}>
          Tone
        </span>
        <div style={{ flex: 1 }}>
          <SegmentedChoice
            label="Letter tone"
            options={BASE_LETTER.tones}
            value={tone}
            onChange={setTone}
            width="100%"
          />
        </div>
      </div>
    </section>
  );
}

function CapsRead({ children, pad }: { children: ReactNode; pad?: number }) {
  return (
    <div
      className="row nw"
      style={{
        gap: 10,
        marginTop: 'auto',
        paddingTop: pad ?? 14,
        borderTop: '1px solid var(--line)',
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--muted)',
      }}
    >
      <span className="v17x" style={{ color: 'var(--ink-2)', flex: 'none' }}>
        Cap’s read
      </span>
      <span>{children}</span>
    </div>
  );
}

function TranscriptCard() {
  return (
    <section className="v17c" style={card}>
      <CardHead title="Transcript" sub="For forms that ask for grades or a graduation date" badge />
      <div className="row nw" style={{ gap: 14 }}>
        <div
          style={{
            width: 42,
            height: 54,
            borderRadius: 6,
            border: '1px solid var(--line-2)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--muted)',
            flex: 'none',
          }}
        >
          PDF
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>{TRANSCRIPT.file}</div>
          <div className="s" style={{ fontSize: 13 }}>
            {TRANSCRIPT.meta}
          </div>
        </div>
        <button className="btn sm" type="button">
          Preview
        </button>
        <button className="btn sm ghost" type="button">
          Replace
        </button>
      </div>
      <div>
        {TRANSCRIPT.facts.map((f) => (
          <div key={f.label} className="row sp nw v17hair" style={{ padding: '10px 0', fontSize: 13.5 }}>
            <span className="s">{f.label}</span>
            <span>{f.value}</span>
          </div>
        ))}
      </div>
      <CapsRead>Attached only when a form asks for it. Never by default.</CapsRead>
    </section>
  );
}

function LinksCard() {
  return (
    <section
      className="v17c"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '18px 22px',
        boxSizing: 'border-box',
        flex: 'none',
      }}
    >
      <div style={{ flex: 'none', width: 168, minWidth: 0 }}>
        <div style={{ fontWeight: 650, fontSize: 16, letterSpacing: '-.01em' }}>Website and links</div>
        <div className="s" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.45 }}>
          Cap checks these before each send.
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 12 }}>
        {LINKS.map((l) => (
          <div
            key={l.label}
            style={{
              flex: 1,
              minWidth: 0,
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '11px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div className="row sp nw" style={{ gap: 8 }}>
              <span className="v17x">{l.label}</span>
              <span className="s" style={{ fontSize: 11.5, color: 'var(--brand-text)', whiteSpace: 'nowrap' }}>
                {l.status}
              </span>
            </div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {l.value}
            </div>
          </div>
        ))}
        <div
          className="row"
          style={{
            flex: 'none',
            width: 96,
            justifyContent: 'center',
            border: '1px dashed var(--line-2)',
            borderRadius: 14,
            padding: '11px 12px',
          }}
        >
          <button className="btn sm ghost" type="button" style={{ minHeight: 30 }}>
            + Add link
          </button>
        </div>
      </div>
    </section>
  );
}

const PENCIL = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

const KnowledgeCard = forwardRef<
  HTMLElement,
  { facts: FactsState; dispatch: (a: Parameters<typeof factsReducer>[1]) => void }
>(function KnowledgeCard({ facts, dispatch }, ref) {
  const [tab, setTab] = useState<'review' | 'confirmed'>('review');
  const shown = tab === 'review' ? facts.review : facts.confirmed;
  return (
    <section ref={ref} className="v17c" style={card}>
      <CardHead
        title="What the agents know"
        sub="Readable, editable, yours. Facts the agents inferred wait here until you confirm them."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr)', gap: 0 }}>
        <div style={{ paddingRight: 28, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <SegmentedChoice
            label="Facts filter"
            options={[
              { value: 'review', label: `To review ${facts.review.length}` },
              { value: 'confirmed', label: `Confirmed ${confirmedTotal(facts)}` },
            ]}
            value={tab}
            onChange={setTab}
            width={300}
          />
          <div style={{ marginTop: 6 }}>
            {shown.map((f) => (
              <div
                key={f.id}
                className="v17hair row sp nw"
                style={{ gap: 14, padding: '12px 0', alignItems: 'center' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.text}</div>
                  <div className="row nw" style={{ gap: 8, marginTop: 4 }}>
                    <span className="v17x" style={tag('var(--work)')}>
                      Set by agent
                    </span>
                    <span className="s" style={{ fontSize: 13 }}>
                      {f.source}
                    </span>
                  </div>
                </div>
                {tab === 'review' && (
                  <div className="row nw" style={{ gap: 6, flex: 'none' }}>
                    <button
                      className="btn sm pri"
                      type="button"
                      style={{ minHeight: 30, padding: '0 12px' }}
                      onClick={() => dispatch({ type: 'confirm', id: f.id })}
                    >
                      Confirm
                    </button>
                    {/* No edit surface exists in the V17 boards, so Edit is inert for now. */}
                    <button className="btn sm ghost" type="button" style={{ minHeight: 30, padding: '0 10px' }}>
                      Edit
                    </button>
                    <button
                      className="btn sm ghost"
                      type="button"
                      style={{ minHeight: 30, padding: '0 10px' }}
                      onClick={() => dispatch({ type: 'reject', id: f.id })}
                    >
                      Not true
                    </button>
                  </div>
                )}
              </div>
            ))}
            {shown.length === 0 && (
              <div className="v17hair s" style={{ padding: '12px 0', fontSize: 13 }}>
                {tab === 'review'
                  ? 'Nothing to review. Cap will ask here when it infers something new.'
                  : `${facts.priorConfirmed} earlier facts are saved. Ones you confirm now appear here.`}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            paddingLeft: 28,
            borderLeft: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div className="row sp nw">
            <b style={{ fontSize: 14 }}>Saved answers · {SAVED_TOTAL}</b>
            <span className="s" style={{ fontSize: 13 }}>
              {SAVED_SPLIT}
            </span>
          </div>
          <div className="inp ph" style={{ height: 40, borderRadius: 99, gap: 8 }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            Search {SAVED_TOTAL} saved answers
          </div>
          {SAVED_ANSWERS.map((a) => (
            <div
              key={a.id}
              className="row sp nw"
              style={{ gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.question}</div>
                <div
                  className="row"
                  style={{ gap: '4px 8px', marginTop: 3, flexWrap: 'wrap', alignItems: 'baseline', minWidth: 0 }}
                >
                  <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{a.answer}</span>
                  <span className="v17x" style={tag(a.setBy === 'you' ? 'var(--ink-2)' : 'var(--work)')}>
                    {a.setBy === 'you' ? 'Set by you' : 'Set by agent'}
                  </span>
                  <span className="s" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                    {a.note}
                  </span>
                </div>
              </div>
              <button className="btn sm ghost ic" type="button" aria-label="Edit answer" style={{ flex: 'none' }}>
                {PENCIL}
              </button>
            </div>
          ))}
          <div className="row sp nw" style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            <span className="s" style={{ fontSize: 13 }}>
              Showing {SAVED_ANSWERS.length} of {SAVED_TOTAL}
            </span>
            <button className="btn sm ghost" type="button">
              Load more
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

/** Facts state lives here so the sidebar count and the panel stay in step. */
export function useProfileFacts() {
  return useReducer(factsReducer, INITIAL_FACTS);
}

export function ProfileMain({
  facts,
  dispatch,
  knowledgeRef,
}: {
  facts: FactsState;
  dispatch: (a: Parameters<typeof factsReducer>[1]) => void;
  knowledgeRef: React.Ref<HTMLElement>;
}) {
  return (
    <main
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: '32px 48px 40px 40px',
        boxSizing: 'border-box',
      }}
    >
      <div className="row sp nw" style={{ alignItems: 'flex-end', gap: 24, flex: 'none' }}>
        <div style={{ minWidth: 0 }}>
          <div className="v17x">Profile & documents · Documents</div>
          <h1 className="h1" style={{ margin: '6px 0 0' }}>
            Everything an application <span className="it">draws from.</span>
          </h1>
        </div>
        <span className="s" style={{ fontSize: 13, maxWidth: 280, textAlign: 'right', lineHeight: 1.5 }}>
          Edit once. Every agent reads this, and each change shows who made it.
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16, flex: 'none' }}>
        {CV_DOCS.map((d) => (
          <CvCard key={d.id} doc={d} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16, flex: '0 0 auto' }}>
        <CoverLetterCard />
        <TranscriptCard />
      </div>
      <LinksCard />
      <KnowledgeCard ref={knowledgeRef} facts={facts} dispatch={dispatch} />
    </main>
  );
}
