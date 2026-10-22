import { V17Kbd } from '../../../components/V17Kbd';
import { UNDO_WINDOW_MS, type RemovedBatch } from './queue';

/** Bottom toast after a removal: what went, Undo (⌘Z), seconds left and a draining bar. */
export function UndoToast({ batch, now, onUndo }: { batch: RemovedBatch; now: number; onUndo: () => void }) {
  const left = Math.max(0, UNDO_WINDOW_MS - (now - batch.at));
  const first = batch.entries[0]?.item;
  return (
    <div
      role="status"
      className="absolute bottom-[88px] left-1/2 z-[3] box-border w-[540px] -translate-x-1/2 overflow-hidden rounded-2xl border border-line-2 bg-bg shadow-float"
    >
      <div className="flex flex-nowrap items-center gap-3 px-4 py-3 text-[13.5px]">
        <span className="min-w-0 flex-1 truncate">
          Removed{' '}
          {batch.entries.length === 1 && first ? (
            <>
              <b className="font-[650]">{first.company}</b> · {first.role}
            </>
          ) : (
            <b className="font-[650]">{batch.entries.length} jobs</b>
          )}
        </span>
        <button
          type="button"
          className="flex cursor-pointer flex-nowrap items-center gap-1.5 border-0 bg-transparent p-0 font-[650] whitespace-nowrap text-brand-text"
          onClick={onUndo}
        >
          Undo <V17Kbd>⌘Z</V17Kbd>
        </button>
        <span className="font-mono text-xs text-muted tabular-nums">{Math.ceil(left / 1000)} s</span>
      </div>
      <div className="h-0.5 bg-line">
        <i
          className="block h-0.5 bg-brand"
          style={{ width: `${Math.floor((left / UNDO_WINDOW_MS) * 100)}%` }}
        />
      </div>
    </div>
  );
}
