import { useEffect, useRef, useState } from 'react';

import { TestDialog } from '@/api';
import { Button, Card, Input } from '@/components/ui';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  buttons?: string[];
  meta?: {
    actions: { type: string; [k: string]: unknown }[];
    escalate: boolean;
    collected_data: unknown;
  };
}

export function BotTestPage() {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length, busy]);

  // Send a specific text (used by both the input form and the suggested
  // buttons under bot replies).
  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    // Strip any pending buttons from the previous bot turn (they're spent).
    const prior = history.map((m) =>
      m.role === 'assistant' ? { ...m, buttons: undefined } : m,
    );
    const next: Msg[] = [...prior, { role: 'user', text: trimmed }];
    setHistory(next);
    setInput('');
    try {
      const res = await TestDialog.send({
        history: next.map((m) => ({ role: m.role, text: m.text })),
        user_message: trimmed,
      });
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply,
          buttons: res.buttons ?? [],
          meta: {
            actions: res.actions,
            escalate: res.escalate,
            collected_data: res.collected_data,
          },
        },
      ]);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Ошибка теста');
      setHistory(history);
    } finally {
      setBusy(false);
    }
  };

  const send = () => sendText(input);

  const reset = () => {
    setHistory([]);
    setInput('');
    setError(null);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <header className="flex items-center justify-end">
        <Button size="md" variant="ghost" onClick={reset}>
          Сбросить
        </Button>
      </header>

      <div>
        <h1 className="font-display text-2xl text-ink">Тестовый чат</h1>
        <p className="text-xs text-mute">
          Тестовый режим — клиенты не видят. Бот отвечает по вашим настройкам, но
          ничего не сохраняется и в Telegram не отправляется.
        </p>
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {history.length === 0 ? (
          <Card>
            <p className="text-sm text-mute">
              Начните диалог — например, «Здравствуйте, можно записаться?»
            </p>
          </Card>
        ) : (
          history.map((m, i) => (
            <Bubble
              key={i}
              msg={m}
              onPickButton={(text) => sendText(text)}
              disabled={busy}
            />
          ))
        )}
        {busy && (
          <Bubble msg={{ role: 'assistant', text: '…' }} onPickButton={() => undefined} disabled />
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <Card>
          <p className="text-xs text-danger">{error}</p>
        </Card>
      )}

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-bg/80 backdrop-blur border-t border-divider flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Напишите сообщение от клиента"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
        </div>
        <Button onClick={send} disabled={!input.trim() || busy}>
          ↗
        </Button>
      </div>
    </div>
  );
}

function Bubble({
  msg,
  onPickButton,
  disabled,
}: {
  msg: Msg;
  onPickButton: (text: string) => void;
  disabled: boolean;
}) {
  const isUser = msg.role === 'user';
  const cls = isUser
    ? 'self-end bg-ink text-white rounded-2xl rounded-br-md'
    : 'self-start bg-card text-ink border border-divider rounded-2xl rounded-bl-md';
  const label = isUser ? 'клиент' : 'бот';
  const actionTypes = (msg.meta?.actions ?? []).map((a) => a.type);
  const buttons = msg.buttons ?? [];
  return (
    <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <span className="text-[10px] uppercase tracking-wider text-mute mb-0.5">{label}</span>
      <div className={`px-3.5 py-2 text-[14px] leading-snug ${cls}`}>{msg.text}</div>

      {!isUser && buttons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {buttons.map((b, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPickButton(b)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-accent text-accent-dark bg-card hover:bg-accent-soft disabled:opacity-50"
            >
              {b}
            </button>
          ))}
        </div>
      )}

      {(msg.meta?.escalate || actionTypes.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-1">
          {msg.meta?.escalate && <Pill>escalate</Pill>}
          {actionTypes.map((t, i) => (
            <Pill key={i}>{t}</Pill>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-soft text-accent-dark">
      {children}
    </span>
  );
}
