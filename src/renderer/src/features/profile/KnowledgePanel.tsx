import { useReducer, useState } from 'react';
import { Segmented } from '../../components/ui';
import { PButton } from './buttons';
import { confirmedTotal, factsReducer, type FactsState } from './model';
import { actionsRow, emptyText, sectionTitle } from './styles';

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
    <section className="flex flex-col items-start gap-3.5" aria-labelledby="agent-knowledge-title">
      <h2 id="agent-knowledge-title" className={`${sectionTitle} leading-[1.2]`}>What the agents know</h2>
      <p className="-mt-2 text-[13px] text-muted">Readable, editable, yours. Facts the agents infer wait here until you confirm them.</p>
      <Segmented
        className="w-[300px]"
        label="Facts filter"
        options={[
          { value: 'review', label: `To review ${facts.review.length}` },
          { value: 'confirmed', label: `Confirmed ${confirmedTotal(facts)}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      <ul className="w-full">
        {shown.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-4 border-t border-line py-3">
            <div>
              <strong className="block text-sm font-semibold">{f.text}</strong>
              <span className="text-[13px] text-muted">{f.source}</span>
            </div>
            {tab === 'review' && (
              <div className={actionsRow}>
                <PButton variant="primary" onClick={() => dispatch({ type: 'confirm', id: f.id })}>
                  Confirm
                </PButton>
                <PButton variant="ghost" onClick={() => dispatch({ type: 'reject', id: f.id })}>
                  Not true
                </PButton>
              </div>
            )}
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <p className={emptyText}>
          {tab === 'review'
            ? 'Nothing to review yet. The agents will ask here when they infer something new about you.'
            : 'Nothing confirmed yet. Facts you confirm will appear here.'}
        </p>
      )}
    </section>
  );
}
