import { useEffect, useMemo, useState } from 'react';

import { Bookings, Clients, Schedule as ScheduleApi, Services } from '@/api';
import type {
  BookingDetail,
  ClientListItem,
  ScheduleBreak,
  ScheduleEntry,
  Service,
  TimeOff,
} from '@/api/types';
import { Button, Card, Input, Sheet } from '@/components/ui';

type View = 'day' | 'week';

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;
const HOUR_PX = 60;
const HALF_HOUR_PX = HOUR_PX / 2;
const GUTTER_PX = 44;

export function Calendar() {
  const [view, setView] = useState<View>('day');
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [breaks, setBreaks] = useState<ScheduleBreak[]>([]);
  const [timeoffs, setTimeoffs] = useState<TimeOff[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newAt, setNewAt] = useState<Date | null>(null);
  const [active, setActive] = useState<BookingDetail | null>(null);
  const [activeBreak, setActiveBreak] = useState<ScheduleBreak | null>(null);

  const refreshSchedule = () =>
    ScheduleApi.get()
      .then((d) => {
        setSchedules(d.schedules);
        setBreaks(d.breaks);
        setTimeoffs(d.time_offs);
      })
      .catch(() => undefined);

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
    refreshSchedule();
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
          schedules={schedules}
          breaks={breaks}
          timeoffs={timeoffs}
          onSlotClick={onSlotClick}
          onBookingClick={setActive}
          onBreakClick={setActiveBreak}
        />
      ) : (
        <WeekGrid
          weekStart={range.from}
          bookings={bookings}
          schedules={schedules}
          timeoffs={timeoffs}
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

      <Sheet
        open={Boolean(activeBreak)}
        onClose={() => setActiveBreak(null)}
        title="Перерыв"
      >
        {activeBreak && (
          <BreakActions
            br={activeBreak}
            day={cursor}
            onChanged={async () => {
              await refreshSchedule();
              setActiveBreak(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function BreakActions({
  br,
  day,
  onChanged,
}: {
  br: ScheduleBreak;
  day: Date;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const iso = toIsoDate(day);
  const skipped = (br.skip_dates ?? []).includes(iso);

  const skipToday = async () => {
    setBusy(true);
    try {
      await ScheduleApi.toggleBreakSkip(br.id, iso);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const removePermanent = async () => {
    if (!confirm('Удалить перерыв из расписания насовсем?')) return;
    setBusy(true);
    try {
      await ScheduleApi.removeBreak(br.id);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-mute">Перерыв</span>
          <span className="text-sm text-ink font-semibold">
            {br.start_time.slice(0, 5)} – {br.end_time.slice(0, 5)}
          </span>
          <span className="text-xs text-mute">
            Каждый {weekdayName(br.weekday)}, повторяется еженедельно.
          </span>
        </div>
      </Card>
      <Button full onClick={skipToday} disabled={busy} variant="secondary">
        {skipped ? 'Вернуть перерыв на этот день' : 'Убрать перерыв на этот день'}
      </Button>
      <Button full onClick={removePermanent} disabled={busy} variant="danger">
        Удалить перерыв насовсем
      </Button>
    </div>
  );
}

function weekdayName(weekday: number): string {
  return ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'][
    weekday
  ] ?? '';
}

// ---------------------------------------------------- Day timeline

function DayTimeline({
  day,
  bookings,
  schedules,
  breaks,
  timeoffs,
  onSlotClick,
  onBookingClick,
  onBreakClick,
}: {
  day: Date;
  bookings: BookingDetail[];
  schedules: ScheduleEntry[];
  breaks: ScheduleBreak[];
  timeoffs: TimeOff[];
  onSlotClick: (at: Date) => void;
  onBookingClick: (b: BookingDetail) => void;
  onBreakClick: (b: ScheduleBreak) => void;
}) {
  const hours = DAY_END_HOUR - DAY_START_HOUR;
  const totalHeight = hours * HOUR_PX;
  const status = dayStatus(day, schedules, timeoffs);
  const today = new Date();
  const isToday = sameDay(day, today);
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const dayStartMin = DAY_START_HOUR * 60;
  const dayEndMin = DAY_END_HOUR * 60;
  const nowTop =
    isToday && nowMin >= dayStartMin && nowMin <= dayEndMin
      ? ((nowMin - dayStartMin) / 60) * HOUR_PX
      : null;

  // Lay out overlapping bookings into columns.
  const laidOut = layoutBookings(bookings);

  const workingBands = workingHourBands(day, schedules);
  const breakBands = breakBands_(day, breaks, toIsoDate(day));

  return (
    <Card padded={false} className="overflow-hidden">
      {status.kind !== 'working' && (
        <div
          className={`text-xs font-semibold px-3 py-2 ${
            status.kind === 'time_off'
              ? 'bg-accent-soft text-accent-dark'
              : 'bg-divider text-ink-soft'
          }`}
        >
          {status.label}
        </div>
      )}
      <div className="flex relative" style={{ height: totalHeight }}>
        {/* Hour gutter */}
        <div
          className="border-r border-divider relative"
          style={{ width: GUTTER_PX, flexShrink: 0 }}
        >
          {Array.from({ length: hours }).map((_, i) => (
            <span
              key={i}
              className="absolute right-1.5 text-[10px] text-mute"
              style={{ top: i * HOUR_PX - 5 }}
            >
              {pad2(DAY_START_HOUR + i)}:00
            </span>
          ))}
        </div>

        {/* Slot column */}
        <div className="flex-1 relative">
          {/* Working-hour shading */}
          {workingBands.map((b, i) => (
            <div
              key={`work-${i}`}
              className="absolute inset-x-0 bg-accent-soft/30"
              style={{ top: b.top, height: b.height }}
            />
          ))}
          {/* Break shading (over working hours) — clickable to skip/remove. */}
          {breakBands.map((b) => (
            <button
              key={`brk-${b.br.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBreakClick(b.br);
              }}
              className="absolute inset-x-0 bg-ink/10 hover:bg-ink/20 z-[5]"
              style={{ top: b.top, height: b.height }}
              aria-label="Перерыв"
            >
              <span className="absolute left-1.5 top-1 text-[10px] uppercase tracking-wider text-ink-soft font-semibold">
                перерыв
              </span>
            </button>
          ))}

          {/* Hour and half-hour grid lines */}
          {Array.from({ length: hours + 1 }).map((_, i) => (
            <div
              key={`hl-${i}`}
              className="absolute inset-x-0 border-t border-divider"
              style={{ top: i * HOUR_PX }}
            />
          ))}
          {Array.from({ length: hours }).map((_, i) => (
            <div
              key={`hhl-${i}`}
              className="absolute inset-x-0 border-t border-dashed border-divider/50"
              style={{ top: i * HOUR_PX + HALF_HOUR_PX }}
            />
          ))}

          {/* Click-to-create slots (one per half-hour) */}
          {Array.from({ length: hours * 2 }).map((_, i) => {
            const offsetMin = i * 30;
            return (
              <button
                key={`slot-${i}`}
                type="button"
                onClick={() => {
                  const at = new Date(day);
                  const totalMin = DAY_START_HOUR * 60 + offsetMin;
                  at.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
                  onSlotClick(at);
                }}
                className="absolute left-0 right-0 hover:bg-bg/40 active:bg-bg"
                style={{ top: (offsetMin / 60) * HOUR_PX, height: HALF_HOUR_PX }}
              />
            );
          })}

          {/* Now line */}
          {nowTop !== null && (
            <>
              <div
                className="absolute left-0 right-0 z-10 border-t-2 border-accent"
                style={{ top: nowTop }}
              />
              <div
                className="absolute z-10 w-2 h-2 rounded-full bg-accent"
                style={{ top: nowTop - 4, left: -4 }}
              />
            </>
          )}

          {/* Booking blocks */}
          {laidOut.map(({ booking, top, height, col, columns }) => {
            const isCancelled =
              booking.status === 'cancelled' || booking.status === 'no_show';
            const widthPct = 100 / columns;
            return (
              <button
                key={booking.id}
                type="button"
                onClick={() => onBookingClick(booking)}
                className={`absolute rounded-lg px-2 py-1 text-left text-[11px] shadow-sm border overflow-hidden z-20 ${
                  isCancelled
                    ? 'bg-divider text-mute border-divider line-through'
                    : 'bg-accent-soft border-accent/40 text-accent-dark'
                }`}
                style={{
                  top,
                  height: Math.max(height, 24),
                  left: `calc(${col * widthPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                }}
              >
                <div className="font-semibold truncate">
                  {fmtTime(booking.starts_at)}–{fmtTime(booking.ends_at)}
                </div>
                <div className="truncate">
                  {booking.client_name ?? `tg:${booking.client_id}`}
                </div>
                {height > 36 && booking.service_name && (
                  <div className="truncate opacity-80">{booking.service_name}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

interface LaidOutBooking {
  booking: BookingDetail;
  top: number;
  height: number;
  col: number;
  columns: number;
}

function layoutBookings(bookings: BookingDetail[]): LaidOutBooking[] {
  const visible = bookings
    .map((b) => {
      const layout = bookingLayout(b);
      return layout ? { booking: b, ...layout } : null;
    })
    .filter((x): x is { booking: BookingDetail; top: number; height: number } => x !== null)
    .sort((a, b) => a.top - b.top || a.height - b.height);

  // Group into clusters of overlapping events; each cluster is split into
  // columns so concurrent bookings sit side by side.
  type Item = LaidOutBooking;
  const out: Item[] = [];
  let cluster: Item[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const cols = cluster.reduce((max, c) => Math.max(max, c.col + 1), 0) || 1;
    cluster.forEach((c) => out.push({ ...c, columns: cols }));
    cluster = [];
    clusterEnd = -1;
  };

  for (const v of visible) {
    if (v.top >= clusterEnd) {
      flush();
    }
    // Find the lowest-index column free at this top.
    const taken = new Set(cluster.filter((c) => c.top + c.height > v.top).map((c) => c.col));
    let col = 0;
    while (taken.has(col)) col++;
    cluster.push({ booking: v.booking, top: v.top, height: v.height, col, columns: 1 });
    clusterEnd = Math.max(clusterEnd, v.top + v.height);
  }
  flush();
  return out;
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

function workingHourBands(day: Date, schedules: ScheduleEntry[]) {
  const weekday = (day.getDay() + 6) % 7; // ru: Mon=0
  return schedules
    .filter((s) => s.weekday === weekday && s.is_working)
    .map((s) => ({
      top: hhmmToOffset(s.start_time),
      height: hhmmToOffset(s.end_time) - hhmmToOffset(s.start_time),
    }))
    .filter((b) => b.height > 0);
}

function breakBands_(day: Date, breaks: ScheduleBreak[], iso: string) {
  const weekday = (day.getDay() + 6) % 7;
  return breaks
    .filter((b) => b.weekday === weekday && !(b.skip_dates ?? []).includes(iso))
    .map((b) => ({
      br: b,
      top: hhmmToOffset(b.start_time),
      height: hhmmToOffset(b.end_time) - hhmmToOffset(b.start_time),
    }))
    .filter((b) => b.height > 0);
}

function hhmmToOffset(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0);
  return ((Math.max(total, DAY_START_HOUR * 60) - DAY_START_HOUR * 60) / 60) * HOUR_PX;
}

// ---------------------------------------------------- Week grid

interface DayStatus {
  kind: 'working' | 'off' | 'time_off';
  label: string;
  hours?: string;
}

function dayStatus(d: Date, schedules: ScheduleEntry[], timeoffs: TimeOff[]): DayStatus {
  const iso = toIsoDate(d);
  const off = timeoffs.find((t) => t.date_from <= iso && t.date_to >= iso);
  if (off) {
    return { kind: 'time_off', label: off.reason ? `Отпуск · ${off.reason}` : 'Отпуск' };
  }
  const weekday = (d.getDay() + 6) % 7;
  const sched = schedules.find((s) => s.weekday === weekday);
  if (!sched || !sched.is_working) {
    return { kind: 'off', label: 'Выходной' };
  }
  return {
    kind: 'working',
    label: 'Рабочий день',
    hours: `${sched.start_time.slice(0, 5)}–${sched.end_time.slice(0, 5)}`,
  };
}

function WeekGrid({
  weekStart,
  bookings,
  schedules,
  timeoffs,
  onSlotClick,
  onBookingClick,
}: {
  weekStart: Date;
  bookings: BookingDetail[];
  schedules: ScheduleEntry[];
  timeoffs: TimeOff[];
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
        const status = dayStatus(d, schedules, timeoffs);
        const isOff = status.kind !== 'working';
        const cardClass = [
          isToday ? 'border-accent/60' : '',
          isOff ? 'bg-bg/60 border-dashed' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <Card key={d.toISOString()} className={cardClass}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className={`flex flex-col ${isOff ? 'opacity-60' : ''}`}>
                  <span className="text-xs uppercase tracking-wider text-mute font-semibold">
                    {weekdayShort(d)}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {formatDayShort(d)}
                  </span>
                </div>
                {isOff && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      status.kind === 'time_off'
                        ? 'bg-accent-soft text-accent-dark'
                        : 'bg-divider text-mute'
                    }`}
                  >
                    {status.label}
                  </span>
                )}
                {!isOff && status.hours && (
                  <span className="text-[10px] text-mute">{status.hours}</span>
                )}
              </div>
              {!isOff && (
                <button
                  type="button"
                  onClick={() => {
                    const at = new Date(d);
                    at.setHours(12, 0, 0, 0);
                    onSlotClick(at);
                  }}
                  className="text-mute text-lg leading-none w-7 h-7 grid place-items-center"
                  aria-label="Новая запись"
                >
                  +
                </button>
              )}
            </div>
            {isOff && dayBookings.length === 0 ? null : dayBookings.length === 0 ? (
              <p className="text-xs text-mute">Записей нет</p>
            ) : (
              <div className="flex flex-col gap-1">
                {dayBookings.map((b) => {
                  const isCancelled =
                    b.status === 'cancelled' || b.status === 'no_show';
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
                      <span className="font-semibold w-12 shrink-0">
                        {fmtTime(b.starts_at)}
                      </span>
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

  // Client picker state
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<ClientListItem[]>([]);
  const [picked, setPicked] = useState<ClientListItem | null>(null);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const initialDate = presetAt ?? new Date();
  const [date, setDate] = useState(toIsoDate(initialDate));
  const [time, setTime] = useState(
    `${pad2(initialDate.getHours())}:${pad2(initialDate.getMinutes())}`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live search through Clients.list({q}). Debounced so we don't hammer the
  // API on every keystroke.
  useEffect(() => {
    if (picked || manual) return;
    const q = query.trim();
    const t = setTimeout(() => {
      Clients.list({ q: q || undefined })
        .then((rows) => setMatches(rows.slice(0, 8)))
        .catch(() => setMatches([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query, picked, manual]);

  const reset = () => {
    setPicked(null);
    setManual(false);
    setQuery('');
    setName('');
    setPhone('');
  };

  const save = async () => {
    if (!serviceId) return;
    setBusy(true);
    setError(null);
    try {
      const startsAt = new Date(`${date}T${time}:00`).toISOString();
      const body: Parameters<typeof Bookings.create>[0] = {
        service_id: serviceId,
        starts_at: startsAt,
      };
      if (picked) {
        body.client_id = picked.id;
      } else {
        if (!name.trim() && !phone.trim()) {
          setError('Укажите имя или телефон клиента');
          setBusy(false);
          return;
        }
        body.client_name = name.trim() || undefined;
        body.client_phone = phone.trim() || undefined;
      }
      await Bookings.create(body);
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

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-ink-soft font-medium">Клиент</span>

        {picked && (
          <Card>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-ink truncate">
                  {picked.name ?? `tg:${picked.telegram_id}`}
                </span>
                <span className="text-xs text-mute">
                  {picked.phone ?? '—'} · {picked.visits_total} визит(ов)
                </span>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-xs text-mute underline"
              >
                Сменить
              </button>
            </div>
          </Card>
        )}

        {!picked && manual && (
          <>
            <Input
              label="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Анна"
            />
            <Input
              label="Телефон"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7…"
            />
            <button
              type="button"
              onClick={reset}
              className="text-xs text-mute underline self-start"
            >
              ← Назад к поиску
            </button>
          </>
        )}

        {!picked && !manual && (
          <>
            <Input
              placeholder="Поиск по имени или телефону"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {matches.length > 0 ? (
              <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                {matches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPicked(c)}
                    className="text-left px-3 py-2 rounded-lg border border-divider bg-card hover:bg-bg"
                  >
                    <div className="text-sm font-semibold text-ink truncate">
                      {c.name ?? `tg:${c.telegram_id}`}
                    </div>
                    <div className="text-xs text-mute">
                      {c.phone ?? '—'} · {c.visits_total} визит(ов)
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mute">
                {query.trim() ? 'Никого не нашлось.' : 'Начните вводить имя или телефон.'}
              </p>
            )}
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setManual(true);
                setName(query.trim());
              }}
            >
              + Новый клиент
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      <Button
        full
        disabled={!serviceId || (!picked && !manual) || busy}
        onClick={save}
      >
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
          {(booking.addons ?? []).length > 0 && (
            <div className="mt-2 pt-2 border-t border-divider flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-mute font-semibold">
                Доп. опции
              </span>
              {(booking.addons ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span className="text-ink-soft truncate">{a.name}</span>
                  <span className="text-mute whitespace-nowrap ml-2">
                    {a.duration_delta > 0 ? `+${a.duration_delta}` : a.duration_delta} мин
                    {' · '}
                    {Number(a.price_delta) > 0 ? `+${Math.round(Number(a.price_delta))}` : Math.round(Number(a.price_delta))} ₽
                  </span>
                </div>
              ))}
            </div>
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
