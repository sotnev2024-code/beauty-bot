import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { BotSettings, Categories, Knowledge, ReturnSettingsApi, Services } from '@/api';
import type {
  BotSettings as BotSettingsType,
  KnowledgeItem,
  ReturnSettings,
  Service,
  ServiceCategory,
} from '@/api/types';
import { Card } from '@/components/ui';

const VOICE_LABEL: Record<string, string> = {
  warm: 'Тёплый',
  neutral: 'Нейтральный',
  casual: 'Дружеский',
};

const FORMAT_LABEL: Record<string, string> = {
  text: 'Только текст',
  buttons: 'Только кнопки',
  hybrid: 'Гибрид',
};

interface HubData {
  settings: BotSettingsType | null;
  services: Service[];
  categories: ServiceCategory[];
  knowledge: KnowledgeItem[];
  returnSettings: ReturnSettings | null;
}

export function BotHubPage() {
  const [data, setData] = useState<HubData | null>(null);

  useEffect(() => {
    Promise.all([
      BotSettings.get().catch(() => null),
      Services.list().catch(() => [] as Service[]),
      Categories.list().catch(() => [] as ServiceCategory[]),
      Knowledge.list().catch(() => [] as KnowledgeItem[]),
      ReturnSettingsApi.get().catch(() => null),
    ]).then(([settings, services, categories, knowledge, returnSettings]) =>
      setData({ settings, services, categories, knowledge, returnSettings })
    );
  }, []);

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-mute animate-pulse">Загружаем настройки…</span>
      </div>
    );
  }

  const greeting = data.settings?.greeting?.trim() || 'Здравствуйте! Подскажите, чем могу помочь?';
  const voice = VOICE_LABEL[data.settings?.voice_tone ?? 'warm'];
  const fmt = FORMAT_LABEL[data.settings?.message_format ?? 'hybrid'];
  const servicesLabel = `${data.services.length} ${plural(data.services.length, ['услуга', 'услуги', 'услуг'])}`
    + (data.categories.length ? ` в ${data.categories.length} ${plural(data.categories.length, ['категории', 'категориях', 'категориях'])}` : '');
  const knowledgeFilled = data.knowledge.length;
  const returnEnabled = data.returnSettings?.is_enabled ?? false;
  const remindersEnabled = data.settings?.reminders_enabled ?? false;
  const isEnabled = data.settings?.is_enabled ?? true;

  return (
    <div className="flex flex-col gap-3">
      <header>
        <h1 className="font-display text-2xl text-ink">Бот</h1>
        <p className="text-xs text-mute">Ваш ассистент в Telegram</p>
      </header>

      <HubCard
        to="/app/bot/greeting"
        icon="👋"
        title="Приветствие"
        subtitle={truncate(greeting, 60)}
      />
      <HubCard to="/app/bot/voice" icon="🎨" title="Голос бота" subtitle={voice} />
      <HubCard to="/app/bot/format" icon="💬" title="Формат сообщений" subtitle={fmt} />
      <HubCard
        to="/app/bot/services"
        icon="💅"
        title="Услуги"
        subtitle={servicesLabel}
      />
      <HubCard
        to="/app/bot/knowledge"
        icon="📚"
        title="База знаний"
        subtitle={
          knowledgeFilled
            ? `${knowledgeFilled} ${plural(knowledgeFilled, ['пункт', 'пункта', 'пунктов'])} заполнено`
            : 'не заполнено'
        }
        muted={knowledgeFilled === 0}
      />
      <HubCard
        to="/app/bot/automation"
        icon="🔔"
        title="Автоматизация"
        subtitle={automationLabel(returnEnabled, remindersEnabled)}
      />
      <HubCard
        to="/app/bot/timezone"
        icon="🕒"
        title="Часовой пояс"
        subtitle={timezoneLabel(data)}
      />
      <HubCard to="/app/bot/test" icon="▶️" title="Протестировать" />
      <HubCard
        to="/app/bot/disable"
        icon={isEnabled ? '⏸️' : '▶️'}
        title={isEnabled ? 'Выключить бота' : 'Включить бота'}
        muted={!isEnabled}
      />
    </div>
  );
}

function HubCard({
  to,
  icon,
  title,
  subtitle,
  muted = false,
}: {
  to: string;
  icon: string;
  title: string;
  subtitle?: string;
  muted?: boolean;
}) {
  return (
    <Link to={to} className="block">
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-xl leading-none" aria-hidden>
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-ink text-[15px] leading-tight">{title}</div>
            {subtitle && (
              <div className={`text-xs mt-0.5 ${muted ? 'text-mute' : 'text-ink-soft'}`}>
                {subtitle}
              </div>
            )}
          </div>
          <span className="text-mute text-base leading-none" aria-hidden>
            ›
          </span>
        </div>
      </Card>
    </Link>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return forms[1];
  return forms[2];
}

function automationLabel(returnOn: boolean, remindersOn: boolean): string {
  if (returnOn && remindersOn) return 'Возврат: вкл · Напоминания: вкл';
  if (returnOn) return 'Возврат: вкл · Напоминания: выкл';
  if (remindersOn) return 'Возврат: выкл · Напоминания: вкл';
  return 'Не настроено';
}

function timezoneLabel(data: HubData): string {
  // Hub doesn't have direct access to master.timezone; we surface the bot
  // settings updated_at instead so the card has a visible status. The Timezone
  // page itself reads master.timezone from the cached profile.
  return data.settings ? 'Настройка времени мастера' : 'Не настроено';
}
