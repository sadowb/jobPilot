import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { useTheme } from '../lib/theme';
import { CommandBoxHost, openCommandBox } from '../features/cmdk/CommandBoxHost';
import { Dashboard } from '../pages/Dashboard';
import { Extension } from '../pages/Extension';
import { Inbox } from '../pages/Inbox';
import { ManualControl } from '../pages/ManualControl';
import { Placeholder } from '../pages/Placeholder';

function Shell() {
  useTheme();
  return (
    <div className="app" style={{ minHeight: '100%' }}>
      <TopBar onAsk={openCommandBox} />
      <Outlet />
      <CommandBoxHost />
    </div>
  );
}

// Hash router: the packaged app loads from file://, where history routing breaks.
const router = createHashRouter([
  // Standalone: the extension popup preview has no app shell.
  { path: '/extension', element: <Extension /> },
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/inbox', element: <Inbox /> },
      { path: '/fixes', element: <ManualControl /> },
      { path: '/analytics', element: <Placeholder board="Analytics" files="V17_Analytics" /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
