import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';

import { PhoneShell } from '@/components/PhoneShell';
import { readyTelegram } from '@/lib/tg';
import {
  AnalyticsPage,
  AppLayout,
  Calendar,
  ChatDetail,
  ChatList,
  ClientsPage,
  Dashboard,
  FunnelEditor,
  FunnelsPage,
  Paywall,
  PricingPage,
  SchedulePage,
  ServicesPage,
  SettingsPage,
} from '@/pages/app';
import {
  Connect,
  Done,
  Premium,
  Profile,
  Schedule,
  Welcome,
} from '@/pages/onboarding';
import { useMaster } from '@/store/master';

function Bootstrap() {
  const { master, loading, error, fetch } = useMaster();

  useEffect(() => {
    readyTelegram();
    if (!master && !loading && !error) {
      fetch();
    }
  }, [master, loading, error, fetch]);

  if (loading || (!master && !error)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-mute animate-pulse">Загружаем профиль…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="text-sm text-danger">Не получилось загрузить профиль</span>
        <span className="text-xs text-mute">
          Открой Mini App из Telegram, чтобы initData передался серверу.
        </span>
      </div>
    );
  }
  return <Outlet />;
}

function NeedsOnboarding() {
  const { master } = useMaster();
  if (!master) return null;
  // Treat "no name + no niche" as not-yet-onboarded.
  if (!master.name || !master.niche) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

function DashboardOrPaywall() {
  const { master } = useMaster();
  if (!master) return null;
  const now = new Date();
  const trialActive =
    master.trial_ends_at && new Date(master.trial_ends_at) > now;
  const subActive =
    master.subscription_active_until &&
    new Date(master.subscription_active_until) > now;
  if (!trialActive && !subActive) {
    return <Paywall reason="Подписка истекла" />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <PhoneShell>
        <Routes>
          <Route element={<Bootstrap />}>
            <Route path="/onboarding" element={<Welcome />} />
            <Route path="/onboarding/premium" element={<Premium />} />
            <Route path="/onboarding/profile" element={<Profile />} />
            <Route path="/onboarding/schedule" element={<Schedule />} />
            <Route path="/onboarding/connect" element={<Connect />} />
            <Route path="/onboarding/done" element={<Done />} />

            <Route element={<NeedsOnboarding />}>
              <Route element={<AppLayout />}>
                <Route path="/app" element={<DashboardOrPaywall />} />
                <Route path="/app/calendar" element={<Calendar />} />
                <Route path="/app/funnels" element={<FunnelsPage />} />
                <Route path="/app/funnels/:id" element={<FunnelEditor />} />
                <Route path="/app/clients" element={<ClientsPage />} />
                <Route path="/app/chats" element={<ChatList />} />
                <Route path="/app/chats/:id" element={<ChatDetail />} />
                <Route path="/app/settings" element={<SettingsPage />} />
                <Route path="/app/services" element={<ServicesPage />} />
                <Route path="/app/schedule" element={<SchedulePage />} />
                <Route path="/app/analytics" element={<AnalyticsPage />} />
                <Route path="/app/pricing" element={<PricingPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Routes>
      </PhoneShell>
    </BrowserRouter>
  );
}
