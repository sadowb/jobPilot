import { highlight } from '../filter';

/** Text with search hits wrapped in the board's `mark` style (need-tint fill, 4px radius). */
export function Highlighted({ text, tokens }: { text: string; tokens: string[] }) {
  return (
    <>
      {highlight(text, tokens).map((seg, i) =>
        seg.hit ? (
          <mark
            key={i}
            style={{ background: 'var(--need-tint)', color: 'var(--ink)', borderRadius: 4, padding: '0 2px' }}
          >
            {seg.text}
          </mark>
        ) : (
          seg.text
        ),
      )}
    </>
  );
}
