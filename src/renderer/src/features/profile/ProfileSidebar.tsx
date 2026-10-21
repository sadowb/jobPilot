import { useProfileIdentity } from './useProfileIdentity';

export function ProfileSidebar({
  section,
  onSection,
  onAnswers,
  knowledgeCount,
  onKnowledge,
}: {
  section: 'about' | 'documents';
  onSection: (section: 'about' | 'documents') => void;
  onAnswers: () => void;
  knowledgeCount: number;
  onKnowledge: () => void;
}) {
  const identity = useProfileIdentity();
  return (
    <aside className="profile-sidebar">
      <div className="profile-identity">
        <div className="profile-portrait">{identity.initials}</div>
        <div>
          <strong>{identity.name}</strong>
          <p>
            {identity.headline === 'Your next chapter, in one place.' ? 'Your profile & documents' : identity.headline}
          </p>
        </div>
      </div>
      <nav aria-label="Profile sections">
        <button
          type="button"
          aria-current={section === 'about' ? 'page' : undefined}
          onClick={() => onSection('about')}
        >
          <span>About me</span>
        </button>
        <button
          type="button"
          aria-current={section === 'documents' ? 'page' : undefined}
          onClick={() => onSection('documents')}
        >
          <span>Documents</span>
        </button>
        <button type="button" onClick={onAnswers}>
          <span>Common answers</span>
          <span className="v17x" aria-hidden="true">
            Q&A
          </span>
        </button>
        <button type="button" onClick={onKnowledge}>
          <span>What the agents know</span>
          <span className="profile-count">{knowledgeCount}</span>
        </button>
      </nav>
      <div className="profile-sidebar-note">
        <p>Your details belong here. Each application only needs what its form asks for.</p>
        <span className="profile-local">Saved on this device</span>
      </div>
    </aside>
  );
}
