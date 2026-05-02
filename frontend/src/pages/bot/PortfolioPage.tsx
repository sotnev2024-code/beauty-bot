import { useEffect, useRef, useState } from 'react';

import { Portfolio } from '@/api';
import type { PortfolioPhoto } from '@/api/types';
import { Button, Card } from '@/components/ui';

const MAX_FILE_MB = 10;

export function BotPortfolioPage() {
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = () =>
    Portfolio.list()
      .then(setPhotos)
      .catch(() => undefined);

  useEffect(() => {
    refresh();
  }, []);

  const onPick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    setBusy(true);
    setError(null);
    try {
      for (const f of files) {
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          setError(`Файл «${f.name}» больше ${MAX_FILE_MB} МБ — пропустил.`);
          continue;
        }
        await Portfolio.upload(f);
      }
      await refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      setError(detail ?? 'Не получилось загрузить фото.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Удалить фото из портфолио?')) return;
    setBusy(true);
    try {
      await Portfolio.remove(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-display text-2xl text-ink">Портфолио</h1>
        <p className="text-xs text-mute">
          Бот отправляет до 3 случайных фото из портфолио, когда клиентка просит
          примеры работ.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFile}
      />

      <Button full onClick={onPick} disabled={busy}>
        {busy ? 'Загружаем…' : '+ Добавить фото'}
      </Button>

      {error && (
        <Card>
          <p className="text-xs text-danger">{error}</p>
        </Card>
      )}

      {photos.length === 0 ? (
        <Card>
          <p className="text-sm text-mute">
            Пока ни одной фотографии. Добавьте 3–10 лучших работ, и бот будет
            автоматически отправлять их по запросу.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square rounded-xl overflow-hidden bg-divider"
            >
              <img
                src={p.public_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => remove(p.id)}
                disabled={busy}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-ink/80 text-white text-sm leading-none grid place-items-center disabled:opacity-50"
                aria-label="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-mute mt-2">
        Лимит: {MAX_FILE_MB} МБ на файл. Поддерживаются JPG, PNG, WEBP.
      </p>
    </div>
  );
}
