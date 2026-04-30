import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Clients, Conversations, ReturnCampaigns } from '@/api';
import type {
  ClientDetail,
  ConversationDetail,
  MessageRow,
  ReturnCampaign,
} from '@/api/types';
import { Button, Card } from '@/components/ui';

export function ChatDetail() {
  const { id } = useParams();
  const cid = Number(id);
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [campaigns, setCampaigns] = useState<ReturnCampaign[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const c = await Conversations.get(cid);
    setConv(c);
    if (c.client_id) {
      Clients.get(c.client_id).then(setClient).catch(() => undefined);
      ReturnCampaigns.forClient(c.client_id).then(setCampaigns).catch(() => undefined);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    const iv = setInterval(() => {
      load().catch(() => undefined);
    }, 8000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  if (!conv) return <div className="text-sm text-mute">Загружаем…</div>;

  const onTakeover = async () => {
    setBusy(true);
    try {
      const r = await Conversations.takeover(cid);
      setConv(r);
    } finally {
      setBusy(false);
    }
  };
  const onRelease = async () => {
    setBusy(true);
    try {
      const r = await Conversations.release(cid);
      setConv(r);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-end gap-3">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-ink truncate max-w-[180px]">
            {conv.client_name ?? `tg:${conv.client_id}`}
          </span>
          <StateBadge state={conv.state} until={conv.takeover_until} />
        </div>
      </header>

      {(() => {
        const now = new Date();
        const active = campaigns.find(
          (c) => c.status === 'sent' && new Date(c.discount_valid_until) > now
        );
        return active ? (
          <Card className="bg-accent-soft border-accent-soft">
            <div className="text-xs text-accent-dark">
              Активна скидка <strong>{active.discount_percent}%</strong> до{' '}
              {new Date(active.discount_valid_until).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
              })}
              . Бот применит её автоматически при создании записи.
            </div>
          </Card>
        ) : null;
      })()}

      {client && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="text-mute text-xs">Карточка клиента</span>
              <span className="text-ink font-semibold">{client.name ?? '—'}</span>
              <span className="text-ink-soft text-xs">{client.phone ?? '—'}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-xs">
              <span className="text-mute">визитов · {client.stats.visits_done}</span>
              {client.stats.avg_check && (
                <span className="text-mute">средний · {Math.round(Number(client.stats.avg_check)).toLocaleString('ru-RU')} ₽</span>
              )}
              <div className="flex gap-1 mt-1 flex-wrap justify-end">
                {client.stats.segments.map((s) => (
                  <span
                    key={s}
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-divider text-ink-soft"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2 flex-1">
        {conv.messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-bg/80 backdrop-blur border-t border-divider">
        {conv.state === 'human_takeover' ? (
          <Button full variant="secondary" onClick={onRelease} disabled={busy}>
            Передать обратно боту
          </Button>
        ) : (
          <Button full onClick={onTakeover} disabled={busy}>
            Перехватить диалог
          </Button>
        )}
        <p className="text-[11px] text-mute text-center mt-1.5">
          {conv.state === 'human_takeover'
            ? 'Бот не отвечает, пока не освободишь чат или не пройдут 24 часа.'
            : 'Если ответишь сама в Telegram — бот замолчит на 24 часа.'}
        </p>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: MessageRow }) {
  const isClient = m.direction === 'in';
  const isMaster = m.direction === 'master';
  const cls = isClient
    ? 'self-start bg-card text-ink rounded-2xl rounded-bl-md'
    : isMaster
      ? 'self-end bg-ink text-white rounded-2xl rounded-br-md'
      : 'self-end bg-coral-grad text-white rounded-2xl rounded-br-md';
  const label = isClient ? 'клиент' : isMaster ? 'вы' : 'бот';
  const proactiveKind = m.is_proactive
    ? (m.llm_meta as { proactive_kind?: string } | null)?.proactive_kind
    : null;
  const proactiveLabel: Record<string, string> = {
    return: 'возврат · бот написал первым',
    service_reminder: 'напоминание · бот написал первым',
  };
  return (
    <div className={`max-w-[80%] flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
      <span className="text-[10px] uppercase tracking-wider text-mute mb-0.5">
        {label}
        {proactiveKind && (
          <span className="ml-1 text-accent-dark">· {proactiveLabel[proactiveKind] ?? 'бот написал первым'}</span>
        )}
      </span>
      <div className={`px-3.5 py-2 text-[14px] leading-snug ${cls} shadow-sm`}>
        {m.text || ''}
      </div>
    </div>
  );
}

function StateBadge({ state, until }: { state: string; until: string | null }) {
  if (state === 'human_takeover' && until) {
    const d = new Date(until);
    return (
      <span className="text-[10px] text-mute">
        перехвачен до {d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  }
  return <span className="text-[10px] text-accent-dark">бот ведёт</span>;
}
