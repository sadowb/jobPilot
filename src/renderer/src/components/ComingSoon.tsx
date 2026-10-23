export function ComingSoon({ title, arrival }: { title: string; arrival: string }) {
  return (
    <main className="flex min-h-[480px] flex-col items-center justify-center gap-4 bg-ground p-10 text-center text-ink">
      <h1 className="font-serif text-[42px]">{title}</h1>
      <p className="text-muted">Arrives with {arrival}.</p>
    </main>
  );
}
