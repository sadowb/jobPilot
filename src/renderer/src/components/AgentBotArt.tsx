import type { ReactNode } from 'react';

/** Agent mascots ("Grok bots") as drawn on the V17 boards: one body shape per company, state carried by the wrapper classes. */
export type AgentBotState = 'work' | 'idle' | 'done' | 'need';

const STATE_CLASS: Record<AgentBotState, string> = {
  work: 'bot mv m-work m-blink',
  idle: 'bot mv m-blink',
  done: 'bot mv m-done',
  need: 'bot mv m-need',
};

const SHAPES: Record<string, ReactNode> = {
  Mercury: (
    <>
      <g className="body">
        <path
          d="M11 9.5 H37 C42 9.5 44 14 41.5 18 L28.5 39.5 C26.5 43 21.5 43 19.5 39.5 L6.5 18 C4 14 6 9.5 11 9.5 Z"
          fill="#8EC5FF"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g className="eye">
          <circle cx="18.4" cy="23.5" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="19.9" cy="21.9" r="1.5" fill="#fff" />
        </g>
        <g className="eye">
          <circle cx="29.6" cy="23.5" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="31.1" cy="21.9" r="1.5" fill="#fff" />
        </g>
        <ellipse cx="14.5" cy="27.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="33.5" cy="27.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M22.2 29.5 q1.8 1.6 3.6 0" fill="none" stroke="#1A1A1A" strokeWidth="1.9" strokeLinecap="round" />
        <path
          d="M9 19.5 C9 6.5 39 6.5 39 19.5 Q24 15.5 9 19.5 Z"
          fill="#E4573D"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M24 7 C19.6 9.6 18.6 14 19 16.9 Q24 16.2 29 16.9 C29.4 14 28.4 9.6 24 7 Z" fill="#F5C64E" />
        <path d="M24 7 V1.6" stroke="#1A1A1A" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <g className="prop">
          <ellipse
            cx="18.4"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <ellipse
            cx="29.6"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
        <circle cx="24" cy="1.6" r="1.6" fill="#1A1A1A" />
      </g>
    </>
  ),
  Retool: (
    <>
      <g className="body">
        <path
          d="M24 6.5 C33 6.5 39 12 39 21 V30 C39 39 33 44.5 24 44.5 C15 44.5 9 39 9 30 V21 C9 12 15 6.5 24 6.5 Z"
          fill="#FF8FB8"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g className="eye">
          <circle cx="18.2" cy="28" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="19.7" cy="26.4" r="1.5" fill="#fff" />
        </g>
        <g className="eye">
          <circle cx="29.8" cy="28" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="31.3" cy="26.4" r="1.5" fill="#fff" />
        </g>
        <ellipse cx="14" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="34" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M22.2 34 q1.8 1.6 3.6 0" fill="none" stroke="#1A1A1A" strokeWidth="1.9" strokeLinecap="round" />
        <path
          d="M9 20.5 C9 8 39 8 39 20.5 Q24 16.8 9 20.5 Z"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M24 9.6 V17" stroke="#5E3B24" strokeWidth="1.4" strokeDasharray="1.6 1.8" strokeLinecap="round" />
        <path
          d="M9 20.5 Q8 25 10.4 26.6 L12.6 21"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M39 20.5 Q40 25 37.6 26.6 L35.4 21"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    </>
  ),
  Duolingo: (
    <>
      <g className="body">
        <path
          d="M18 9 H30 C38 9 42 13 42 21 V31 C42 39 38 43 30 43 H18 C10 43 6 39 6 31 V21 C6 13 10 9 18 9 Z"
          fill="#7FD9AE"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g className="eye">
          <circle cx="17.5" cy="28" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="19.0" cy="26.4" r="1.5" fill="#fff" />
        </g>
        <g className="eye">
          <circle cx="30.5" cy="28" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="32.0" cy="26.4" r="1.5" fill="#fff" />
        </g>
        <ellipse cx="12" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="36" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M22.2 34 q1.8 1.6 3.6 0" fill="none" stroke="#1A1A1A" strokeWidth="1.9" strokeLinecap="round" />
        <path
          d="M9 19.5 C9 6.5 39 6.5 39 19.5 Q24 15.5 9 19.5 Z"
          fill="#E4573D"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M24 7 C19.6 9.6 18.6 14 19 16.9 Q24 16.2 29 16.9 C29.4 14 28.4 9.6 24 7 Z" fill="#F5C64E" />
        <path d="M24 7 V1.6" stroke="#1A1A1A" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <g className="prop">
          <ellipse
            cx="18.4"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <ellipse
            cx="29.6"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
        <circle cx="24" cy="1.6" r="1.6" fill="#1A1A1A" />
      </g>
    </>
  ),
  Perpay: (
    <>
      <g className="body">
        <path
          d="M11 9.5 H37 C42 9.5 44 14 41.5 18 L28.5 39.5 C26.5 43 21.5 43 19.5 39.5 L6.5 18 C4 14 6 9.5 11 9.5 Z"
          fill="#7FD9AE"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g className="eye">
          <circle cx="18.4" cy="23.5" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="19.9" cy="21.9" r="1.5" fill="#fff" />
        </g>
        <g className="eye">
          <circle cx="29.6" cy="23.5" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="31.1" cy="21.9" r="1.5" fill="#fff" />
        </g>
        <ellipse cx="14.5" cy="27.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="33.5" cy="27.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M22.2 29.5 q1.8 1.6 3.6 0" fill="none" stroke="#1A1A1A" strokeWidth="1.9" strokeLinecap="round" />
        <path
          d="M9 20.5 C9 8 39 8 39 20.5 Q24 16.8 9 20.5 Z"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M24 9.6 V17" stroke="#5E3B24" strokeWidth="1.4" strokeDasharray="1.6 1.8" strokeLinecap="round" />
        <path
          d="M9 20.5 Q8 25 10.4 26.6 L12.6 21"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M39 20.5 Q40 25 37.6 26.6 L35.4 21"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    </>
  ),
  Clark: (
    <>
      <g className="body">
        <path
          d="M18 9 H30 C38 9 42 13 42 21 V31 C42 39 38 43 30 43 H18 C10 43 6 39 6 31 V21 C6 13 10 9 18 9 Z"
          fill="#FF8FB8"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g className="eye">
          <circle cx="17.5" cy="28" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="19.0" cy="26.4" r="1.5" fill="#fff" />
        </g>
        <g className="eye">
          <circle cx="30.5" cy="28" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="32.0" cy="26.4" r="1.5" fill="#fff" />
        </g>
        <ellipse cx="12" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="36" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M22.2 34 q1.8 1.6 3.6 0" fill="none" stroke="#1A1A1A" strokeWidth="1.9" strokeLinecap="round" />
        <path
          d="M9 19.5 C9 6.5 39 6.5 39 19.5 Q24 15.5 9 19.5 Z"
          fill="#E4573D"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M24 7 C19.6 9.6 18.6 14 19 16.9 Q24 16.2 29 16.9 C29.4 14 28.4 9.6 24 7 Z" fill="#F5C64E" />
        <path d="M24 7 V1.6" stroke="#1A1A1A" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <g className="prop">
          <ellipse
            cx="18.4"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <ellipse
            cx="29.6"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
        <circle cx="24" cy="1.6" r="1.6" fill="#1A1A1A" />
      </g>
    </>
  ),
  Ramp: (
    <>
      <g className="body">
        <path
          d="M18 9 H30 C38 9 42 13 42 21 V31 C42 39 38 43 30 43 H18 C10 43 6 39 6 31 V21 C6 13 10 9 18 9 Z"
          fill="#8EC5FF"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M14.5 28 q3 -3.6 6 0 M27.5 28 q3 -3.6 6 0"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="12" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="36" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M21 33.5 q3 4 6 0 Z" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
        <path
          d="M9 19.5 C9 6.5 39 6.5 39 19.5 Q24 15.5 9 19.5 Z"
          fill="#E4573D"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M24 7 C19.6 9.6 18.6 14 19 16.9 Q24 16.2 29 16.9 C29.4 14 28.4 9.6 24 7 Z" fill="#F5C64E" />
        <path d="M24 7 V1.6" stroke="#1A1A1A" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <g className="prop">
          <ellipse
            cx="18.4"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <ellipse
            cx="29.6"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
        <circle cx="24" cy="1.6" r="1.6" fill="#1A1A1A" />
        <g className="chkpop">
          <circle cx="41" cy="9" r="6.5" fill="#111" stroke="#fff" strokeWidth="1.5" />
          <path d="M38.2 9 l2 2 l3.6 -3.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </>
  ),
  Datadog: (
    <>
      <g className="body">
        <path
          d="M18 9 H30 C38 9 42 13 42 21 V31 C42 39 38 43 30 43 H18 C10 43 6 39 6 31 V21 C6 13 10 9 18 9 Z"
          fill="#9FE3F5"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M14.5 28 q3 -3.6 6 0 M27.5 28 q3 -3.6 6 0"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="12" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="36" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M21 33.5 q3 4 6 0 Z" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
        <path
          d="M8.5 16.5 C7 5 41 5 39.5 16.5 Z"
          fill="#24324A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <rect
          x="10"
          y="15"
          width="28"
          height="4.6"
          rx="1.6"
          fill="#F5C64E"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M10.5 19.6 Q24 26.5 37.5 19.6 Z"
          fill="#1A1A1A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M17.5 10.6 q3.2 -2.4 6.5 0 q3.3 -2.4 6.5 0"
          fill="none"
          stroke="#F5C64E"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="24" cy="10.4" r="1.6" fill="#F5C64E" />
        <g className="chkpop">
          <circle cx="41" cy="9" r="6.5" fill="#111" stroke="#fff" strokeWidth="1.5" />
          <path d="M38.2 9 l2 2 l3.6 -3.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </>
  ),
  Notion: (
    <>
      <g className="body">
        <path
          d="M24 6.5 C33 6.5 39 12 39 21 V30 C39 39 33 44.5 24 44.5 C15 44.5 9 39 9 30 V21 C9 12 15 6.5 24 6.5 Z"
          fill="#7FD9AE"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g className="eye">
          <circle cx="18.2" cy="26" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="19.7" cy="24.4" r="1.5" fill="#fff" />
        </g>
        <g className="eye">
          <circle cx="29.8" cy="26" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="31.3" cy="24.4" r="1.5" fill="#fff" />
        </g>
        <ellipse cx="14" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="34" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="24" cy="34.5" rx="2" ry="2.4" fill="#1A1A1A" />
        <path
          d="M8.5 16.5 C7 5 41 5 39.5 16.5 Z"
          fill="#24324A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <rect
          x="10"
          y="15"
          width="28"
          height="4.6"
          rx="1.6"
          fill="#F5C64E"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M10.5 19.6 Q24 26.5 37.5 19.6 Z"
          fill="#1A1A1A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M17.5 10.6 q3.2 -2.4 6.5 0 q3.3 -2.4 6.5 0"
          fill="none"
          stroke="#F5C64E"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="24" cy="10.4" r="1.6" fill="#F5C64E" />
      </g>
    </>
  ),
  Stripe: (
    <>
      <g className="body">
        <path
          d="M18 9 H30 C38 9 42 13 42 21 V31 C42 39 38 43 30 43 H18 C10 43 6 39 6 31 V21 C6 13 10 9 18 9 Z"
          fill="#9FE3F5"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M14.5 28 q3 -3.6 6 0 M27.5 28 q3 -3.6 6 0"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="12" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="36" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M21 33.5 q3 4 6 0 Z" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
        <path
          d="M9 19.5 C9 6.5 39 6.5 39 19.5 Q24 15.5 9 19.5 Z"
          fill="#E4573D"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M24 7 C19.6 9.6 18.6 14 19 16.9 Q24 16.2 29 16.9 C29.4 14 28.4 9.6 24 7 Z" fill="#F5C64E" />
        <path d="M24 7 V1.6" stroke="#1A1A1A" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <g className="prop">
          <ellipse
            cx="18.4"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <ellipse
            cx="29.6"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
        <circle cx="24" cy="1.6" r="1.6" fill="#1A1A1A" />
        <g className="chkpop">
          <circle cx="41" cy="9" r="6.5" fill="#111" stroke="#fff" strokeWidth="1.5" />
          <path d="M38.2 9 l2 2 l3.6 -3.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </>
  ),
  Plaid: (
    <>
      <g className="body">
        <path
          d="M11 9.5 H37 C42 9.5 44 14 41.5 18 L28.5 39.5 C26.5 43 21.5 43 19.5 39.5 L6.5 18 C4 14 6 9.5 11 9.5 Z"
          fill="#BBA4FF"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M15.399999999999999 23.5 q3 -3.6 6 0 M26.6 23.5 q3 -3.6 6 0"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="14.5" cy="27.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="33.5" cy="27.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M21 29.0 q3 4 6 0 Z" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
        <path
          d="M8.5 16.5 C7 5 41 5 39.5 16.5 Z"
          fill="#24324A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <rect
          x="10"
          y="15"
          width="28"
          height="4.6"
          rx="1.6"
          fill="#F5C64E"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M10.5 19.6 Q24 26.5 37.5 19.6 Z"
          fill="#1A1A1A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M17.5 10.6 q3.2 -2.4 6.5 0 q3.3 -2.4 6.5 0"
          fill="none"
          stroke="#F5C64E"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="24" cy="10.4" r="1.6" fill="#F5C64E" />
        <g className="chkpop">
          <circle cx="41" cy="9" r="6.5" fill="#111" stroke="#fff" strokeWidth="1.5" />
          <path d="M38.2 9 l2 2 l3.6 -3.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </>
  ),
  Linear: (
    <>
      <g className="body">
        <path
          d="M11 9.5 H37 C42 9.5 44 14 41.5 18 L28.5 39.5 C26.5 43 21.5 43 19.5 39.5 L6.5 18 C4 14 6 9.5 11 9.5 Z"
          fill="#C4E38A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M15.399999999999999 23.5 q3 -3.6 6 0 M26.6 23.5 q3 -3.6 6 0"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="14.5" cy="27.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="33.5" cy="27.5" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M21 29.0 q3 4 6 0 Z" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
        <path
          d="M9 20.5 C9 8 39 8 39 20.5 Q24 16.8 9 20.5 Z"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M24 9.6 V17" stroke="#5E3B24" strokeWidth="1.4" strokeDasharray="1.6 1.8" strokeLinecap="round" />
        <path
          d="M9 20.5 Q8 25 10.4 26.6 L12.6 21"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M39 20.5 Q40 25 37.6 26.6 L35.4 21"
          fill="#8A5A3B"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g className="chkpop">
          <circle cx="41" cy="9" r="6.5" fill="#111" stroke="#fff" strokeWidth="1.5" />
          <path d="M38.2 9 l2 2 l3.6 -3.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </>
  ),
  Salesforce: (
    <>
      <g className="body">
        <path
          d="M24 6.5 C33 6.5 39 12 39 21 V30 C39 39 33 44.5 24 44.5 C15 44.5 9 39 9 30 V21 C9 12 15 6.5 24 6.5 Z"
          fill="#C4E38A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M15.2 28 q3 -3.6 6 0 M26.8 28 q3 -3.6 6 0"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="14" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="34" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M21 33.5 q3 4 6 0 Z" fill="#1A1A1A" stroke="#1A1A1A" strokeWidth="1.4" strokeLinejoin="round" />
        <path
          d="M8.5 16.5 C7 5 41 5 39.5 16.5 Z"
          fill="#24324A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <rect
          x="10"
          y="15"
          width="28"
          height="4.6"
          rx="1.6"
          fill="#F5C64E"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M10.5 19.6 Q24 26.5 37.5 19.6 Z"
          fill="#1A1A1A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M17.5 10.6 q3.2 -2.4 6.5 0 q3.3 -2.4 6.5 0"
          fill="none"
          stroke="#F5C64E"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="24" cy="10.4" r="1.6" fill="#F5C64E" />
        <g className="chkpop">
          <circle cx="41" cy="9" r="6.5" fill="#111" stroke="#fff" strokeWidth="1.5" />
          <path d="M38.2 9 l2 2 l3.6 -3.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </>
  ),
  Vercel: (
    <>
      <g className="body">
        <path
          d="M24 6.5 C33 6.5 39 12 39 21 V30 C39 39 33 44.5 24 44.5 C15 44.5 9 39 9 30 V21 C9 12 15 6.5 24 6.5 Z"
          fill="#FFA97A"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g className="eye">
          <circle cx="18.2" cy="28" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="19.7" cy="26.4" r="1.5" fill="#fff" />
        </g>
        <g className="eye">
          <circle cx="29.8" cy="28" r="4" fill="#1A1A1A" />
          <circle className="pupil" cx="31.3" cy="26.4" r="1.5" fill="#fff" />
        </g>
        <ellipse cx="14" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <ellipse cx="34" cy="34" rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
        <path d="M22.2 34 q1.8 1.6 3.6 0" fill="none" stroke="#1A1A1A" strokeWidth="1.9" strokeLinecap="round" />
        <path
          d="M9 19.5 C9 6.5 39 6.5 39 19.5 Q24 15.5 9 19.5 Z"
          fill="#E4573D"
          stroke="#1A1A1A"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M24 7 C19.6 9.6 18.6 14 19 16.9 Q24 16.2 29 16.9 C29.4 14 28.4 9.6 24 7 Z" fill="#F5C64E" />
        <path d="M24 7 V1.6" stroke="#1A1A1A" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <g className="prop">
          <ellipse
            cx="18.4"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <ellipse
            cx="29.6"
            cy="1.4"
            rx="5.4"
            ry="1.9"
            fill="#00A383"
            stroke="#1A1A1A"
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
        <circle cx="24" cy="1.6" r="1.6" fill="#1A1A1A" />
      </g>
    </>
  ),
};

export type AgentBotCompany = keyof typeof SHAPES;
export const AGENT_BOT_COMPANIES = Object.keys(SHAPES);

/**
 * A company's agent bot. `work` draws the orbit ring; `need` adds the amber
 * waiting badge. The same company always gets the same body; unknown companies fall back to Vercel's.
 */
export function AgentBotArt({ company, state, size }: { company: string; state: AgentBotState; size: number }) {
  const shape = SHAPES[company] ?? SHAPES.Vercel;
  return (
    <span
      className={STATE_CLASS[state]}
      style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="-1 -3 50 50"
        role="img"
        aria-label={`${company} agent, ${state}`}
        style={{ overflow: 'visible' }}
      >
        {shape}
      </svg>
      {state === 'work' && <i className="orb" aria-hidden="true" style={{ inset: -5, borderWidth: 3 }} />}
      {state === 'need' && <i className="wb" aria-hidden="true" style={{ width: 10, height: 10 }} />}
    </span>
  );
}
