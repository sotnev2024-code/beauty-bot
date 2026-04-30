import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Me } from '@/api';
import type { OnboardingStatus } from '@/api/types';
import { Button, Card } from '@/components/ui';

import { OnboardingShell } from './OnboardingShell';

export function Done() {
  const nav = useNavigate();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    Me.onboardingStatus().then(setStatus).catch(() => undefined);
  }, []);

  return (
    <OnboardingShell
      step={8}
      total={8}
      title="Всё готово"
      subtitle="Можешь открыть приложение или сразу попробовать как бот ответит — у нас есть тестовый чат."
      footer={
        <>
          <Button size="lg" full onClick={() => nav('/app/bot/test')}>
            Попробовать тестовый чат
          </Button>
          <Button size="lg" variant="secondary" full onClick={() => nav('/app')}>
            Открыть Beauty.dev
          </Button>
        </>
      }
    >
      <Card>
        <ul className="flex flex-col gap-2 text-sm text-ink-soft">
          <Item ok={status?.profile_done}>Профиль</Item>
          <Item ok={status?.address_done}>Адрес</Item>
          <Item ok={status?.schedule_done}>График</Item>
          <Item ok={status?.services_done}>Услуги</Item>
          <Item ok={status?.business_connected}>Telegram Business</Item>
        </ul>
      </Card>
    </OnboardingShell>
  );
}

function Item({ ok, children }: { ok: boolean | undefined; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`w-2 h-2 rounded-full ${ok ? 'bg-success' : 'bg-mute animate-pulse'}`}
      />
      <span className={ok ? 'text-ink' : 'text-mute'}>{children}</span>
    </li>
  );
}
