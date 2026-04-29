// Sitemap — high-level. Built as an SVG-on-positioned-divs hybrid:
// nodes are HTML cards (for nice typography) and edges are an SVG layer
// behind them. Coordinates are absolute within a 1680×1040 frame.

const SITEMAP_BG = '#f5f1ea';
const SITEMAP_INK = '#2a1f15';
const SITEMAP_MUTE = '#8a7867';
const SITEMAP_ACCENT = '#c08856';

function SMNode({ x, y, w = 200, h = 88, kind = 'screen', title, subtitle, badge }) {
  const palette = {
    entry:   { bg: '#1a1410', fg: '#f5e6cc', border: '#1a1410', sub: 'rgba(245,230,204,0.65)' },
    home:    { bg: '#fff', fg: '#1a1410', border: '#c08856', sub: '#8a7867', ring: true },
    screen:  { bg: '#fff', fg: '#2a1f15', border: 'rgba(42,31,21,0.12)', sub: '#8a7867' },
    setup:   { bg: '#fdf6ec', fg: '#2a1f15', border: 'rgba(192,136,86,0.4)', sub: '#8a7867' },
    modal:   { bg: '#fff', fg: '#2a1f15', border: 'rgba(42,31,21,0.12)', sub: '#8a7867', dashed: true },
    group:   { bg: 'transparent', fg: '#5a4634', border: 'rgba(42,31,21,0.18)', sub: '#8a7867', dashed: true },
  };
  const p = palette[kind] || palette.screen;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, minHeight: h,
      background: p.bg, color: p.fg,
      border: `${p.ring ? 2 : 1}px ${p.dashed ? 'dashed' : 'solid'} ${p.border}`,
      borderRadius: kind === 'group' ? 16 : 12,
      padding: kind === 'group' ? '14px 16px' : '12px 14px',
      boxShadow: kind === 'group' ? 'none' : '0 1px 2px rgba(40,30,20,0.06)',
      fontSize: 13, lineHeight: 1.3,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.1, flex: 1 }}>{title}</div>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(192,136,86,0.15)', color: SITEMAP_ACCENT, textTransform: 'uppercase', letterSpacing: 0.5 }}>{badge}</span>
        )}
      </div>
      {subtitle && <div style={{ fontSize: 11.5, color: p.sub, lineHeight: 1.35 }}>{subtitle}</div>}
    </div>
  );
}

function Sitemap() {
  // Edges: { from: {x,y}, to: {x,y}, dashed?, curve? }
  const edges = [
    // entry → onboarding flow
    { from: [120, 100], to: [120, 200], label: 'первый запуск' },
    { from: [120, 288], to: [120, 380] },
    { from: [220, 424], to: [340, 424], label: 'готово' },

    // home → main sections (radial)
    { from: [440, 424], to: [580, 200] },   // → dashboard
    { from: [440, 424], to: [580, 360] },   // → calendar
    { from: [440, 424], to: [580, 504] },   // → bot-config
    { from: [440, 424], to: [580, 660] },   // → clients
    { from: [440, 424], to: [580, 808] },   // → settings

    // dashboard children
    { from: [780, 200], to: [920, 132] },
    { from: [780, 200], to: [920, 244] },

    // calendar children
    { from: [780, 360], to: [920, 360] },
    { from: [780, 360], to: [920, 448] },

    // bot config children
    { from: [780, 504], to: [920, 528] },
    { from: [780, 504], to: [920, 612] },
    { from: [1120, 612], to: [1280, 580], dashed: true, label: 'редактор' },

    // clients children
    { from: [780, 660], to: [920, 720] },
    { from: [1120, 720], to: [1280, 720] },

    // settings children
    { from: [780, 808], to: [920, 808] },
    { from: [780, 808], to: [920, 896] },
  ];

  const arrowEnd = (e, idx) => {
    const [x1, y1] = e.from; const [x2, y2] = e.to;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const ux = dx/len, uy = dy/len;
    // curve via control point offset perpendicular
    const cx = (x1+x2)/2 - uy * 24;
    const cy = (y1+y2)/2 + ux * 24;
    return (
      <g key={idx}>
        <path d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2-ux*8} ${y2-uy*8}`}
          fill="none" stroke="#b8a890" strokeWidth="1.4"
          strokeDasharray={e.dashed ? '4 4' : 'none'} />
        <polygon points={`${x2},${y2} ${x2-ux*8-uy*4},${y2-uy*8+ux*4} ${x2-ux*8+uy*4},${y2-uy*8-ux*4}`}
          fill="#b8a890" />
        {e.label && (
          <text x={(x1+x2)/2 - uy*16} y={(y1+y2)/2 + ux*16}
            fontSize="10" fill={SITEMAP_MUTE} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace">{e.label}</text>
        )}
      </g>
    );
  };

  return (
    <div style={{ position: 'relative', width: 1680, height: 1040, background: SITEMAP_BG, padding: 0, fontFamily: 'Manrope, sans-serif' }}>
      {/* header strip */}
      <div style={{ position: 'absolute', top: 24, left: 32, right: 32, display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: SITEMAP_INK, letterSpacing: -0.5 }}>Карта экранов</div>
        <div style={{ fontSize: 13, color: SITEMAP_MUTE }}>Mini App · соло-мастер · 390 × 844</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: SITEMAP_MUTE, fontFamily: 'JetBrains Mono, monospace' }}>
          <span>■ <span style={{ color: SITEMAP_INK }}>экран</span></span>
          <span>● <span style={{ color: SITEMAP_INK }}>хаб</span></span>
          <span>┄ <span style={{ color: SITEMAP_INK }}>модалка</span></span>
        </div>
      </div>

      {/* edges */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs />
        {edges.map((e, i) => arrowEnd(e, i))}
      </svg>

      {/* COL 1: entry + onboarding column */}
      <SMNode x={32} y={80} w={180} h={44} kind="entry" title="🚀 /start в Telegram" subtitle="первая встреча с ботом" />
      <SMNode x={32} y={200} w={180} kind="screen" title="Welcome · кто мы" subtitle="2 экрана истории + CTA «открыть Mini App»" />
      <SMNode x={32} y={380} w={380} h={88} kind="setup" title="Onboarding-мастер" subtitle="4 обязательных шага: профиль → услуга → график → подключение Telegram Business → тест" badge="30 мин" />

      {/* COL 2: HOME (hub) */}
      <SMNode x={340} y={400} w={100} h={56} kind="home" title="🏠 Главная" subtitle="хаб" />

      {/* checklist callout, hangs off home */}
      <SMNode x={32} y={520} w={380} h={140} kind="modal" title="✓ Чек-лист «доделать потом»" subtitle="опциональные шаги: фото мастера, шаблон воронки, реквизиты для оплаты, правила переноса. Свернуть/раскрыть с главной." />

      {/* COL 3: 5 main sections */}
      <SMNode x={580} y={170} w={200} kind="screen" title="📊 Дашборд" subtitle="метрики + лента событий" />
      <SMNode x={580} y={330} w={200} kind="screen" title="📅 Календарь" subtitle="день / неделя / месяц" />
      <SMNode x={580} y={478} w={200} kind="screen" title="🤖 Бот · конструктор" subtitle="воронки, услуги, прайс" />
      <SMNode x={580} y={634} w={200} kind="screen" title="👥 Клиенты" subtitle="база + диалоги" />
      <SMNode x={580} y={782} w={200} kind="screen" title="⚙️ Настройки" subtitle="профиль, бот, оплата" />

      {/* COL 4: leaf screens */}
      {/* dashboard leaves */}
      <SMNode x={920} y={108} w={180} h={64} kind="screen" title="Метрики · период" subtitle="день/неделя/месяц" />
      <SMNode x={920} y={220} w={180} h={64} kind="screen" title="Лента событий" subtitle="новые записи, переносы" />

      {/* calendar leaves */}
      <SMNode x={920} y={336} w={180} h={64} kind="screen" title="Запись · детали" subtitle="перенос, отмена, заметка" />
      <SMNode x={920} y={424} w={180} h={64} kind="screen" title="+ Новая запись" subtitle="ручное добавление" />

      {/* bot config leaves */}
      <SMNode x={920} y={504} w={180} h={64} kind="screen" title="Услуги · CRUD" subtitle="название, длит., цена" />
      <SMNode x={920} y={588} w={180} h={64} kind="screen" title="Воронки" subtitle="список + шаблоны" />

      {/* clients leaves */}
      <SMNode x={920} y={696} w={180} h={64} kind="screen" title="Карточка клиента" subtitle="история, заметки, чек" />

      {/* settings leaves */}
      <SMNode x={920} y={784} w={180} h={64} kind="screen" title="Tone of voice" subtitle="ты/вы, формальный/тёплый" />
      <SMNode x={920} y={872} w={180} h={64} kind="screen" title="Расписание · дни/часы" subtitle="график + выходные" />

      {/* COL 5: deep editors / takeover */}
      <SMNode x={1280} y={552} w={200} h={92} kind="screen" title="Редактор воронки" subtitle="шаги · промт · цель · условия перехода. Самый сложный экран — собственный wireframe." badge="ключевой" />
      <SMNode x={1280} y={696} w={200} h={64} kind="screen" title="Диалог с клиенткой" subtitle="лента переписки + кнопка «перехватить»" />
      <SMNode x={1280} y={808} w={200} h={64} kind="modal" title="Подключить Telegram Business" subtitle="инструкция-пошаговая, проверка статуса" />

      {/* groups (dashed regions) */}
      <SMNode x={20} y={60} w={420} h={420} kind="group" title="ВХОД · ONBOARDING" />
      <SMNode x={560} y={140} w={580} h={840} kind="group" title="ОСНОВНЫЕ РАЗДЕЛЫ — нижний таб-бар (5 иконок)" />
      <SMNode x={1260} y={530} w={240} h={350} kind="group" title="ГЛУБОКИЕ ЭКРАНЫ" />

      {/* legend bottom */}
      <div style={{ position: 'absolute', bottom: 24, left: 32, right: 32, display: 'flex', gap: 24, fontSize: 12, color: SITEMAP_MUTE, fontFamily: 'JetBrains Mono, monospace', borderTop: '1px solid rgba(42,31,21,0.1)', paddingTop: 14 }}>
        <span><b style={{ color: SITEMAP_INK }}>Нижний таб-бар:</b> Главная · Календарь · Бот · Клиенты · Настройки</span>
        <span><b style={{ color: SITEMAP_INK }}>Onboarding success:</b> бот ответил на тестовое сообщение</span>
      </div>
    </div>
  );
}

Object.assign(window, { Sitemap });
