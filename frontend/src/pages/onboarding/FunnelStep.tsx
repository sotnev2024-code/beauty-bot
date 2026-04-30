import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Funnels } from '@/api';
import type { FunnelPresetSummary, FunnelSummary } from '@/api/types';
import { Button, Card } from '@/components/ui';

import { OnboardingShell } from './OnboardingShell';

export function FunnelStep() {
  const nav = useNavigate();
  const [presets, setPresets] = useState<FunnelPresetSummary[]>([]);
  const [funnels, setFunnels] = useState<FunnelSummary[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () =>
    Promise.all([
      Funnels.presets().then(setPresets),
      Funnels.list().then(setFunnels),
    ]).catch(() => undefined);

  useEffect(() => {
    refresh();
  }, []);

  const seed = async (key: string) => {
    setBusy(key);
    try {
      await Funnels.seed(key, true);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const hasActive = funnels.some((f) => f.is_active);

  return (
    <OnboardingShell
      step={6}
      total={8}
      title="Выбери воронку"
      subtitle="Готовый сценарий, по которому бот будет вести клиентов до записи. Можно поменять позже."
      footer={
        <Button
          size="lg"
          full
          disabled={!hasActive}
          onClick={() => nav('/onboarding/connect')}
        >
          {hasActive ? 'Дальше' : 'Выбери одну'}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {presets.map((p) => {
          const seeded = funnels.find(
            (f) => f.preset_key === p.key && f.is_active,
          );
          return (
            <Card key={p.key} className={seeded ? 'border-accent' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{p.name}</span>
                  <span className="text-xs text-mute">
                    {labelType(p.type)} · {p.steps_count} шагов
                  </span>
                </div>
                {seeded ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent-dark">
                    выбрана
                  </span>
                ) : (
                  <Button
                    size="md"
                    variant="secondary"
                    onClick={() => seed(p.key)}
                    disabled={busy !== null}
                  >
                    {busy === p.key ? '...' : 'Выбрать'}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

function labelType(t: string): string {
  if (t === 'main') return 'основная';
  if (t === 'return') return 'возврат';
  if (t === 'cold') return 'холодная';
  return t;
}
