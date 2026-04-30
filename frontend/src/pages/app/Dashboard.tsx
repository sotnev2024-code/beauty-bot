import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Analytics } from '@/api';
import type { DashboardData, Plan } from '@/api/types';
import { Card } from '@/components/ui';
import { tgPhotoUrl } from '@/lib/tg';
import { useMaster } from '@/store/master';

const PLAN_LABEL: Record<Plan, string> = {
  trial: 'Trial',
  pro: 'Pro',
  pro_plus: 'Pro+',
};

export function Dashboard() {
  const { master } = useMaster();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Analytics.dashboard()
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  const photoUrl = tgPhotoUrl();
  const initials = (master?.name ?? 'M')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="w-14 h-14 rounded-full object-cover bg-divider"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-coral-grad text-white grid place-items-center font-display text-lg">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl text-ink truncate">
              {master?.name ?? 'Мастер'}
            </div>
            {master?.niche && (
              <div className="text-xs text-mute truncate">{master.niche}</div>
            )}
          </div>
          {master && (
            <Link
              to="/app/pricing"
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-soft text-accent-dark whitespace-nowrap"
            >
              {PLAN_LABEL[master.plan]}
            </Link>
          )}
        </div>
      </Card>

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

      <div className="text-xs uppercase tracking-wider text-mute font-semibold px-1 mt-2">
        Разделы
      </div>
      <NavCard
        to="/app/chats"
        icon="💬"
        title="Чаты"
        subtitle={
          data?.pending_takeovers
            ? `${data.pending_takeovers} на вас`
            : 'Все диалоги ведёт бот'
        }
      />
      <NavCard
        to="/app/clients"
        icon="◉"
        title="Клиенты"
        subtitle="База, сегменты, история"
      />
      <NavCard
        to="/app/analytics"
        icon="📊"
        title="Аналитика"
        subtitle="Записи, выручка, инсайты"
      />
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

function NavCard({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link to={to} className="block">
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none" aria-hidden>
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-ink text-[15px] leading-tight">{title}</div>
            <div className="text-xs text-ink-soft mt-0.5">{subtitle}</div>
          </div>
          <span className="text-mute text-base leading-none" aria-hidden>
            ›
          </span>
        </div>
      </Card>
    </Link>
  );
}

function fmtMoney(v: string | number | undefined): string {
  if (v === undefined || v === null) return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return '—';
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}
