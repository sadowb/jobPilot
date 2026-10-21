import { useState, type InputHTMLAttributes } from 'react';
import { ProfileEditor } from './ProfileEditor';
import { PROFILE_KEY, readProfile, type PersonalProfile, type ProfileField } from './personal';
import { useSavedDraft } from './useSavedDraft';
import { CommonAnswers } from './CommonAnswers';

type Field = {
  key: ProfileField;
  label: string;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  autoComplete?: string;
  placeholder?: string;
  wide?: boolean;
  options?: string[];
};
const GROUPS: { id: string; title: string; description: string; fields: Field[] }[] = [
  {
    id: 'basics',
    title: 'Personal details',
    description: 'Your name, headline and introduction.',
    fields: [
      { key: 'firstName', label: 'First name', autoComplete: 'given-name' },
      { key: 'lastName', label: 'Last name', autoComplete: 'family-name' },
      {
        key: 'preferredName',
        label: 'Preferred name',
        autoComplete: 'nickname',
        placeholder: 'What should Cap call you?',
      },
      { key: 'headline', label: 'Professional headline', placeholder: 'e.g. Software engineer · New graduate' },
      {
        key: 'bio',
        label: 'A little about you',
        wide: true,
        placeholder: 'Your experience, what you enjoy building, and what comes next.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact information',
    description: 'Where employers can reach you.',
    fields: [
      { key: 'email', label: 'Email address', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
      { key: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel', placeholder: '+212 …' },
      { key: 'alternatePhone', label: 'Alternate phone', type: 'tel', placeholder: 'Optional' },
      { key: 'country', label: 'Country', autoComplete: 'country-name' },
      { key: 'address', label: 'Street address', autoComplete: 'street-address', wide: true },
      { key: 'city', label: 'City', autoComplete: 'address-level2' },
      { key: 'region', label: 'State / region', autoComplete: 'address-level1' },
      { key: 'postalCode', label: 'Postal code', autoComplete: 'postal-code' },
    ],
  },
  {
    id: 'links',
    title: 'Website & links',
    description: 'Your work, beyond the application.',
    fields: [
      { key: 'website', label: 'Website / portfolio', type: 'url', placeholder: 'https://your-site.com', wide: true },
      { key: 'linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/in/…' },
      { key: 'github', label: 'GitHub', type: 'url', placeholder: 'https://github.com/…' },
    ],
  },
  {
    id: 'education',
    title: 'Education',
    description: 'The education details that application forms ask for.',
    fields: [
      { key: 'school', label: 'School / university', autoComplete: 'organization' },
      { key: 'degree', label: 'Degree', placeholder: 'e.g. BSc' },
      { key: 'fieldOfStudy', label: 'Field of study', placeholder: 'e.g. Computer Science' },
      { key: 'graduation', label: 'Graduation date', type: 'month' },
    ],
  },
  {
    id: 'preferences',
    title: 'Job preferences',
    description: 'A starting point for your search. Leave anything undecided blank.',
    fields: [
      {
        key: 'role',
        label: 'Roles you’re looking for',
        placeholder: 'e.g. Software engineer, AI engineer',
        wide: true,
      },
      { key: 'workMode', label: 'Work arrangement', options: ['Remote', 'Hybrid', 'On-site', 'Open to any'] },
      { key: 'locations', label: 'Preferred locations', placeholder: 'Cities, countries, or time zones' },
      { key: 'startDate', label: 'Earliest start date', type: 'date' },
      { key: 'salary', label: 'Salary expectations', placeholder: 'Include currency and period, or “Negotiable”' },
    ],
  },
];

function summaryRows(id: string, p: PersonalProfile): [string, string][] {
  switch (id) {
    case 'basics':
      return [
        ['Full name', [p.firstName, p.lastName].filter(Boolean).join(' ')],
        ['Preferred name', p.preferredName],
        ['Headline', p.headline],
        ['About', p.bio],
      ];
    case 'contact':
      return [
        ['Email', p.email],
        ['Phone', p.phone],
        ['Alternate phone', p.alternatePhone],
        ['Location', [p.city, p.region, p.country].filter(Boolean).join(', ')],
        ['Address', [p.address, p.postalCode].filter(Boolean).join(' · ')],
      ];
    case 'education':
      return [
        ['University', p.school],
        ['Degree', p.degree],
        ['Field of study', p.fieldOfStudy],
        ['Graduation', p.graduation],
      ];
    case 'preferences':
      return [
        ['Target roles', p.role],
        ['Arrangement', p.workMode],
        ['Locations', p.locations],
        ['Start date', p.startDate],
        ['Salary', p.salary],
      ];
    default:
      return [
        ['Website', p.website],
        ['LinkedIn', p.linkedin],
        ['GitHub', p.github],
      ];
  }
}

export function AboutMe() {
  const { draft, setDraft, dirty, save, cancel, message, error } = useSavedDraft(PROFILE_KEY, readProfile);
  const [editing, setEditing] = useState<string | null>(null);
  const group = GROUPS.find((g) => g.id === editing);
  const update = (key: ProfileField, value: string) => setDraft((p) => ({ ...p, [key]: value }));
  const close = () => {
    cancel();
    setEditing(null);
  };
  const groups = ['basics', 'contact', 'education', 'preferences', 'links'].map((id) =>
    GROUPS.find((g) => g.id === id)!,
  );
  return (
    <>
      <div className="profile-overview">
        {groups.map((group) => (
          <section
            className={`profile-card profile-detail-card${group.id === 'links' ? ' profile-links-card' : ''}`}
            id={group.id}
            key={group.id}
            aria-labelledby={`${group.id}-title`}
          >
            <div className="profile-card-heading">
              <div>
                <h2 id={`${group.id}-title`}>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <button
                type="button"
                className="btn sm ghost profile-edit"
                aria-label={`Edit ${group.title.toLowerCase()}`}
                onClick={() => setEditing(group.id)}
              >
                Edit
              </button>
            </div>
            <dl className={group.id === 'links' ? 'profile-link-values' : 'profile-detail-rows'}>
              {summaryRows(group.id, draft).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className={value ? '' : 'profile-missing'}>{value || 'Not added'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className="profile-save-note" role="status">
        {error || message || 'Only details you save appear in your profile.'}
      </div>
      <CommonAnswers />
      {group && (
        <ProfileEditor
          title={group.title}
          description={group.description}
          dirty={dirty}
          error={error}
          onCancel={close}
          onSave={() => {
            if (save()) setEditing(null);
          }}
        >
          <div className="profile-fields">
            {group.fields.map((field) => (
              <label className={`profile-field${field.wide ? ' profile-wide' : ''}`} key={field.key}>
                <span>{field.label}</span>
                {field.key === 'bio' ? (
                  <textarea
                    value={draft.bio}
                    onChange={(e) => update(field.key, e.target.value)}
                    rows={5}
                    maxLength={10000}
                    placeholder={field.placeholder}
                  />
                ) : field.options ? (
                  <select value={draft[field.key]} onChange={(e) => update(field.key, e.target.value)}>
                    <option value="">Not specified</option>
                    {field.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type ?? 'text'}
                    value={draft[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    autoComplete={field.autoComplete}
                    placeholder={field.placeholder}
                    maxLength={2000}
                  />
                )}
              </label>
            ))}
          </div>
        </ProfileEditor>
      )}
    </>
  );
}
