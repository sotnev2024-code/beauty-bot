import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Services } from '@/api';
import type { Service } from '@/api/types';
import { Button, Card, Input, Sheet, Textarea } from '@/components/ui';

export function ServicesPage() {
  const [list, setList] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const refresh = () => Services.list().then(setList).catch(() => undefined);

  useEffect(() => {
    refresh();
  }, []);

  const onSaved = () => {
    setOpen(false);
    setEditing(null);
    refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <Link to="/app/settings" className="text-sm text-mute">
          ← Настройки
        </Link>
        <Button
          size="md"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          + Услуга
        </Button>
      </header>

      <h1 className="font-display text-2xl text-ink">Услуги</h1>

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-mute">
            Добавь хотя бы одну услугу, чтобы бот мог предлагать её клиентам.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((s) => (
            <button
              key={s.id}
              type="button"
              className="text-left"
              onClick={() => {
                setEditing(s);
                setOpen(true);
              }}
            >
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-ink">{s.name}</span>
                    <span className="text-xs text-mute">
                      {s.duration_minutes} мин · {Math.round(Number(s.price)).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                  {!s.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-divider text-mute">
                      выкл
                    </span>
                  )}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Услуга' : 'Новая услуга'}
      >
        <ServiceForm initial={editing} onSaved={onSaved} />
      </Sheet>
    </div>
  );
}

function ServiceForm({
  initial,
  onSaved,
}: {
  initial: Service | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 60);
  const [price, setPrice] = useState(initial?.price ?? '1500');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (initial) {
        await Services.update(initial.id, {
          name,
          duration_minutes: duration,
          price,
          description,
        });
      } else {
        await Services.create({
          name,
          duration_minutes: duration,
          price,
          description,
        });
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial || !confirm('Удалить услугу?')) return;
    setBusy(true);
    try {
      await Services.remove(initial.id);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Длительность, мин"
          type="number"
          min={5}
          step={5}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
        <Input
          label="Цена, ₽"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <Textarea
        label="Описание (видит бот)"
        value={description ?? ''}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button full onClick={save} disabled={busy || !name}>
        Сохранить
      </Button>
      {initial && (
        <Button full variant="ghost" onClick={remove} disabled={busy}>
          Удалить
        </Button>
      )}
    </div>
  );
}
