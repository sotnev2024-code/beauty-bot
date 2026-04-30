import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/app', label: 'Главная', icon: '◇' },
  { to: '/app/calendar', label: 'Календарь', icon: '▥' },
  { to: '/app/bot', label: 'Бот', icon: '☆' },
  { to: '/app/clients', label: 'Клиенты', icon: '◉' },
  { to: '/app/settings', label: 'Настройки', icon: '⚙' },
];

export function TabBar() {
  return (
    <nav className="sticky bottom-0 z-10 bg-card border-t border-divider px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 gap-1 py-2">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/app'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition ${
                isActive ? 'text-accent' : 'text-mute hover:text-ink-soft'
              }`
            }
          >
            <span className="text-base leading-none" aria-hidden>
              {t.icon}
            </span>
            <span className="text-[11px] font-medium">{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
