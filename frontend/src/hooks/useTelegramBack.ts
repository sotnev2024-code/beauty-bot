import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { tg } from '@/lib/tg';

/**
 * Show the Telegram WebApp BackButton on routes that aren't a top-level tab,
 * and route its click into react-router (history.back, falling back to a
 * provided default route). Hides the button automatically on top-level routes.
 */
const TOP_LEVEL_ROUTES = new Set(['/app', '/app/calendar', '/app/bot', '/app/settings']);

export function useTelegramBack(fallback = '/app/bot'): void {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    const bb = tg?.BackButton;
    if (!bb) return;

    const isTop = TOP_LEVEL_ROUTES.has(loc.pathname);
    if (isTop) {
      bb.hide();
      return;
    }

    const onClick = () => {
      if (window.history.length > 1) {
        nav(-1);
      } else {
        nav(fallback);
      }
    };
    bb.onClick(onClick);
    bb.show();
    return () => {
      bb.offClick(onClick);
      bb.hide();
    };
  }, [loc.pathname, nav, fallback]);
}
