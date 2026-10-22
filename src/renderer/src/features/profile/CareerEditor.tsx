import { Field, Input } from '../../components/ui';
import { PButton } from './buttons';
import { Glyph } from './icons';
import { PRESENT, sortCareer, type CareerEntry } from './career';
import { emptyText } from './styles';

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
    <fieldset className="mb-6 min-w-0 border-0 p-0">
      <legend className="mb-3 p-0 text-[13px] font-semibold">Work history</legend>
      {entries.length === 0 && <p className={emptyText}>No roles yet. Add the ones an application should mention.</p>}
      {entries.map((e, i) => (
        <div
          className="grid grid-cols-2 items-end gap-x-4 gap-y-3 border-t border-line py-3.5"
          key={e.id}
          role="group"
          aria-label={`Role ${i + 1}`}
        >
          <Field label="Role">
            <Input
              value={e.role}
              maxLength={200}
              placeholder="e.g. Builder, AI agents"
              onChange={(ev) => patch(e.id, { role: ev.target.value })}
            />
          </Field>
          <Field label="Organisation">
            <Input
              value={e.organisation}
              maxLength={200}
              placeholder="e.g. Independent"
              onChange={(ev) => patch(e.id, { organisation: ev.target.value })}
            />
          </Field>
          <Field label="Start">
            <Input type="month" value={e.start} onChange={(ev) => patch(e.id, { start: ev.target.value })} />
          </Field>
          <Field label="End">
            <Input
              type="month"
              value={e.end === PRESENT ? '' : e.end}
              disabled={e.end === PRESENT}
              onChange={(ev) => patch(e.id, { end: ev.target.value })}
            />
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={e.end === PRESENT}
              onChange={(ev) => patch(e.id, { end: ev.target.checked ? PRESENT : '' })}
            />
            I still work here
          </label>
          <PButton
            variant="ghost"
            className="justify-self-end"
            aria-label={`Remove role ${i + 1}`}
            onClick={() => onChange(entries.filter((x) => x.id !== e.id))}
          >
            Remove
          </PButton>
        </div>
      ))}
      <div className="flex gap-2 border-t border-line pt-3">
        <PButton
          className="gap-1.5!"
          onClick={() =>
            onChange([...entries, { id: crypto.randomUUID(), role: '', organisation: '', start: '', end: PRESENT }])
          }
        >
          <Glyph name="plus" size={14} /> Add a role
        </PButton>
        {entries.length > 1 && (
          <PButton variant="ghost" className="gap-1.5!" onClick={() => onChange(sortCareer(entries))}>
            Sort by date
          </PButton>
        )}
      </div>
    </fieldset>
  );
}
