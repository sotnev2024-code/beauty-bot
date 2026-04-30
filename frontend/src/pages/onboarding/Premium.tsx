import { useNavigate } from 'react-router-dom';

import { Button, Card } from '@/components/ui';
import { isPremium, tgUser } from '@/lib/tg';

import { OnboardingShell } from './OnboardingShell';

export function Premium() {
  const nav = useNavigate();
  const premium = isPremium();
  const user = tgUser();

  return (
    <OnboardingShell
      step={1}
      total={5}
      title="Telegram Premium"
      subtitle="Без Premium бот не сможет подключиться к твоему Business-аккаунту."
      footer={
        premium ? (
          <Button size="lg" full onClick={() => nav('/onboarding/profile')}>
            Продолжить
          </Button>
        ) : (
          <>
            <Button size="lg" full onClick={() => window.open('https://t.me/PremiumBot', '_blank')}>
              Купить Premium
            </Button>
            <Button variant="ghost" full onClick={() => nav('/onboarding/profile')}>
              Уже купил(а), проверить ещё раз
            </Button>
          </>
        )
      }
    >
      <Card>
        <div className="flex items-start gap-3">
          <div
            className={`mt-1 w-2.5 h-2.5 rounded-full ${
              premium ? 'bg-success' : 'bg-danger'
            }`}
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-ink">
              {premium ? 'Premium активен' : 'Premium не найден'}
            </p>
            <p className="text-xs text-mute">
              {user ? `Telegram: @${user.username ?? user.first_name ?? user.id}` : 'Откройте Mini App из Telegram'}
            </p>
          </div>
        </div>
      </Card>

      <div className="text-sm text-ink-soft leading-relaxed">
        Premium нужен только для подключения Business API. После подключения
        бот работает автоматически в фоне.
      </div>
    </OnboardingShell>
  );
}
