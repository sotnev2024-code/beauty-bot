import { Link } from 'react-router-dom';

import { Card } from '@/components/ui';

/** Phase 4 will replace this with a real virtual chat against the LLM. */
export function TestChatPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Тестовый чат</h1>
        <Link to="/app" className="text-sm text-mute">
          ← Назад
        </Link>
      </header>
      <Card>
        <p className="text-sm text-ink-soft">
          Скоро здесь можно будет писать боту от имени клиента и видеть его
          ответы — без записи в реальную БД и без отправки в Telegram. Это
          поможет настроить промты воронок до того, как клиент напишет вживую.
        </p>
      </Card>
    </div>
  );
}
