import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Card, Input } from '@/components/ui';
import { useMaster } from '@/store/master';

export function SettingsPage() {
  const { master, update } = useMaster();
  const [name, setName] = useState(master?.name ?? '');
  const [busy, setBusy] = useState(false);

  if (!master) return null;

  const save = async () => {
    setBusy(true);
    try {
      await update({ name });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink">Настройки</h1>

      <Card>
        <div className="flex flex-col gap-3">
          <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={save} disabled={busy} full>
            Сохранить
          </Button>
        </div>
      </Card>

      <NavItem to="/app/pricing" title="Тариф" subtitle={planLabel(master.plan)} />

      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-mute uppercase tracking-wider">Версия</span>
          <span className="text-sm text-ink-soft">Beauty.dev · v1.0</span>
        </div>
      </Card>
    </div>
  );
}

function planLabel(plan: string): string {
  if (plan === 'trial') return 'Trial · 14 дней бесплатно';
  if (plan === 'pro') return 'Pro · активен';
  if (plan === 'pro_plus') return 'Pro+ · активен';
  return plan.toUpperCase();
}

function NavItem({
  to,
  title,
  subtitle,
}: {
  to: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link to={to} className="block">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-ink">{title}</span>
            <span className="text-xs text-mute">{subtitle}</span>
          </div>
          <span className="text-mute">→</span>
        </div>
      </Card>
    </Link>
  );
}
