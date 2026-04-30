import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BotSettings } from '@/api';
import { Button, Card } from '@/components/ui';

export function BotDisablePage() {
  const nav = useNavigate();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    BotSettings.get().then((s) => setEnabled(s.is_enabled)).catch(() => undefined);
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      const next = enabled ? await BotSettings.disable() : await BotSettings.enable();
      setEnabled(next.is_enabled);
      nav('/app/bot');
    } finally {
      setBusy(false);
    }
  };

  if (enabled === null) {
    return <div className="text-sm text-mute animate-pulse">Загружаем…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-display text-2xl text-ink">
          {enabled ? 'Выключить бота' : 'Включить бота'}
        </h1>
      </div>

      <Card>
        <p className="text-sm text-ink">
          {enabled
            ? 'Когда бот выключен, он перестаёт отвечать клиентам в Business-чатах. Вы продолжите получать сообщения и сможете писать вручную. Mini App продолжает работать.'
            : 'Бот снова начнёт отвечать клиентам в Business-чатах от вашего имени по настройкам, которые вы задали.'}
        </p>
      </Card>

      <Button full onClick={toggle} disabled={busy} variant={enabled ? 'ghost' : 'primary'}>
        {busy
          ? '…'
          : enabled
            ? 'Подтвердить — выключить'
            : 'Подтвердить — включить'}
      </Button>
    </div>
  );
}
