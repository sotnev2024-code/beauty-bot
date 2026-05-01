import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { Me } from '@/api';
import type { OnboardingStatus } from '@/api/types';
import { PhoneShell } from '@/components/PhoneShell';
import { readyTelegram } from '@/lib/tg';
import {
  AnalyticsPage,
  AppLayout,
  Calendar,
  ChatDetail,
  ChatList,
  ClientDetailPage,
  ClientsPage,
  Dashboard,
  Paywall,
  PricingPage,
  SchedulePage,
  SettingsPage,
} from '@/pages/app';
import {
  BotAutomationPage,
  BotDisablePage,
  BotFormatPage,
  BotGreetingPage,
  BotHubPage,
  BotKnowledgePage,
  BotServicesPage,
  BotTestPage,
  BotTimezonePage,
  BotVoicePage,
} from '@/pages/bot';
import {
  Address,
  Connect,
  Done,
  Premium,
  Profile,
  Schedule,
  Services,
  Voice,
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

/** Steps in the order the user should complete them. */
const STEP_ROUTES: { key: keyof OnboardingStatus; route: string }[] = [
  { key: 'profile_done', route: '/onboarding/profile' },
  { key: 'address_done', route: '/onboarding/address' },
  { key: 'schedule_done', route: '/onboarding/schedule' },
  { key: 'services_done', route: '/onboarding/services' },
  { key: 'voice_done', route: '/onboarding/voice' },
];

function NeedsOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    Me.onboardingStatus().then(setStatus).catch(() => undefined);
  }, []);

  if (!status) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-mute animate-pulse">Проверяем настройки…</span>
      </div>
    );
  }
  if (!status.complete) {
    const next = STEP_ROUTES.find((s) => !status[s.key]);
    return <Navigate to={next?.route ?? '/onboarding'} replace />;
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
            <Route path="/onboarding/address" element={<Address />} />
            <Route path="/onboarding/schedule" element={<Schedule />} />
            <Route path="/onboarding/services" element={<Services />} />
            <Route path="/onboarding/voice" element={<Voice />} />
            <Route path="/onboarding/connect" element={<Connect />} />
            <Route path="/onboarding/done" element={<Done />} />
            {/* Legacy redirects — bookmarks from the funnel era. */}
            <Route
              path="/onboarding/funnel"
              element={<Navigate to="/onboarding/done" replace />}
            />

            <Route element={<NeedsOnboarding />}>
              <Route element={<AppLayout />}>
                <Route path="/app" element={<DashboardOrPaywall />} />
                <Route path="/app/calendar" element={<Calendar />} />
                <Route path="/app/clients" element={<ClientsPage />} />
                <Route path="/app/clients/:id" element={<ClientDetailPage />} />
                <Route path="/app/chats" element={<ChatList />} />
                <Route path="/app/chats/:id" element={<ChatDetail />} />
                <Route path="/app/settings" element={<SettingsPage />} />
                <Route path="/app/schedule" element={<SchedulePage />} />
                <Route path="/app/analytics" element={<AnalyticsPage />} />
                <Route path="/app/pricing" element={<PricingPage />} />

                <Route path="/app/bot" element={<BotHubPage />} />
                <Route path="/app/bot/greeting" element={<BotGreetingPage />} />
                <Route path="/app/bot/voice" element={<BotVoicePage />} />
                <Route path="/app/bot/format" element={<BotFormatPage />} />
                <Route path="/app/bot/services" element={<BotServicesPage />} />
                <Route path="/app/bot/knowledge" element={<BotKnowledgePage />} />
                <Route path="/app/bot/automation" element={<BotAutomationPage />} />
                <Route path="/app/bot/timezone" element={<BotTimezonePage />} />
                <Route path="/app/bot/test" element={<BotTestPage />} />
                <Route path="/app/bot/disable" element={<BotDisablePage />} />

                {/* Legacy redirects — old routes that have moved into /app/bot. */}
                <Route
                  path="/app/funnels"
                  element={<Navigate to="/app/bot" replace />}
                />
                <Route
                  path="/app/funnels/:id"
                  element={<Navigate to="/app/bot" replace />}
                />
                <Route
                  path="/app/services"
                  element={<Navigate to="/app/bot/services" replace />}
                />
                <Route
                  path="/app/test-chat"
                  element={<Navigate to="/app/bot/test" replace />}
                />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Routes>
      </PhoneShell>
    </BrowserRouter>
  );
}
