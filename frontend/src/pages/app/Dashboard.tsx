import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Analytics } from '@/api';
import type { DashboardData, Master, Plan } from '@/api/types';
import { Button, Card, Input, Sheet } from '@/components/ui';
import { tgPhotoUrl } from '@/lib/tg';
import { useMaster } from '@/store/master';

const PLAN_LABEL: Record<Plan, string> = {
  trial: 'Trial',
  pro: 'Pro',
  pro_plus: 'Pro+',
};

export function Dashboard() {
  const { master, update } = useMaster();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState(false);

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
      {/* Master profile card */}
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
            <button
              type="button"
              onClick={() => setEditName(true)}
              className="text-left flex items-center gap-1 group"
            >
              <span className="font-display text-xl text-ink truncate">
                {master?.name ?? 'Мастер'}
              </span>
              <span className="text-mute group-hover:text-ink text-sm" aria-hidden>
                ✎
              </span>
            </button>
            {master?.niche && (
              <div className="text-xs text-mute truncate">{master.niche}</div>
            )}
          </div>
        </div>
      </Card>

      {/* Plan / subscription card — bigger */}
      {master && <PlanCard master={master} />}

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

      <Sheet open={editName} onClose={() => setEditName(false)} title="Имя мастера">
        <NameForm
          initial={master?.name ?? ''}
          onSave={async (v) => {
            await update({ name: v });
            setEditName(false);
          }}
        />
      </Sheet>
    </div>
  );
}

function PlanCard({ master }: { master: Master }) {
  const now = new Date();
  const trialEnds = master.trial_ends_at ? new Date(master.trial_ends_at) : null;
  const subEnds = master.subscription_active_until
    ? new Date(master.subscription_active_until)
    : null;

  const trialActive = trialEnds && trialEnds > now;
  const subActive = subEnds && subEnds > now;

  let subtitle: string;
  let activeUntil: Date | null = null;
  if (subActive) {
    subtitle = 'Подписка активна';
    activeUntil = subEnds;
  } else if (trialActive) {
    subtitle = 'Пробный период';
    activeUntil = trialEnds;
  } else {
    subtitle = 'Подписка истекла';
  }

  const daysLeft = activeUntil
    ? Math.max(0, Math.ceil((activeUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <Link to="/app/pricing" className="block">
      <Card className="bg-coral-grad text-white border-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
              Тариф
            </span>
            <span className="font-display text-2xl">{PLAN_LABEL[master.plan]}</span>
            <span className="text-xs opacity-90">{subtitle}</span>
          </div>
          <div className="text-right">
            {activeUntil ? (
              <>
                <div className="font-display text-2xl leading-none">{daysLeft}</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {plural(daysLeft, ['день', 'дня', 'дней'])} осталось
                </div>
                <div className="text-[10px] opacity-70 mt-1">
                  до{' '}
                  {activeUntil.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </div>
              </>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20">
                продлить →
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function NameForm({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave(name.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Анна"
      />
      <Button onClick={save} disabled={busy || !name.trim()} full>
        Сохранить
      </Button>
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

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return forms[1];
  return forms[2];
}
