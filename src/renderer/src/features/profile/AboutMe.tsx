import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { Field, FieldGrid, Input, Select, Textarea } from '../../components/ui';
import { ProfileEditor } from './ProfileEditor';
import {
  EDIT_IDENTITY_EVENT,
  OPEN_EDITOR_EVENT,
  PROFILE_KEY,
  effectiveSalaryCurrency,
  readProfile,
  type OpenEditorDetail,
  type ProfileField,
} from './personal';
import { careerError, sortCareer } from './career';
import { CareerEditor } from './CareerEditor';
import { PhoneField } from './PhoneField';
import { phoneProblem, regionOf } from './phones';
import { CountrySelect, LanguageEditor, NoticeField, SalaryField } from './ProfileInputs';
import { languagesError } from './languages';
import { useSavedDraft } from './useSavedDraft';
import { useDocumentCount } from './useDocumentCount';
import { CareerCard, ContactCard, CvsCard, LanguagesLinksCard, PrefsCard, WhereCard } from './AboutCards';
import { AddCountryDialog, CountryEditor, ManageCountriesDialog } from './MarketDialogs';
import { CURRENCIES, EU_CODE, defaultCurrency, MARKETS_KEY, isEuMember, readMarkets, type Market } from './markets';
import { selectChevron } from './styles';

type Field = {
  label: string;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  autoComplete?: string;
  placeholder?: string;
  wide?: boolean;
  options?: string[];
  multiline?: boolean;
  kind?: 'phone' | 'currency' | 'country' | 'salary' | 'notice';
};

/** The legacy free-text `country` is never edited directly; `countryCode` replaces it. */
type EditableField = Exclude<ProfileField, 'country'>;

const FIELDS: Record<EditableField, Field> = {
  firstName: { label: 'First name', autoComplete: 'given-name' },
  lastName: { label: 'Last name', autoComplete: 'family-name' },
  preferredName: { label: 'Preferred name', autoComplete: 'nickname', placeholder: 'What should Cap call you?' },
  headline: { label: 'Professional headline', placeholder: 'e.g. Software engineer · New graduate', wide: true },
  bio: {
    label: 'A little about you',
    wide: true,
    multiline: true,
    placeholder: 'Your experience, what you enjoy building, and what comes next.',
  },
  email: { label: 'Email address', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
  phone: { label: 'Phone number', kind: 'phone' },
  alternatePhone: { label: 'Alternate phone', kind: 'phone' },
  countryCode: { label: 'Country', kind: 'country' },
  address: { label: 'Street address', autoComplete: 'street-address', wide: true },
  city: { label: 'City', autoComplete: 'address-level2' },
  region: { label: 'State / region', autoComplete: 'address-level1' },
  postalCode: { label: 'Postal code', autoComplete: 'postal-code' },
  website: { label: 'Website / portfolio', type: 'url', placeholder: 'https://your-site.com', wide: true },
  linkedin: { label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/in/…' },
  github: { label: 'GitHub', type: 'url', placeholder: 'https://github.com/…' },
  schoolStart: { label: 'Start date', type: 'month' },
  school: { label: 'School / university', autoComplete: 'organization' },
  degree: { label: 'Degree', placeholder: 'e.g. BSc' },
  fieldOfStudy: { label: 'Field of study', placeholder: 'e.g. Computer Science' },
  graduation: { label: 'Graduation date', type: 'month' },
  role: { label: 'Roles you’re looking for', placeholder: 'e.g. Software engineer, AI engineer', wide: true },
  workMode: { label: 'Work arrangement', options: ['Remote', 'Hybrid', 'On-site', 'Open to any'] },
  locations: { label: 'Preferred locations', placeholder: 'Cities, countries, or time zones' },
  startDate: { label: 'Notice', kind: 'notice' },
  salary: { label: 'Salary expectation', kind: 'salary' },
  salaryCurrency: { label: 'Salary currency', kind: 'currency' },
};

type GroupId = 'identity' | 'contact' | 'career' | 'preferences' | 'languages-links';
const GROUPS: Record<
  GroupId,
  { title: string; description: string; fields: EditableField[]; career?: boolean; languages?: boolean }
> = {
  identity: {
    title: 'Identity',
    description: 'Your name and introduction. The name decides the file name employers receive.',
    fields: ['firstName', 'lastName', 'preferredName', 'headline', 'bio'],
  },
  contact: {
    title: 'Contact',
    description: 'Where employers can reach you.',
    fields: ['email', 'phone', 'alternatePhone', 'countryCode', 'address', 'city', 'region', 'postalCode'],
  },
  career: {
    title: 'Career',
    description: 'Your work history and the education details application forms ask for.',
    fields: ['school', 'schoolStart', 'degree', 'fieldOfStudy', 'graduation'],
    career: true,
  },
  preferences: {
    title: 'Job preferences',
    description: 'A starting point for your search. Leave anything undecided blank.',
    fields: ['role', 'workMode', 'locations', 'startDate', 'salary', 'salaryCurrency'],
  },
  'languages-links': {
    title: 'Languages & links',
    description: 'What you speak, and your work beyond the application. Choose a language and how well you speak it.',
    fields: ['website', 'linkedin', 'github'],
    languages: true,
  },
};

type View =
  | { type: 'profile'; group: GroupId }
  | { type: 'manage' }
  | { type: 'add' }
  | { type: 'country'; code: string; added?: boolean }
  | null;

export function AboutMe({ onSeeAllCvs }: { onSeeAllCvs: () => void }) {
  const profile = useSavedDraft(PROFILE_KEY, readProfile);
  const markets = useSavedDraft(MARKETS_KEY, readMarkets);
  const docCount = useDocumentCount();
  const [view, setView] = useState<View>(null);
  const { draft } = profile;
  useEffect(() => {
    const open = () => setView({ type: 'profile', group: 'identity' });
    const openDetail = (e: Event) => {
      const detail = (e as CustomEvent<OpenEditorDetail>).detail;
      if (detail?.kind === 'market') setView({ type: 'country', code: detail.code });
      else if (detail?.kind === 'manage') setView({ type: 'manage' });
      else if (detail?.kind === 'profile' && detail.group in GROUPS)
        setView({ type: 'profile', group: detail.group as GroupId });
    };
    window.addEventListener(EDIT_IDENTITY_EVENT, open);
    window.addEventListener(OPEN_EDITOR_EVENT, openDetail);
    return () => {
      window.removeEventListener(EDIT_IDENTITY_EVENT, open);
      window.removeEventListener(OPEN_EDITOR_EVENT, openDetail);
    };
  }, []);
  const [problem, setProblem] = useState('');
  const group = view?.type === 'profile' ? GROUPS[view.group] : null;
  const update = (key: ProfileField, value: string) => {
    setProblem('');
    profile.setDraft((p) => ({ ...p, [key]: value }));
  };
  const closeProfile = () => {
    setProblem('');
    profile.cancel();
    setView(null);
  };
  const saveMarkets = (next: Market[]) => markets.save(next);
  const addCountry = async (code: string) => {
    const home = code === draft.countryCode;
    // A new country starts from the main details: no overrides, and work authorisation is only assumed for home.
    // An EU member inherits the answer already given for the EU as a whole.
    const eu = isEuMember(code) ? markets.draft.find((m) => m.code === EU_CODE)?.workAuth : undefined;
    const next: Market = { code, workAuth: eu ?? (home ? 'authorized' : 'sponsorship') };
    const currency = defaultCurrency(code);
    if (currency) next.currency = currency;
    if (await saveMarkets([...markets.draft, next])) setView({ type: 'country', code, added: true });
  };
  const editingMarket = view?.type === 'country' ? markets.draft.find((m) => m.code === view.code) : undefined;
  // The unreadable-data message for markets is shown once, inside its card.
  const status = profile.error || profile.message || markets.message;
  return (
    <>
      <div className="grid auto-rows-[minmax(300px,auto)] grid-cols-3 gap-5 [@media(height<=760px)]:auto-rows-[minmax(236px,auto)] [@media(height<=760px)]:gap-4 [@media(width<=1190px)]:grid-cols-2 [@media(width<=800px)]:auto-rows-auto [@media(width<=800px)]:grid-cols-1">
        <ContactCard profile={draft} onEdit={() => setView({ type: 'profile', group: 'contact' })} />
        <WhereCard
          markets={markets.draft}
          homeCode={draft.countryCode}
          homeCurrency={effectiveSalaryCurrency(draft) || undefined}
          error={markets.error}
          onEdit={() => setView({ type: 'manage' })}
          onOpen={(code) => setView({ type: 'country', code })}
        />
        <CvsCard profile={draft} count={docCount} onSeeAll={onSeeAllCvs} />
        <CareerCard profile={draft} onEdit={() => setView({ type: 'profile', group: 'career' })} />
        <PrefsCard profile={draft} onEdit={() => setView({ type: 'profile', group: 'preferences' })} />
        <LanguagesLinksCard profile={draft} onEdit={() => setView({ type: 'profile', group: 'languages-links' })} />
      </div>
      <div className="mx-0.5 mt-3 mb-5 min-h-[18px] text-[11.5px] text-muted" role="status">
        {status || 'Only details you save appear in your profile.'}
      </div>
      {group && (
        <ProfileEditor
          title={group.title}
          description={group.description}
          dirty={profile.dirty}
          error={problem || profile.error}
          onCancel={closeProfile}
          onSave={async () => {
            const phone = phoneProblem(draft.phone);
            const alternate = phoneProblem(draft.alternatePhone);
            const langProblem = languagesError(draft.languages);
            const roleProblem = draft.career.map(careerError).find(Boolean);
            const bad =
              (phone && `Phone number: ${phone}`) ||
              (alternate && `Alternate phone: ${alternate}`) ||
              (roleProblem && `Work history: ${roleProblem}`) ||
              (langProblem && `Languages: ${langProblem}`);
            if (bad) {
              setProblem(bad);
              return;
            }
            if (await profile.save({ ...draft, career: sortCareer(draft.career) })) setView(null);
          }}
        >
          {group.career && (
            <CareerEditor
              entries={draft.career}
              onChange={(career) => {
                setProblem('');
                profile.setDraft((p) => ({ ...p, career }));
              }}
            />
          )}
          {group.languages && (
            <LanguageEditor
              entries={draft.languages}
              onChange={(languages) => {
                setProblem('');
                profile.setDraft((p) => ({ ...p, languages }));
              }}
            />
          )}
          <FieldGrid>
            {group.fields.map((key) => {
              const field = FIELDS[key];
              if (field.kind === 'phone')
                return (
                  <PhoneField
                    key={key}
                    label={field.label}
                    value={draft[key]}
                    defaultRegion={regionOf(draft.countryCode)}
                    onChange={(value) => update(key, value)}
                  />
                );
              if (field.kind === 'country')
                return (
                  <CountrySelect
                    key={key}
                    label={field.label}
                    value={draft.countryCode}
                    legacyText={draft.country}
                    onChange={(code) => {
                      setProblem('');
                      profile.setDraft((p) => ({ ...p, countryCode: code, country: '' }));
                    }}
                  />
                );
              if (field.kind === 'notice')
                return (
                  <NoticeField
                    key={key}
                    notice={draft.notice}
                    legacyText={draft.startDate}
                    onChange={(notice) => {
                      setProblem('');
                      // A chosen notice replaces the old free text that could not be understood.
                      profile.setDraft((p) => ({ ...p, notice, startDate: notice ? '' : p.startDate }));
                    }}
                  />
                );
              if (field.kind === 'salary')
                return (
                  <SalaryField
                    key={key}
                    amount={draft.salaryAmount}
                    period={draft.salaryPeriod}
                    legacyText={draft.salary}
                    currency={draft.salaryCurrency || effectiveSalaryCurrency(draft)}
                    onChange={(salaryAmount, salaryPeriod) => {
                      setProblem('');
                      // A typed amount replaces the old free text that could not be parsed.
                      profile.setDraft((p) => ({
                        ...p,
                        salaryAmount,
                        salaryPeriod,
                        salary: salaryAmount === null ? p.salary : '',
                      }));
                    }}
                  />
                );
              if (field.kind === 'currency')
                return (
                  <Field label={field.label} key={key}>
                    <Select
                      className={selectChevron}
                      value={draft[key] || effectiveSalaryCurrency(draft)}
                      onChange={(e) => update(key, e.target.value)}
                    >
                      <option value="">Not specified</option>
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </Select>
                  </Field>
                );
              return (
                <Field label={field.label} wide={field.wide} key={key}>
                  {field.multiline ? (
                    <Textarea
                      value={draft[key]}
                      onChange={(e) => update(key, e.target.value)}
                      rows={5}
                      maxLength={10000}
                      placeholder={field.placeholder}
                    />
                  ) : field.options ? (
                    <Select className={selectChevron} value={draft[key]} onChange={(e) => update(key, e.target.value)}>
                      <option value="">Not specified</option>
                      {field.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={field.type ?? 'text'}
                      value={draft[key]}
                      onChange={(e) => update(key, e.target.value)}
                      autoComplete={field.autoComplete}
                      placeholder={field.placeholder}
                      maxLength={2000}
                    />
                  )}
                </Field>
              );
            })}
          </FieldGrid>
        </ProfileEditor>
      )}
      {view?.type === 'manage' && (
        <ManageCountriesDialog
          markets={markets.draft}
          onOpen={(code) => setView({ type: 'country', code })}
          onAdd={() => setView({ type: 'add' })}
          onClose={() => setView(null)}
        />
      )}
      {view?.type === 'add' && (
        <AddCountryDialog
          existing={markets.draft.map((m) => m.code)}
          onAdd={addCountry}
          onCancel={() => setView(null)}
        />
      )}
      {view?.type === 'country' && editingMarket && (
        <CountryEditor
          key={editingMarket.code}
          market={editingMarket}
          profile={draft}
          error={markets.error}
          added={view.added === true}
          onCancel={() => setView(null)}
          onSave={async (next) => {
            if (await saveMarkets(markets.draft.map((m) => (m.code === next.code ? next : m)))) setView(null);
          }}
          onRemove={async () => {
            if (await saveMarkets(markets.draft.filter((m) => m.code !== editingMarket.code))) setView(null);
          }}
        />
      )}
    </>
  );
}
