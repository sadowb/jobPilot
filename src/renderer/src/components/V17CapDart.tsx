/**
 * Cap riding the JobPilot dart (design/brand/cap-and-dart.svg), themed: the dart takes --ink, the
 * highlight and Cap's halo take --panel. Cap's own colours are fixed. `look` = open eyes, `happy` = closed smile.
 */
export function V17CapDart({ size = 96, mood = 'look' }: { size?: number; mood?: 'look' | 'happy' }) {
  return (
    <svg width={size} height={size} viewBox="-8 -4 124 124" role="img" aria-label="Cap riding the JobPilot dart">
      <g stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" opacity="0">
        <path d="M-4 84 L18 74" />
        <path d="M8 100 L30 88" />
        <path d="M-6 66 L8 60" />
      </g>
      <path
        d="M12.5 56 L107.5 12.5 L71 107.5 L55 67 Z"
        fill="var(--ink)"
        stroke="var(--ink)"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path d="M55 67 L107.5 12.5" stroke="var(--panel,#fff)" strokeWidth="4.5" strokeLinecap="round" opacity=".5" />
      <g transform="translate(44 60) rotate(22) scale(1.2) translate(-24 -26)">
        <path
          d="M24 8 C37 8 43 17 43 28 C43 39 34 43 24 43 C14 43 5 39 5 28 C5 17 11 8 24 8 Z"
          fill="var(--panel,#fff)"
          stroke="var(--panel,#fff)"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M24 9 C36 9 42 17 42 28 C42 38 34 42 24 42 C14 42 6 38 6 28 C6 17 12 9 24 9 Z"
          fill="#8EC5FF"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {mood === 'look' ? (
          <>
            <circle cx="17.5" cy="28.0" r="4" fill="#1A1A1A" />
            <circle cx="30.5" cy="28.0" r="4" fill="#1A1A1A" />
            <circle cx="19.0" cy="26.4" r="1.5" fill="#fff" />
            <circle cx="32.0" cy="26.4" r="1.5" fill="#fff" />
          </>
        ) : (
          <path
            d="M14.5 28 q3 -3.6 6 0 M27.5 28 q3 -3.6 6 0"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
        )}
        <ellipse cx="12" cy="33.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="36" cy="33.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        {mood === 'look' ? (
          <path d="M22.2 34 q1.8 1.6 3.6 0" fill="none" stroke="#1A1A1A" strokeWidth="1.9" strokeLinecap="round" />
        ) : (
          <path d="M21 33.5 q3 4 6 0 Z" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
        )}
        <path
          d="M9.5 20 C10 9 38 9 38.5 20 Q24 16 9.5 20 Z"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M9.5 20 Q8 26 10.5 28 L13 21"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M38.5 20 Q40 26 37.5 28 L35 21"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx="24" cy="12.6" r="1.7" fill="#F5C64E" />
      </g>
      <circle
        cx="63"
        cy="60"
        r="5"
        fill="#8EC5FF"
        stroke="#1A1A1A"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx="73"
        cy="50"
        r="5"
        fill="#8EC5FF"
        stroke="#1A1A1A"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
