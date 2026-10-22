import { V17X } from '../shared-ui';
import { CREW_MAX, CREW_MIN, CREW_TICKS, clampCrew, crewPercent, tickTransform } from './model';

/** Crew-size slider drawn as on the board. A transparent native range input sits on top for drag, keyboard and a11y. */
export function CrewSlider({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const pct = crewPercent(value);
  return (
    <div>
      <div className="relative mt-1 h-6">
        <div className="absolute inset-x-0 top-[9px] h-1.5 rounded-full bg-line" />
        <div className="absolute top-[9px] left-0 h-1.5 rounded-full bg-brand" style={{ width: `${pct.toFixed(2)}%` }} />
        <div
          className="absolute top-px size-[22px] rounded-full border-2 border-brand bg-bg shadow-float"
          style={{ left: `calc(${pct.toFixed(2)}% - 11px)` }}
        />
        <input
          type="range"
          aria-label="Crew size"
          min={CREW_MIN}
          max={CREW_MAX}
          step={1}
          value={value}
          onChange={(e) => onChange(clampCrew(Number(e.target.value)))}
          className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
        />
      </div>
      <div className={`${V17X} relative mt-2 h-3.5`} aria-hidden="true">
        {CREW_TICKS.map((t) => (
          <span
            key={t}
            className="absolute top-0"
            style={{ left: `${crewPercent(t).toFixed(2)}%`, transform: tickTransform(t) }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
