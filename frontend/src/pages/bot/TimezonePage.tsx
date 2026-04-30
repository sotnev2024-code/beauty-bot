import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Me } from '@/api';
import { Button, Card } from '@/components/ui';
import { useMaster } from '@/store/master';

const TIMEZONES = [
  { tz: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { tz: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { tz: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { tz: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { tz: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { tz: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { tz: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { tz: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { tz: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { tz: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { tz: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
];

export function BotTimezonePage() {
  const nav = useNavigate();
  const { master, fetch } = useMaster();
  const [value, setValue] = useState<string>(master?.timezone ?? 'Europe/Moscow');
  const [saving, setSaving] = useState(false);

  if (!master) return null;

  const save = async () => {
    setSaving(true);
    try {
      await Me.update({ timezone: value });
      await fetch();
      nav('/app/bot');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-display text-2xl text-ink">Часовой пояс</h1>
        <p className="text-xs text-mute">
          Бот использует ваше локальное время для напоминаний и приглашений на возврат.
        </p>
      </div>

      {TIMEZONES.map((t) => (
        <Card
          key={t.tz}
          onClick={() => setValue(t.tz)}
          className={`cursor-pointer transition border-2 ${
            value === t.tz ? 'border-accent bg-accent-soft' : 'border-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-4 h-4 rounded-full border-2 ${
                value === t.tz ? 'border-accent bg-accent' : 'border-mute'
              }`}
            />
            <span className="font-medium text-ink">{t.label}</span>
            <span className="ml-auto text-xs text-mute">{t.tz}</span>
          </div>
        </Card>
      ))}

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-bg/80 backdrop-blur border-t border-divider">
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
