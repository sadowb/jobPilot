import { V17Kbd } from '../../../components/V17Kbd';

const action =
  'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-3 text-[13.5px] whitespace-nowrap text-inherit hover:bg-white/12';

/** Floating toolbar for the current selection: Remove, Hold, Move to top; Esc clears. */
export function BulkBar({
  count,
  onRemove,
  onHold,
  onMoveToTop,
}: {
  count: number;
  onRemove: () => void;
  onHold: () => void;
  onMoveToTop: () => void;
}) {
  return (
    <div
      className="absolute bottom-7 left-1/2 z-[3] box-border flex h-12 w-[540px] -translate-x-1/2 flex-nowrap items-center gap-1 rounded-full bg-pri py-1.5 pr-1.5 pl-5 text-[13.5px] whitespace-nowrap text-on-pri shadow-float"
      role="toolbar"
      aria-label={`${count} selected`}
    >
      <b className="mr-2.5 font-[650]">{count} selected</b>
      <button type="button" className={action} onClick={onRemove}>
        Remove <V17Kbd>⌫</V17Kbd>
      </button>
      <button type="button" className={action} onClick={onHold}>
        Hold <V17Kbd>H</V17Kbd>
      </button>
      <button type="button" className={action} onClick={onMoveToTop}>
        Move to top <V17Kbd>⇧↑</V17Kbd>
      </button>
      <span className="ml-auto inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13.5px] whitespace-nowrap opacity-75">
        Esc clears
      </span>
    </div>
  );
}
