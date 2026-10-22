import { highlight } from '../filter';

/** Text with search hits wrapped in the board's `mark` style (need-tint fill, 4px radius). */
export function Highlighted({ text, tokens }: { text: string; tokens: string[] }) {
  return (
    <>
      {highlight(text, tokens).map((seg, i) =>
        seg.hit ? (
          <mark key={i} className="rounded-[4px] bg-need-tint px-0.5 text-ink">
            {seg.text}
          </mark>
        ) : (
          seg.text
        ),
      )}
    </>
  );
}
