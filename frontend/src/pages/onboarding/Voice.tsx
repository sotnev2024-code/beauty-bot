import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BotSettings } from '@/api';
import type { VoiceTone } from '@/api/types';
import { Button, Card } from '@/components/ui';

import { OnboardingShell } from './OnboardingShell';

const OPTIONS: { value: VoiceTone; label: string; example: string; hint: string }[] = [
  {
    value: 'warm',
    label: 'Тёплый',
    example: 'Здравствуйте, Анна! Рада вас видеть, подскажу с радостью.',
    hint: 'На «вы», заботливый, эмоциональный.',
  },
  {
    value: 'neutral',
    label: 'Нейтральный',
    example: 'Здравствуйте, Анна. Чем могу помочь?',
    hint: 'На «вы», деловой, без эмоций.',
  },
  {
    value: 'casual',
    label: 'На «ты»',
    example: 'Привет! Расскажи, что тебя интересует?',
    hint: 'Свободный тон, для молодой аудитории.',
  },
];

export function Voice() {
  const nav = useNavigate();
  const [value, setValue] = useState<VoiceTone>('warm');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    BotSettings.get()
      .then((s) => setValue(s.voice_tone))
      .catch(() => undefined);
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      await BotSettings.update({ voice_tone: value });
      nav('/onboarding/connect');
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={6}
      total={7}
      title="Каким голосом отвечает бот?"
      subtitle="Этот тон бот будет использовать в общении с твоими клиентками. Можно поменять позже в разделе «Бот»."
      footer={
        <Button size="lg" full disabled={busy} onClick={submit}>
          Дальше
        </Button>
      }
    >
      {OPTIONS.map((opt) => (
        <Card
          key={opt.value}
          onClick={() => setValue(opt.value)}
          className={`cursor-pointer transition border-2 ${
            value === opt.value ? 'border-accent bg-accent-soft' : 'border-transparent'
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
    </OnboardingShell>
  );
}
