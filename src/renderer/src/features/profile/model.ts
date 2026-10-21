export type FactOrigin = 'agent' | 'you';

export interface ReviewFact {
  id: string;
  /** Headline, e.g. "Notice period · Immediately". */
  text: string;
  source: string;
}

export interface FactsState {
  review: readonly ReviewFact[];
  confirmed: readonly ReviewFact[];
  /** Facts confirmed before this session, drawn as a count only. */
  priorConfirmed: number;
}

export type FactAction = { type: 'confirm' | 'reject'; id: string } | { type: 'restore' };

/**
 * Confirm moves a fact from "To review" to "Confirmed"; reject ("Not true") drops it so agents stop using it.
 * Unknown ids are ignored, so a double click on a fast re-render cannot confirm twice.
 */
export function factsReducer(state: FactsState, action: FactAction): FactsState {
  if (action.type === 'restore') return state;
  const fact = state.review.find((f) => f.id === action.id);
  if (!fact) return state;
  const review = state.review.filter((f) => f.id !== action.id);
  return action.type === 'confirm' ? { ...state, review, confirmed: [fact, ...state.confirmed] } : { ...state, review };
}

export const confirmedTotal = (s: FactsState): number => s.priorConfirmed + s.confirmed.length;
