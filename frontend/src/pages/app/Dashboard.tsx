import { useEffect, useState } from 'react';

import { Analytics, type Master } from '@/api';
import { Card } from '@/components/ui';
import { useMaster } from '@/store/master';
import type { DashboardData } from '@/api/types';

export function Dashboard() {
  const { master } = useMaster();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Analytics.dashboard()
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wider text-mute font-medium">
          Сегодня
        </span>
        <h1 className="font-display text-2xl text-ink">
          Привет{master?.name ? `, ${master.name.split(' ')[0]}` : ''}!
        </h1>
      </header>

      {error && (
        <Card>
          <p className="text-sm text-danger">Не получилось загрузить статистику</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Записей сегодня" value={data?.today_bookings ?? '—'} />
        <Stat label="Выручка сегодня" value={fmtMoney(data?.today_revenue)} />
        <Stat label="Записей за неделю" value={data?.week_bookings ?? '—'} />
        <Stat label="Выручка за неделю" value={fmtMoney(data?.week_revenue)} />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-ink font-semibold">Бот включён</span>
            <span className="text-xs text-mute">
              {data?.pending_takeovers
                ? `${data.pending_takeovers} чат(ов) на тебе`
                : 'Все диалоги ведёт бот'}
            </span>
          </div>
          <BotPill enabled={Boolean(data?.bot_enabled ?? master?.bot_enabled)} />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-mute">{label}</span>
        <span className="font-display text-xl text-ink">{value}</span>
      </div>
    </Card>
  );
}

function BotPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
        enabled ? 'bg-success/10 text-success' : 'bg-divider text-mute'
      }`}
    >
      {enabled ? 'on' : 'off'}
    </span>
  );
}

function fmtMoney(v: string | number | undefined): string {
  if (v === undefined || v === null) return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return '—';
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

// Re-export for tree-shaking sanity.
export type { Master };
