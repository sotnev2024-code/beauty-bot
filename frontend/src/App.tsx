import { useEffect, useState } from 'react';

type Health = { status: string; env: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? (r.json() as Promise<Health>) : Promise.reject(r.statusText)))
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="min-h-full flex items-center justify-center px-6">
      <div className="w-full max-w-[360px] bg-card rounded-3xl shadow-md p-8 flex flex-col gap-6 border border-divider">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-mute">
            Beauty.dev
          </span>
          <h1 className="font-display text-3xl text-ink">AI-ассистент для бьюти-мастеров</h1>
          <p className="text-base text-ink-soft">
            Скелет проекта поднят. Дальше — модели БД, бот и Mini App.
          </p>
        </div>

        <button
          type="button"
          className="w-full bg-coral-grad text-white text-base font-semibold py-3 rounded-xl shadow-coral transition active:scale-[0.98]"
        >
          Начать
        </button>

        <div className="text-sm">
          {health && (
            <div className="flex items-center gap-2 text-success">
              <span className="w-2 h-2 rounded-full bg-success" />
              backend OK · env: <span className="font-mono">{health.env}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-danger">
              <span className="w-2 h-2 rounded-full bg-danger" />
              backend недоступен: <span className="font-mono">{error}</span>
            </div>
          )}
          {!health && !error && (
            <div className="flex items-center gap-2 text-mute">
              <span className="w-2 h-2 rounded-full bg-mute animate-pulse" />
              проверяем backend…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
