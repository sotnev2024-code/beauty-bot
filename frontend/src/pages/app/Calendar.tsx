import { useEffect, useState } from 'react';

import { Bookings } from '@/api';
import type { BookingDetail } from '@/api/types';
import { Card } from '@/components/ui';

export function Calendar() {
  const [bookings, setBookings] = useState<BookingDetail[]>([]);

  useEffect(() => {
    Bookings.list().then(setBookings).catch(() => undefined);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink">Календарь</h1>
      {bookings.length === 0 ? (
        <Card>
          <p className="text-sm text-mute">Записей пока нет — как только клиент подтвердит время, оно появится здесь.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((b) => (
            <Card key={b.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">
                    {b.client_name ?? `tg:${b.client_id}`}
                  </span>
                  <span className="text-xs text-mute">
                    {b.service_name ?? '—'} · {fmtDate(b.starts_at)}
                  </span>
                </div>
                <StatusPill status={b.status} />
              </div>
            </Card>
          ))}
        </div>
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
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{status}</span>;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
