import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="relative w-full sm:max-w-[400px] bg-card rounded-t-3xl sm:rounded-3xl shadow-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="font-display text-lg text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-mute hover:text-ink text-xl leading-none w-8 h-8 grid place-items-center"
          >
            ×
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}
