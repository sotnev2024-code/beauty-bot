import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BotSettings } from '@/api';
import type { MessageFormat } from '@/api/types';
import { Button, Card } from '@/components/ui';

const OPTIONS: {
  value: MessageFormat;
  label: string;
  hint: string;
}[] = [
  {
    value: 'text',
    label: 'Только текст',
    hint: 'Бот пишет обычными сообщениями. Лучше для коротких диалогов.',
  },
  {
    value: 'buttons',
    label: 'Только кнопки',
    hint: 'Услуги, время, подтверждение — кнопками. Быстрее для клиентки.',
  },
  {
    value: 'hybrid',
    label: 'Гибрид (рекомендуем)',
    hint: 'Кнопки для выбора, текст для остального. Самый удобный вариант.',
  },
];

export function BotFormatPage() {
  const nav = useNavigate();
  const [value, setValue] = useState<MessageFormat>('hybrid');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    BotSettings.get()
      .then((s) => {
        setValue(s.message_format);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await BotSettings.update({ message_format: value });
      nav('/app/bot');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <div className="text-sm text-mute animate-pulse">Загружаем…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-display text-2xl text-ink">Формат сообщений</h1>
        <p className="text-xs text-mute">Как бот предлагает варианты выбора.</p>
      </div>

      {OPTIONS.map((opt) => (
        <Card
          key={opt.value}
          onClick={() => setValue(opt.value)}
          className={`cursor-pointer transition border-2 ${
            value === opt.value
              ? 'border-accent bg-accent-soft'
              : 'border-transparent'
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-1 w-4 h-4 rounded-full border-2 ${
                value === opt.value ? 'border-accent bg-accent' : 'border-mute'
              }`}
            />
            <div className="flex-1">
              <div className="font-medium text-ink">{opt.label}</div>
              <div className="text-xs text-mute mt-0.5">{opt.hint}</div>
            </div>
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
