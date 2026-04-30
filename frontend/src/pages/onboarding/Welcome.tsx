import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui';

export function Welcome() {
  const nav = useNavigate();
  return (
    <div className="flex flex-col flex-1 px-6 py-10 gap-8 justify-between">
      <div className="flex flex-col gap-4 mt-12">
        <span className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">
          Beauty.dev
        </span>
        <h1 className="font-display text-3xl text-ink leading-tight">
          AI-ассистент для бьюти-мастеров
        </h1>
        <p className="text-base text-ink-soft leading-relaxed">
          Подключи бота к своему Telegram Business — он отвечает клиенткам
          мгновенно, ведёт по воронке и записывает на услуги. Ты остаёшься в
          центре, бот делает рутину.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" full onClick={() => nav('/onboarding/premium')}>
          Начать настройку
        </Button>
        <p className="text-xs text-mute text-center">
          14 дней бесплатно · без карты
        </p>
      </div>
    </div>
  );
}
