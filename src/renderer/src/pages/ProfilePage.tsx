import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AboutMe } from '../features/profile/AboutMe';
import { ProfileMain, useProfileFacts } from '../features/profile/ProfileMain';
import { ProfileSidebar } from '../features/profile/ProfileSidebar';
import '../features/profile/profile.css';

/** Profile sections stay mounted so switching between documents and details preserves unsaved edits. */
export function ProfilePage() {
  const [params, setParams] = useSearchParams();
  const section = params.get('section') === 'documents' ? 'documents' : 'about';
  const [facts, dispatch] = useProfileFacts();
  const knowledge = useRef<HTMLElement>(null);
  const go = (next: 'about' | 'documents') => setParams(next === 'documents' ? { section: 'documents' } : {});
  const scrollTo = (next: 'about' | 'documents', id: string) => {
    go(next);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  };
  return (
    <div className="profile-layout">
      <ProfileSidebar
        section={section}
        onSection={go}
        onAnswers={() => scrollTo('about', 'common-answers')}
        knowledgeCount={facts.review.length}
        onKnowledge={() => scrollTo('documents', 'agent-knowledge')}
      />
      <div className="profile-main-wrap">
        <main className="profile-about" hidden={section !== 'about'}>
          <header className="profile-page-heading">
            <div className="v17x">Profile & documents · About me</div>
            <h1 className="h1">
              The person behind <span className="it">every application.</span>
            </h1>
            <p>Your details, ready when a form asks. Edit a section to make a change.</p>
          </header>
          <AboutMe />
        </main>
        <div hidden={section !== 'documents'}>
          <ProfileMain facts={facts} dispatch={dispatch} knowledgeRef={knowledge} />
        </div>
      </div>
    </div>
  );
}
