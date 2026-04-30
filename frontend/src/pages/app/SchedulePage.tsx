import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Schedule as ScheduleApi } from '@/api';
import type { ScheduleBreak, ScheduleEntry, TimeOff } from '@/api/types';
import { Button, Card, Input, Sheet } from '@/components/ui';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [breaks, setBreaks] = useState<ScheduleBreak[]>([]);
  const [timeoffs, setTimeoffs] = useState<TimeOff[]>([]);
  const [showBreak, setShowBreak] = useState(false);
  const [showOff, setShowOff] = useState(false);

  const load = async () => {
    const data = await ScheduleApi.get();
    // Backend may return entries for some weekdays only; pad to 7.
    const map = new Map(data.schedules.map((s) => [s.weekday, s]));
    const all: ScheduleEntry[] = WEEKDAYS.map((_, i) =>
      map.get(i) ?? {
        weekday: i,
        start_time: '10:00',
        end_time: '20:00',
        is_working: false,
      }
    );
    setSchedules(all);
    setBreaks(data.breaks);
    setTimeoffs(data.time_offs);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const updateDay = (i: number, patch: Partial<ScheduleEntry>) => {
    setSchedules((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const save = async () => {
    await ScheduleApi.replace(schedules);
    load().catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <Link to="/app/settings" className="text-sm text-mute">
          ← Настройки
        </Link>
      </header>
      <h1 className="font-display text-2xl text-ink">Расписание</h1>

      <div className="flex flex-col gap-2">
        {schedules.map((s, i) => (
          <Card key={i}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateDay(i, { is_working: !s.is_working })}
                className={`w-12 h-12 rounded-xl font-semibold ${
                  s.is_working ? 'bg-accent text-white' : 'bg-divider text-mute'
                }`}
              >
                {WEEKDAYS[i]}
              </button>
              <div className="flex gap-2 flex-1">
                <input
                  type="time"
                  disabled={!s.is_working}
                  value={s.start_time.slice(0, 5)}
                  onChange={(e) => updateDay(i, { start_time: e.target.value })}
                  className="flex-1 h-10 px-2 rounded-lg border border-divider bg-card text-sm disabled:opacity-50"
                />
                <input
                  type="time"
                  disabled={!s.is_working}
                  value={s.end_time.slice(0, 5)}
                  onChange={(e) => updateDay(i, { end_time: e.target.value })}
                  className="flex-1 h-10 px-2 rounded-lg border border-divider bg-card text-sm disabled:opacity-50"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button full onClick={save}>
        Сохранить расписание
      </Button>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Перерывы</h2>
          <Button size="md" variant="secondary" onClick={() => setShowBreak(true)}>
            + Перерыв
          </Button>
        </div>
        {breaks.length === 0 ? (
          <Card>
            <p className="text-sm text-mute">Перерывов нет.</p>
          </Card>
        ) : (
          breaks.map((b) => (
            <Card key={b.id}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink">
                  {WEEKDAYS[b.weekday]} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    ScheduleApi.removeBreak(b.id).then(() => load().catch(() => undefined))
                  }
                  className="text-mute text-sm"
                >
                  ×
                </button>
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Отпуска</h2>
          <Button size="md" variant="secondary" onClick={() => setShowOff(true)}>
            + Период
          </Button>
        </div>
        {timeoffs.length === 0 ? (
          <Card>
            <p className="text-sm text-mute">Отпусков нет.</p>
          </Card>
        ) : (
          timeoffs.map((o) => (
            <Card key={o.id}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm text-ink">
                    {o.date_from} → {o.date_to}
                  </span>
                  {o.reason && (
                    <span className="text-xs text-mute">{o.reason}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    ScheduleApi.removeTimeOff(o.id).then(() =>
                      load().catch(() => undefined)
                    )
                  }
                  className="text-mute text-sm"
                >
                  ×
                </button>
              </div>
            </Card>
          ))
        )}
      </section>

      <Sheet
        open={showBreak}
        onClose={() => setShowBreak(false)}
        title="Новый перерыв"
      >
        <BreakForm
          onSaved={() => {
            setShowBreak(false);
            load().catch(() => undefined);
          }}
        />
      </Sheet>
      <Sheet
        open={showOff}
        onClose={() => setShowOff(false)}
        title="Новый отпуск"
      >
        <TimeOffForm
          onSaved={() => {
            setShowOff(false);
            load().catch(() => undefined);
          }}
        />
      </Sheet>
    </div>
  );
}

function BreakForm({ onSaved }: { onSaved: () => void }) {
  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState('13:00');
  const [end, setEnd] = useState('14:00');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await ScheduleApi.addBreak({
        weekday,
        start_time: start,
        end_time: end,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="text-sm text-ink-soft font-medium">День</span>
        <div className="grid grid-cols-7 gap-1 mt-1.5">
          {WEEKDAYS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setWeekday(i)}
              className={`h-10 rounded-lg text-sm font-semibold ${
                weekday === i
                  ? 'bg-accent text-white'
                  : 'bg-divider text-mute'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Начало"
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <Input
          label="Конец"
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <Button full onClick={save} disabled={busy}>
        Добавить
      </Button>
    </div>
  );
}

function TimeOffForm({ onSaved }: { onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await ScheduleApi.addTimeOff({
        date_from: from,
        date_to: to,
        reason: reason || undefined,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="С"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          label="По"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Input
        label="Причина (опционально)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button full onClick={save} disabled={busy}>
        Добавить
      </Button>
    </div>
  );
}
