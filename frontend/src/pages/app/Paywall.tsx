import { Link } from 'react-router-dom';

import { Button, Card } from '@/components/ui';

interface Props {
  reason: string;
}

export function Paywall({ reason }: Props) {
  return (
    <div className="flex flex-col flex-1 px-6 py-10 gap-6 justify-between">
      <div className="flex flex-col gap-3 mt-12">
        <span className="text-xs uppercase tracking-wider text-accent font-semibold">
          Подписка
        </span>
        <h1 className="font-display text-2xl text-ink">{reason}</h1>
        <p className="text-sm text-ink-soft">
          Бот сейчас не отвечает клиенткам. Оформи подписку — записи продолжат
          приходить, пока ты занимаешься своим делом.
        </p>
      </div>

      <Card>
        <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
          <li className="flex items-start gap-2">
            <span className="text-accent">✓</span>
            <span>Безлимит на диалоги и записи</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">✓</span>
            <span>AI-ассистент 24/7</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent">✓</span>
            <span>Аналитика и инсайты</span>
          </li>
        </ul>
      </Card>

      <Link to="/app/pricing" className="block">
        <Button size="lg" full>
          Выбрать тариф
        </Button>
      </Link>
    </div>
  );
}
