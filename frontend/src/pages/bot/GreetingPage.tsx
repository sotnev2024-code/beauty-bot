import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BotSettings } from '@/api';
import { Button, Card, Textarea } from '@/components/ui';

export function BotGreetingPage() {
  const nav = useNavigate();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    BotSettings.get()
      .then((s) => {
        setText(s.greeting);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    if (!text.trim()) {
      setError('Приветствие не может быть пустым');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await BotSettings.update({ greeting: text.trim() });
      nav('/app/bot');
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <div className="text-sm text-mute animate-pulse">Загружаем…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-display text-2xl text-ink">Приветствие</h1>
        <p className="text-xs text-mute">
          Первое сообщение, которое бот отправит клиенту, если приветствие — его
          первая реплика.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-2">
          <Textarea
            rows={4}
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder="Здравствуйте! Подскажите, чем могу помочь?"
          />
          <span className="text-[11px] text-mute self-end">{text.length}/500</span>
        </div>
      </Card>

      <Card>
        <div className="text-xs uppercase tracking-wider text-mute font-semibold mb-1">
          Превью
        </div>
        <div className="self-start bg-card text-ink border border-divider rounded-2xl rounded-bl-md px-3.5 py-2 text-[14px] leading-snug max-w-[85%]">
          {text || 'Здравствуйте! Подскажите, чем могу помочь?'}
        </div>
      </Card>

      {error && (
        <Card>
          <p className="text-xs text-danger">{error}</p>
        </Card>
      )}

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-bg/80 backdrop-blur border-t border-divider">
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
