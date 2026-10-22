import { useEffect, useRef, useState } from 'react';
import { AppButton } from './AppButton';
import { Eyebrow, cx } from '../../../components/ui';
import { SegTabs } from './TabSwitch';
import { V17Kbd } from '../../../components/V17Kbd';
import { PAPER_PALETTE } from '../../../components/V17MiniPaper';
import type { CvLine, SentCv } from '../cv';

const bodyLine = 'relative text-[12.5px] leading-[1.55] text-ink-2';
const metaLabel = 'border-t border-line py-2 font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase';
const metaValue = 'border-t border-line py-2';

function Line({ line, view, nested }: { line: CvLine; view: 'sent' | 'current'; nested: boolean }) {
  const text = view === 'current' && line.currentText ? line.currentText : line.text;
  const changed = Boolean(line.currentText);
  if (!changed) {
    return <div className={cx(bodyLine, nested && 'mt-[3px]')}>{text}</div>;
  }
  const inner = (
    <div className={bodyLine}>
      <i className="absolute top-[3px] bottom-[3px] -left-[22px] w-[3px] rounded-xs bg-brand" />
      {text}
    </div>
  );
  return nested ? <div className="mt-[3px]">{inner}</div> : inner;
}

/**
 * Full-size view of the exact CV a job received (modal over the dashboard). Esc closes it; focus moves in
 * on open and returns to the opener on close. The "Current version" toggle shows today's CV for comparison.
 */
export function CvViewerDialog({ company, cv, onClose }: { company: string; cv: SentCv; onClose: () => void }) {
  const [view, setView] = useState<'sent' | 'current'>('sent');
  const dialogRef = useRef<HTMLDivElement>(null);
  const diff = cv.changes;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => opener?.focus();
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-20 animate-jp-cv-fade bg-[rgb(20_33_27_/_0.25)] backdrop-blur-[8px] motion-reduce:animate-none dark:bg-black/45 [[data-platform=darwin]_&]:!top-[var(--app-toolbar-height)]"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="fixed inset-x-12 inset-y-10 z-30 flex animate-jp-cv-in flex-col motion-reduce:animate-none overflow-hidden rounded-3xl border border-line bg-bg shadow-float [[data-platform=darwin]_&]:!top-[calc(var(--app-toolbar-height)+16px)]"
        role="dialog"
        aria-modal="true"
        aria-label="CV viewer, sent version"
        onKeyDown={(e) => {
          // Keep Tab inside the dialog.
          if (e.key !== 'Tab') return;
          const focusable = e.currentTarget.querySelectorAll<HTMLElement>(
            'button, [href], [tabindex]:not([tabindex="-1"])',
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="flex flex-none flex-nowrap items-center justify-between gap-3 border-b border-line py-3.5 pr-[22px] pl-[26px]">
          <div className="flex min-w-0 flex-nowrap items-center gap-3">
            <span className="font-mono text-[11.5px] tracking-[0.06em] text-muted uppercase">CV · full size</span>
            <span className="text-[13px] text-muted">The exact file {company} received · 1 page</span>
          </div>
          <div className="flex flex-nowrap items-center gap-2.5">
            <span className="flex flex-nowrap items-center gap-1.5 text-[12px] text-muted">
              <V17Kbd>Esc</V17Kbd>
              <span>to close</span>
            </span>
            <AppButton data-autofocus size="sm" onClick={onClose}>
              Close
            </AppButton>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative grid min-w-0 place-items-center overflow-hidden bg-panel">
            <div className="absolute top-4 left-6 flex flex-nowrap items-center gap-2.5 text-[12px] text-muted">
              <span>Page 1 of 1</span>
              <span>·</span>
              <span>Fit page · 90%</span>
            </div>
            <div className="origin-center scale-90">
              <div
                className={`relative box-border h-[780px] w-[580px] overflow-hidden rounded-[4px] border border-line bg-bg px-[52px] pt-11 pb-9 font-sans text-ink shadow-float ${PAPER_PALETTE}`}
              >
                <div className="font-serif text-[40px] leading-none tracking-[-0.015em]">{cv.document.name}</div>
                <div className="mt-2.5 text-[12px] text-ink-2">{cv.document.headline}</div>
                {cv.document.sections.map((section) => (
                  <div key={section.heading}>
                    <div className="mt-[22px] mb-2.5 border-b border-line pb-1.5 font-mono text-[10.5px] tracking-[0.12em] text-muted uppercase">
                      {section.heading}
                    </div>
                    {section.entries?.map((entry) => (
                      <div key={entry.title} className="relative mb-2.5">
                        <div className="flex flex-nowrap items-baseline justify-between gap-3">
                          <span className="text-[13px] font-semibold text-ink">{entry.title}</span>
                          <span className="text-[11.5px] whitespace-nowrap text-muted">{entry.when}</span>
                        </div>
                        {entry.lines.map((l) => (
                          <Line key={l.text} line={l} view={view} nested />
                        ))}
                      </div>
                    ))}
                    {section.lines?.map((l) => (
                      <Line key={l.text} line={l} view={view} nested={false} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-col gap-[18px] overflow-hidden border-l border-line p-[26px]">
            <div>
              <Eyebrow className="mb-2">Sent to {company}</Eyebrow>
              <h2 className="m-0 font-serif text-[34px] leading-[1.05] font-normal tracking-[-0.015em]">
                {cv.fileName}
              </h2>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-4 text-[13px]">
              <div className={metaLabel}>Sent</div>
              <div className={metaValue}>{cv.sentAt}</div>
              <div className={metaLabel}>Job</div>
              <div className={metaValue}>{cv.jobTitle}</div>
              <div className={metaLabel}>File</div>
              <div className={metaValue}>{cv.fileMeta}</div>
              <div className={metaLabel}>Checksum</div>
              <div className={metaValue}>{cv.checksum}</div>
            </div>
            <SegTabs
              label="CV version"
              active={view}
              onChange={setView}
              className="flex-none self-start"
              tabs={[
                { key: 'sent', label: 'Sent version' },
                { key: 'current', label: 'Current version' },
              ]}
            />
            {diff.length > 0 && (
              <div className="flex flex-col gap-2.5 rounded-[18px] bg-brand-tint px-[18px] py-4 text-[14px] text-ink-2 shadow-[inset_3px_0_0_var(--brand)]">
                <div className="text-[14px] font-semibold text-ink">
                  Your current CV differs in {diff.length} {diff.length === 1 ? 'line' : 'lines'}
                </div>
                <div className="font-mono text-[12px] leading-[1.7] text-ink-2">
                  {diff.map((note) => (
                    <div key={note}>
                      <span className="text-brand-text">+</span>
                      {` ${note}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-[12.5px] leading-[1.55] text-muted">
              Locked at submit. This is the file {company} received. Your edits apply to future applications only.
            </div>
            <div className="mt-auto flex flex-nowrap items-center gap-2">
              <AppButton variant="primary" className="min-w-0 flex-1">
                Download PDF
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
