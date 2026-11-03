import { useState, type ReactNode } from 'react';
import { Input, cn } from '../../components/ui';
import { A_RISE } from '../shared-ui';
import { languageName } from '../profile/languages';
import { countryName } from '../profile/markets';
import { emailProblem } from '../profile/personal';
import { phoneProblem } from '../profile/phones';
import { CountryBadge } from '../profile/icons';
import { fullName } from '../profile/personal';
import { completeness, type Draft } from './draft';
import { Cap } from './parts';

const LAND = 'animate-ob-flash rounded-md motion-reduce:animate-none';

/** A value that edits in place on click; commits on Enter or blur, rejects what the profile would reject. */
function Editable({
  value,
  label,
  check,
  onCommit,
  className,
}: {
  value: string;
  label: string;
  check?: (value: string) => string | null;
  onCommit: (value: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    const bad = check?.(next) ?? null;
    if (bad) return setProblem(bad);
    setDraft(null);
    setProblem(null);
    if (next !== value) onCommit(next);
  };
  if (draft === null)
    return (
      <button
        type="button"
        aria-label={`Edit ${label}`}
        onClick={() => setDraft(value)}
        className={cn(
          'cursor-text rounded-md bg-transparent p-0 text-left hover:bg-hover focus-visible:outline-2 focus-visible:outline-brand',
          className,
        )}
      >
        {value || <span className="text-muted">Add</span>}
      </button>
    );
  return (
    <span className="flex flex-col gap-1">
      <Input
        autoFocus
        aria-label={label}
        aria-invalid={problem !== null}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') {
            setDraft(null);
            setProblem(null);
          }
        }}
        className="min-h-9 py-1.5 text-sm"
      />
      {problem && (
        <span role="alert" className="text-xs text-bad">
          {problem}
        </span>
      )}
    </span>
  );
}

function Section({
  title,
  filled,
  children,
  delay,
}: {
  title: string;
  filled: boolean;
  children: ReactNode;
  delay: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-line py-3 first:border-t-0">
      <Cap>{title}</Cap>
      {filled ? (
        <div className={LAND} style={{ ['--d' as string]: delay }}>
          {children}
        </div>
      ) : (
        <span className="text-muted" aria-label="Empty">
          —
        </span>
      )}
    </div>
  );
}

/** The live profile: fills in as Cap reads and as the owner answers. Click a value to correct it. Nothing here is saved yet. */
export function ProfilePanel({
  draft,
  hasDraft,
  jobsLinedUp,
  resolvedPhone,
  onEdit,
  footer,
}: {
  draft: Draft;
  hasDraft: boolean;
  jobsLinedUp: number;
  resolvedPhone: boolean;
  onEdit: (patch: Partial<Draft['personal']>) => void;
  footer: ReactNode;
}) {
  const p = draft.personal;
  const pct = hasDraft ? completeness(draft) : 0;
  const latest = p.career[0];
  const name = fullName(p);
  const rightsSettled = draft.markets.length > 0 && draft.markets.every((m) => draft.rightsSettled.includes(m.code));
  const phoneFlag = draft.flagged.includes('phone') && !resolvedPhone;
  return (
    <aside
      aria-label="Your profile"
      className="flex w-[400px] flex-none flex-col border-l border-line bg-panel max-lg:hidden"
    >
      <div className="flex items-center gap-3.5 border-b border-line px-6 py-4">
        <div className="relative size-12 flex-none">
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" className="-rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" strokeWidth="4" className="stroke-hover" />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="125.66"
              strokeDashoffset={125.66 * (1 - pct / 100)}
              className="stroke-brand transition-[stroke-dashoffset] duration-700 ease-out-jp motion-reduce:transition-none"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-mono text-xs font-medium">{pct}%</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold">Your profile</span>
          <span className="text-[13px] text-muted">
            {!hasDraft
              ? 'Fills in as I read and we talk'
              : pct === 100
                ? 'Complete · ready for you to check'
                : 'Filling in…'}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-1">
        <Section title="NAME" filled={hasDraft && name !== ''} delay="0s">
          <Editable
            label="name"
            value={name}
            className="font-serif text-[22px] leading-[1.1]"
            onCommit={(value) => {
              const at = value.lastIndexOf(' ');
              onEdit(
                at < 0
                  ? { firstName: value, lastName: '' }
                  : { firstName: value.slice(0, at), lastName: value.slice(at + 1) },
              );
            }}
          />
          {p.headline && <div className="text-[13.5px] text-muted">{p.headline}</div>}
        </Section>
        <Section title="CONTACT" filled={hasDraft && (p.email !== '' || p.phone !== '')} delay=".1s">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Editable
              label="email"
              value={p.email}
              check={(v) => (v ? emailProblem(v) : null)}
              onCommit={(email) => onEdit({ email })}
            />
            <span className="text-line-2">·</span>
            <Editable label="phone" value={p.phone} check={phoneProblem} onCommit={(phone) => onEdit({ phone })} />
            {phoneFlag && (
              <span className="rounded-full bg-need-tint px-2 py-0.5 text-xs font-semibold text-need">check code</span>
            )}
            {draft.flagged.includes('phone') && resolvedPhone && (
              <span className="font-semibold text-brand-text" aria-label="Checked">
                ✓
              </span>
            )}
          </div>
        </Section>
        <div className="grid grid-cols-2 gap-4 border-t border-line">
          <Section title="LIVES IN" filled={hasDraft && (p.city !== '' || p.countryCode !== '')} delay=".2s">
            <div className="text-sm">
              <Editable label="city" value={p.city} onCommit={(city) => onEdit({ city })} />
              {p.countryCode && <div className="text-muted">{countryName(p.countryCode)}</div>}
            </div>
          </Section>
          <Section title="WORK" filled={hasDraft && p.career.length > 0} delay=".3s">
            <span className="text-sm">
              {p.career.length} role{p.career.length === 1 ? '' : 's'}
              {latest ? ` · ${latest.organisation}` : ''}
            </span>
          </Section>
        </div>
        <Section title="EDUCATION" filled={hasDraft && (p.school !== '' || p.degree !== '')} delay=".4s">
          <span className="text-sm">{[p.degree, p.school].filter(Boolean).join(' · ')}</span>
        </Section>
        <Section title="LANGUAGES" filled={hasDraft && p.languages.length > 0} delay=".5s">
          <div className="flex flex-wrap gap-1.5">
            {p.languages.map((l) => {
              const name = l.language ? languageName(l.language) : (l.raw ?? '');
              const unsure = l.level === '';
              return (
                <span
                  key={l.id}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[13px]',
                    unsure ? 'border-need-line bg-need-tint' : 'border-line bg-bg',
                  )}
                >
                  {name} · {unsure ? <span className="font-semibold text-need">level?</span> : l.level.toLowerCase()}
                </span>
              );
            })}
          </div>
        </Section>
        <Section title="APPLYING IN" filled={draft.markets.length > 0} delay="0s">
          <div className="flex flex-wrap gap-1.5">
            {draft.markets.map((m, i) => (
              <span
                key={m.code}
                className={cn(LAND, 'inline-flex items-center gap-1.5 text-sm')}
                style={{ ['--d' as string]: `${i * 0.12}s` }}
              >
                <CountryBadge code={m.code} name={countryName(m.code) ?? m.code} />
                {countryName(m.code) ?? m.code}
              </span>
            ))}
          </div>
        </Section>
        <Section title="PASSPORT · WORK RIGHTS" filled={rightsSettled} delay="0s">
          <span className="text-sm">
            {draft.nationalities.map((c) => countryName(c) ?? c).join(', ') || 'Work rights set'}
            {' · '}
            {draft.markets.filter((m) => m.workAuth === 'sponsorship').length
              ? `sponsorship in ${draft.markets
                  .filter((m) => m.workAuth === 'sponsorship')
                  .map((m) => m.code)
                  .join(', ')}`
              : 'can work in all picked'}
          </span>
        </Section>
        <Section title="JOBS · OPTIONAL" filled={jobsLinedUp > 0} delay="0s">
          <span className="text-sm">{jobsLinedUp} lined up</span>
        </Section>
      </div>

      <div className={cn('flex flex-col gap-2.5 border-t border-line px-6 pt-4 pb-5', A_RISE)}>
        {footer}
        <span className="text-center text-[12.5px] leading-snug text-muted">
          Click anything here to edit it. Nothing is saved until you press the button.
        </span>
      </div>
    </aside>
  );
}
