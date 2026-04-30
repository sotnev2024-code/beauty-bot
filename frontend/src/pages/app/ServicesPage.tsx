import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Services } from '@/api';
import type { Service } from '@/api/types';
import { Button, Card, Input, Sheet, Textarea } from '@/components/ui';

const UNGROUPED = '__ungrouped__';

export function ServicesPage() {
  const [list, setList] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const refresh = () => Services.list().then(setList).catch(() => undefined);

  useEffect(() => {
    refresh();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of list) {
      const key = s.group?.trim() || UNGROUPED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // sort categories: known first (alpha), ungrouped last
    return [...map.entries()].sort(([a], [b]) => {
      if (a === UNGROUPED) return 1;
      if (b === UNGROUPED) return -1;
      return a.localeCompare(b, 'ru');
    });
  }, [list]);

  const knownCategories = useMemo(
    () =>
      Array.from(
        new Set(list.map((s) => s.group?.trim()).filter((g): g is string => !!g)),
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [list],
  );

  const onSaved = () => {
    setOpen(false);
    setEditing(null);
    refresh();
  };

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
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
            Добавь хотя бы одну услугу — бот будет предлагать их клиентам.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(([cat, items]) => {
            const isOpen = !collapsed.has(cat);
            const label = cat === UNGROUPED ? 'Без категории' : cat;
            return (
              <section key={cat} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center justify-between px-1 py-1 text-left"
                >
                  <span className="text-xs uppercase tracking-wider text-mute font-semibold">
                    {label} · {items.length}
                  </span>
                  <span
                    className={`text-mute text-sm transition-transform ${
                      isOpen ? '' : '-rotate-90'
                    }`}
                  >
                    ▾
                  </span>
                </button>
                {isOpen &&
                  items.map((s) => (
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
                              {s.duration_minutes} мин ·{' '}
                              {Math.round(Number(s.price)).toLocaleString('ru-RU')} ₽
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
              </section>
            );
          })}
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
        <ServiceForm
          initial={editing}
          knownCategories={knownCategories}
          onSaved={onSaved}
        />
      </Sheet>
    </div>
  );
}

function ServiceForm({
  initial,
  knownCategories,
  onSaved,
}: {
  initial: Service | null;
  knownCategories: string[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 60);
  const [price, setPrice] = useState(initial?.price ?? '1500');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.group ?? '');
  const [busy, setBusy] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = category.trim()
    ? knownCategories.filter(
        (c) =>
          c.toLowerCase().includes(category.trim().toLowerCase()) &&
          c.toLowerCase() !== category.trim().toLowerCase(),
      )
    : knownCategories;

  // close suggest popover on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        name,
        duration_minutes: duration,
        price,
        description: description || null,
        group: category.trim() || null,
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
      <Input
        label="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div ref={wrapRef} className="relative flex flex-col gap-1.5">
        <Input
          label="Категория"
          placeholder="Например, маникюр"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setShowSuggest(true);
          }}
          onFocus={() => setShowSuggest(true)}
          hint="Услуги с одинаковой категорией группируются вместе"
        />
        {showSuggest && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-card border border-divider rounded-xl shadow-md flex flex-col max-h-48 overflow-y-auto">
            {suggestions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setShowSuggest(false);
                }}
                className="text-left px-3 py-2 text-sm hover:bg-bg first:rounded-t-xl last:rounded-b-xl"
              >
                {c}
              </button>
            ))}
          </div>
        )}
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
