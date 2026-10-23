import type { ReactNode } from 'react';
import { CapDartArt } from '../../components/CapDartArt';
import { cn } from '../../components/ui';
import { MONO_CAPS, S } from '../shared-ui';

/** `.v17c` surface (Card's classes, on a <section>). */
const SECTION =
  'flex min-h-0 min-w-0 flex-none flex-col gap-3.5 overflow-hidden rounded-3xl border border-line bg-bg px-[22px] py-[18px] dark:bg-panel';

/** Card with title, subtitle, an "Ask Cap about this" chip and a closing "Cap's read" line. */
export function AnalyticsPanel({
  title,
  sub,
  read,
  onAsk,
  children,
}: {
  title: string;
  sub: string;
  read: string;
  onAsk?: () => void;
  children: ReactNode;
}) {
  return (
    <section className={SECTION}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <b className="text-[16px] font-[650] tracking-[-0.01em]">{title}</b>
          </div>
          <div className={cn(S, 'mt-[3px] text-[13px]')}>{sub}</div>
        </div>
        {/* `!`: the shell's unlayered `.app button` rule resets font and colour (see shared-ui). */}
        <button
          type="button"
          aria-label="Ask Cap about this"
          onClick={onAsk}
          className="inline-flex h-[30px] flex-none cursor-pointer items-center gap-1.5 rounded-full border border-line-2 bg-transparent pr-3 pl-[3px] text-[13px]! font-semibold! whitespace-nowrap text-ink-2! hover:bg-hover"
        >
          <CapDartArt size={24} /> Ask Cap about this
        </button>
      </div>
      {children}
      <div className="mt-auto flex items-center gap-2.5 border-t border-line pt-3.5 text-[13px] leading-normal text-muted">
        <span className={cn(MONO_CAPS, 'flex-none text-ink-2')}>Cap’s read</span>
        <span>{read}</span>
      </div>
    </section>
  );
}
