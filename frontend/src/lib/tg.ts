/**
 * Telegram Mini App SDK helpers.
 * Read-only handle to window.Telegram.WebApp + a dev-mode stub.
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            is_premium?: boolean;
            first_name?: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
            language_code?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        disableVerticalSwipes?: () => void;
        BackButton?: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
      };
    };
  }
}

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export const isInsideTelegram = (): boolean => Boolean(tg?.initData);

export const isPremium = (): boolean => Boolean(tg?.initDataUnsafe.user?.is_premium);

export const tgUser = () => tg?.initDataUnsafe.user;

export const tgPhotoUrl = (): string | null => tg?.initDataUnsafe.user?.photo_url ?? null;

export function readyTelegram(): void {
  try {
    tg?.ready();
    tg?.expand();
    // Prevent the Mini App from collapsing back to its launcher height when
    // the user pulls down or scrolls the page.
    tg?.disableVerticalSwipes?.();
  } catch {
    // outside Telegram — no-op
  }
}
