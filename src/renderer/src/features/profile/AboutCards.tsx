import type { ReactNode } from 'react';
import { Card as Surface, cn } from '../../components/ui';
import { Glyph, CountryBadge, GlobeBadge, type GlyphName } from './icons';
import { countryName, marketSummary, type Market } from './markets';
import { PRESENT, sortCareer, yearRange } from './career';
import { CHECK_NUMBER, parsePhone, regionName, regionOf } from './phones';
import { noticeLabel } from './notice';
import { formatSalary } from './salary';
import { languageName } from './languages';
import { monoMeta } from './styles';
import { cvFileName, effectiveSalaryCurrency, fullName, splitList, type PersonalProfile } from './personal';

/** Rows shown in the card, home row included; the rest are one click away in Edit. */
const MAX_COUNTRY_ROWS = 3;
const MAX_CHIPS = 4;

/** `.pf-li` row; `where` is the taller "Where you apply" variant. Rows that are buttons keep the inherited 15px. */
const row = (o: { where?: boolean; tall?: boolean; button?: boolean } = {}) =>
  cn(
    'flex w-full min-w-0 items-center gap-2.5 border-t border-line text-left',
    o.where ? 'min-h-11' : 'min-h-[42px]',
    o.tall && 'items-start py-2.5',
    !o.button && 'text-[13.5px] text-ink',
  );
/** First row of a list has no top rule, whether the `li` or the button inside it is the row. */
const rowList = '[&>li:first-child]:border-t-0 [&>li:first-child>button]:border-t-0';
const glyph = (tall?: boolean) => cn('grid w-[22px] flex-none place-items-center text-muted', tall && 'mt-0.5');
const rowText = (where?: boolean) =>
  cn('min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap', where && 'text-[15px]');
const rowSub = 'mt-px block overflow-hidden [font-size:12px] text-ellipsis text-muted';
const status = (need?: boolean) =>
  cn('flex-none text-[13px] font-semibold whitespace-nowrap', need ? 'text-need' : 'text-brand-text');
const moreButton = 'inline-flex items-center gap-1.5 self-start mt-auto bg-transparent pt-2.5';
const addPromptButton = 'inline-flex items-center gap-1.5 self-start mt-auto bg-transparent pt-2.5';

function Card({
  id,
  icon,
  title,
  meta,
  editLabel,
  onEdit,
  children,
}: {
  id: string;
  icon: GlyphName;
  title: string;
  meta: string;
  editLabel: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <Surface role="region" className="flex scroll-mt-6 flex-col px-[22px] py-5" id={id} aria-labelledby={`${id}-title`}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid size-9 flex-none place-items-center rounded-xl border border-line bg-ground text-ink-2"
          aria-hidden="true"
        >
          <Glyph name={icon} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={`${id}-title`}
            className="m-0 overflow-hidden font-sans text-[15.5px] leading-[1.25] font-[650] tracking-[-0.01em] text-ellipsis whitespace-nowrap"
          >
            {title}
          </h2>
          <span className={cn(monoMeta, 'mt-[3px] block overflow-hidden text-ellipsis whitespace-nowrap')}>{meta}</span>
        </div>
        <button
          type="button"
          className="min-h-7 flex-none bg-transparent p-0 underline decoration-line-2 underline-offset-[3px] hover:text-ink!"
          aria-label={editLabel}
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </Surface>
  );
}

function AddPrompt({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        addPromptButton,
        'only:m-0 only:w-full only:justify-center only:rounded-[14px] only:border only:border-dashed only:border-line-2 only:px-4 only:py-3.5 only:text-ink-2!',
      )}
      onClick={onClick}
    >
      <Glyph name="plus" size={14} /> {children}
    </button>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function ContactCard({ profile, onEdit }: { profile: PersonalProfile; onEdit: () => void }) {
  const region = regionOf(profile.countryCode);
  const phones = [profile.phone, profile.alternatePhone]
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => parsePhone(p, region));
  // "Avenue Hassan II, Rabat 10000" / "Rabat-Salé-Kénitra · Morocco"
  const cityLine = [profile.city, profile.postalCode].filter(Boolean).join(' ');
  const line1 = [profile.address, cityLine].filter(Boolean).join(', ');
  const line2 = [profile.region, (profile.countryCode && countryName(profile.countryCode)) || profile.country]
    .filter(Boolean)
    .join(' · ');
  const email = profile.email.trim();
  const empty = !email && !phones.length && !line1 && !line2;
  const meta = empty ? 'Nothing added yet' : `${plural(email ? 1 : 0, 'email')} · ${plural(phones.length, 'phone')}`;
  return (
    <Card id="contact" icon="contact" title="Contact" meta={meta} editLabel="Edit contact" onEdit={onEdit}>
      {empty ? (
        <AddPrompt onClick={onEdit}>Add your email and phone</AddPrompt>
      ) : (
        <ul className={rowList}>
          {email && (
            <li className={row()}>
              <span className={glyph()}>
                <Glyph name="mail" size={15} />
              </span>
              <span className={rowText()}>{email}</span>
              <span className="flex-none rounded-full bg-brand-tint px-[9px] py-0.5 text-[11.5px] font-semibold text-brand-text">
                Primary
              </span>
            </li>
          )}
          {phones.map((phone, i) => (
            <li className={row()} key={`${i}-${phone.raw}`}>
              {phone.valid && phone.region ? (
                <CountryBadge code={phone.region} name={regionName(phone.region)} />
              ) : (
                <span className={glyph()}>
                  <Glyph name="phone" size={15} />
                </span>
              )}
              <span className={rowText()}>{phone.international ?? phone.raw}</span>
              {!phone.valid ? (
                <span className="flex-none font-sans text-[11.5px] leading-[normal] font-semibold text-bad">
                  {CHECK_NUMBER}
                </span>
              ) : phone.type ? (
                <span className={cn(monoMeta, 'flex-none')}>{phone.type}</span>
              ) : null}
            </li>
          ))}
          {(line1 || line2) && (
            <li className={row({ tall: true })}>
              <span className={glyph(true)}>
                <Glyph name="pin" size={15} />
              </span>
              <span className={rowText()}>
                {line1 || line2}
                {line1 && line2 && <small className={rowSub}>{line2}</small>}
              </span>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

export function WhereCard({
  markets,
  homeCode,
  homeCurrency,
  error,
  onEdit,
  onOpen,
}: {
  markets: readonly Market[];
  /** The profile's country. Shown first as a derived row that is never stored. */
  homeCode: string;
  /** Currency used for the home country when the profile does not name one. */
  homeCurrency: string | undefined;
  error: string;
  onEdit: () => void;
  onOpen: (code: string) => void;
}) {
  const home = homeCode ? (countryName(homeCode) ?? homeCode) : '';
  // A stored market for the home country replaces the derived row (and moves first) so it is never listed twice.
  const ordered = homeCode
    ? [...markets].sort((a, b) => Number(b.code === homeCode) - Number(a.code === homeCode))
    : markets;
  const showHome = homeCode !== '' && !markets.some((m) => m.code === homeCode);
  const shown = ordered.slice(0, MAX_COUNTRY_ROWS - (showHome ? 1 : 0));
  const hidden = markets.length - shown.length;
  return (
    <Card
      id="where"
      icon="globe"
      title="Where you apply"
      meta="Matched by job location"
      editLabel="Edit where you apply"
      onEdit={onEdit}
    >
      {error && (
        <p className="mb-2 text-xs leading-[1.45] text-bad" role="status">
          {error}
        </p>
      )}
      <ul className={rowList}>
        {showHome && (
          <li className={row({ where: true })}>
            <CountryBadge code={homeCode} name={home} />
            <span className={rowText(true)}>
              {home}
              <small className={rowSub}>{['Main details', homeCurrency].filter(Boolean).join(' · ')}</small>
            </span>
            <span className={status()}>Can work</span>
          </li>
        )}
        {shown.map((m) => {
          const name = countryName(m.code) ?? m.code;
          const sent = marketSummary(m);
          return (
            <li key={m.code}>
              <button
                type="button"
                className={cn(row({ where: true, button: true }), 'group')}
                aria-label={`Edit ${name}`}
                onClick={() => onOpen(m.code)}
              >
                <CountryBadge code={m.code} name={name} />
                <span
                  className={cn(
                    rowText(true),
                    'group-hover:underline group-hover:decoration-line-2 group-hover:underline-offset-[3px]',
                  )}
                >
                  {name}
                  <small className={rowSub}>{sent || 'Uses your main details'}</small>
                </span>
                <span className={status(m.workAuth !== 'authorized')}>
                  {m.workAuth === 'authorized' ? 'Can work' : 'Visa needed'}
                </span>
              </button>
            </li>
          );
        })}
        <li className={row({ where: true })}>
          <GlobeBadge />
          <span className={rowText(true)}>
            Other countries
            <small className={rowSub}>Uses your main details</small>
          </span>
        </li>
      </ul>
      {hidden > 0 && (
        <button type="button" className={moreButton} onClick={onEdit}>
          +{hidden} more
        </button>
      )}
    </Card>
  );
}

/** The thumbnails depict printed paper, so they stay light in dark mode too. */
const PAPER =
  'absolute top-0 left-0 box-border h-[88px] w-[68px] rounded-[7px] border border-[#dadada] shadow-[0_1px_2px_rgb(0_0_0/0.08)]';
const PAPER_LINE = 'block h-[3px] rounded-[2px] bg-[#dcdcdc]';
const PAPER_HEAD = 'mb-[3px] block h-[5px] w-[62%] rounded-[2px] bg-[#3a3a3a]';
const PAPER_ACCENT = 'mt-1 block h-[3px] w-[34%] rounded-[2px] bg-[#00846a]';

function PaperStack({ empty }: { empty: boolean }) {
  return (
    <div
      className={cn('relative mt-0.5 ml-0.5 h-[100px] w-[84px] flex-none', empty && 'opacity-55')}
      aria-hidden="true"
    >
      <i className={cn(PAPER, 'bg-[#f1f1ef] [transform:translate(8px,4px)_rotate(5deg)]')} />
      <i className={cn(PAPER, 'bg-[#f6f6f4] [transform:translate(4px,2px)_rotate(2.5deg)]')} />
      <div className={cn(PAPER, 'flex flex-col gap-[3.5px] bg-[#fcfcfb] px-2 py-[9px]')}>
        <i className={PAPER_HEAD} />
        <i className={PAPER_LINE} />
        <i className={PAPER_LINE} />
        <i className={PAPER_ACCENT} />
        <i className={PAPER_LINE} />
        <i className={PAPER_LINE} />
        <i className={PAPER_LINE} />
        <i className={PAPER_ACCENT} />
        <i className={PAPER_LINE} />
        <i className={PAPER_LINE} />
      </div>
    </div>
  );
}

export function CvsCard({
  profile,
  count,
  onSeeAll,
}: {
  profile: PersonalProfile;
  count: number | null;
  onSeeAll: () => void;
}) {
  const none = count === 0;
  const meta = count === null ? 'CVs on this device' : none ? 'No CVs yet' : plural(count, 'CV');
  return (
    <Card id="cvs" icon="doc" title="CVs" meta={meta} editLabel="Manage CVs" onEdit={onSeeAll}>
      <div className="flex min-w-0 gap-[18px]">
        <PaperStack empty={none} />
        <div className="min-w-0 flex-1 text-[12.5px] text-muted">
          <strong className="block text-[15px] font-[650] text-ink">
            {none ? 'Add your first CV' : 'The agent picks one per job'}
          </strong>
          <p className="mt-2 leading-[1.5]">
            {fullName(profile) ? (
              <>
                Employers always see
                <b className="block font-semibold text-ink [overflow-wrap:anywhere]">{cvFileName(profile)}</b>
              </>
            ) : (
              'Add your name to set the file name'
            )}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="mt-auto flex min-h-10 w-full items-center justify-between border-t border-line bg-transparent p-0"
        aria-label={none ? 'Add a CV' : 'See all CVs'}
        onClick={onSeeAll}
      >
        <span>{none ? 'Add a CV' : 'See all CVs'}</span>
        <Glyph name="arrowRight" size={14} />
      </button>
    </Card>
  );
}

const MAX_TIMELINE = 3;

export function CareerCard({ profile, onEdit }: { profile: PersonalProfile; onEdit: () => void }) {
  const jobs = sortCareer(profile.career).map((e) => ({
    id: e.id,
    current: e.end === PRESENT,
    title: e.role,
    sub: [e.organisation, yearRange(e.start, e.end)].filter(Boolean).join(' · '),
  }));
  const degree = [profile.degree, profile.fieldOfStudy]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ');
  const school = [profile.school.trim(), yearRange(profile.schoolStart, profile.graduation)].filter(Boolean);
  const entries = [
    ...jobs,
    ...(degree || school.length
      ? [{ id: 'edu', current: false, title: degree || 'Education', sub: school.join(' · ') }]
      : []),
  ];
  const shown = entries.slice(0, MAX_TIMELINE);
  return (
    <Card
      id="career"
      icon="briefcase"
      title="Career"
      meta={entries.length ? plural(entries.length, 'entry', 'entries') : 'Nothing added yet'}
      editLabel="Edit career"
      onEdit={onEdit}
    >
      {entries.length ? (
        <>
          <ol className="flex flex-col gap-4 pt-0.5">
            {shown.map((e) => (
              <li
                key={e.id}
                className="relative grid grid-cols-[14px_minmax(0,1fr)] gap-3 not-last:after:absolute not-last:after:top-4 not-last:after:bottom-[-18px] not-last:after:left-1.5 not-last:after:w-px not-last:after:bg-line not-last:after:content-['']"
              >
                <b
                  className={cn(
                    'mt-[3px] box-border size-[13px] rounded-full border-2 bg-bg dark:bg-panel',
                    e.current ? 'border-brand' : 'border-line-2',
                  )}
                  aria-hidden="true"
                />
                <div>
                  <strong className="block [font-size:14px] font-[620] [overflow-wrap:anywhere]">{e.title}</strong>
                  {e.sub && <span className="mt-0.5 block text-[12.5px] text-muted">{e.sub}</span>}
                </div>
              </li>
            ))}
          </ol>
          {entries.length > shown.length && (
            <button type="button" className={moreButton} onClick={onEdit}>
              +{entries.length - shown.length} more
            </button>
          )}
        </>
      ) : (
        <AddPrompt onClick={onEdit}>Add your work history and education</AddPrompt>
      )}
    </Card>
  );
}

const CHIP =
  'inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-ground px-[11px] text-[12.5px] font-[550] whitespace-nowrap text-ink-2';

function Chips({ items, max = MAX_CHIPS }: { items: ReactNode[]; max?: number }) {
  const shown = items.slice(0, max);
  return (
    <ul className="mb-1.5 flex flex-wrap gap-1.5">
      {shown.map((item, i) => (
        <li className={CHIP} key={i}>
          {item}
        </li>
      ))}
      {items.length > shown.length && <li className={cn(CHIP, 'text-muted')}>+{items.length - shown.length}</li>}
    </ul>
  );
}

export function PrefsCard({ profile, onEdit }: { profile: PersonalProfile; onEdit: () => void }) {
  const roles = splitList(profile.role);
  const currency = effectiveSalaryCurrency(profile);
  const legacySalary = profile.salary.trim();
  const salary =
    profile.salaryAmount !== null
      ? formatSalary(profile.salaryAmount, profile.salaryPeriod, currency || undefined)
      : legacySalary
        ? `${legacySalary} (check this)`
        : '';
  const notice = profile.notice
    ? noticeLabel(profile.notice)
    : profile.startDate.trim()
      ? `${profile.startDate.trim()} (check this)`
      : '';
  const rows: [string, string][] = [
    ['Arrangement', profile.workMode],
    ['Locations', profile.locations],
    ['Notice', notice],
    ['Salary', salary],
  ];
  const empty = !roles.length && rows.every(([, v]) => !v.trim());
  return (
    <Card
      id="preferences"
      icon="target"
      title="Job preferences"
      meta={roles.length ? `Targeting ${plural(roles.length, 'role')}` : 'Not set yet'}
      editLabel="Edit job preferences"
      onEdit={onEdit}
    >
      {empty ? (
        <AddPrompt onClick={onEdit}>Add the roles you want</AddPrompt>
      ) : (
        <>
          {roles.length > 0 && <Chips items={roles} />}
          <dl className="mt-1">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="grid min-h-[35px] grid-cols-[92px_minmax(0,1fr)] items-center gap-2.5 border-t border-line text-[13px]"
              >
                <dt className="text-[12.5px] text-muted">{label}</dt>
                <dd className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {value.trim() ? (
                    value
                  ) : (
                    <button
                      type="button"
                      className="bg-transparent p-0 font-semibold! text-brand-text!"
                      aria-label={`Add ${label.toLowerCase()}`}
                      onClick={onEdit}
                    >
                      Add
                    </button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Card>
  );
}

const stripUrl = (url: string) =>
  url
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/\/+$/, '');

export function LanguagesLinksCard({ profile, onEdit }: { profile: PersonalProfile; onEdit: () => void }) {
  const languages = profile.languages.map((l) =>
    l.language ? { name: languageName(l.language), level: l.level } : { name: l.raw ?? '', level: 'Check this' },
  );
  const links = [profile.website, profile.linkedin, profile.github].map(stripUrl).filter(Boolean);
  const meta =
    languages.length || links.length
      ? `${plural(languages.length, 'language')} · ${plural(links.length, 'link')}`
      : 'Nothing added yet';
  return (
    <Card
      id="languages-links"
      icon="language"
      title="Languages & links"
      meta={meta}
      editLabel="Edit languages and links"
      onEdit={onEdit}
    >
      {languages.length || links.length ? (
        <>
          {languages.length > 0 && (
            <Chips
              items={languages.map((l) => (
                <>
                  {l.name} {l.level && <span className="font-[450] text-muted">{l.level}</span>}
                </>
              ))}
              max={3}
            />
          )}
          <ul className={rowList}>
            {links.slice(0, 3).map((link) => (
              <li className={row()} key={link}>
                <span className={glyph()}>
                  <Glyph name="link" size={15} />
                </span>
                <span className={rowText()}>{link}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <AddPrompt onClick={onEdit}>Add languages and links</AddPrompt>
      )}
    </Card>
  );
}
