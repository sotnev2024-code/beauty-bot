import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Conversations } from '@/api';
import type { ConversationSummary } from '@/api/types';
import { Card } from '@/components/ui';

export function ChatList() {
  const [items, setItems] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    Conversations.list().then(setItems).catch(() => undefined);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink">Чаты</h1>
      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-mute">
            Когда клиент напишет в Business-чат, диалог появится здесь.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((c) => (
            <Link key={c.id} to={`/app/chats/${c.id}`} className="block">
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold text-ink truncate">
                      {c.client_name ?? `tg:${c.client_id}`}
                    </span>
                    <span className="text-xs text-mute truncate">
                      {c.last_message_preview ?? '—'}
                    </span>
                  </div>
                  <StatePill state={c.state} takeoverUntil={c.takeover_until} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatePill({
  state,
  takeoverUntil,
}: {
  state: string;
  takeoverUntil: string | null;
}) {
  if (state === 'human_takeover' && takeoverUntil) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-divider text-ink-soft">
        вы
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-soft text-accent-dark">
      бот
    </span>
  );
}
