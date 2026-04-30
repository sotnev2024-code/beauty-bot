import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Funnels } from '@/api';
import type { FunnelDetail, FunnelStep } from '@/api/types';
import { Button, Card, Input, Textarea } from '@/components/ui';

export function FunnelEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const fid = Number(id);

  const [funnel, setFunnel] = useState<FunnelDetail | null>(null);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Funnels.get(fid)
      .then((f) => {
        setFunnel(f);
        setName(f.name);
        setSteps(f.steps);
      })
      .catch(() => undefined);
  }, [fid]);

  const dirty = useMemo(() => {
    if (!funnel) return false;
    if (name !== funnel.name) return true;
    if (steps.length !== funnel.steps.length) return true;
    return steps.some((s, i) => {
      const orig = funnel.steps[i];
      return (
        !orig ||
        orig.system_prompt !== s.system_prompt ||
        orig.goal !== s.goal ||
        (orig.collected_fields ?? []).join(',') !== (s.collected_fields ?? []).join(',')
      );
    });
  }, [funnel, name, steps]);

  if (!funnel) {
    return <div className="text-sm text-mute">Загружаем…</div>;
  }

  const updateStep = (idx: number, patch: Partial<FunnelStep>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };

  const save = async () => {
    setBusy(true);
    try {
      await Funnels.update(fid, {
        name,
        steps: steps.map((s) => ({
          id: s.id,
          position: s.position,
          system_prompt: s.system_prompt,
          goal: s.goal,
          collected_fields: s.collected_fields,
          transition_conditions: s.transition_conditions,
        })) as unknown as FunnelStep[], // backend accepts position/prompt/goal/etc shape
      });
      const refreshed = await Funnels.get(fid);
      setFunnel(refreshed);
      setSteps(refreshed.steps);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Удалить воронку безвозвратно?')) return;
    await Funnels.remove(fid);
    nav('/app/funnels');
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <Link to="/app/funnels" className="text-sm text-mute">
          ← Воронки
        </Link>
        <span className="text-xs text-mute uppercase tracking-wider">
          {funnel.type}
          {funnel.preset_key ? ` · ${funnel.preset_key}` : ''}
        </span>
      </header>

      <Input
        label="Название воронки"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="flex flex-col gap-3">
        <span className="text-sm text-ink-soft font-medium">Шаги</span>
        {steps.map((s, i) => (
          <Card key={s.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-mute font-semibold">
                Шаг {i + 1}
              </span>
              {i === 0 && (
                <span className="text-[10px] uppercase text-accent">старт</span>
              )}
            </div>
            <Input
              label="Цель шага"
              value={s.goal ?? ''}
              onChange={(e) => updateStep(i, { goal: e.target.value })}
            />
            <Textarea
              label="Промпт для бота"
              value={s.system_prompt}
              onChange={(e) => updateStep(i, { system_prompt: e.target.value })}
            />
            <Input
              label="Поля для сбора (через запятую)"
              hint="например: name, phone, service_intent"
              value={(s.collected_fields ?? []).join(', ')}
              onChange={(e) =>
                updateStep(i, {
                  collected_fields: e.target.value
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            />
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 sticky bottom-0 -mx-4 px-4 py-3 bg-bg/80 backdrop-blur border-t border-divider">
        <Button full disabled={!dirty || busy} onClick={save}>
          Сохранить
        </Button>
        <Button full variant="ghost" onClick={remove}>
          Удалить воронку
        </Button>
      </div>
    </div>
  );
}
