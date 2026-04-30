import { useEffect, useState } from 'react';

import { Bookings, Services } from '@/api';
import type { BookingDetail, Service } from '@/api/types';
import { Button, Card, Input, Sheet } from '@/components/ui';

export function Calendar() {
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [active, setActive] = useState<BookingDetail | null>(null);

  const load = () => Bookings.list({}).then(setBookings).catch(() => undefined);

  useEffect(() => {
    load();
    Services.list().then(setServices).catch(() => undefined);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Календарь</h1>
        <Button size="md" onClick={() => setShowNew(true)}>
          + Запись
        </Button>
      </header>

      {bookings.length === 0 ? (
        <Card>
          <p className="text-sm text-mute">
            Записей пока нет — как только клиент подтвердит время, оно появится здесь.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {groupByDay(bookings).map(([day, items]) => (
            <div key={day} className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wider text-mute font-semibold pl-1">
                {day}
              </span>
              {items.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className="text-left"
                  onClick={() => setActive(b)}
                >
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-ink">
                          {b.client_name ?? `tg:${b.client_id}`}
                        </span>
                        <span className="text-xs text-mute">
                          {b.service_name ?? '—'} · {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)}
                        </span>
                      </div>
                      <StatusPill status={b.status} />
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="Новая запись">
        <NewBookingForm
          services={services}
          onSaved={() => {
            setShowNew(false);
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

function NewBookingForm({
  services,
  onSaved,
}: {
  services: Service[];
  onSaved: () => void;
}) {
  const [serviceId, setServiceId] = useState<number | null>(services[0]?.id ?? null);
  const [tg, setTg] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const today = new Date();
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [time, setTime] = useState('12:00');
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
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
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
      <Input label="Telegram ID клиента" type="number" value={tg} onChange={(e) => setTg(e.target.value)} />
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

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'done'
      ? 'bg-success/10 text-success'
      : status === 'cancelled' || status === 'no_show'
        ? 'bg-divider text-mute'
        : 'bg-accent-soft text-accent-dark';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  );
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

function groupByDay(items: BookingDetail[]): [string, BookingDetail[]][] {
  const buckets = new Map<string, BookingDetail[]>();
  for (const b of items) {
    const d = new Date(b.starts_at);
    const key = d.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
    });
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(b);
  }
  return [...buckets.entries()];
}
