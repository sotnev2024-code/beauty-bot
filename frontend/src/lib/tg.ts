/**
 * Telegram Mini App SDK helpers.
 * Stage 0: stub. Real wiring (initData validation, viewport, theme) — Stage 8.
 */
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: { id: number; is_premium?: boolean; first_name?: string };
        };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export const isPremium = (): boolean => Boolean(tg?.initDataUnsafe.user?.is_premium);
