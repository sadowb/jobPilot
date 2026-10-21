import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { useTheme } from '../lib/theme';
import { Placeholder } from '../pages/Placeholder';

function Shell() {
  useTheme();
  return (
    <div className="app" style={{ minHeight: '100%' }}>
      <TopBar />
      <Outlet />
    </div>
  );
}

// Hash router: the packaged app loads from file://, where history routing breaks.
const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Placeholder board="Dashboard · Applied" files="V17_Dash_Applied" /> },
      { path: '/inbox', element: <Placeholder board="Inbox" files="V17_Inbox" /> },
      { path: '/analytics', element: <Placeholder board="Analytics" files="V17_Analytics" /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
