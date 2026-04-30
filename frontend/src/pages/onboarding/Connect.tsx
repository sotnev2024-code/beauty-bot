import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card } from '@/components/ui';

import { OnboardingShell } from './OnboardingShell';

export function Connect() {
  const nav = useNavigate();
  const [polling, setPolling] = useState(true);
  const [connected, setConnected] = useState(false);

  // Polling stub. Real /api/business-connections/status endpoint comes in Stage 9.
  useEffect(() => {
    let cancelled = false;
    if (!polling) return;
    const tick = async () => {
      try {
        const res = await fetch('/api/business-connections/status', {
          headers: {
            'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData ?? '',
          },
        });
        if (res.ok && !cancelled) {
          const data: { enabled?: boolean } = await res.json();
          if (data.enabled) setConnected(true);
        }
      } catch {
        // endpoint not yet wired — ignore
      }
    };
    const iv = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [polling]);

  return (
    <OnboardingShell
      step={7}
      total={8}
      title="Подключи Telegram Business"
      subtitle="Открой настройки Business в Telegram и добавь @beauty_dev_bot."
      footer={
        connected ? (
          <Button size="lg" full onClick={() => nav('/onboarding/done')}>
            Бот подключён, дальше
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              full
              onClick={() => window.open('https://t.me/beauty_dev_bot?startbusiness=1', '_blank')}
            >
              Открыть в Telegram
            </Button>
            <Button variant="ghost" full onClick={() => setPolling((p) => !p)}>
              {polling ? 'Проверяю подключение…' : 'Возобновить проверку'}
            </Button>
          </>
        )
      }
    >
      <Card>
        <ol className="flex flex-col gap-3 text-sm text-ink-soft list-decimal list-inside">
          <li>Открой меню Telegram → <span className="text-ink font-medium">Настройки</span></li>
          <li>Раздел <span className="text-ink font-medium">Telegram Business</span> → Чат-боты</li>
          <li>Добавь <span className="text-ink font-mono">@beauty_dev_bot</span></li>
        </ol>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              connected ? 'bg-success' : 'bg-mute animate-pulse'
            }`}
          />
          <span className="text-sm text-ink-soft">
            {connected ? 'Бот подключён' : 'Ожидаю подключения…'}
          </span>
        </div>
      </Card>
    </OnboardingShell>
  );
}
