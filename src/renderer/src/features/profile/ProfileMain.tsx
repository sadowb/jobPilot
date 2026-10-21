import { forwardRef, useReducer, useState, type ReactNode } from 'react';
import { SegmentedChoice } from '../../components/SegmentedChoice';
import { SwitchToggle } from '../../components/SwitchToggle';
import { ProfileDocuments } from './ProfileDocuments';
import '../../styles/v17-surfaces.css';
import { BASE_LETTER, INITIAL_FACTS, LINKS, TRANSCRIPT } from './data';
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
      className="v17c profile-links-preview"
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

const KnowledgeCard = forwardRef<
  HTMLElement,
  { facts: FactsState; dispatch: (a: Parameters<typeof factsReducer>[1]) => void }
>(function KnowledgeCard({ facts, dispatch }, ref) {
  const [tab, setTab] = useState<'review' | 'confirmed'>('review');
  const shown = tab === 'review' ? facts.review : facts.confirmed;
  return (
    <section ref={ref} id="agent-knowledge" className="v17c" style={card}>
      <CardHead
        title="What the agents know"
        sub="Readable, editable, yours. Facts the agents inferred wait here until you confirm them."
      />
      <div
        className="profile-knowledge-grid"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr)', gap: 0 }}
      >
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
          <h3 style={{ margin: 0, fontSize: 16 }}>Your common answers</h3>
          <p className="s" style={{ fontSize: 13 }}>
            Keep contact details, work preferences, and reusable application answers together in About me.
          </p>
          <a className="btn sm" href="#/profile">
            Edit my details & answers →
          </a>
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
      <ProfileDocuments />
      <div
        className="profile-document-extras"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16, flex: '0 0 auto' }}
      >
        <CoverLetterCard />
        <TranscriptCard />
      </div>
      <LinksCard />
      <KnowledgeCard ref={knowledgeRef} facts={facts} dispatch={dispatch} />
    </main>
  );
}
