/** Screens not ported yet. Each names the V17 board that is its acceptance test. */
export function Placeholder({ board, files }: { board: string; files: string }) {
  return (
    <main style={{ padding: '20px 56px' }}>
      <div className="eyebrow">Not ported yet</div>
      <h1 className="h1" style={{ margin: '8px 0' }}>
        {board}
      </h1>
      <p className="s">
        Spec: <code style={{ fontFamily: 'var(--mono)' }}>design/v17/boards/{files}_L|_D.dc.html</code>
      </p>
    </main>
  );
}
