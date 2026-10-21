const ITEMS = [
  { id: 'about', label: 'About me', count: 42 },
  { id: 'documents', label: 'Documents', count: 5 },
] as const;

/** Section list of the Profile screen. Only Documents (with its agent-knowledge panel) has a V17 board. */
export function ProfileSidebar({ knowledgeCount, onKnowledge }: { knowledgeCount: number; onKnowledge: () => void }) {
  const item = (active: boolean) =>
    ({
      minHeight: 44,
      padding: '0 14px',
      borderRadius: 12,
      fontSize: 14,
      fontWeight: active ? 650 : 500,
      color: active ? 'var(--ink)' : 'var(--ink-2)',
      background: active ? 'var(--hover)' : 'transparent',
      border: 0,
      width: '100%',
      textAlign: 'left',
    }) as const;
  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        padding: '36px 24px 36px 40px',
        boxSizing: 'border-box',
        borderRight: '1px solid var(--line)',
        minWidth: 0,
      }}
    >
      <div className="row nw" style={{ gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            flex: 'none',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 18,
            background: 'var(--brand-tint)',
            color: 'var(--brand-text)',
          }}
        >
          AM
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 650, fontSize: 15 }}>Abdelhadi Marjane</div>
          <div className="s" style={{ fontSize: 13 }}>
            CS · Al Akhawayn · synced today
          </div>
        </div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }} aria-label="Profile sections">
        {ITEMS.map((i) => (
          <button
            key={i.id}
            type="button"
            className="row sp nw"
            aria-current={i.id === 'documents' ? 'page' : undefined}
            disabled={i.id === 'about'}
            title={i.id === 'about' ? 'No V17 board for this section yet' : undefined}
            style={item(i.id === 'documents')}
          >
            <span>{i.label}</span>
            <span className="s" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              {i.count}
            </span>
          </button>
        ))}
        <button type="button" className="row sp nw" onClick={onKnowledge} style={item(false)}>
          <span>What the agents know</span>
          <span className="s" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
            {knowledgeCount}
          </span>
        </button>
      </nav>
      <div className="s" style={{ fontSize: 13, lineHeight: 1.55, marginTop: 'auto' }}>
        Cap reads this on every turn. Each application sends only what its form asks for.
      </div>
    </aside>
  );
}
