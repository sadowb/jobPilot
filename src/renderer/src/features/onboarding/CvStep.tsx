import { CapDartArt } from '../../components/CapDartArt';
import { Button, Eyebrow, cn } from '../../components/ui';
import { cssVars } from '../../lib/css-vars';
import { A_BAR, A_RISE, GoButton, S, SPEC } from '../shared-ui';
import { CV_FIELDS, CV_FILE } from './data';
import { OnboardingFrame, StepHeading } from './OnboardingFrame';
import { nextPath } from './steps';

const PENCIL = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </svg>
);

const THUMB_LINES = ['w-[90%]', 'w-[70%]', 'w-[84%]', 'w-[56%]', 'w-[80%]', 'w-[88%]', 'w-[62%]'];

/** The CV thumbnail is always white paper, in both themes (it depicts a document). */
function PaperThumb() {
  return (
    <div className="flex h-[118px] w-[92px] flex-none flex-col gap-1.5 rounded-[9px] border border-line-2 bg-[rgb(255_255_255)] px-2.5 py-3 shadow-[0_6px_18px_color-mix(in_srgb,var(--ink)_12%,transparent)]">
      {THUMB_LINES.map((w, i) => (
        <i key={i} className={cn('block h-1 rounded-xs bg-[rgb(17_17_17/0.22)]', w)} />
      ))}
    </div>
  );
}

export function CvStep() {
  return (
    <OnboardingFrame step={2} minHeight={822}>
      <StepHeading
        eyebrow="Step 2 · Your CV"
        lead="Drop your CV."
        tail="I’ll read it, so you never retype it."
        lede="PDF or DOCX. Every field I find can be checked, and answers update when it changes."
      />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8">
        <div className="min-h-0">
          <div className="flex h-full flex-col items-center justify-center gap-[18px] rounded-[28px] border-2 border-dashed border-line-2 bg-panel p-8 text-center">
            <PaperThumb />
            <div className="flex flex-col items-center gap-2">
              <div className="text-[24px] font-semibold tracking-[-0.02em]">{CV_FILE.name}</div>
              <div className="flex items-center gap-2 text-[14px] font-semibold text-brand-text">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
                <span>
                  Read · {CV_FILE.pages} page · {CV_FILE.sizeKb} KB
                </span>
              </div>
            </div>
            {/* `.btn.ghost` never had a hover fill, unlike the primitive's ghost variant. */}
            <Button variant="ghost" size="sm" className="cursor-pointer hover:bg-transparent! text-[13.5px]!">
              Replace file
            </Button>
            <div className={cn(S, 'text-[13px]')}>Dropping another file replaces this one.</div>
          </div>
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-line bg-bg">
          <div className="flex flex-none items-center justify-between gap-4 px-[26px] pt-[18px] pb-3.5">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid size-[52px] flex-none place-items-center rounded-[14px] bg-brand-tint">
                <CapDartArt size={40} />
              </span>
              <div className="min-w-0">
                <Eyebrow>Cap is reading</Eyebrow>
                <div className="mt-0.5 text-[19px] font-semibold">{CV_FILE.name}</div>
              </div>
            </div>
            <span className={cn(SPEC, 'flex-none text-muted tracking-[0.02em]!')}>{CV_FIELDS.length} fields found</span>
          </div>
          <div className="mx-[26px] h-1 flex-none overflow-hidden rounded-[9px] bg-line">
            <div className={cn('h-1 bg-brand [--d:.1s] [--dur:1s]', A_BAR)} />
          </div>
          <div className="flex min-h-0 flex-[1_1_auto] flex-col pb-1">
            {CV_FIELDS.map((f) => (
              <div
                key={f.label}
                className={cn(
                  'grid flex-none grid-cols-[120px_minmax(0,1fr)_20px] items-center gap-3.5 border-t border-line px-[26px] py-[7px]',
                  A_RISE,
                )}
                // Stagger delay comes from the sample data.
                style={cssVars({ '--d': `${f.delay}s` })}
              >
                <span className={cn(SPEC, 'text-muted tracking-[0.02em]!')}>{f.label}</span>
                <div className="min-w-0 text-[15.5px] leading-[1.45]">
                  {f.chips ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {f.chips.map((c) => (
                        <span key={c} className="rounded-full border border-line px-2.5 py-1 text-[13px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <>
                      {f.value}
                      {f.secondary && (
                        <>
                          <br />
                          <span className={cn(S, 'text-[13.5px]')}>{f.secondary}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
                <span className="grid text-muted">{PENCIL}</span>
              </div>
            ))}
          </div>
          <div
            className={cn(
              'flex flex-none flex-col gap-2.5 border-t border-line bg-panel px-[26px] pt-3.5 pb-[18px] [--d:0s]',
              A_RISE,
            )}
          >
            <div>
              <b className="text-[18px]">Looks right?</b>
              <div className={cn(S, 'text-[13.5px]')}>
                Every field can be changed. Fix one and I re-check the forms that use it.
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <GoButton
                to={nextPath(2)}
                variant="primary"
                size="sm"
                className="min-h-11! px-[22px]! text-[13.5px]! text-on-pri!"
              >
                Looks right
              </GoButton>
              <Button size="sm" className="min-h-11! cursor-pointer px-5! text-[13.5px]!">
                Edit fields
              </Button>
            </div>
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
