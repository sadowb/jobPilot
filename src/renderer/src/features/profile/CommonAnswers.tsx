import { useState } from 'react';
import { V17Icon } from '../../components/V17Icon';
import { ANSWERS_KEY, readAnswers } from './personal';
import { useSavedDraft } from './useSavedDraft';
import { ProfileEditor } from './ProfileEditor';

export function CommonAnswers() {
  const { draft, setDraft, dirty, save, cancel, message, error } = useSavedDraft(ANSWERS_KEY, readAnswers);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const current = draft.find((a) => a.id === editing);
  const shown = draft.filter((a) => `${a.question} ${a.answer}`.toLowerCase().includes(query.toLowerCase()));
  const close = () => {
    cancel();
    setEditing(null);
  };
  return (
    <section className="profile-card profile-questions" id="common-answers" aria-labelledby="answers-title">
      <div className="profile-card-heading">
        <div>
          <h2 id="answers-title">
            Common answers <span className="profile-question-count">{draft.length}</span>
          </h2>
          <p>The questions that come up again. Write an answer once, keep it here.</p>
        </div>
        <button
          className="btn sm"
          type="button"
          onClick={() => {
            const id = crypto.randomUUID();
            setDraft((all) => [...all, { id, question: '', answer: '' }]);
            setEditing(id);
          }}
        >
          <V17Icon name="plus" /> Add answer
        </button>
      </div>
      <label className="profile-search">
        <V17Icon name="search" />
        <span className="sr-only">Search common answers</span>
        <input
          type="search"
          placeholder="Search saved answers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="profile-answer-list">
        {shown.map((a) => (
          <div className="profile-answer-summary" key={a.id}>
            <div>
              <strong>{a.question || 'New question'}</strong>
              <p className={a.answer ? '' : 'profile-missing'}>{a.answer || 'No answer saved'}</p>
            </div>
            <button
              className="btn sm ghost ic"
              type="button"
              aria-label={`Edit answer: ${a.question}`}
              onClick={() => setEditing(a.id)}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      {!shown.length && <p className="s">{query ? 'No matching answers.' : 'Add your first answer.'}</p>}
      <div className="profile-answers-meta">
        <span>
          {draft.filter((a) => a.answer.trim()).length} answered · {draft.length} questions
        </span>
        <span role="status">{error || message || 'Saved on this device'}</span>
      </div>
      {current && (
        <ProfileEditor
          title="Edit answer"
          description="Keep it in your own words. You can change this at any time."
          dirty={dirty}
          error={error}
          onCancel={close}
          onSave={() => {
            if (save()) setEditing(null);
          }}
        >
          <div className="profile-fields">
            <label className="profile-field profile-wide">
              <span>Question</span>
              <input
                required
                pattern=".*\S.*"
                value={current.question}
                maxLength={500}
                onChange={(e) =>
                  setDraft((all) => all.map((a) => (a.id === current.id ? { ...a, question: e.target.value } : a)))
                }
              />
            </label>
            <label className="profile-field profile-wide">
              <span>Answer</span>
              <textarea
                rows={7}
                value={current.answer}
                maxLength={10000}
                placeholder="Your answer…"
                onChange={(e) =>
                  setDraft((all) => all.map((a) => (a.id === current.id ? { ...a, answer: e.target.value } : a)))
                }
              />
            </label>
          </div>
          <button
            className="btn sm neg profile-delete-answer"
            type="button"
            onClick={() => {
              if (save(draft.filter((a) => a.id !== current.id))) setEditing(null);
            }}
          >
            Remove question
          </button>
        </ProfileEditor>
      )}
    </section>
  );
}
