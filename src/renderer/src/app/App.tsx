import { createHashRouter, Navigate, Outlet, redirect, RouterProvider, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { CommandBoxHost, openCommandBox } from '../features/cmdk/CommandBoxHost';
import { onboardingPending } from '../features/profile/profileStorage';
import { FirstDay } from '../features/onboarding/FirstDay';
import { useSettingsShortcut } from '../features/settings/useSettingsShortcut';
import { useTheme } from '../lib/theme';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { Dashboard } from '../pages/Dashboard';
import { Extension } from '../pages/Extension';
import { Inbox } from '../pages/Inbox';
import { ManualControl } from '../pages/ManualControl';
import { NotFoundPage, RouteErrorPage } from '../pages/NotFoundPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RecoveryPage } from '../pages/RecoveryPage';
import { SettingsPage } from '../pages/SettingsPage';

function Shell() {
  useTheme();
  useSettingsShortcut();
  const navigate = useNavigate();
  return (
    <div className="relative min-h-full bg-ground font-sans text-[15px] leading-[1.45] text-ink antialiased">
      <TopBar onAsk={openCommandBox} onSettings={() => void navigate('/settings')} />
      <Outlet />
      <CommandBoxHost />
    </div>
  );
}

// Hash router: the packaged app is a single document, so history routing is not an option.
const router = createHashRouter([
  { path: '/recovery', element: <RecoveryPage />, errorElement: <RouteErrorPage /> },
  // Standalone: the extension popup preview has no app shell.
  { path: '/extension', element: <Extension />, errorElement: <RouteErrorPage /> },
  {
    element: <Shell />,
    // Every app route waits for setup. The loader runs whenever the shell is entered (launch, typed hash, leaving /welcome), so no hash skips it.
    loader: () => (onboardingPending() ? redirect('/welcome/1') : null),
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/first-day', element: <FirstDay /> },
      { path: '/inbox', element: <Inbox /> },
      { path: '/fixes', element: <ManualControl /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Setup is full screen: no top bar, no pill nav.
  { path: '/welcome', element: <Navigate to="/welcome/1" replace /> },
  { path: '/welcome/:step', element: <OnboardingPage />, errorElement: <RouteErrorPage /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
