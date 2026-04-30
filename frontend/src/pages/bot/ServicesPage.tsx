import { useEffect, useMemo, useState } from 'react';

import { Categories, Services } from '@/api';
import type { Service, ServiceCategory } from '@/api/types';
import { Button, Card, Input, Sheet, Textarea } from '@/components/ui';

const UNGROUPED = -1;

export function BotServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [openSvc, setOpenSvc] = useState<Service | null | undefined>(undefined);
  const [openCat, setOpenCat] = useState<ServiceCategory | null | undefined>(undefined);

  const refresh = () => Promise.all([Services.list(), Categories.list()]).then(([s, c]) => {
    setServices(s);
    setCategories(c.sort((a, b) => a.position - b.position || a.id - b.id));
  });

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const grouped = useMemo(() => {
    const byId = new Map<number, ServiceCategory>(categories.map((c) => [c.id, c]));
    const map = new Map<number, Service[]>();
    for (const s of services) {
      const cid = s.category_id && byId.has(s.category_id) ? s.category_id : UNGROUPED;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push(s);
    }
    const ordered: { cat: ServiceCategory | null; services: Service[] }[] = categories.map(
      (c) => ({ cat: c, services: map.get(c.id) ?? [] })
    );
    if (map.has(UNGROUPED)) {
      ordered.push({ cat: null, services: map.get(UNGROUPED) ?? [] });
    }
    return ordered;
  }, [services, categories]);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-end">
        <Button size="md" onClick={() => setOpenSvc(null)}>
          + Услуга
        </Button>
      </header>

      <div>
        <h1 className="font-display text-2xl text-ink">Услуги</h1>
        <p className="text-xs text-mute">
          Услуги, которые предлагает бот клиентам. Опционально сгруппируйте их по
          категориям.
        </p>
      </div>

      {services.length === 0 && (
        <Card>
          <p className="text-sm text-mute">
            Добавьте хотя бы одну услугу — бот будет предлагать её клиентам.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {grouped.map(({ cat, services: items }) => (
          <section key={cat?.id ?? 'ungrouped'} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs uppercase tracking-wider text-mute font-semibold">
                {cat?.name ?? 'Без категории'} · {items.length}
              </span>
              {cat && (
                <button
                  type="button"
                  onClick={() => setOpenCat(cat)}
                  className="text-xs text-mute"
                >
                  Изменить
                </button>
              )}
            </div>
            {items.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setOpenSvc(s)}
                className="text-left"
              >
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-semibold text-ink truncate">
                        {s.name}
                      </span>
                      <span className="text-xs text-mute">
                        {s.duration_minutes} мин ·{' '}
                        {Math.round(Number(s.price)).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      {s.reminder_after_days != null && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-soft text-accent-dark">
                          напомнить через {s.reminder_after_days} д.
                        </span>
                      )}
                      {!s.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-divider text-mute">
                          выкл
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </section>
        ))}
      </div>

      <Card onClick={() => setOpenCat(null)} className="cursor-pointer border-2 border-dashed border-divider hover:border-accent">
        <span className="text-sm text-mute">+ Новая категория</span>
      </Card>

      <Sheet
        open={openSvc !== undefined}
        onClose={() => setOpenSvc(undefined)}
        title={openSvc ? 'Услуга' : 'Новая услуга'}
      >
        {openSvc !== undefined && (
          <ServiceForm
            initial={openSvc}
            categories={categories}
            onSaved={() => {
              setOpenSvc(undefined);
              refresh();
            }}
          />
        )}
      </Sheet>

      <Sheet
        open={openCat !== undefined}
        onClose={() => setOpenCat(undefined)}
        title={openCat ? 'Категория' : 'Новая категория'}
      >
        {openCat !== undefined && (
          <CategoryForm
            initial={openCat}
            onSaved={() => {
              setOpenCat(undefined);
              refresh();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function ServiceForm({
  initial,
  categories,
  onSaved,
}: {
  initial: Service | null;
  categories: ServiceCategory[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 60);
  const [price, setPrice] = useState(initial?.price ?? '1500');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>(initial?.category_id ?? '');
  const [reminderEnabled, setReminderEnabled] = useState(initial?.reminder_after_days != null);
  const [reminderDays, setReminderDays] = useState(initial?.reminder_after_days ?? 30);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        name,
        duration_minutes: duration,
        price,
        description: description || null,
        category_id: categoryId === '' ? null : Number(categoryId),
        reminder_after_days: reminderEnabled ? reminderDays : null,
      };
      if (initial) {
        await Services.update(initial.id, payload);
      } else {
        await Services.create(payload);
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
      <Input label="Название" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-mute font-semibold">Категория</span>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          className="bg-card border border-divider rounded-xl px-3 py-2.5 text-[14px] text-ink focus:outline-none focus:border-accent"
        >
          <option value="">— без категории —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

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

      <Card>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-ink">Напомнить о повторной записи</div>
            <div className="text-xs text-mute mt-0.5">
              Бот напишет клиентке через N дней после визита и предложит записаться снова.
            </div>
            {reminderEnabled && (
              <div className="mt-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                />
                <span className="text-[11px] text-mute">дней после визита</span>
              </div>
            )}
          </div>
        </label>
      </Card>

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

function CategoryForm({
  initial,
  onSaved,
}: {
  initial: ServiceCategory | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (initial) {
        await Categories.update(initial.id, { name: name.trim() });
      } else {
        await Categories.create({ name: name.trim() });
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial || !confirm('Удалить категорию? Услуги останутся, но без категории.')) return;
    setBusy(true);
    try {
      await Categories.remove(initial.id);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Название категории"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Например, маникюр"
      />
      <Button full onClick={save} disabled={busy || !name.trim()}>
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
