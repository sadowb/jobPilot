import { CREW_MAX, CREW_MIN, CREW_TICKS, clampCrew, crewPercent, tickTransform } from './model';

/** Crew-size slider drawn as on the board. A transparent native range input sits on top for drag, keyboard and a11y. */
export function CrewSlider({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const pct = crewPercent(value);
  return (
    <div>
      <div style={{ position: 'relative', height: 24, marginTop: 4 }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 9,
            height: 6,
            borderRadius: 99,
            background: 'var(--line)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${pct.toFixed(2)}%`,
            top: 9,
            height: 6,
            borderRadius: 99,
            background: 'var(--brand)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${pct.toFixed(2)}% - 11px)`,
            top: 1,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--bg)',
            border: '2px solid var(--brand)',
            boxShadow: 'var(--float)',
          }}
        />
        <input
          type="range"
          aria-label="Crew size"
          min={CREW_MIN}
          max={CREW_MAX}
          step={1}
          value={value}
          onChange={(e) => onChange(clampCrew(Number(e.target.value)))}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>
      <div className="v17x" style={{ position: 'relative', height: 14, marginTop: 8 }} aria-hidden="true">
        {CREW_TICKS.map((t) => (
          <span
            key={t}
            style={{ position: 'absolute', left: `${crewPercent(t).toFixed(2)}%`, transform: tickTransform(t), top: 0 }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
