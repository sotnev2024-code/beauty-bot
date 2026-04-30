import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Funnels } from '@/api';
import type { FunnelPresetSummary, FunnelSummary } from '@/api/types';
import { Button, Card, Sheet } from '@/components/ui';

export function FunnelsPage() {
  const [funnels, setFunnels] = useState<FunnelSummary[]>([]);
  const [presets, setPresets] = useState<FunnelPresetSummary[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = () => Funnels.list().then(setFunnels).catch(() => undefined);

  useEffect(() => {
    refresh();
    Funnels.presets().then(setPresets).catch(() => undefined);
  }, []);

  const seed = async (key: string) => {
    setBusy(true);
    try {
      await Funnels.seed(key, true);
      setShowPresets(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Воронки</h1>
        <Button size="md" onClick={() => setShowPresets(true)}>
          + Пресет
        </Button>
      </header>

      {funnels.length === 0 ? (
        <Card>
          <p className="text-sm text-mute">
            Воронок пока нет. Возьми готовый пресет — за пару минут бот будет
            готов отвечать клиентам.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {funnels.map((f) => (
            <Link key={f.id} to={`/app/funnels/${f.id}`} className="block">
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-ink">{f.name}</span>
                    <span className="text-xs text-mute uppercase tracking-wider">
                      {labelForType(f.type)}
                      {f.preset_key ? ` · ${f.preset_key}` : ''}
                    </span>
                  </div>
                  {f.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent-dark">
                      активна
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Sheet open={showPresets} onClose={() => setShowPresets(false)} title="Готовые пресеты">
        <div className="flex flex-col gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={busy}
              onClick={() => seed(p.key)}
              className="text-left p-4 rounded-xl border border-divider bg-card hover:bg-bg transition disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{p.name}</span>
                  <span className="text-xs text-mute">
                    {labelForType(p.type)} · {p.steps_count} шагов
                  </span>
                </div>
                <span className="text-accent">→</span>
              </div>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function labelForType(t: string): string {
  if (t === 'main') return 'основная';
  if (t === 'return') return 'возврат';
  if (t === 'cold') return 'холодная';
  return t;
}
