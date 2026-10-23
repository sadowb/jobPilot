import { forwardRef, useState } from 'react';
import { V17Icon } from '../../../components/V17Icon';
import { V17Kbd } from '../../../components/V17Kbd';
import { cn } from '../../../components/ui';

/** Search box (`/` focuses it). Looks like the board's `.inp`, with `.f` while focused or non-empty. */
export const SearchField = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; placeholder?: string; width?: number; pill?: boolean }
>(function SearchField(
  { value, onChange, placeholder = 'Search company, role, location', width = 264, pill = false },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className={cn(
        'flex h-[38px] min-w-0 flex-none items-center gap-2 border bg-bg text-[13.5px]',
        pill ? 'rounded-full px-3.5' : 'rounded-xl py-0 pr-2 pl-3',
        focused || value
          ? 'border-ink text-ink shadow-[0_0_0_3px_color-mix(in_srgb,var(--ink)_14%,transparent)]'
          : cn('border-line-2', pill ? 'text-muted' : 'text-ink'),
      )}
      style={{ width }}
    >
      {pill ? (
        <V17Icon name="search" />
      ) : (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
          className="flex-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      )}
      <input
        ref={ref}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-ink outline-0 placeholder:text-muted placeholder:opacity-100 focus-visible:outline-0"
        type="text"
        role="searchbox"
        aria-label="Search applications"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          className="grid size-[22px] flex-none place-items-center rounded-full border-0 bg-hover p-0 text-[11px]! text-ink-2!"
          onClick={() => onChange('')}
        >
          ✕
        </button>
      ) : (
        <V17Kbd>/</V17Kbd>
      )}
    </div>
  );
});
