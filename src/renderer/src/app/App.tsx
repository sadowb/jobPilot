import { createHashRouter, Navigate, Outlet, RouterProvider, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { CommandBoxHost, openCommandBox } from '../features/cmdk/CommandBoxHost';
import { FirstDay } from '../features/onboarding/FirstDay';
import { useSettingsShortcut } from '../features/settings/useSettingsShortcut';
import { useTheme } from '../lib/theme';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { Dashboard } from '../pages/Dashboard';
import { Extension } from '../pages/Extension';
import { Inbox } from '../pages/Inbox';
import { ManualControl } from '../pages/ManualControl';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SettingsPage } from '../pages/SettingsPage';

function Shell() {
  useTheme();
  useSettingsShortcut();
  const navigate = useNavigate();
  return (
    <div className="app" style={{ minHeight: '100%' }}>
      <TopBar onAsk={openCommandBox} onSettings={() => void navigate('/settings')} />
      <Outlet />
      <CommandBoxHost />
    </div>
  );
}

// Hash router: the packaged app is a single document, so history routing is not an option.
const router = createHashRouter([
  // Standalone: the extension popup preview has no app shell.
  { path: '/extension', element: <Extension /> },
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/first-day', element: <FirstDay /> },
      { path: '/inbox', element: <Inbox /> },
      { path: '/fixes', element: <ManualControl /> },
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
