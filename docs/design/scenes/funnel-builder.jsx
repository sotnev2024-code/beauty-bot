// Воронка — Конструктор. Самый сложный экран MVP.
// 6 артбордов: список / пресеты / редактор / карточка шага / тест / ветвление
// + один кликабельный prototype с переключением между режимами

const FB = HYB; // используем токены гибрида D
const fbFonts = { body: '"Manrope", sans-serif', mono: '"JetBrains Mono", monospace' };

// ── shared bits ───────────────────────────────────────────────────────

function FBHeader({ title, sub, back, right }) {
  return (
    <div style={{ padding: '14px 22px 12px', borderBottom: `1px solid ${FB.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      {back && <div style={{ fontSize: 18, color: FB.ink, cursor: 'pointer' }}>←</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontFamily: fbFonts.mono, color: FB.accent, letterSpacing: 0.4 }}>{sub}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: FB.ink, letterSpacing: -0.3 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function FBTabBar({ active = 'bot' }) {
  const items = [
    ['home', 'home'],
    ['cal', 'cal'],
    ['bot', 'bot'],
    ['cli', 'cli'],
    ['cfg', 'cfg'],
  ];
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0 14px', borderTop: `1px solid ${FB.divider}`, background: FB.card, fontFamily: fbFonts.mono, fontSize: 11 }}>
      {items.map(([id, l]) => (
        <div key={id} style={{ color: id === active ? FB.accent : FB.mute, fontWeight: id === active ? 700 : 400 }}>{l}</div>
      ))}
    </div>
  );
}

// ── 1. Список воронок ─────────────────────────────────────────────────

function FunnelList() {
  const funnels = [
    { name: 'Маникюр · базовый', steps: 5, status: 'ON', conv: 64, last: 'сегодня · 12 диал.' },
    { name: 'Брови — холодная', steps: 4, status: 'OFF', conv: 28, last: '3 дня назад' },
    { name: 'Возврат после визита', steps: 3, status: 'ON', conv: 41, last: 'вчера · 6 диал.' },
  ];
  return (
    <PhoneShell width={320} height={660} bg={FB.bg}>
      <FBHeader sub="БОТ · ВОРОНКИ" title="Воронки" right={
        <div style={{ width: 32, height: 32, borderRadius: 8, background: FB.ink, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600 }}>+</div>
      } />
      <div style={{ flex: 1, padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          {['все · 3', 'активные · 2', 'черновики · 1'].map((t, i) => (
            <div key={i} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontFamily: fbFonts.mono, background: i === 0 ? FB.ink : 'transparent', color: i === 0 ? '#fff' : FB.mute, border: i === 0 ? 'none' : `1px solid ${FB.divider}` }}>{t}</div>
          ))}
        </div>
        {funnels.map((f, i) => (
          <div key={i} style={{ background: FB.card, border: `1px solid ${FB.divider}`, borderRadius: 12, padding: 14, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: FB.ink }}>{f.name}</div>
              <div style={{ fontSize: 9, fontFamily: fbFonts.mono, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: f.status === 'ON' ? '#e7f4e7' : '#f0eee9', color: f.status === 'ON' ? FB.success : FB.mute }}>
                {f.status}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: fbFonts.mono, color: FB.mute }}>
              <span>{f.steps} шагов</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: FB.divider }} />
              <span style={{ color: f.conv > 50 ? FB.success : FB.mute }}>конв. {f.conv}%</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: FB.divider }} />
              <span>{f.last}</span>
            </div>
            <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: FB.divider, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${f.conv}%`, background: f.status === 'ON' ? FB.accent : FB.mute }} />
            </div>
          </div>
        ))}
        <button style={{ marginTop: 4, background: 'transparent', border: `1.5px dashed ${FB.divider}`, padding: 14, borderRadius: 12, color: FB.mute, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
          + Создать воронку
        </button>
      </div>
      <FBTabBar />
    </PhoneShell>
  );
}

// ── 2. Выбор пресета ──────────────────────────────────────────────────

function FunnelPresets() {
  const presets = [
    { tag: 'POPULAR', name: 'Маникюр / педикюр', sub: 'Приветствие → услуга → слот → контакт → подтверждение', steps: 5 },
    { tag: 'POPULAR', name: 'Ресницы / брови', sub: 'Знакомство → выбор техники → слот → подтверждение', steps: 4 },
    { tag: null, name: 'Возврат постоянной', sub: 'Через 4 нед. после визита → напомнить → предложить запись', steps: 3 },
    { tag: null, name: 'Холодная заявка', sub: 'Из рекламы → знакомство → услуга → слот', steps: 5 },
  ];
  return (
    <PhoneShell width={320} height={660} bg={FB.bg}>
      <FBHeader sub="БОТ · НОВАЯ ВОРОНКА" title="С чего начнём?" back />
      <div style={{ flex: 1, padding: '16px 22px 22px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <p style={{ margin: 0, fontSize: 13, color: FB.inkSoft, lineHeight: 1.5 }}>
          Возьмите готовый шаблон под вашу нишу — настроим под себя за пару минут.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {presets.map((p, i) => (
            <div key={i} style={{ background: FB.card, border: `1px solid ${i === 0 ? FB.accent : FB.divider}`, borderRadius: 12, padding: 14, cursor: 'pointer', position: 'relative' }}>
              {p.tag && <div style={{ position: 'absolute', top: -7, left: 12, fontSize: 9, fontFamily: fbFonts.mono, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: FB.accent, color: '#fff' }}>{p.tag}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: FB.ink }}>{p.name}</div>
                <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute }}>{p.steps} шагов</div>
              </div>
              <div style={{ fontSize: 12, color: FB.inkSoft, lineHeight: 1.5 }}>{p.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: FB.divider, margin: '12px 0' }} />
        <button style={{ background: 'transparent', border: `1.5px dashed ${FB.divider}`, padding: 14, borderRadius: 12, color: FB.mute, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
          Пустая воронка с нуля
        </button>
      </div>
    </PhoneShell>
  );
}

// ── 3. Редактор воронки (главный экран) ───────────────────────────────

const FUNNEL_STEPS = [
  { id: 1, type: 'GREET', name: 'Приветствие', goal: 'Поздороваться, узнать имя', status: 'ok' },
  { id: 2, type: 'NEED',  name: 'Какая услуга нужна', goal: 'Определить услугу из прайса', status: 'ok' },
  { id: 3, type: 'COND',  name: 'Если новая клиентка', goal: 'Развилка: новенькая → расскажи об услуге', status: 'cond' },
  { id: 4, type: 'SLOT',  name: 'Предложить слот', goal: 'Выбрать день и время', status: 'ok' },
  { id: 5, type: 'CONFIRM', name: 'Подтверждение', goal: 'Записать в календарь, прислать напоминание', status: 'ok' },
];

function StepIcon({ type, active }) {
  const map = {
    GREET: '01', NEED: '02', COND: 'IF', SLOT: '03', CONFIRM: '04',
  };
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8,
      background: active ? FB.accent : (type === 'COND' ? '#fff' : FB.ink),
      color: active ? '#fff' : (type === 'COND' ? FB.accent : '#fff'),
      border: type === 'COND' ? `1.5px dashed ${FB.accent}` : 'none',
      display: 'grid', placeItems: 'center',
      fontFamily: fbFonts.mono, fontSize: 10, fontWeight: 700,
      flexShrink: 0,
    }}>{map[type]}</div>
  );
}

function FunnelEditor({ activeId = 2 }) {
  return (
    <PhoneShell width={320} height={660} bg={FB.bg}>
      <FBHeader sub="ВОРОНКА · РЕДАКТОР" title="Маникюр · базовый" back right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 30, height: 18, borderRadius: 9, background: FB.success, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
          </div>
        </div>
      } />

      {/* meta */}
      <div style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, fontFamily: fbFonts.mono, color: FB.mute, borderBottom: `1px solid ${FB.divider}` }}>
        <span>5 ШАГОВ</span>
        <span>·</span>
        <span style={{ color: FB.success }}>ON</span>
        <span>·</span>
        <span>конв. 64%</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: FB.accent, fontWeight: 600, cursor: 'pointer' }}>тест →</span>
      </div>

      {/* steps timeline */}
      <div style={{ flex: 1, padding: '14px 22px 16px', overflow: 'auto', position: 'relative' }}>
        {/* connector line */}
        <div style={{ position: 'absolute', left: 37, top: 30, bottom: 70, width: 1, background: FB.divider }} />

        {FUNNEL_STEPS.map((s, i) => {
          const active = s.id === activeId;
          return (
            <div key={s.id} style={{ display: 'flex', gap: 12, marginBottom: 8, position: 'relative' }}>
              <StepIcon type={s.type} active={active} />
              <div style={{
                flex: 1, padding: 12, borderRadius: 10,
                background: active ? FB.accentSoft : FB.card,
                border: `1px solid ${active ? FB.accent : FB.divider}`,
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: FB.ink, letterSpacing: -0.1 }}>{s.name}</div>
                  <div style={{ fontSize: 9, fontFamily: fbFonts.mono, color: s.status === 'cond' ? FB.accentDark : FB.mute, fontWeight: 600 }}>{s.type}</div>
                </div>
                <div style={{ fontSize: 11.5, color: FB.inkSoft, marginTop: 3, lineHeight: 1.4 }}>{s.goal}</div>
                {active && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid rgba(217,105,98,0.25)`, display: 'flex', gap: 8, fontSize: 10, fontFamily: fbFonts.mono }}>
                    <span style={{ color: FB.accentDark, fontWeight: 600 }}>редактировать ↗</span>
                    <span style={{ color: FB.mute }}>дублировать</span>
                    <span style={{ color: FB.mute, marginLeft: 'auto' }}>удалить</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* add step */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingLeft: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px dashed ${FB.divider}`, color: FB.mute, display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0 }}>+</div>
          <div style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px dashed ${FB.divider}`, color: FB.mute, fontSize: 13, fontFamily: 'inherit' }}>Добавить шаг</div>
        </div>
      </div>

      <FBTabBar />
    </PhoneShell>
  );
}

// ── 4. Карточка шага (sheet) ──────────────────────────────────────────

function StepSheet() {
  return (
    <PhoneShell width={320} height={660} bg={FB.bg}>
      {/* dimmed editor behind */}
      <div style={{ flex: 1, position: 'relative', background: 'rgba(31,20,22,0.5)' }}>
        {/* peek of editor */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.25 }}>
          <FBHeader sub="ВОРОНКА · РЕДАКТОР" title="Маникюр · базовый" back />
        </div>

        {/* sheet */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 60, background: FB.card, borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* grabber */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: FB.divider }} />
          </div>
          {/* sheet header */}
          <div style={{ padding: '6px 22px 14px', borderBottom: `1px solid ${FB.divider}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StepIcon type="NEED" active />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute }}>ШАГ 02 · NEED</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: FB.ink, letterSpacing: -0.2 }}>Какая услуга нужна</div>
              </div>
              <div style={{ fontSize: 18, color: FB.mute, cursor: 'pointer' }}>×</div>
            </div>
          </div>

          <div style={{ flex: 1, padding: '14px 22px 18px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* goal */}
            <div>
              <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute, letterSpacing: 0.4, marginBottom: 6 }}>ЦЕЛЬ ШАГА</div>
              <div style={{ background: FB.bg, borderRadius: 10, padding: 12, fontSize: 13, color: FB.ink, lineHeight: 1.45 }}>
                Понять, какую услугу хочет клиентка. Сопоставить с прайсом.
              </div>
            </div>

            {/* prompt */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute, letterSpacing: 0.4 }}>СИСТЕМНЫЙ ПРОМТ</div>
                <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.accent, cursor: 'pointer' }}>пример ↗</div>
              </div>
              <div style={{ background: FB.bg, border: `1px solid ${FB.divider}`, borderRadius: 10, padding: 12, fontSize: 12.5, color: FB.ink, lineHeight: 1.5, fontFamily: fbFonts.mono }}>
                Спроси у клиентки, какую услугу хочет.<br/>
                Если назовёт нашу — подтверди.<br/>
                Если не из списка — мягко предложи альтернативу.
              </div>
            </div>

            {/* available services */}
            <div>
              <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute, letterSpacing: 0.4, marginBottom: 6 }}>ДОСТУПНЫЕ УСЛУГИ</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['Маникюр + покрытие', 'Маникюр без', 'Педикюр', 'Снятие'].map((s, i) => (
                  <div key={i} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, background: FB.accentSoft, color: FB.accentDark, fontFamily: fbFonts.mono }}>✓ {s}</div>
                ))}
              </div>
            </div>

            {/* transitions */}
            <div>
              <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute, letterSpacing: 0.4, marginBottom: 8 }}>ПЕРЕХОД ДАЛЬШЕ</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  ['КОГДА', 'услуга определена', '→ шаг 03'],
                  ['ИНАЧЕ', 'клиентка молчит >2ч', '→ напомнить'],
                ].map(([k, v, t], i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${FB.divider}`, fontSize: 12 }}>
                    <span style={{ fontFamily: fbFonts.mono, color: FB.accent, fontWeight: 600, fontSize: 10 }}>{k}</span>
                    <span style={{ color: FB.ink }}>{v}</span>
                    <span style={{ color: FB.mute, fontSize: 11, fontFamily: fbFonts.mono }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div style={{ padding: '12px 22px 18px', borderTop: `1px solid ${FB.divider}`, display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, background: FB.ink, color: '#fff', border: 'none', padding: '13px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Сохранить</button>
            <button style={{ background: 'transparent', color: FB.accentDark, border: `1px solid ${FB.divider}`, padding: '13px 16px', borderRadius: 12, fontWeight: 500, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>↺ тест</button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ── 5. Тест-режим ─────────────────────────────────────────────────────

function FunnelTest() {
  return (
    <PhoneShell width={320} height={660} bg={FB.bg}>
      <FBHeader sub="ВОРОНКА · ТЕСТ" title="Превью диалога" back right={
        <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.success, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: '#e7f4e7' }}>LIVE</div>
      } />
      <div style={{ flex: 1, padding: '12px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* step badge */}
        <div style={{ alignSelf: 'center', fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute, padding: '4px 10px', borderRadius: 999, background: FB.card, border: `1px solid ${FB.divider}` }}>
          ── шаг 01 · приветствие ──
        </div>

        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: FB.accent, color: '#fff', padding: '9px 13px', borderRadius: '14px 14px 4px 14px', fontSize: 13.5 }}>привет</div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: FB.card, color: FB.ink, padding: '9px 13px', borderRadius: '14px 14px 14px 4px', fontSize: 13.5, lineHeight: 1.45, border: `1px solid ${FB.divider}` }}>
          Здравствуйте! Я Аня. Подскажите ваше имя — так мне будет удобнее общаться 🌷
        </div>

        <div style={{ alignSelf: 'center', fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute, padding: '4px 10px', borderRadius: 999, background: FB.card, border: `1px solid ${FB.divider}`, marginTop: 6 }}>
          ── шаг 02 · услуга ──
        </div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: FB.accent, color: '#fff', padding: '9px 13px', borderRadius: '14px 14px 4px 14px', fontSize: 13.5 }}>Марина. Хочу маникюр</div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: FB.card, color: FB.ink, padding: '9px 13px', borderRadius: '14px 14px 14px 4px', fontSize: 13.5, lineHeight: 1.45, border: `1px solid ${FB.divider}` }}>
          Марина, приятно! Маникюр + покрытие, 90 мин — 2 500 ₽. На какой день удобнее?
        </div>

        {/* AI debug */}
        <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: FB.card, border: `1px dashed ${FB.divider}`, fontSize: 11, fontFamily: fbFonts.mono, color: FB.mute, lineHeight: 1.5 }}>
          <div style={{ color: FB.accent, fontWeight: 700, marginBottom: 4 }}>· DEEPSEEK · 0.42s</div>
          intent: book_service<br/>
          service: "Маникюр + покрытие" (97%)<br/>
          next: → step 03 (slot)
        </div>
      </div>

      <div style={{ padding: '10px 18px 14px', borderTop: `1px solid ${FB.divider}`, display: 'flex', gap: 8, alignItems: 'center', background: FB.card }}>
        <input placeholder="Напишите как клиентка…" style={{ flex: 1, border: `1px solid ${FB.divider}`, background: FB.bg, padding: '10px 12px', borderRadius: 999, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        <button style={{ width: 36, height: 36, borderRadius: '50%', background: FB.accent, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16 }}>↑</button>
      </div>
    </PhoneShell>
  );
}

// ── 6. Развилка ───────────────────────────────────────────────────────

function FunnelBranch() {
  return (
    <PhoneShell width={320} height={660} bg={FB.bg}>
      <FBHeader sub="ШАГ 03 · РАЗВИЛКА" title="Если новая клиентка" back />
      <div style={{ flex: 1, padding: '14px 22px', overflow: 'auto' }}>
        <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute, letterSpacing: 0.4, marginBottom: 6 }}>УСЛОВИЕ</div>
        <div style={{ background: FB.card, border: `1px solid ${FB.divider}`, borderRadius: 10, padding: 12, fontSize: 13, color: FB.ink, marginBottom: 18 }}>
          <code style={{ fontFamily: fbFonts.mono, fontSize: 12, color: FB.accentDark }}>client.history</code>{' '}
          <span style={{ color: FB.mute }}>равно</span>{' '}
          <code style={{ fontFamily: fbFonts.mono, fontSize: 12, background: FB.accentSoft, padding: '1px 5px', borderRadius: 3, color: FB.accentDark }}>пусто</code>
        </div>

        <div style={{ fontSize: 10, fontFamily: fbFonts.mono, color: FB.mute, letterSpacing: 0.4, marginBottom: 8 }}>ВЕТКИ</div>

        {/* TRUE branch */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 4, borderRadius: 2, background: FB.success, flexShrink: 0 }} />
          <div style={{ flex: 1, background: FB.card, border: `1px solid ${FB.divider}`, borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontFamily: fbFonts.mono, color: '#fff', background: FB.success, padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>ДА</span>
              <span style={{ fontSize: 12, color: FB.ink, fontWeight: 600 }}>Новенькая</span>
            </div>
            <div style={{ fontSize: 11.5, color: FB.inkSoft, lineHeight: 1.5 }}>→ Расскажи об услуге подробнее</div>
            <div style={{ fontSize: 11.5, color: FB.inkSoft, lineHeight: 1.5 }}>→ Покажи 2-3 примера работ</div>
            <div style={{ fontSize: 11.5, color: FB.accent, lineHeight: 1.5, marginTop: 4 }}>→ перейти к шагу 04</div>
          </div>
        </div>

        {/* FALSE branch */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 4, borderRadius: 2, background: FB.mute, flexShrink: 0 }} />
          <div style={{ flex: 1, background: FB.card, border: `1px solid ${FB.divider}`, borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontFamily: fbFonts.mono, color: '#fff', background: FB.mute, padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>НЕТ</span>
              <span style={{ fontSize: 12, color: FB.ink, fontWeight: 600 }}>Постоянная</span>
            </div>
            <div style={{ fontSize: 11.5, color: FB.inkSoft, lineHeight: 1.5 }}>→ «Рада снова видеть!»</div>
            <div style={{ fontSize: 11.5, color: FB.accent, lineHeight: 1.5, marginTop: 4 }}>→ перейти к шагу 04</div>
          </div>
        </div>

        <button style={{ width: '100%', background: 'transparent', border: `1.5px dashed ${FB.divider}`, padding: 12, borderRadius: 10, color: FB.mute, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
          + Добавить условие
        </button>
      </div>
    </PhoneShell>
  );
}

// ── 7. Кликабельный prototype ────────────────────────────────────────

function FunnelPrototype() {
  const [view, setView] = React.useState('list');
  const screens = {
    list: <FunnelList />,
    presets: <FunnelPresets />,
    editor: <FunnelEditor activeId={2} />,
    sheet: <StepSheet />,
    test: <FunnelTest />,
    branch: <FunnelBranch />,
  };
  const labels = [
    ['list', '1 · Список'],
    ['presets', '2 · Пресеты'],
    ['editor', '3 · Редактор'],
    ['sheet', '4 · Карточка'],
    ['test', '5 · Тест'],
    ['branch', '6 · Развилка'],
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#ece7e2', padding: 24, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', fontFamily: fbFonts.body }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
        <div style={{ fontSize: 11, fontFamily: fbFonts.mono, color: FB.mute, letterSpacing: 0.4, marginBottom: 4 }}>КЛИКНИТЕ →</div>
        {labels.map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} style={{
            background: view === id ? FB.ink : '#fff',
            color: view === id ? '#fff' : FB.ink,
            border: `1px solid ${view === id ? FB.ink : FB.divider}`,
            padding: '10px 14px', borderRadius: 10,
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            cursor: 'pointer', textAlign: 'left',
          }}>{l}</button>
        ))}
        <div style={{ marginTop: 12, fontSize: 11, color: FB.mute, lineHeight: 1.5 }}>
          Реальный поток:<br/>
          список → + → пресеты →<br/>
          редактор → шаг → тест.
        </div>
      </div>
      <div>{screens[view]}</div>
    </div>
  );
}

Object.assign(window, { FunnelList, FunnelPresets, FunnelEditor, StepSheet, FunnelTest, FunnelBranch, FunnelPrototype });
