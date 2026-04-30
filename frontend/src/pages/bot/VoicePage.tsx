import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BotSettings } from '@/api';
import type { VoiceTone } from '@/api/types';
import { Button, Card } from '@/components/ui';

const OPTIONS: { value: VoiceTone; label: string; example: string; hint: string }[] = [
  {
    value: 'warm',
    label: 'Тёплый',
    example: 'Здравствуйте, Анна! Рада вас видеть, подскажу с радостью.',
    hint: 'На «вы», заботливый, эмоциональный тон. Подходит большинству бьюти-ниш.',
  },
  {
    value: 'neutral',
    label: 'Нейтральный',
    example: 'Здравствуйте, Анна. Чем могу помочь?',
    hint: 'На «вы», деловой, без эмоций. Удобен для коротких диалогов.',
  },
  {
    value: 'casual',
    label: 'На «ты» (дружеский)',
    example: 'Привет! Расскажи, что тебя интересует?',
    hint: 'На «ты», свободный тон. Подходит молодой аудитории.',
  },
];

export function BotVoicePage() {
  const nav = useNavigate();
  const [value, setValue] = useState<VoiceTone>('warm');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    BotSettings.get()
      .then((s) => {
        setValue(s.voice_tone);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await BotSettings.update({ voice_tone: value });
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
        <h1 className="font-display text-2xl text-ink">Голос бота</h1>
        <p className="text-xs text-mute">Тон, в котором бот общается с клиентами.</p>
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
              <div className="mt-2 self-start bg-card text-ink border border-divider rounded-2xl rounded-bl-md px-3 py-1.5 text-[13px] inline-block">
                {opt.example}
              </div>
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
