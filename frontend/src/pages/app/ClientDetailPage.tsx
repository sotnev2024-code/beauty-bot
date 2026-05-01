import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Clients, ReturnCampaigns } from '@/api';
import type { ClientDetail, ReturnCampaign } from '@/api/types';
import { Button, Card, Input, Textarea } from '@/components/ui';

export function ClientDetailPage() {
  const { id } = useParams();
  const cid = Number(id);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [campaigns, setCampaigns] = useState<ReturnCampaign[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedNotes, setSavedNotes] = useState(false);

  const load = async () => {
    const [c, camps] = await Promise.all([
      Clients.get(cid),
      ReturnCampaigns.forClient(cid).catch(() => [] as ReturnCampaign[]),
    ]);
    setClient(c);
    setName(c.name ?? '');
    setPhone(c.phone ?? '');
    setNotes(c.notes ?? '');
    setCampaigns(camps);
  };

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setSavedProfile(false);
    try {
      const next = await Clients.update(cid, {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setClient(next);
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2000);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    setSavedNotes(false);
    try {
      const next = await Clients.update(cid, { notes: notes.trim() });
      setClient(next);
      setSavedNotes(true);
      setTimeout(() => setSavedNotes(false), 2000);
    } finally {
      setSavingNotes(false);
    }
  };

  if (!client) {
    return <div className="text-sm text-mute animate-pulse">Загружаем…</div>;
  }

  const stats = client.stats;
  const initials = (client.name ?? 'К')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const now = new Date();
  const activeCampaign = campaigns.find(
    (c) => c.status === 'sent' && new Date(c.discount_valid_until) > now
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-coral-grad text-white grid place-items-center font-display text-lg">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl text-ink truncate">
              {client.name ?? `tg:${client.telegram_id}`}
            </div>
            <div className="text-xs text-mute">{client.phone ?? '—'}</div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {stats.segments.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-soft text-accent-dark"
                >
                  {s}
                </span>
              ))}
              {stats.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-divider text-ink-soft"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {activeCampaign && (
        <Card className="bg-accent-soft border-accent-soft">
          <div className="text-xs text-accent-dark">
            Активна скидка <strong>{activeCampaign.discount_percent}%</strong> до{' '}
            {new Date(activeCampaign.discount_valid_until).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
            })}
            . Бот применит её автоматически.
          </div>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Всего записей" value={stats.visits_total} />
        <Stat label="Завершено" value={stats.visits_done} />
        <Stat
          label="Средний чек"
          value={stats.avg_check ? fmtMoney(stats.avg_check) : '—'}
        />
        <Stat
          label="Последний визит"
          value={stats.last_visit_at ? fmtDate(stats.last_visit_at) : '—'}
        />
      </div>

      {/* Profile (name + phone) */}
      <Card>
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-wider text-mute font-semibold">
            Контакты
          </span>
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
          <Button onClick={saveProfile} disabled={savingProfile} full>
            {savedProfile ? 'Сохранено ✓' : savingProfile ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-wider text-mute font-semibold">
            Заметка для мастера
          </span>
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Аллергии, предпочтения, особенности — будет видно только вам."
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-mute">{notes.length}/2000</span>
            <Button onClick={saveNotes} disabled={savingNotes}>
              {savedNotes ? 'Сохранено ✓' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Return campaigns history */}
      {campaigns.length > 0 && (
        <Card>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-mute font-semibold">
              История кампаний возврата
            </span>
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-divider last:border-b-0"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-ink">
                    {fmtDate(c.sent_at)} · скидка {c.discount_percent}%
                  </span>
                  <span className="text-[11px] text-mute">
                    действ. до {fmtDate(c.discount_valid_until)}
                  </span>
                </div>
                <CampaignStatusPill status={c.status} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-mute">{label}</span>
        <span className="font-display text-xl text-ink">{value}</span>
      </div>
    </Card>
  );
}

function CampaignStatusPill({ status }: { status: ReturnCampaign['status'] }) {
  const cfg: Record<ReturnCampaign['status'], { label: string; cls: string }> = {
    sent: { label: 'отправлено', cls: 'bg-divider text-ink-soft' },
    responded: { label: 'ответ', cls: 'bg-accent-soft text-accent-dark' },
    booked: { label: 'записалась', cls: 'bg-success/20 text-success' },
    expired: { label: 'истекло', cls: 'bg-divider text-mute' },
    expired_late_response: { label: 'поздний ответ', cls: 'bg-divider text-mute' },
  };
  const { label, cls } = cfg[status] ?? cfg.sent;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>
  );
}

function fmtMoney(v: string | number): string {
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return '—';
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}
