import { useEffect, useState } from 'react';

import { Clients } from '@/api';
import type { ClientListItem } from '@/api/types';
import { Card, Input } from '@/components/ui';

export function ClientsPage() {
  const [list, setList] = useState<ClientListItem[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      Clients.list({ q: q || undefined })
        .then(setList)
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink">Клиенты</h1>
      <Input
        placeholder="Поиск по имени или телефону"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-mute">Клиентов пока нет.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">
                    {c.name ?? `tg:${c.telegram_id}`}
                  </span>
                  <span className="text-xs text-mute">
                    {c.phone ?? '—'} · {c.visits_total} визит(ов)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {c.segments.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-divider text-ink-soft"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
