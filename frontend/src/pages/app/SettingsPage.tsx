import { useState } from 'react';

import { Button, Card, Input } from '@/components/ui';
import { useMaster } from '@/store/master';

export function SettingsPage() {
  const { master, update } = useMaster();
  const [name, setName] = useState(master?.name ?? '');
  const [greeting, setGreeting] = useState(master?.greeting ?? '');
  const [busy, setBusy] = useState(false);

  if (!master) return null;

  const save = async () => {
    setBusy(true);
    try {
      await update({ name, greeting });
    } finally {
      setBusy(false);
    }
  };

  const toggleBot = async () => {
    setBusy(true);
    try {
      await update({ bot_enabled: !master.bot_enabled });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink">Настройки</h1>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-ink">Бот</span>
            <span className="text-xs text-mute">
              {master.bot_enabled ? 'Отвечает клиентам' : 'Молчит — пишешь сама'}
            </span>
          </div>
          <Button
            variant={master.bot_enabled ? 'secondary' : 'primary'}
            size="md"
            disabled={busy}
            onClick={toggleBot}
          >
            {master.bot_enabled ? 'Выключить' : 'Включить'}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <Input
            label="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Приветствие для клиентов"
            placeholder="например, «Привет! На связи Аня»"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
          />
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
