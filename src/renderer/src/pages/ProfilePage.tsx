import { useRef } from 'react';
import { ProfileMain, useProfileFacts } from '../features/profile/ProfileMain';
import { ProfileSidebar } from '../features/profile/ProfileSidebar';

/** /profile: documents and what the agents know. */
export function ProfilePage() {
  const [facts, dispatch] = useProfileFacts();
  const knowledge = useRef<HTMLElement>(null);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '272px minmax(0,1fr)' }}>
      <ProfileSidebar
        knowledgeCount={facts.review.length}
        onKnowledge={() => knowledge.current?.scrollIntoView({ behavior: 'auto', block: 'start' })}
      />
      <ProfileMain facts={facts} dispatch={dispatch} knowledgeRef={knowledge} />
    </div>
  );
}
