import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Funnels } from '@/api';
import { Button, Card } from '@/components/ui';
import { useMaster } from '@/store/master';

import { OnboardingShell } from './OnboardingShell';

export function Done() {
  const nav = useNavigate();
  const { master } = useMaster();
  const [busy, setBusy] = useState(false);
  const [funnelSeeded, setFunnelSeeded] = useState(false);

  // Seed a sensible default funnel based on niche.
  useEffect(() => {
    if (!master?.niche || funnelSeeded || busy) return;
    const presetKey = master.niche === 'brows_lashes' ? 'brows_lashes' : 'manicure';
    setBusy(true);
    Funnels.seed(presetKey, true)
      .catch(() => undefined)
      .finally(() => {
        setFunnelSeeded(true);
        setBusy(false);
      });
  }, [master?.niche, funnelSeeded, busy]);

  return (
    <OnboardingShell
      step={5}
      total={5}
      title="Готово"
      subtitle="Бот уже на дежурстве. Можешь зайти в приложение и посмотреть, как он работает."
      footer={
        <Button size="lg" full onClick={() => nav('/app')}>
          Открыть Beauty.dev
        </Button>
      }
    >
      <Card>
        <ul className="flex flex-col gap-2 text-sm text-ink-soft">
          <Item ok>Профиль настроен</Item>
          <Item ok>График сохранён</Item>
          <Item ok>Бот подключён к Business</Item>
          <Item ok={funnelSeeded}>Воронка по нише {funnelSeeded ? 'создана' : '…'}</Item>
        </ul>
      </Card>
    </OnboardingShell>
  );
}

function Item({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success' : 'bg-mute animate-pulse'}`}
      />
      <span>{children}</span>
    </li>
  );
}
