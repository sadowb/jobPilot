import { createHashRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { useTheme } from '../lib/theme';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { Placeholder } from '../pages/Placeholder';
import { ProfilePage } from '../pages/ProfilePage';
import { SettingsPage } from '../pages/SettingsPage';

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
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  // Setup is full screen: no top bar, no pill nav.
  { path: '/welcome', element: <Navigate to="/welcome/1" replace /> },
  { path: '/welcome/:step', element: <OnboardingPage /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
