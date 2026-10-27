import { useNavigate } from 'react-router-dom';
import { V17CapDart } from '../components/V17CapDart';
import { AppButton } from '../features/dashboard/components/AppButton';

/** Real empty state: nothing is waiting on the owner. */
export function Inbox() {
  const navigate = useNavigate();
  return (
    <main className="box-border flex h-[calc(100vh-var(--app-toolbar-height))] flex-col gap-3.5 px-14 pt-5 pb-[34px]">
      <h1 className="m-0 font-serif text-[42px] leading-[1.02] font-[350] tracking-[-0.025em]">Inbox</h1>
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-line bg-bg p-10 text-center"
        role="status"
      >
        <V17CapDart size={96} />
        <div className="mt-2 font-serif text-[30px] leading-[1.1] font-normal tracking-[-0.015em]">
          Nothing needs you
        </div>
        <div className="max-w-[470px] text-[14px] leading-[1.55] text-muted">
          When an agent needs an answer or an application is ready to review, it shows up here.
        </div>
        <AppButton variant="primary" size="sm" className="mt-2" onClick={() => void navigate('/')}>
          Open Up next
        </AppButton>
      </div>
    </main>
  );
}
