import { useTheme } from '../lib/theme';

// `.app button` (board.css) forces `color: inherit` on every shell button, hence the `!`.
const BUTTON =
  'grid size-8 flex-none place-items-center rounded-lg border-0 bg-transparent p-0 text-ink! hover:bg-hover ' +
  '[html[data-platform=darwin]_&]:[-webkit-app-region:no-drag] [html[data-platform=darwin]_&]:[app-region:no-drag]';

export function AppearanceControl() {
  const { state, setSource, error } = useTheme();
  const action = `Switch to ${state.dark ? 'light' : 'dark'} mode`;
  return (
    <>
      <button
        className={BUTTON}
        type="button"
        onClick={() => setSource(state.dark ? 'light' : 'dark')}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
        }}
        aria-label={action}
        title={error || action}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {state.dark ? (
            <path d="M20.6 13.1A8.6 8.6 0 0 1 10.9 3.4a8.6 8.6 0 1 0 9.7 9.7Z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </>
          )}
        </svg>
      </button>
      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
