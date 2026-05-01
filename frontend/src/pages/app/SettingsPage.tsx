import { useEffect, useState } from 'react';

import { BotSettings } from '@/api';
import type { BotSettings as BotSettingsType } from '@/api/types';
import { Button, Card } from '@/components/ui';

const PRESET_OFFSETS: { value: number; label: string }[] = [
  { value: 10, label: '10 минут' },
  { value: 30, label: '30 минут' },
  { value: 60, label: '1 час' },
  { value: 120, label: '2 часа' },
  { value: 1440, label: 'За сутки' },
];

export function SettingsPage() {
  const [bs, setBs] = useState<BotSettingsType | null>(null);

  // Daily digest config
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestHour, setDigestHour] = useState(10);

  // Pre-visit reminders config
  const [preEnabled, setPreEnabled] = useState(true);
  const [offsets, setOffsets] = useState<Set<number>>(new Set([10, 60]));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    BotSettings.get()
      .then((s) => {
        setBs(s);
        setDigestEnabled(s.master_digest_enabled);
        setDigestHour(s.master_digest_hour);
        setPreEnabled(s.master_pre_visit_enabled);
        setOffsets(new Set(s.master_pre_visit_offsets));
      })
      .catch(() => undefined);
  }, []);

  const toggleOffset = (v: number) => {
    setOffsets((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await BotSettings.update({
        master_digest_enabled: digestEnabled,
        master_digest_hour: digestHour,
        master_pre_visit_enabled: preEnabled,
        master_pre_visit_offsets: Array.from(offsets).sort((a, b) => a - b),
      });
      setBs(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  if (!bs) {
    return <div className="text-sm text-mute animate-pulse">Загружаем…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink">Настройки</h1>

      {/* Daily digest */}
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-base font-semibold text-ink">📅 Расписание</div>
              <p className="text-xs text-mute mt-1">
                Уведомление каждый день о записях на сегодня. Бот пришлёт его в чат
                в выбранное время.
              </p>
            </div>
            <Toggle on={digestEnabled} onChange={() => setDigestEnabled(!digestEnabled)} />
          </div>
          {digestEnabled && (
            <div className="pt-3 border-t border-divider flex items-center gap-3">
              <span className="text-sm text-ink-soft">Время:</span>
              <select
                value={digestHour}
                onChange={(e) => setDigestHour(Number(e.target.value))}
                className="bg-card border border-divider rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <span className="text-xs text-mute">по вашему часовому поясу</span>
            </div>
          )}
        </div>
      </Card>

      {/* Pre-visit reminders */}
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-base font-semibold text-ink">🔔 Уведомление до начала записи</div>
              <p className="text-xs text-mute mt-1">
                Бот напомнит вам о клиенте за указанное время до начала сеанса.
                Можно выбрать несколько вариантов.
              </p>
            </div>
            <Toggle on={preEnabled} onChange={() => setPreEnabled(!preEnabled)} />
          </div>
          {preEnabled && (
            <div className="pt-3 border-t border-divider flex flex-wrap gap-2">
              {PRESET_OFFSETS.map((opt) => {
                const on = offsets.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOffset(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition ${
                      on
                        ? 'border-accent bg-accent-soft text-accent-dark'
                        : 'border-divider bg-card text-mute'
                    }`}
                  >
                    {on ? '✓ ' : ''}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Card>
          <p className="text-xs text-danger">{error}</p>
        </Card>
      )}

      <Button onClick={save} disabled={busy} full>
        {saved ? 'Сохранено ✓' : busy ? 'Сохраняем…' : 'Сохранить'}
      </Button>

      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-mute uppercase tracking-wider">Версия</span>
          <span className="text-sm text-ink-soft">Beauty.dev · v1.0</span>
        </div>
      </Card>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition flex-shrink-0 ${
        on ? 'bg-accent' : 'bg-divider'
      }`}
      aria-label={on ? 'Выключить' : 'Включить'}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card transition-transform ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

