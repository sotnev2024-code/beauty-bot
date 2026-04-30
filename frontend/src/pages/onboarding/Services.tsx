import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Services as ServicesApi } from '@/api';
import type { Service } from '@/api/types';
import { Button, Card, Input } from '@/components/ui';

import { OnboardingShell } from './OnboardingShell';

interface Draft {
  name: string;
  duration: string;
  price: string;
  category: string;
}

const NEW: Draft = { name: '', duration: '60', price: '1500', category: '' };

export function Services() {
  const nav = useNavigate();
  const [list, setList] = useState<Service[]>([]);
  const [draft, setDraft] = useState<Draft>(NEW);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => ServicesApi.list().then(setList).catch(() => undefined);
  useEffect(() => {
    refresh();
  }, []);

  const add = async () => {
    if (!draft.name.trim() || !draft.duration || !draft.price) return;
    setBusy(true);
    setError(null);
    try {
      await ServicesApi.create({
        name: draft.name.trim(),
        duration_minutes: Number(draft.duration),
        price: draft.price,
        group: draft.category.trim() || null,
      });
      setDraft(NEW);
      await refresh();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detail ?? 'Не удалось добавить услугу');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    try {
      await ServicesApi.remove(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const next = () => nav('/onboarding/funnel');

  return (
    <OnboardingShell
      step={5}
      total={8}
      title="Какие услуги ты предлагаешь?"
      subtitle="Минимум одну. Бот будет предлагать их клиенткам по этому списку."
      footer={
        <Button size="lg" full disabled={list.length === 0 || busy} onClick={next}>
          {list.length === 0 ? 'Добавь хотя бы одну' : 'Дальше'}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {list.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-ink">{s.name}</span>
                <span className="text-xs text-mute">
                  {s.duration_minutes} мин · {Math.round(Number(s.price))} ₽
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="text-mute text-lg w-8 h-8 grid place-items-center"
              >
                ×
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-ink">Новая услуга</span>
          <Input
            label="Название"
            placeholder="Например, классический маникюр"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            label="Категория"
            placeholder="Например, маникюр"
            hint="Услуги одной категории группируются вместе"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Минут"
              type="number"
              min={5}
              step={5}
              value={draft.duration}
              onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
            />
            <Input
              label="Цена, ₽"
              type="number"
              min={0}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            />
          </div>
          {error && <span className="text-xs text-danger">{error}</span>}
          <Button onClick={add} disabled={!draft.name.trim() || busy} full>
            + Добавить
          </Button>
        </div>
      </Card>
    </OnboardingShell>
  );
}
