import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExtensionPopup, SentCard } from '../features/dashboard/extension/ExtensionPopup';
import { FauxBrowser } from '../features/dashboard/extension/FauxBrowser';
import { SAMPLE_SCAN } from '../features/dashboard/extension/model';
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
    <div className="app" style={{ minHeight: '100%' }}>
      <div className="native-preview-titlebar">JobPilot · Extension preview</div>
      <div
        style={{
          padding: '28px 40px 40px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div className="row sp nw" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="eyebrow">V17 · extension</div>
            <h1 className="h1" style={{ fontSize: 40, marginTop: 6 }}>
              Tick what fits, <span className="it">send it in one click.</span>
            </h1>
          </div>
          <div className="s" style={{ maxWidth: 380, fontSize: 13, lineHeight: 1.5 }}>
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
        <div className="row nw" style={{ gap: 20, alignItems: 'stretch' }}>
          <div className="mcell" style={{ flex: 1, minWidth: 0, gap: 12 }}>
            <span className="spec" style={{ letterSpacing: '.06em' }}>
              State 1 · choose
            </span>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35 }}>
              Only ticked links are sent. The popup reads the links, not the page.
            </div>
            <div className="s" style={{ lineHeight: 1.6, fontSize: 13 }}>
              Dedupe runs on the server:{' '}
              <code style={{ fontFamily: 'monospace', fontSize: '1em', lineHeight: 1 }}>POST /capture/batch</code>{' '}
              returns added, duplicate, applied or error per URL. Jobs you’ve applied to show their date and can’t be
              ticked. “Match my roles” is an optional Haiku pass on titles against your preferences, off by default.
            </div>
          </div>
          <div style={{ width: 470, flex: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="spec" style={{ letterSpacing: '.06em' }}>
              State 2 · sent
            </span>
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
