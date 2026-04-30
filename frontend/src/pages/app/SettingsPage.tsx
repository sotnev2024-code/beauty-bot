import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, Card, Input, Textarea } from '@/components/ui';
import { useMaster } from '@/store/master';

const VOICES = [
  { key: 'warm', label: 'Тёплый' },
  { key: 'pro', label: 'Деловой' },
  { key: 'soft', label: 'Спокойный' },
];

export function SettingsPage() {
  const { master, update } = useMaster();
  const [name, setName] = useState(master?.name ?? '');
  const [greeting, setGreeting] = useState(master?.greeting ?? '');
  const [rules, setRules] = useState(master?.rules ?? '');
  const [voice, setVoice] = useState(master?.voice ?? 'warm');
  const [busy, setBusy] = useState(false);

  if (!master) return null;

  const save = async () => {
    setBusy(true);
    try {
      await update({ name, greeting, rules, voice });
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

      <NavItem to="/app/services" title="Услуги" subtitle="Названия, цены, длительность" />
      <NavItem to="/app/schedule" title="Расписание" subtitle="Часы работы, перерывы, отпуска" />
      <NavItem to="/app/analytics" title="Аналитика" subtitle="Записи, выручка, инсайты" />
      <NavItem to="/app/chats" title="Чаты" subtitle="Перехват и контроль диалогов" />

      <Card>
        <div className="flex flex-col gap-3">
          <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} />

          <div>
            <span className="text-sm text-ink-soft font-medium">Тон голоса</span>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {VOICES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVoice(v.key)}
                  className={`h-10 rounded-lg text-sm font-semibold ${
                    voice === v.key ? 'bg-accent text-white' : 'bg-divider text-mute'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Приветствие"
            placeholder="«Привет! На связи Аня»"
            value={greeting ?? ''}
            onChange={(e) => setGreeting(e.target.value)}
          />
          <Textarea
            label="Правила для бота"
            placeholder="Например: не предлагать выезд, не отвечать после 22:00"
            value={rules ?? ''}
            onChange={(e) => setRules(e.target.value)}
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
