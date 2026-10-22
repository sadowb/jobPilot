import { Glyph } from './icons';
import { PRESENT, sortCareer, type CareerEntry } from './career';

/** List editor for work history. Entries are re-ordered by date (newest first) when saved. */
export function CareerEditor({
  entries,
  onChange,
}: {
  entries: readonly CareerEntry[];
  onChange: (next: CareerEntry[]) => void;
}) {
  const patch = (id: string, change: Partial<CareerEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...change } : e)));
  return (
    <fieldset className="pf-career">
      <legend>Work history</legend>
      {entries.length === 0 && <p className="pf-empty">No roles yet. Add the ones an application should mention.</p>}
      {entries.map((e, i) => (
        <div className="pf-career-row" key={e.id} role="group" aria-label={`Role ${i + 1}`}>
          <label className="profile-field">
            <span>Role</span>
            <input
              value={e.role}
              maxLength={200}
              placeholder="e.g. Builder, AI agents"
              onChange={(ev) => patch(e.id, { role: ev.target.value })}
            />
          </label>
          <label className="profile-field">
            <span>Organisation</span>
            <input
              value={e.organisation}
              maxLength={200}
              placeholder="e.g. Independent"
              onChange={(ev) => patch(e.id, { organisation: ev.target.value })}
            />
          </label>
          <label className="profile-field">
            <span>Start</span>
            <input type="month" value={e.start} onChange={(ev) => patch(e.id, { start: ev.target.value })} />
          </label>
          <label className="profile-field">
            <span>End</span>
            <input
              type="month"
              value={e.end === PRESENT ? '' : e.end}
              disabled={e.end === PRESENT}
              onChange={(ev) => patch(e.id, { end: ev.target.value })}
            />
          </label>
          <label className="pf-check">
            <input
              type="checkbox"
              checked={e.end === PRESENT}
              onChange={(ev) => patch(e.id, { end: ev.target.checked ? PRESENT : '' })}
            />
            I still work here
          </label>
          <button
            type="button"
            className="btn sm ghost"
            aria-label={`Remove role ${i + 1}`}
            onClick={() => onChange(entries.filter((x) => x.id !== e.id))}
          >
            Remove
          </button>
        </div>
      ))}
      <div className="pf-career-actions">
        <button
          type="button"
          className="btn sm"
          onClick={() =>
            onChange([...entries, { id: crypto.randomUUID(), role: '', organisation: '', start: '', end: PRESENT }])
          }
        >
          <Glyph name="plus" size={14} /> Add a role
        </button>
        {entries.length > 1 && (
          <button type="button" className="btn sm ghost" onClick={() => onChange(sortCareer(entries))}>
            Sort by date
          </button>
        )}
      </div>
    </fieldset>
  );
}
