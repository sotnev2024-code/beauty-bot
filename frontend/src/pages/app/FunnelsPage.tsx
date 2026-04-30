import { useEffect, useState } from 'react';

import { Funnels } from '@/api';
import type { FunnelSummary } from '@/api/types';
import { Card } from '@/components/ui';

export function FunnelsPage() {
  const [funnels, setFunnels] = useState<FunnelSummary[]>([]);

  useEffect(() => {
    Funnels.list().then(setFunnels).catch(() => undefined);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink">Бот · воронки</h1>
      {funnels.length === 0 ? (
        <Card>
          <p className="text-sm text-mute">Воронок пока нет.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {funnels.map((f) => (
            <Card key={f.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{f.name}</span>
                  <span className="text-xs text-mute uppercase tracking-wider">
                    {f.type}
                  </span>
                </div>
                {f.is_active && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent-dark">
                    активна
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
