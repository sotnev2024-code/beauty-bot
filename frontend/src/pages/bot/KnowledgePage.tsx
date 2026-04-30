import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Knowledge } from '@/api';
import type { KBType, KnowledgeItem } from '@/api/types';
import { Button, Card, Input, Sheet, Textarea } from '@/components/ui';

interface KBTemplate {
  type: KBType;
  title: string;
  emoji: string;
  hint: string;
  is_short_default: boolean;
}

const TEMPLATES: KBTemplate[] = [
  { type: 'address', title: 'Адрес', emoji: '📍', hint: 'Как найти и добраться', is_short_default: true },
  { type: 'payment', title: 'Оплата', emoji: '💳', hint: 'Как и чем платить', is_short_default: true },
  { type: 'techniques', title: 'Техники работы', emoji: '✨', hint: 'Что используется и почему', is_short_default: false },
  { type: 'sterilization', title: 'Стерилизация', emoji: '🧼', hint: 'Санитарные нормы', is_short_default: false },
  { type: 'preparation', title: 'Подготовка к визиту', emoji: '📝', hint: 'Что нужно сделать заранее', is_short_default: false },
  { type: 'whats_with', title: 'Что взять с собой', emoji: '🎒', hint: 'Список вещей', is_short_default: false },
  { type: 'guarantees', title: 'Гарантии', emoji: '🛡️', hint: 'Переделки, возвраты', is_short_default: false },
  { type: 'restrictions', title: 'Ограничения', emoji: '⚠️', hint: 'Беременность, аллергии', is_short_default: false },
];

export function BotKnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [open, setOpen] = useState<{ kind: 'edit'; item: KnowledgeItem } | { kind: 'create'; template: KBTemplate | null } | null>(null);

  const refresh = () => Knowledge.list().then(setItems).catch(() => undefined);

  useEffect(() => {
    refresh();
  }, []);

  const byType = useMemo(() => {
    const m = new Map<KBType, KnowledgeItem[]>();
    for (const it of items) {
      const arr = m.get(it.type) ?? [];
      arr.push(it);
      m.set(it.type, arr);
    }
    return m;
  }, [items]);

  const customs = byType.get('custom') ?? [];

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <Link to="/app/bot" className="text-sm text-mute">
          ← Бот
        </Link>
      </header>
      <div>
        <h1 className="font-display text-2xl text-ink">База знаний</h1>
        <p className="text-xs text-mute">
          Бот использует эти ответы, когда клиенты спрашивают типовые вопросы.
        </p>
      </div>

      {TEMPLATES.map((t) => {
        const existing = byType.get(t.type)?.[0] ?? null;
        return (
          <Card
            key={t.type}
            onClick={() =>
              setOpen(
                existing
                  ? { kind: 'edit', item: existing }
                  : { kind: 'create', template: t }
              )
            }
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>
                {t.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink">{t.title}</div>
                <div className={`text-xs mt-0.5 ${existing ? 'text-ink-soft' : 'text-mute'}`}>
                  {existing ? truncate(existing.content, 80) : t.hint}
                </div>
              </div>
              <span className={`text-xs ${existing ? 'text-success' : 'text-mute'}`}>
                {existing ? '✓' : '+ Заполнить'}
              </span>
            </div>
          </Card>
        );
      })}

      {customs.length > 0 && (
        <div className="text-xs uppercase tracking-wider text-mute font-semibold mt-2 px-1">
          Свои пункты
        </div>
      )}
      {customs.map((it) => (
        <Card key={it.id} onClick={() => setOpen({ kind: 'edit', item: it })} className="cursor-pointer">
          <div className="flex items-start gap-3">
            <span className="text-xl">📎</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-ink truncate">{it.title}</div>
              <div className="text-xs text-mute mt-0.5">{truncate(it.content, 80)}</div>
            </div>
          </div>
        </Card>
      ))}

      <Card
        onClick={() => setOpen({ kind: 'create', template: null })}
        className="cursor-pointer border-2 border-dashed border-divider"
      >
        <span className="text-sm text-mute">+ Свой пункт</span>
      </Card>

      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open?.kind === 'edit' ? open.item.title : 'Новый пункт'}
      >
        {open && (
          <KBForm
            initial={open.kind === 'edit' ? open.item : null}
            template={open.kind === 'create' ? open.template : null}
            onSaved={() => {
              setOpen(null);
              refresh();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function KBForm({
  initial,
  template,
  onSaved,
}: {
  initial: KnowledgeItem | null;
  template: KBTemplate | null;
  onSaved: () => void;
}) {
  const isAddress = (initial?.type ?? template?.type) === 'address';
  const [title, setTitle] = useState(initial?.title ?? template?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [lat, setLat] = useState<string>(
    initial?.geolocation_lat != null ? String(initial.geolocation_lat) : ''
  );
  const [lng, setLng] = useState<string>(
    initial?.geolocation_lng != null ? String(initial.geolocation_lng) : ''
  );
  const [yandex, setYandex] = useState(initial?.yandex_maps_url ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Заполните название и содержимое');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        geolocation_lat: lat ? Number(lat) : null,
        geolocation_lng: lng ? Number(lng) : null,
        yandex_maps_url: yandex.trim() || null,
      };
      if (initial) {
        await Knowledge.update(initial.id, payload);
      } else {
        const type = template?.type ?? 'custom';
        const is_short = template?.is_short_default ?? false;
        await Knowledge.create({ type, ...payload, is_short });
      }
      onSaved();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial || !confirm('Удалить пункт?')) return;
    setBusy(true);
    try {
      await Knowledge.remove(initial.id);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={!!template && template.type !== 'custom'}
      />
      <Textarea
        label={isAddress ? 'Адрес и как добраться' : 'Содержимое'}
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {isAddress && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Широта"
              placeholder="55.7558"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
            <Input
              label="Долгота"
              placeholder="37.6173"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
          <Input
            label="Ссылка на Яндекс.Карты"
            placeholder="https://yandex.ru/maps/-/..."
            value={yandex}
            onChange={(e) => setYandex(e.target.value)}
            hint="Если есть — бот пришлёт точку и ссылку на карту"
          />
        </>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      <Button full onClick={save} disabled={busy}>
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

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
