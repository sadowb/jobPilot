import { useReducer, useState } from 'react';
import { SegmentedChoice } from '../../components/SegmentedChoice';
import { confirmedTotal, factsReducer, type FactsState } from './model';

/** Real facts will come from the agents; until then a user starts with none, never with sample data. */
export const NO_FACTS: FactsState = { review: [], confirmed: [], priorConfirmed: 0 };

export function useProfileFacts() {
  return useReducer(factsReducer, NO_FACTS);
}

export function KnowledgePanel({
  facts,
  dispatch,
}: {
  facts: FactsState;
  dispatch: (a: Parameters<typeof factsReducer>[1]) => void;
}) {
  const [tab, setTab] = useState<'review' | 'confirmed'>('review');
  const shown = tab === 'review' ? facts.review : facts.confirmed;
  return (
    <section className="pf-knowledge" aria-labelledby="agent-knowledge-title">
      <h2 id="agent-knowledge-title">What the agents know</h2>
      <p className="pf-lede">Readable, editable, yours. Facts the agents infer wait here until you confirm them.</p>
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
      <ul className="pf-factlist">
        {shown.map((f) => (
          <li key={f.id}>
            <div>
              <strong>{f.text}</strong>
              <span>{f.source}</span>
            </div>
            {tab === 'review' && (
              <div className="profile-actions">
                <button type="button" className="btn sm pri" onClick={() => dispatch({ type: 'confirm', id: f.id })}>
                  Confirm
                </button>
                <button type="button" className="btn sm ghost" onClick={() => dispatch({ type: 'reject', id: f.id })}>
                  Not true
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <p className="pf-empty">
          {tab === 'review'
            ? 'Nothing to review yet. The agents will ask here when they infer something new about you.'
            : 'Nothing confirmed yet. Facts you confirm will appear here.'}
        </p>
      )}
    </section>
  );
}
