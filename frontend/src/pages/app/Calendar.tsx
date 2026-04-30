import { useEffect, useMemo, useState } from 'react';

import { Bookings, Services } from '@/api';
import type { BookingDetail, Service } from '@/api/types';
import { Button, Card, Input, Sheet } from '@/components/ui';

type View = 'day' | 'week';

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const HOUR_PX = 56; // pixel height of one hour in the timeline

export function Calendar() {
  const [view, setView] = useState<View>('day');
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newAt, setNewAt] = useState<Date | null>(null);
  const [active, setActive] = useState<BookingDetail | null>(null);

  const range = useMemo(() => computeRange(cursor, view), [cursor, view]);

  const load = () =>
    Bookings.list({
      from_date: toIsoDate(range.from),
      to_date: toIsoDate(range.to),
    })
      .then(setBookings)
      .catch(() => undefined);

  useEffect(() => {
    load();
    Services.list().then(setServices).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, view]);

  const onSlotClick = (at: Date) => {
    setNewAt(at);
    setShowNew(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-ink">Календарь</h1>
        <div className="flex bg-card border border-divider rounded-xl overflow-hidden text-xs font-semibold">
          <button
            type="button"
            onClick={() => setView('day')}
            className={`px-3 py-1.5 ${view === 'day' ? 'bg-accent text-white' : 'text-mute'}`}
          >
            День
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={`px-3 py-1.5 ${view === 'week' ? 'bg-accent text-white' : 'text-mute'}`}
          >
            Неделя
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor(shiftDate(cursor, view, -1))}
          className="w-9 h-9 rounded-lg border border-divider text-ink-soft"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            setCursor(d);
          }}
          className="text-sm font-semibold text-ink"
        >
          {view === 'day' ? formatDay(cursor) : formatWeekRange(cursor)}
        </button>
        <button
          type="button"
          onClick={() => setCursor(shiftDate(cursor, view, 1))}
          className="w-9 h-9 rounded-lg border border-divider text-ink-soft"
        >
          ›
        </button>
      </div>

      <div className="flex justify-end">
        <Button
          size="md"
          onClick={() => {
            const d = new Date(cursor);
            d.setHours(12, 0, 0, 0);
            setNewAt(d);
            setShowNew(true);
          }}
        >
          + Запись
        </Button>
      </div>

      {view === 'day' ? (
        <DayTimeline
          day={cursor}
          bookings={bookings.filter((b) => sameDay(new Date(b.starts_at), cursor))}
          onSlotClick={onSlotClick}
          onBookingClick={setActive}
        />
      ) : (
        <WeekGrid
          weekStart={range.from}
          bookings={bookings}
          onSlotClick={onSlotClick}
          onBookingClick={setActive}
        />
      )}

      <Sheet
        open={showNew}
        onClose={() => {
          setShowNew(false);
          setNewAt(null);
        }}
        title="Новая запись"
      >
        <NewBookingForm
          services={services}
          presetAt={newAt}
          onSaved={() => {
            setShowNew(false);
            setNewAt(null);
            load();
          }}
        />
      </Sheet>

      <Sheet
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title="Запись"
      >
        {active && (
          <BookingDetailView
            booking={active}
            onChange={load}
            onClose={() => setActive(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------- Day timeline

function DayTimeline({
  day,
  bookings,
  onSlotClick,
  onBookingClick,
}: {
  day: Date;
  bookings: BookingDetail[];
  onSlotClick: (at: Date) => void;
  onBookingClick: (b: BookingDetail) => void;
}) {
  const hours = DAY_END_HOUR - DAY_START_HOUR;
  const totalHeight = hours * HOUR_PX;

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex relative" style={{ height: totalHeight }}>
        {/* Hour gutter */}
        <div className="w-10 border-r border-divider flex flex-col">
          {Array.from({ length: hours + 1 }).map((_, i) => (
            <div
              key={i}
              className="text-[10px] text-mute pr-1 text-right -mt-1.5 first:mt-0"
              style={{ height: HOUR_PX }}
            >
              {i < hours ? `${pad2(DAY_START_HOUR + i)}:00` : ''}
            </div>
          ))}
        </div>

        {/* Slot column */}
        <div className="flex-1 relative">
          {Array.from({ length: hours }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const at = new Date(day);
                at.setHours(DAY_START_HOUR + i, 0, 0, 0);
                onSlotClick(at);
              }}
              className="absolute left-0 right-0 border-t border-divider hover:bg-bg/50 active:bg-bg"
              style={{ top: i * HOUR_PX, height: HOUR_PX }}
            />
          ))}

          {bookings.map((b) => {
            const layout = bookingLayout(b);
            if (!layout) return null;
            const isCancelled = b.status === 'cancelled' || b.status === 'no_show';
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onBookingClick(b)}
                className={`absolute left-1 right-1 rounded-lg px-2 py-1 text-left text-[11px] shadow-sm border overflow-hidden ${
                  isCancelled
                    ? 'bg-divider text-mute border-divider line-through'
                    : 'bg-accent-soft border-accent/40 text-accent-dark'
                }`}
                style={{
                  top: layout.top,
                  height: Math.max(layout.height, 22),
                }}
              >
                <div className="font-semibold truncate">
                  {fmtTime(b.starts_at)} · {b.client_name ?? `tg:${b.client_id}`}
                </div>
                <div className="truncate opacity-80">{b.service_name ?? ''}</div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function bookingLayout(b: BookingDetail): { top: number; height: number } | null {
  const start = new Date(b.starts_at);
  const end = new Date(b.ends_at);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const dayStart = DAY_START_HOUR * 60;
  const dayEnd = DAY_END_HOUR * 60;
  if (endMin <= dayStart || startMin >= dayEnd) return null;
  const top = ((Math.max(startMin, dayStart) - dayStart) / 60) * HOUR_PX;
  const height = ((Math.min(endMin, dayEnd) - Math.max(startMin, dayStart)) / 60) * HOUR_PX;
  return { top, height };
}

// ---------------------------------------------------- Week grid

function WeekGrid({
  weekStart,
  bookings,
  onSlotClick,
  onBookingClick,
}: {
  weekStart: Date;
  bookings: BookingDetail[];
  onSlotClick: (at: Date) => void;
  onBookingClick: (b: BookingDetail) => void;
}) {
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col gap-2">
      {days.map((d) => {
        const dayBookings = bookings
          .filter((b) => sameDay(new Date(b.starts_at), d))
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        const isToday = sameDay(d, today);
        return (
          <Card key={d.toISOString()} className={isToday ? 'border-accent/60' : ''}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider text-mute font-semibold">
                  {weekdayShort(d)}
                </span>
                <span className="text-sm font-semibold text-ink">{formatDayShort(d)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const at = new Date(d);
                  at.setHours(12, 0, 0, 0);
                  onSlotClick(at);
                }}
                className="text-mute text-lg"
              >
                +
              </button>
            </div>
            {dayBookings.length === 0 ? (
              <p className="text-xs text-mute">Записей нет</p>
            ) : (
              <div className="flex flex-col gap-1">
                {dayBookings.map((b) => {
                  const isCancelled = b.status === 'cancelled' || b.status === 'no_show';
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onBookingClick(b)}
                      className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs ${
                        isCancelled
                          ? 'bg-divider text-mute line-through'
                          : 'bg-accent-soft text-accent-dark'
                      }`}
                    >
                      <span className="font-semibold w-12 shrink-0">{fmtTime(b.starts_at)}</span>
                      <span className="truncate flex-1 text-left">
                        {b.client_name ?? `tg:${b.client_id}`}
                      </span>
                      <span className="truncate opacity-70 max-w-[120px]">
                        {b.service_name ?? ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------- Sheets (reused)

function NewBookingForm({
  services,
  presetAt,
  onSaved,
}: {
  services: Service[];
  presetAt: Date | null;
  onSaved: () => void;
}) {
  const [serviceId, setServiceId] = useState<number | null>(services[0]?.id ?? null);
  const [tg, setTg] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const initialDate = presetAt ?? new Date();
  const [date, setDate] = useState(toIsoDate(initialDate));
  const [time, setTime] = useState(
    `${pad2(initialDate.getHours())}:${pad2(initialDate.getMinutes())}`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!serviceId || !tg) return;
    setBusy(true);
    setError(null);
    try {
      const startsAt = new Date(`${date}T${time}:00`).toISOString();
      await Bookings.create({
        service_id: serviceId,
        client_telegram_id: Number(tg),
        client_name: name || undefined,
        client_phone: phone || undefined,
        starts_at: startsAt,
      });
      onSaved();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detail ?? 'Не удалось создать запись');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="text-sm text-ink-soft font-medium">Услуга</span>
        <div className="flex flex-col gap-1.5 mt-1.5">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceId(s.id)}
              className={`text-left p-3 rounded-xl border ${
                serviceId === s.id
                  ? 'border-accent bg-accent-soft'
                  : 'border-divider bg-card'
              }`}
            >
              <span className="text-sm font-semibold text-ink">{s.name}</span>
              <span className="text-xs text-mute block">
                {s.duration_minutes} мин · {Math.round(Number(s.price))} ₽
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Дата" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Время" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <Input
        label="Telegram ID клиента"
        type="number"
        value={tg}
        onChange={(e) => setTg(e.target.value)}
      />
      <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button full disabled={!serviceId || !tg || busy} onClick={save}>
        Создать запись
      </Button>
    </div>
  );
}

function BookingDetailView({
  booking,
  onChange,
  onClose,
}: {
  booking: BookingDetail;
  onChange: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    if (!confirm('Отменить запись?')) return;
    setBusy(true);
    try {
      await Bookings.cancel(booking.id);
      onChange();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-mute">Клиент</span>
          <span className="text-sm text-ink font-semibold">
            {booking.client_name ?? `tg:${booking.client_id}`}
          </span>
          {booking.client_phone && (
            <span className="text-xs text-ink-soft">{booking.client_phone}</span>
          )}
        </div>
      </Card>
      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-mute">Услуга</span>
          <span className="text-sm text-ink">{booking.service_name ?? '—'}</span>
          <span className="text-xs text-mute">
            {fmtDate(booking.starts_at)} — {fmtTime(booking.ends_at)}
          </span>
          {booking.price && (
            <span className="text-xs text-ink-soft">
              {Math.round(Number(booking.price)).toLocaleString('ru-RU')} ₽
            </span>
          )}
        </div>
      </Card>
      {booking.status !== 'cancelled' && (
        <Button full variant="danger" onClick={cancel} disabled={busy}>
          Отменить запись
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------- date helpers

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function shiftDate(d: Date, view: View, dir: 1 | -1): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + (view === 'day' ? dir : 7 * dir));
  return next;
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const dow = (out.getDay() + 6) % 7; // ru: Mon=0, Sun=6
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

function computeRange(cursor: Date, view: View): { from: Date; to: Date } {
  if (view === 'day') {
    return { from: cursor, to: cursor };
  }
  const from = startOfWeek(cursor);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { from, to };
}

function formatDay(d: Date): string {
  return d.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatDayShort(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
}

function formatWeekRange(d: Date): string {
  const from = startOfWeek(d);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  const sameMonth = from.getMonth() === to.getMonth();
  const fromStr = from.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: sameMonth ? undefined : 'short',
  });
  const toStr = to.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  return `${fromStr} – ${toStr}`;
}

function weekdayShort(d: Date): string {
  return d.toLocaleDateString('ru-RU', { weekday: 'short' });
}
