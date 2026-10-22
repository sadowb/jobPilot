import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExtensionPopup, SentCard } from '../features/dashboard/extension/ExtensionPopup';
import { FauxBrowser } from '../features/dashboard/extension/FauxBrowser';
import { SAMPLE_SCAN } from '../features/dashboard/extension/model';
import { Eyebrow } from '../components/ui';
import { useTheme } from '../lib/theme';

/**
 * Extension popup preview (route `/extension`, no app shell): a mock careers page with the popup open,
 * the way the browser extension looks on a job board. Standalone: it is a design surface for the popup,
 * not part of the desktop app's navigation.
 */
export function Extension() {
  useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  return (
    <div className="relative min-h-full bg-ground font-sans text-[15px] text-ink">
      <div className="hidden [[data-platform=darwin]_&]:flex sticky top-0 z-[1] h-[var(--app-toolbar-height)] items-center justify-center bg-ground font-sans text-[12px] leading-normal text-muted select-none [-webkit-app-region:drag] [app-region:drag]">
        JobPilot · Extension preview
      </div>
      <div className="box-border flex flex-col gap-[18px] px-10 pt-7 pb-10">
        <div className="flex flex-nowrap items-end justify-between gap-3">
          <div>
            <Eyebrow>V17 · extension</Eyebrow>
            <h1 className="mt-1.5 mb-0 font-serif text-[40px] leading-[1.02] font-[350] tracking-[-0.025em]">
              Tick what fits,{' '}
              <span className="font-serif text-[1em] font-light tracking-[-0.01em] italic">send it in one click.</span>
            </h1>
          </div>
          <div className="max-w-[380px] text-[13px] leading-normal text-muted">
            On any job board the popup finds every job link on the page. Nothing is sent until you press Send.
          </div>
        </div>
        <FauxBrowser badge={SAMPLE_SCAN.total} popupOpen={open} onTogglePopup={() => setOpen((o) => !o)}>
          {open && (
            <ExtensionPopup
              scan={SAMPLE_SCAN}
              onClose={() => setOpen(false)}
              onSend={() => undefined}
              onSeeUpNext={() => navigate('/?tab=up-next')}
            />
          )}
        </FauxBrowser>
        <div className="flex flex-nowrap items-stretch gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-3xl border border-line bg-bg p-6">
            <span className="font-mono text-[11.5px] tracking-[0.06em] text-muted">State 1 · choose</span>
            <div className="text-[16px] leading-[1.35] font-semibold">
              Only ticked links are sent. The popup reads the links, not the page.
            </div>
            <div className="text-[13px] leading-[1.6] text-muted">
              Dedupe runs on the server:{' '}
              <code className="text-[1em] leading-none [font-family:monospace]">POST /capture/batch</code> returns
              added, duplicate, applied or error per URL. Jobs you’ve applied to show their date and can’t be ticked.
              “Match my roles” is an optional Haiku pass on titles against your preferences, off by default.
            </div>
          </div>
          <div className="flex w-[470px] flex-none flex-col gap-3">
            <span className="font-mono text-[11.5px] tracking-[0.06em] text-muted">State 2 · sent</span>
            <SentCard
              titles={['Backend Engineer, Early Career', 'Data Engineer, New Grad', 'Software Engineer, Payments']}
              onSeeUpNext={() => navigate('/?tab=up-next')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
