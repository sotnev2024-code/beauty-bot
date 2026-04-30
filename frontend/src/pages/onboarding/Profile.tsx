import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/components/ui';
import { useMaster } from '@/store/master';

import { OnboardingShell } from './OnboardingShell';

const NICHES = [
  { key: 'manicure', label: 'Маникюр / педикюр' },
  { key: 'brows_lashes', label: 'Брови / ресницы' },
  { key: 'hair', label: 'Парикмахер' },
  { key: 'cosmetology', label: 'Косметолог' },
  { key: 'massage', label: 'Массажист' },
];

export function Profile() {
  const nav = useNavigate();
  const { master, update } = useMaster();
  const [name, setName] = useState(master?.name ?? '');
  const [niche, setNiche] = useState(master?.niche ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name || !niche) return;
    setBusy(true);
    try {
      await update({ name, niche });
      nav('/onboarding/address');
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={2}
      total={8}
      title="Расскажи о себе"
      subtitle="Это видно только тебе и помогает боту звучать в твоём ключе."
      footer={
        <Button size="lg" full disabled={!name || !niche || busy} onClick={submit}>
          Дальше
        </Button>
      }
    >
      <Input
        label="Как тебя зовут?"
        placeholder="Имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-soft font-medium">Твоя ниша</span>
        <div className="flex flex-col gap-1.5">
          {NICHES.map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={() => setNiche(n.key)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition ${
                niche === n.key
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-divider bg-card text-ink-soft'
              }`}
            >
              <span className="text-base">{n.label}</span>
              {niche === n.key && <span className="text-accent">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </OnboardingShell>
  );
}
