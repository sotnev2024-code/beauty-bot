import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { BotReminders, BotSettings, ReturnSettingsApi, Services } from '@/api';
import type {
  BotSettings as BotSettingsType,
  ReturnSettings,
  Service,
} from '@/api/types';
import { Button, Card, Input } from '@/components/ui';

export function BotAutomationPage() {
  const [bot, setBot] = useState<BotSettingsType | null>(null);
  const [ret, setRet] = useState<ReturnSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Return form
  const [days, setDays] = useState(60);
  const [pct, setPct] = useState(15);
  const [valid, setValid] = useState(7);
  const [showReturnForm, setShowReturnForm] = useState(false);

  const refresh = () =>
    Promise.all([BotSettings.get(), ReturnSettingsApi.get(), Services.list()]).then(
      ([b, r, s]) => {
        setBot(b);
        setRet(r);
        setServices(s);
        setDays(r.trigger_after_days);
        setPct(r.discount_percent);
        setValid(r.discount_valid_days);
      }
    );

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const servicesWithReminder = services.filter((s) => s.reminder_after_days != null);
  const remindersOn = bot?.reminders_enabled ?? false;
  const returnOn = ret?.is_enabled ?? false;

  const toggleReminders = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = remindersOn ? await BotReminders.disable() : await BotReminders.enable();
      setBot(next);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Не удалось переключить');
    } finally {
      setBusy(false);
    }
  };

  const saveReturn = async () => {
    setBusy(true);
    setError(null);
    try {
      await ReturnSettingsApi.update({
        trigger_after_days: days,
        discount_percent: pct,
        discount_valid_days: valid,
      });
      const next = await ReturnSettingsApi.enable();
      setRet(next);
      setShowReturnForm(false);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const disableReturn = async () => {
    setBusy(true);
    try {
      const next = await ReturnSettingsApi.disable();
      setRet(next);
    } finally {
      setBusy(false);
    }
  };

  if (!bot || !ret) {
    return <div className="text-sm text-mute animate-pulse">Загружаем…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-display text-2xl text-ink">Автоматизация</h1>
        <p className="text-xs text-mute">Бот сам пишет клиентам в нужный момент.</p>
      </div>

      {error && (
        <Card>
          <p className="text-xs text-danger">{error}</p>
        </Card>
      )}

      {/* Section 1: service reminders */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="text-base font-semibold text-ink">
              🔔 Напоминания о повторной записи
            </div>
            <p className="text-xs text-mute mt-1">
              Бот сам напомнит клиентке записаться через N дней после визита.
            </p>
            <p className="text-xs text-ink-soft mt-2">
              Сейчас настроено: {servicesWithReminder.length} из {services.length} услуг.{' '}
              <Link to="/app/bot/services" className="text-accent">
                Настроить
              </Link>
            </p>
          </div>
          <Toggle on={remindersOn} disabled={busy} onChange={toggleReminders} />
        </div>
      </Card>

      {/* Section 2: master-side notifications (digest + pre-visit reminders) */}
      <Card>
        <div className="text-base font-semibold text-ink">📅 Уведомления вам</div>
        <p className="text-xs text-mute mt-1">
          Бот пишет вам в личные сообщения — кратко, без флуда.
        </p>

        {/* Daily digest */}
        <div className="mt-3 pt-3 border-t border-divider">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink">
                Утренний дайджест
              </div>
              <p className="text-xs text-mute mt-1">
                Список записей на сегодня — каждое утро в выбранное время.
              </p>
            </div>
            <Toggle
              on={bot.master_digest_enabled}
              disabled={busy}
              onChange={async () => {
                setBusy(true);
                try {
                  const next = await BotSettings.update({
                    master_digest_enabled: !bot.master_digest_enabled,
                  });
                  setBot(next);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
          {bot.master_digest_enabled && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-mute">Время отправки:</span>
              <select
                value={bot.master_digest_hour}
                disabled={busy}
                className="bg-card border border-divider rounded-lg px-2 py-1 text-sm text-ink"
                onChange={async (e) => {
                  setBusy(true);
                  try {
                    const next = await BotSettings.update({
                      master_digest_hour: Number(e.target.value),
                    });
                    setBot(next);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-mute">по вашему часовому поясу</span>
            </div>
          )}
        </div>

        {/* Pre-visit reminders */}
        <div className="mt-3 pt-3 border-t border-divider">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink">
                Напоминания перед записью
              </div>
              <p className="text-xs text-mute mt-1">
                Бот предупредит вас о ближайшей записи за выбранное время.
              </p>
            </div>
            <Toggle
              on={bot.master_pre_visit_enabled}
              disabled={busy}
              onChange={async () => {
                setBusy(true);
                try {
                  const next = await BotSettings.update({
                    master_pre_visit_enabled: !bot.master_pre_visit_enabled,
                  });
                  setBot(next);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
          {bot.master_pre_visit_enabled && (
            <div className="mt-2 flex flex-wrap gap-2">
              {[10, 30, 60, 120].map((mins) => {
                const active = bot.master_pre_visit_offsets.includes(mins);
                return (
                  <button
                    key={mins}
                    type="button"
                    disabled={busy}
                    className={`px-3 py-1 rounded-full text-xs border transition ${
                      active
                        ? 'bg-accent text-white border-accent'
                        : 'bg-card text-ink border-divider'
                    }`}
                    onClick={async () => {
                      const nextOffsets = active
                        ? bot.master_pre_visit_offsets.filter((m) => m !== mins)
                        : [...bot.master_pre_visit_offsets, mins];
                      setBusy(true);
                      try {
                        const next = await BotSettings.update({
                          master_pre_visit_offsets: nextOffsets,
                        });
                        setBot(next);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    за {mins < 60 ? `${mins} мин` : mins === 60 ? 'час' : `${mins / 60} ч`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Section 3: return campaign */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="text-base font-semibold text-ink">💌 Возврат клиенток</div>
            <p className="text-xs text-mute mt-1">
              Если клиентка не записывалась N дней — бот пришлёт сообщение со скидкой
              на ближайшую неделю.
            </p>
          </div>
          <Toggle
            on={returnOn}
            disabled={busy}
            onChange={() => {
              if (returnOn) disableReturn();
              else setShowReturnForm(true);
            }}
          />
        </div>

        {(showReturnForm || (returnOn && !showReturnForm)) && (
          <div className="mt-3 flex flex-col gap-3 pt-3 border-t border-divider">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-mute">Через сколько дней</span>
                <Input
                  type="number"
                  min={14}
                  max={365}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  disabled={!showReturnForm && returnOn}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-mute">Скидка, %</span>
                <Input
                  type="number"
                  min={1}
                  max={70}
                  value={pct}
                  onChange={(e) => setPct(Number(e.target.value))}
                  disabled={!showReturnForm && returnOn}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-mute">Действует, дн.</span>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={valid}
                  onChange={(e) => setValid(Number(e.target.value))}
                  disabled={!showReturnForm && returnOn}
                />
              </div>
            </div>
            <Card>
              <span className="text-[11px] uppercase tracking-wider text-mute font-semibold">
                Превью сообщения
              </span>
              <div className="mt-1 self-start bg-card text-ink border border-divider rounded-2xl rounded-bl-md px-3 py-1.5 text-[13px] inline-block">
                {`Имя, давно вас не было. Готовлю скидку ${pct}% специально для вас — действует ${valid} ${plural(valid, ['день', 'дня', 'дней'])}. Хотите подобрать удобное время?`}
              </div>
            </Card>
            {showReturnForm && (
              <Button full onClick={saveReturn} disabled={busy}>
                {returnOn ? 'Сохранить и продолжить' : 'Сохранить и включить'}
              </Button>
            )}
            {returnOn && !showReturnForm && (
              <Button
                full
                variant="ghost"
                onClick={() => setShowReturnForm(true)}
                disabled={busy}
              >
                Изменить параметры
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Toggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition ${
        on ? 'bg-accent' : 'bg-divider'
      } disabled:opacity-50`}
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

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return forms[1];
  return forms[2];
}
