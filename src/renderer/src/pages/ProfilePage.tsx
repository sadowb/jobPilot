import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AboutMe } from '../features/profile/AboutMe';
import { CommonAnswers } from '../features/profile/CommonAnswers';
import { KnowledgePanel, useProfileFacts } from '../features/profile/KnowledgePanel';
import { ProfileDocuments } from '../features/profile/ProfileDocuments';
import { panelId, ProfileHeader, ProfileTabs, tabId, type ProfileTab } from '../features/profile/ProfileHeader';
import { useDocumentCount } from '../features/profile/useDocumentCount';
import { migrateStartAnswer } from '../features/profile/startMigration';
import { useProfileIdentity } from '../features/profile/useProfileIdentity';
import '../features/profile/profile.css';

const TABS: ProfileTab[] = ['about', 'documents', 'answers', 'knowledge'];

/** Every tab panel stays mounted (only hidden), so switching tabs preserves unsaved edits. */
export function ProfilePage() {
  // Runs once, before the panels below read storage: "When can you start?" now comes from Notice.
  useState(() => migrateStartAnswer());
  const [params, setParams] = useSearchParams();
  const requested = params.get('section');
  const tab = TABS.find((t) => t === requested) ?? 'about';
  const [facts, dispatch] = useProfileFacts();
  const documents = useDocumentCount();
  const { answersCount } = useProfileIdentity();
  const go = (next: ProfileTab) => setParams(next === 'about' ? {} : { section: next });
  const panel = (id: ProfileTab, children: React.ReactNode) => (
    <div role="tabpanel" id={panelId(id)} aria-labelledby={tabId(id)} hidden={tab !== id} className="pf-panel">
      {children}
    </div>
  );
  return (
    <div className="profile-layout">
      <ProfileHeader />
      <ProfileTabs tab={tab} onTab={go} counts={{ documents, answers: answersCount, knowledge: facts.review.length }} />
      {panel('about', <AboutMe onSeeAllCvs={() => go('documents')} />)}
      {panel('documents', <ProfileDocuments />)}
      {panel('answers', <CommonAnswers />)}
      {panel('knowledge', <KnowledgePanel facts={facts} dispatch={dispatch} />)}
    </div>
  );
}
