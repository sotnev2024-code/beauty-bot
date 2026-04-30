import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Analytics, Bookings } from '@/api';
import type { BookingDetail, OverviewData } from '@/api/types';
import { Card } from '@/components/ui';
import { HYB } from '@/lib/tokens';

export function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [bookings, setBookings] = useState<BookingDetail[]>([]);

  useEffect(() => {
    Analytics.overview().then(setOverview).catch(() => undefined);
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 14);
    Bookings.list({
      from_date: from.toISOString().slice(0, 10),
      to_date: today.toISOString().slice(0, 10),
    })
      .then(setBookings)
      .catch(() => undefined);
  }, []);

  const dailyRevenue = useMemo(() => buildDailyRevenue(bookings), [bookings]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink">Аналитика</h1>

      {overview && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Записей" value={overview.bookings_done} />
          <Stat
            label="Выручка"
            value={`${Math.round(Number(overview.revenue)).toLocaleString('ru-RU')} ₽`}
          />
          <Stat label="Новые клиенты" value={overview.new_clients} />
          <Stat label="Активные диалоги" value={overview.active_conversations} />
        </div>
      )}

      {overview && overview.return_campaigns.sent > 0 && (
        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">💌 Возврат клиенток</span>
              <span className="text-xs text-mute">за период</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <ReturnStat label="отправлено" value={overview.return_campaigns.sent} />
              <ReturnStat label="записались" value={overview.return_campaigns.booked} />
              <ReturnStat label="истекло" value={overview.return_campaigns.expired} />
            </div>
            <div className="text-xs text-ink-soft">
              Дополнительная выручка:{' '}
              <strong>
                {Math.round(Number(overview.return_campaigns.revenue)).toLocaleString('ru-RU')} ₽
              </strong>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Выручка по дням</span>
            <span className="text-xs text-mute">14 дней</span>
          </div>
          <div className="h-48">
            {dailyRevenue.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-mute">
                Накапливаем данные…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue} margin={{ left: -16, right: 0, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke={HYB.colors.divider} vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke={HYB.colors.mute}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={HYB.colors.mute}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: HYB.colors.divider }}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${HYB.colors.divider}`,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={HYB.colors.accent}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-xs text-mute">
          Гибридные инсайты появятся, когда наберётся неделя данных.
        </p>
      </Card>
    </div>
  );
}

function ReturnStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-display text-lg text-ink">{value}</span>
      <span className="text-[11px] text-mute">{label}</span>
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

function buildDailyRevenue(items: BookingDetail[]): { day: string; revenue: number }[] {
  const buckets = new Map<string, number>();
  for (const b of items) {
    if (b.status !== 'done') continue;
    const d = new Date(b.starts_at);
    const key = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    buckets.set(key, (buckets.get(key) ?? 0) + Number(b.price ?? 0));
  }
  return [...buckets.entries()].map(([day, revenue]) => ({ day, revenue }));
}
