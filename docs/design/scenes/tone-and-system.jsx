// Tone of Voice + Design System overview
// Renders the system cards (3 variants) and the tone-of-voice card

function SystemCard({ vars, title, sub, accentLabel, font }) {
  return (
    <div style={{ width: '100%', height: '100%', background: vars.bg, padding: '28px 28px 22px', display: 'flex', flexDirection: 'column', fontFamily: font || 'Manrope, sans-serif', boxSizing: 'border-box' }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: vars.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>{accentLabel}</div>
        <h1 style={{ margin: '6px 0 2px', fontSize: 30, fontWeight: 700, color: vars.ink, letterSpacing: -0.6, fontFamily: vars.titleFont || font }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 13, color: vars.inkSoft }}>{sub}</p>
      </div>

      {/* Color swatches */}
      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {[
          ['bg', 'фон'],
          ['card', 'карта'],
          ['accentSoft', 'soft'],
          ['accent', 'accent'],
          ['ink', 'ink'],
        ].map(([k, l]) => (
          <div key={k}>
            <div style={{ height: 56, borderRadius: 10, background: vars[k] || '#000', border: '1px solid rgba(0,0,0,0.06)' }} />
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: vars.mute, marginTop: 4 }}>{l}</div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: vars.ink }}>{vars[k]}</div>
          </div>
        ))}
      </div>

      {/* Type sample */}
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: vars.mute, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>типографика</div>
        <div style={{ background: vars.card, borderRadius: 12, padding: 16, border: `1px solid ${vars.divider}` }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: vars.ink, fontFamily: vars.titleFont || font, lineHeight: 1.1, letterSpacing: -0.5 }}>Привет, Аня</div>
          <div style={{ fontSize: 14, color: vars.inkSoft, marginTop: 6, lineHeight: 1.45 }}>3 записи сегодня. Бот ответил на 7 диалогов за ночь.</div>
          <div style={{ fontSize: 11, color: vars.mute, fontFamily: 'JetBrains Mono, monospace', marginTop: 8 }}>10:42 · BOOK · Марина К.</div>
        </div>
      </div>

      {/* UI components */}
      <div style={{ marginTop: 18, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={{ background: vars.accent, color: vars.btnFg || '#fff', border: 'none', padding: '11px 18px', borderRadius: vars.radius || 12, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'default' }}>Дальше →</button>
        <button style={{ background: 'transparent', color: vars.ink, border: `1px solid ${vars.divider}`, padding: '11px 18px', borderRadius: vars.radius || 12, fontWeight: 500, fontSize: 13, fontFamily: 'inherit', cursor: 'default' }}>Отмена</button>
        <span style={{ background: vars.accentSoft, color: vars.accent, padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{vars.tag || '✨ совет'}</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Vibe note */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${vars.divider}`, fontSize: 12, color: vars.mute, lineHeight: 1.5 }}>
        <b style={{ color: vars.ink }}>Vibe:</b> {vars.vibe}
      </div>
    </div>
  );
}

function SystemCardWarm() {
  return <SystemCard
    vars={{ ...WARM, mute: WARM.mute, divider: WARM.divider, titleFont: '"Fraunces", serif', tag: '☕ совет', vibe: 'тёплый, домашний, тактильный. Серифные заголовки. Карамельный акцент. Подходит, если хочется ощущения «уют салона».' }}
    title="Тёплая карамель"
    sub="Серифные заголовки + Manrope. Глубокий бежево-коричневый."
    accentLabel="Вариант A"
    font='"Manrope", sans-serif'
  />;
}

function SystemCardRose() {
  return <SystemCard
    vars={{ ...ROSE, mute: ROSE.mute, divider: ROSE.divider, radius: 16, tag: '💕 совет', vibe: 'мягкий, эмоциональный, эмодзи-форвард. Жирные шрифты, скруглённые карточки, тёплый розовый. Подходит, если ЦА любит выразительный визуал.' }}
    title="Мягкий розовый"
    sub="Manrope 800. Сорбетный розовый. Эмодзи-акценты."
    accentLabel="Вариант B"
  />;
}

function SystemCardGraphite() {
  return <SystemCard
    vars={{ ...GRAPH, mute: GRAPH.mute, divider: GRAPH.divider, radius: 8, tag: 'note', vibe: 'технический, сдержанный, без украшений. Mono для меток. Графит и слоновая кость. Подходит, если в приоритете скорость и минимализм.' }}
    title="Графитовый минимал"
    sub="Manrope + JetBrains Mono. Чёрный, off-white. Минимум декора."
    accentLabel="Вариант C"
  />;
}

// ─── Tone of Voice card ─────────────────────────────────────

function ToneOfVoice() {
  const TV_INK = '#2a1f15';
  const TV_MUTE = '#8a7867';
  const TV_BG = '#fdfaf4';
  const TV_DIV = 'rgba(42,31,21,0.08)';
  const TV_OK = '#3a8b3a';
  const TV_BAD = '#b54141';

  const principles = [
    ['🤝', 'Как подруга, а не как банк', 'Тёплый, без жаргона. Не «осуществить запись» — «записать».'],
    ['💬', 'На «вы», но без скованности', 'Тебе/вы переключается в настройках. По умолчанию — мягкое «вы».'],
    ['✂️', 'Короче — лучше', 'Заголовки до 4 слов. Объяснения — 1 предложение, максимум 2.'],
    ['❓', 'Вопрос, а не команда', '«Когда вы работаете?» вместо «Введите часы работы».'],
    ['☕', 'Эмодзи дозированно', '1 эмодзи на экран как акцент. Не раскрашиваем каждое слово.'],
    ['🆘', 'Ошибки спокойно', 'Не «Ошибка!» — «Что-то не получилось. Попробуем ещё раз?»'],
  ];

  const examples = [
    ['Введите название услуги', 'Как назвать услугу?', 'команда → вопрос'],
    ['Operation completed successfully', 'Готово ✓', 'технический → человеческий'],
    ['Подтвердите удаление записи', 'Удалить запись Марины? Отменить будет нельзя.', 'абстракт → конкретика'],
    ['Sync error: code 502', 'Не получилось обновить — попробуйте через минуту.', 'жаргон → понятно'],
    ['Чтобы добавить услугу, нажмите кнопку «+» в правом верхнем углу...', 'Добавьте первую услугу — это займёт минуту.', 'инструкция → приглашение'],
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: TV_BG, padding: '32px 36px', display: 'flex', flexDirection: 'column', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontFamily: '"Fraunces", serif', fontSize: 32, fontWeight: 600, color: TV_INK, letterSpacing: -0.5 }}>Голос интерфейса</h1>
        <span style={{ fontSize: 12, color: TV_MUTE, fontFamily: 'JetBrains Mono, monospace' }}>tone of voice · 6 принципов</span>
      </div>
      <p style={{ margin: '0 0 22px', fontSize: 14, color: '#5a4634', maxWidth: 720, lineHeight: 1.5 }}>
        Аудитория — мастера 22–45, не технари. Цель: чтобы интерфейс ощущался как заметка от подруги, а не уведомление от банка. Эти правила одинаковы для всех 3 визуальных вариантов.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        {principles.map(([emoji, head, body]) => (
          <div key={head} style={{ background: '#fff', padding: 16, borderRadius: 14, border: `1px solid ${TV_DIV}` }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TV_INK, marginBottom: 4, letterSpacing: -0.1 }}>{head}</div>
            <div style={{ fontSize: 12.5, color: '#5a4634', lineHeight: 1.45 }}>{body}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: TV_MUTE, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>До → После</div>
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${TV_DIV}`, overflow: 'hidden' }}>
        {examples.map(([bad, good, label], i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', borderTop: i ? `1px solid ${TV_DIV}` : 'none' }}>
            <div style={{ padding: '14px 18px', borderRight: `1px solid ${TV_DIV}`, fontSize: 13, color: TV_BAD, lineHeight: 1.4, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>NO</span>
              <span style={{ textDecoration: 'line-through', textDecorationColor: 'rgba(181,65,65,0.4)' }}>{bad}</span>
            </div>
            <div style={{ padding: '14px 18px', borderRight: `1px solid ${TV_DIV}`, fontSize: 13, color: TV_OK, lineHeight: 1.4, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>YES</span>
              <span style={{ color: TV_INK, fontWeight: 500 }}>{good}</span>
            </div>
            <div style={{ padding: '14px 18px', fontSize: 11, color: TV_MUTE, fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 18, fontSize: 12, color: TV_MUTE, lineHeight: 1.5 }}>
        <b style={{ color: TV_INK }}>Замечание:</b> tone мастера → клиенту настраивается отдельно (формальный / дружеский / на «ты»). Это правила tone <b>интерфейса → мастеру</b>.
      </div>
    </div>
  );
}

Object.assign(window, { SystemCardWarm, SystemCardRose, SystemCardGraphite, ToneOfVoice });
