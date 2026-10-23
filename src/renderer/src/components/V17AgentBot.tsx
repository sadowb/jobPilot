import { BOT, BOT_BADGE, BOT_INK, BOT_MOTION, BOT_ORB } from './botStyles';
import { cn } from './ui';
import type { AgentState } from './v17-agent-state';

export type { AgentState };
export type AgentBody = 'tag' | 'squircle' | 'egg';
export type AgentHat = 'hair' | 'propeller' | 'officer';
export interface AgentLook {
  body: AgentBody;
  hat: AgentHat;
  fill: string;
}

const FILLS = ['#7FD9AE', '#FF8FB8', '#8EC5FF', '#9FE3F5', '#FFA97A', '#C4E38A', '#BBA4FF'] as const;
const BODIES: AgentBody[] = ['tag', 'squircle', 'egg'];
const HATS: AgentHat[] = ['hair', 'propeller', 'officer'];

/** The looks the V17 boards draw for their sample companies. */
const BOARD_LOOKS: Record<string, AgentLook> = {
  Perpay: { body: 'tag', hat: 'hair', fill: '#7FD9AE' },
  Clark: { body: 'squircle', hat: 'propeller', fill: '#FF8FB8' },
  Ramp: { body: 'squircle', hat: 'propeller', fill: '#8EC5FF' },
  Datadog: { body: 'squircle', hat: 'officer', fill: '#9FE3F5' },
  Notion: { body: 'egg', hat: 'officer', fill: '#7FD9AE' },
  Duolingo: { body: 'squircle', hat: 'propeller', fill: '#7FD9AE' },
  Cloudflare: { body: 'tag', hat: 'hair', fill: '#FFA97A' },
  Asana: { body: 'squircle', hat: 'hair', fill: '#C4E38A' },
  Stripe: { body: 'squircle', hat: 'propeller', fill: '#9FE3F5' },
  'Capital One': { body: 'tag', hat: 'officer', fill: '#BBA4FF' },
  Plaid: { body: 'tag', hat: 'officer', fill: '#BBA4FF' },
  Linear: { body: 'tag', hat: 'hair', fill: '#C4E38A' },
  Salesforce: { body: 'egg', hat: 'officer', fill: '#C4E38A' },
  Vercel: { body: 'egg', hat: 'propeller', fill: '#FFA97A' },
  Mercury: { body: 'tag', hat: 'propeller', fill: '#8EC5FF' },
  Retool: { body: 'egg', hat: 'hair', fill: '#FF8FB8' },
  Figma: { body: 'squircle', hat: 'hair', fill: '#FF8FB8' },
  Brex: { body: 'egg', hat: 'propeller', fill: '#BBA4FF' },
  Rippling: { body: 'squircle', hat: 'officer', fill: '#FF8FB8' },
};

/** Stable look for any company: the board's own where drawn, else derived from a hash of the name. */
export function agentLook(name: string): AgentLook {
  const known = BOARD_LOOKS[name];
  if (known) return known;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    body: BODIES[h % 3] as AgentBody,
    hat: HATS[Math.floor(h / 3) % 3] as AgentHat,
    fill: FILLS[Math.floor(h / 9) % FILLS.length] as string,
  };
}

interface Geometry {
  path: string;
  eyeX: [number, number];
  eyeY: number;
  cheekX: [number, number];
  cheekY: number;
  mouthY: number;
}

const GEOMETRY: Record<AgentBody, Geometry> = {
  tag: {
    path: 'M11 9.5 H37 C42 9.5 44 14 41.5 18 L28.5 39.5 C26.5 43 21.5 43 19.5 39.5 L6.5 18 C4 14 6 9.5 11 9.5 Z',
    eyeX: [18.4, 29.6],
    eyeY: 23.5,
    cheekX: [14.5, 33.5],
    cheekY: 27.5,
    mouthY: 29.5,
  },
  squircle: {
    path: 'M18 9 H30 C38 9 42 13 42 21 V31 C42 39 38 43 30 43 H18 C10 43 6 39 6 31 V21 C6 13 10 9 18 9 Z',
    eyeX: [17.5, 30.5],
    eyeY: 28,
    cheekX: [12, 36],
    cheekY: 34,
    mouthY: 34,
  },
  egg: {
    path: 'M24 6.5 C33 6.5 39 12 39 21 V30 C39 39 33 44.5 24 44.5 C15 44.5 9 39 9 30 V21 C9 12 15 6.5 24 6.5 Z',
    eyeX: [18.2, 29.8],
    eyeY: 28,
    cheekX: [14, 34],
    cheekY: 34,
    mouthY: 34,
  },
};

/** Outline of body and hat: themed. The face (eyes, mouth) is always near-black, on both themes. */
const INK = 'var(--bot-ink)';
const FACE = '#1A1A1A';
const r1 = (n: number) => Number(n.toFixed(1));
const round = { strokeLinejoin: 'round', strokeLinecap: 'round' } as const;

function Eyes({ g, dy = 0 }: { g: Geometry; dy?: number }) {
  return (
    <>
      {g.eyeX.map((x) => (
        <g className="eye" key={x}>
          <circle cx={x} cy={r1(g.eyeY + dy)} r="4" fill="#1A1A1A" />
          <circle className="pupil" cx={r1(x + 1.5)} cy={r1(g.eyeY + dy - 1.6)} r="1.5" fill="#fff" />
        </g>
      ))}
    </>
  );
}

function Face({ state, g }: { state: AgentState; g: Geometry }) {
  const cheeks = g.cheekX.map((x) => (
    <ellipse key={x} cx={x} cy={g.cheekY} rx="3" ry="1.8" fill="#FF6F8E" fillOpacity=".5" />
  ));
  const [lx, rx] = g.eyeX;
  switch (state) {
    case 'block':
      return (
        <>
          {[lx, rx].map((x) => (
            <path
              key={x}
              d={`M${r1(x - 2.5)} ${r1(g.eyeY - 2.5)} l5 5 M${r1(x + 2.5)} ${r1(g.eyeY - 2.5)} l-5 5`}
              stroke={FACE}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}
          {cheeks}
          <path
            d={`M21.5 ${r1(g.mouthY + 1.5)} q2.5 -2 5 0`}
            fill="none"
            stroke={FACE}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </>
      );
    case 'need':
      return (
        <>
          <Eyes g={g} dy={-2} />
          {cheeks}
          <ellipse cx="24" cy={r1(g.mouthY + 0.5)} rx="2" ry="2.4" fill="#1A1A1A" />
        </>
      );
    case 'done':
      return (
        <>
          <path
            d={`M${lx - 3} ${g.eyeY} q3 -3.6 6 0 M${rx - 3} ${g.eyeY} q3 -3.6 6 0`}
            stroke={FACE}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          {cheeks}
          <path
            d={`M21 ${r1(g.mouthY - 0.5)} q3 4 6 0 Z`}
            fill={FACE}
            stroke={FACE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </>
      );
    default:
      return (
        <>
          <Eyes g={g} />
          {cheeks}
          <path
            d={`M22.2 ${g.mouthY} q1.8 1.6 3.6 0`}
            fill="none"
            stroke={FACE}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </>
      );
  }
}

function Hat({ hat }: { hat: AgentHat }) {
  switch (hat) {
    case 'hair':
      return (
        <>
          <path
            d="M9 20.5 C9 8 39 8 39 20.5 Q24 16.8 9 20.5 Z"
            fill="#8A5A3B"
            stroke={INK}
            strokeWidth="2.4"
            {...round}
          />
          <path d="M24 9.6 V17" stroke="#5E3B24" strokeWidth="1.4" strokeDasharray="1.6 1.8" strokeLinecap="round" />
          <path d="M9 20.5 Q8 25 10.4 26.6 L12.6 21" fill="#8A5A3B" stroke={INK} strokeWidth="2.4" {...round} />
          <path d="M39 20.5 Q40 25 37.6 26.6 L35.4 21" fill="#8A5A3B" stroke={INK} strokeWidth="2.4" {...round} />
        </>
      );
    case 'propeller':
      return (
        <>
          <path
            d="M9 19.5 C9 6.5 39 6.5 39 19.5 Q24 15.5 9 19.5 Z"
            fill="#E4573D"
            stroke={INK}
            strokeWidth="2.4"
            {...round}
          />
          <path d="M24 7 C19.6 9.6 18.6 14 19 16.9 Q24 16.2 29 16.9 C29.4 14 28.4 9.6 24 7 Z" fill="#F5C64E" />
          <path d="M24 7 V1.6" stroke={INK} strokeWidth="2.4" />
          <g className="prop">
            <ellipse cx="18.4" cy="1.4" rx="5.4" ry="1.9" fill="#00A383" stroke={INK} strokeWidth="2.4" />
            <ellipse cx="29.6" cy="1.4" rx="5.4" ry="1.9" fill="#00A383" stroke={INK} strokeWidth="2.4" />
          </g>
          <circle cx="24" cy="1.6" r="1.6" fill={INK} />
        </>
      );
    case 'officer':
      return (
        <>
          <path d="M8.5 16.5 C7 5 41 5 39.5 16.5 Z" fill="#24324A" stroke={INK} strokeWidth="2.4" {...round} />
          <rect
            x="10"
            y="15"
            width="28"
            height="4.6"
            rx="1.6"
            fill="#F5C64E"
            stroke={INK}
            strokeWidth="2.4"
            {...round}
          />
          <path d="M10.5 19.6 Q24 26.5 37.5 19.6 Z" fill={INK} stroke={INK} strokeWidth="2.4" {...round} />
          <path
            d="M17.5 10.6 q3.2 -2.4 6.5 0 q3.3 -2.4 6.5 0"
            fill="none"
            stroke="#F5C64E"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="24" cy="10.4" r="1.6" fill="#F5C64E" />
        </>
      );
  }
}

/**
 * Row avatar for a job's agent ("bot"). Colours are fixed art; only the outline follows the theme.
 * `work` adds the orbiting ring, `need` the waiting badge .
 */
export function V17AgentBot({
  name,
  state,
  size = 30,
  look,
}: {
  name: string;
  state: AgentState;
  size?: number;
  look?: AgentLook;
}) {
  const { body, hat, fill } = look ?? agentLook(name);
  const g = GEOMETRY[body];
  return (
    <span className={cn(BOT, BOT_INK, BOT_MOTION[state])} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="-1 -3 50 50"
        role="img"
        aria-label={`${name} agent, ${state}`}
        className="overflow-visible"
      >
        <g className="body">
          <path d={g.path} fill={fill} stroke={INK} strokeWidth="2.4" {...round} />
          <Face state={state} g={g} />
          <Hat hat={hat} />
          {state === 'done' && (
            <g className="chkpop">
              <circle cx="41" cy="9" r="6.5" fill="#111" stroke="#fff" strokeWidth="1.5" />
              <path d="M38.2 9 l2 2 l3.6 -3.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </g>
          )}
        </g>
      </svg>
      {state === 'work' && <i className={BOT_ORB} aria-hidden="true" />}
      {state === 'need' && <i className={BOT_BADGE} aria-hidden="true" />}
    </span>
  );
}
