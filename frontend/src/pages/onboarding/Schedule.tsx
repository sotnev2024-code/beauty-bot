import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Schedule as ScheduleApi } from '@/api';
import { Button, Input } from '@/components/ui';

import { OnboardingShell } from './OnboardingShell';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function Schedule() {
  const nav = useNavigate();
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('20:00');
  const [working, setWorking] = useState<boolean[]>([true, true, true, true, true, true, false]);
  const [busy, setBusy] = useState(false);

  const toggle = (i: number) => {
    const next = [...working];
    next[i] = !next[i];
    setWorking(next);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await ScheduleApi.replace(
        WEEKDAYS.map((_, i) => ({
          weekday: i,
          start_time: start,
          end_time: end,
          is_working: working[i] ?? false,
        }))
      );
      nav('/onboarding/connect');
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={3}
      total={5}
      title="График работы"
      subtitle="Можно подкрутить позже в настройках."
      footer={
        <Button size="lg" full disabled={busy || !working.some(Boolean)} onClick={submit}>
          Дальше
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Input label="Начало" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input label="Конец" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-soft font-medium">Рабочие дни</span>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => toggle(i)}
              className={`h-12 rounded-xl border text-sm font-semibold transition ${
                working[i]
                  ? 'border-accent bg-accent text-white'
                  : 'border-divider bg-card text-mute'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </OnboardingShell>
  );
}
