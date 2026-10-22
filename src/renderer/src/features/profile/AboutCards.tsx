import type { ReactNode } from 'react';
import { Glyph, CountryBadge, GlobeBadge, type GlyphName } from './icons';
import { countryName, marketSummary, type Market } from './markets';
import { PRESENT, sortCareer, yearRange } from './career';
import { CHECK_NUMBER, parsePhone, regionName, regionOf } from './phones';
import { noticeLabel } from './notice';
import { formatSalary } from './salary';
import { languageName } from './languages';
import { cvFileName, effectiveSalaryCurrency, fullName, splitList, type PersonalProfile } from './personal';

/** Rows shown in the card, home row included; the rest are one click away in Edit. */
const MAX_COUNTRY_ROWS = 3;
const MAX_CHIPS = 4;

function Card({
  id,
  icon,
  title,
  meta,
  editLabel,
  onEdit,
  className = '',
  children,
}: {
  id: string;
  icon: GlyphName;
  title: string;
  meta: string;
  editLabel: string;
  onEdit: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`pf-card ${className}`.trim()} id={id} aria-labelledby={`${id}-title`}>
      <div className="pf-chd">
        <span className="pf-ico" aria-hidden="true">
          <Glyph name={icon} size={18} />
        </span>
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          <span className="pf-meta">{meta}</span>
        </div>
        <button type="button" className="pf-edit" aria-label={editLabel} onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className="pf-cb">{children}</div>
    </section>
  );
}

function AddPrompt({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="pf-addprompt" onClick={onClick}>
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
  // "Avenue Hassan II, Ifrane 53000" / "Fès-Meknès · Morocco"
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
        <ul className="pf-li-list">
          {email && (
            <li className="pf-li">
              <span className="pf-gl">
                <Glyph name="mail" size={15} />
              </span>
              <span className="pf-t">{email}</span>
              <span className="pf-pill">Primary</span>
            </li>
          )}
          {phones.map((phone, i) => (
            <li className="pf-li" key={`${i}-${phone.raw}`}>
              {phone.valid && phone.region ? (
                <CountryBadge code={phone.region} name={regionName(phone.region)} />
              ) : (
                <span className="pf-gl">
                  <Glyph name="phone" size={15} />
                </span>
              )}
              <span className="pf-t">{phone.international ?? phone.raw}</span>
              {!phone.valid ? (
                <span className="pf-tag bad">{CHECK_NUMBER}</span>
              ) : phone.type ? (
                <span className="pf-tag">{phone.type}</span>
              ) : null}
            </li>
          ))}
          {(line1 || line2) && (
            <li className="pf-li tall">
              <span className="pf-gl">
                <Glyph name="pin" size={15} />
              </span>
              <span className="pf-t">
                {line1 || line2}
                {line1 && line2 && <small>{line2}</small>}
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
      className="pf-where"
    >
      {error && (
        <p className="pf-inline-error" role="status">
          {error}
        </p>
      )}
      <ul className="pf-li-list">
        {showHome && (
          <li className="pf-li">
            <CountryBadge code={homeCode} name={home} />
            <span className="pf-t">
              {home}
              <small>{['Main details', homeCurrency].filter(Boolean).join(' · ')}</small>
            </span>
            <span className="pf-status">Can work</span>
          </li>
        )}
        {shown.map((m) => {
          const name = countryName(m.code) ?? m.code;
          const sent = marketSummary(m);
          return (
            <li key={m.code}>
              <button
                type="button"
                className="pf-li pf-rowbtn"
                aria-label={`Edit ${name}`}
                onClick={() => onOpen(m.code)}
              >
                <CountryBadge code={m.code} name={name} />
                <span className="pf-t">
                  {name}
                  <small>{sent || 'Uses your main details'}</small>
                </span>
                <span className={m.workAuth === 'authorized' ? 'pf-status' : 'pf-status need'}>
                  {m.workAuth === 'authorized' ? 'Can work' : 'Visa needed'}
                </span>
              </button>
            </li>
          );
        })}
        <li className="pf-li">
          <GlobeBadge />
          <span className="pf-t">
            Other countries
            <small>Uses your main details</small>
          </span>
        </li>
      </ul>
      {hidden > 0 && (
        <button type="button" className="pf-more" onClick={onEdit}>
          +{hidden} more
        </button>
      )}
    </Card>
  );
}

function PaperStack({ empty }: { empty: boolean }) {
  return (
    <div className={`pf-stack${empty ? ' empty' : ''}`} aria-hidden="true">
      <i className="pf-paper b2" />
      <i className="pf-paper b1" />
      <div className="pf-paper f">
        <i className="h" />
        <i />
        <i />
        <i className="a" />
        <i />
        <i />
        <i />
        <i className="a" />
        <i />
        <i />
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
      <div className="pf-cvtop">
        <PaperStack empty={none} />
        <div className="pf-cvinfo">
          <strong>{none ? 'Add your first CV' : 'The agent picks one per job'}</strong>
          <p>
            {fullName(profile) ? (
              <>
                Employers always see
                <b>{cvFileName(profile)}</b>
              </>
            ) : (
              'Add your name to set the file name'
            )}
          </p>
        </div>
      </div>
      <button type="button" className="pf-rowlink" aria-label={none ? 'Add a CV' : 'See all CVs'} onClick={onSeeAll}>
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
          <ol className="pf-tl">
            {shown.map((e) => (
              <li key={e.id} className={`pf-te${e.current ? '' : ' past'}`}>
                <b aria-hidden="true" />
                <div>
                  <strong>{e.title}</strong>
                  {e.sub && <span>{e.sub}</span>}
                </div>
              </li>
            ))}
          </ol>
          {entries.length > shown.length && (
            <button type="button" className="pf-more" onClick={onEdit}>
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

function Chips({ items, max = MAX_CHIPS }: { items: ReactNode[]; max?: number }) {
  const shown = items.slice(0, max);
  return (
    <ul className="pf-chips">
      {shown.map((item, i) => (
        <li className="pf-chip" key={i}>
          {item}
        </li>
      ))}
      {items.length > shown.length && <li className="pf-chip more">+{items.length - shown.length}</li>}
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
          <dl className="pf-kv">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {value.trim() ? (
                    value
                  ) : (
                    <button
                      type="button"
                      className="pf-addlink"
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
                  {l.name} {l.level && <span>{l.level}</span>}
                </>
              ))}
              max={3}
            />
          )}
          <ul className="pf-li-list">
            {links.slice(0, 3).map((link) => (
              <li className="pf-li" key={link}>
                <span className="pf-gl">
                  <Glyph name="link" size={15} />
                </span>
                <span className="pf-t">{link}</span>
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
