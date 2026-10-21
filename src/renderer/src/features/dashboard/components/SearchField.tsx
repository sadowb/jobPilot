import { forwardRef, useState } from 'react';
import { V17Icon } from '../../../components/V17Icon';
import { V17Kbd } from '../../../components/V17Kbd';
import './dashboard.css';

const clearStyle = {
  flex: 'none',
  width: 22,
  height: 22,
  borderRadius: 99,
  border: 0,
  background: 'var(--hover)',
  color: 'var(--ink-2)',
  display: 'grid',
  placeItems: 'center',
  fontSize: 11,
  padding: 0,
} as const;

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
      className={focused || value ? 'inp f' : pill ? 'inp ph' : 'inp'}
      style={{
        width,
        height: 38,
        borderRadius: pill ? 99 : 12,
        ...(pill ? {} : { padding: '0 8px 0 12px' }),
        fontSize: 13.5,
        flex: 'none',
        boxSizing: 'border-box',
        gap: 8,
      }}
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
          style={{ flex: 'none' }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      )}
      <input
        ref={ref}
        className="dash-search"
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
        <button type="button" aria-label="Clear search" style={clearStyle} onClick={() => onChange('')}>
          ✕
        </button>
      ) : (
        <V17Kbd>/</V17Kbd>
      )}
    </div>
  );
});
