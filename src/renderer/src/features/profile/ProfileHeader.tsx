import { useRef, type KeyboardEvent } from 'react';
import { cn } from '../../components/ui';
import { PButton } from './buttons';
import { Glyph } from './icons';
import { EDIT_IDENTITY_EVENT } from './personal';
import { monoLabel } from './styles';
import { useProfileIdentity } from './useProfileIdentity';

export type ProfileTab = 'about' | 'documents' | 'answers' | 'knowledge';

export const tabId = (tab: ProfileTab) => `profile-tab-${tab}`;
export const panelId = (tab: ProfileTab) => `profile-panel-${tab}`;

/** Hero: initials, serif name, italic headline, mono location and the two identity actions. */
export function ProfileHeader() {
  const identity = useProfileIdentity();
  return (
    <header className="mb-7 [@media(height<=760px)]:mb-4">
      <div className={monoLabel}>Profile & documents</div>
      <div className="mt-3 flex items-center gap-6 [@media(width<=800px)]:flex-wrap [@media(height<=760px)]:mt-2">
        <div
          className="grid size-[76px] flex-none [@media(height<=760px)]:size-14 place-items-center rounded-full bg-brand-tint font-sans text-[28px] leading-[normal] font-semibold text-brand-text"
          aria-hidden="true"
        >
          {identity.initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              'm-0 font-serif text-[46px] leading-[1.08] font-normal tracking-[-0.02em] [overflow-wrap:anywhere] [@media(width<=800px)]:text-[34px] [@media(height<=760px)]:text-[36px]',
              !identity.name && 'text-muted',
            )}
          >
            {identity.name || 'Add your name'}
          </h1>
          {identity.headline && (
            <p className="mt-1.5 font-serif text-[19px] leading-[1.25] font-light text-ink-2 italic">
              {identity.headline}
            </p>
          )}
          {identity.location && (
            <p className={cn(monoLabel, 'mt-2 flex items-center gap-1.5 leading-[normal] font-medium')}>
              <Glyph name="pin" size={12} /> {identity.location}
            </p>
          )}
        </div>
        <div className="flex flex-none gap-2 [@media(width<=800px)]:w-full">
          {/* Uploading a CV does not fill the profile yet (see Documents), so there is nothing to wire this to. */}
          <PButton className="gap-1.5!" disabled title="Reading your details from a CV is not available yet">
            <Glyph name="upload" size={15} /> Update from a CV
          </PButton>
          <PButton className="gap-1.5!" onClick={() => window.dispatchEvent(new Event(EDIT_IDENTITY_EVENT))}>
            Edit identity
          </PButton>
        </div>
      </div>
    </header>
  );
}

/** Tabs with a live count, as an ARIA tablist: roving tabindex, arrows, Home and End. */
export function ProfileTabs({
  tab,
  onTab,
  counts,
}: {
  tab: ProfileTab;
  onTab: (next: ProfileTab) => void;
  counts: Partial<Record<ProfileTab, number | null>>;
}) {
  const items: { id: ProfileTab; label: string }[] = [
    { id: 'about', label: 'About me' },
    { id: 'documents', label: 'Documents' },
    { id: 'answers', label: 'Common answers' },
    { id: 'knowledge', label: 'What the agents know' },
  ];
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (e: KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const target =
      e.key === 'ArrowRight'
        ? (index + 1) % items.length
        : e.key === 'ArrowLeft'
          ? (index + last) % items.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1;
    const next = items[target];
    if (!next) return;
    e.preventDefault();
    onTab(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div
      className="mb-6 flex gap-7 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-line)] [@media(height<=760px)]:mb-4"
      role="tablist"
      aria-label="Profile sections"
    >
      {items.map((item, i) => {
        const count = counts[item.id];
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            type="button"
            role="tab"
            id={tabId(item.id)}
            aria-selected={tab === item.id}
            aria-controls={panelId(item.id)}
            tabIndex={tab === item.id ? 0 : -1}
            className="inline-flex min-h-11 items-center gap-2 border-b-2 border-b-transparent bg-transparent p-0 whitespace-nowrap aria-selected:border-b-ink aria-selected:font-[650]! aria-selected:text-ink!"
            onClick={() => onTab(item.id)}
            onKeyDown={(e) => move(e, i)}
          >
            {item.label}
            {typeof count === 'number' && (
              <span className="rounded-full bg-panel px-[7px] py-px font-mono text-[11px] leading-[normal] font-medium text-muted">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
