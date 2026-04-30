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

      <NavItem
        to="/app/bot"
        title="Бот"
        subtitle="Приветствие, голос, услуги, база знаний и автоматизация"
      />
      <NavItem to="/app/schedule" title="Расписание" subtitle="Часы работы, перерывы, отпуска" />
      <NavItem to="/app/analytics" title="Аналитика" subtitle="Записи, выручка, инсайты" />
      <NavItem to="/app/chats" title="Чаты" subtitle="Перехват и контроль диалогов" />

      <Card>
        <div className="flex flex-col gap-3">
          <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={save} disabled={busy} full>
            Сохранить
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-mute uppercase tracking-wider">Тариф</span>
          <span className="text-sm text-ink font-semibold">
            {master.plan === 'trial' ? 'Trial · 14 дней бесплатно' : master.plan.toUpperCase()}
          </span>
        </div>
      </Card>
    </div>
  );
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
