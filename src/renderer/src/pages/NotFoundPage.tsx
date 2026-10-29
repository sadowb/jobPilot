import { Link } from 'react-router-dom';

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-[480px] flex-col items-center justify-center gap-4 bg-ground p-10 text-center text-ink">
      <h1 className="font-serif text-[42px]">{title}</h1>
      <p className="text-muted">{body}</p>
      <Link to="/" replace className="font-semibold text-ink underline underline-offset-4">
        Back to dashboard
      </Link>
    </main>
  );
}

/** Catch-all route: any hash that matches nothing. */
export const NotFoundPage = () => <Notice title="Page not found" body="That page does not exist." />;

/** Router errorElement: replaces React Router's developer error page if a route fails to render. */
export const RouteErrorPage = () => (
  <Notice title="Something went wrong" body="This screen failed to load. Your data is not affected." />
);
