// Карточка клиента — D · Коралл + сетка
const CL = HYB;
const clFonts = { body: '"Manrope", sans-serif', mono: '"JetBrains Mono", monospace' };

function ClHeader({ title, sub, back, right }) {
  return (
    <div style={{ padding: '14px 22px 12px', borderBottom: `1px solid ${CL.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      {back && <div style={{ fontSize: 18, color: CL.ink, cursor: 'pointer' }}>←</div>}
      <div style={{ flex: 1 }}>
        {sub && <div style={{ fontSize: 11, fontFamily: clFonts.mono, color: CL.accent, letterSpacing: 0.4 }}>{sub}</div>}
        <div style={{ fontSize: 17, fontWeight: 700, color: CL.ink, letterSpacing: -0.3 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function ClTabBar({ active = 'cli' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0 14px', borderTop: `1px solid ${CL.divider}`, background: CL.card, fontFamily: clFonts.mono, fontSize: 11 }}>
      {['home', 'cal', 'bot', 'cli', 'cfg'].map(l => (
        <div key={l} style={{ color: l === active ? CL.accent : CL.mute, fontWeight: l === active ? 700 : 400 }}>{l}</div>
      ))}
    </div>
  );
}

// ── 1. База клиентов (список) ─────────────────────────────────────────

const CLIENTS = [
  { name: 'Марина К.', initials: 'МК', visits: 4, avg: 2500, last: '2 нед.', tag: 'постоянная', acc: true },
  { name: 'Алина Р.', initials: 'АР', visits: 1, avg: 500, last: 'вчера', tag: 'новенькая' },
  { name: 'Юлия В.', initials: 'ЮВ', visits: 7, avg: 3200, last: '1 мес.', tag: 'постоянная', vip: true },
  { name: 'Катя М.', initials: 'КМ', visits: 2, avg: 2500, last: '3 мес.', tag: 'спящая' },
  { name: 'Дарья Л.', initials: 'ДЛ', visits: 3, avg: 1800, last: '5 дн.', tag: 'постоянная' },
  { name: 'Ольга С.', initials: 'ОС', visits: 1, avg: 2500, last: '1 нед.', tag: 'новенькая' },
];

const TAG_STYLE = {
  'новенькая': { c: CL.accentDark, b: CL.accentSoft },
  'постоянная': { c: CL.success, b: '#e7f4e7' },
  'спящая': { c: CL.mute, b: '#ece7e2' },
};

function ClientList() {
  return (
    <PhoneShell width={320} height={660} bg={CL.bg}>
      <ClHeader sub="БАЗА · 47 КЛИЕНТОК" title="Клиентки" right={
        <div style={{ width: 32, height: 32, borderRadius: 8, background: CL.ink, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>+</div>
      } />

      {/* search */}
      <div style={{ padding: '10px 22px 8px', borderBottom: `1px solid ${CL.divider}` }}>
        <div style={{ background: CL.card, border: `1px solid ${CL.divider}`, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: CL.mute, fontSize: 13 }}>⌕</span>
          <input placeholder="Имя, телефон, заметка…" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: CL.ink, outline: 'none', fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* segments */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 22px', overflowX: 'auto', borderBottom: `1px solid ${CL.divider}` }}>
        {[['все', 47, true], ['постоянные', 18], ['новенькие', 6], ['спящие', 12], ['VIP', 4]].map(([t, n, on], i) => (
          <div key={i} style={{
            padding: '6px 12px', borderRadius: 999, fontSize: 11, fontFamily: clFonts.mono, fontWeight: 500,
            background: on ? CL.ink : 'transparent',
            color: on ? '#fff' : CL.inkSoft,
            border: on ? 'none' : `1px solid ${CL.divider}`,
            whiteSpace: 'nowrap', cursor: 'pointer',
          }}>{t} · {n}</div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {CLIENTS.map((c, i) => {
          const ts = TAG_STYLE[c.tag];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderBottom: `1px solid ${CL.divider}`, cursor: 'pointer' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: c.vip ? `linear-gradient(135deg, ${CL.accent}, ${CL.accentDark})` : CL.accentSoft, color: c.vip ? '#fff' : CL.accentDark, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {c.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: CL.ink }}>{c.name}</span>
                  {c.vip && <span style={{ fontSize: 9, fontFamily: clFonts.mono, color: CL.accentDark, fontWeight: 700 }}>★ VIP</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, fontFamily: clFonts.mono, color: CL.mute }}>
                  <span>{c.visits} визит{c.visits === 1 ? '' : c.visits < 5 ? 'а' : 'ов'}</span>
                  <span>·</span>
                  <span>ср. {c.avg} ₽</span>
                  <span>·</span>
                  <span>{c.last}</span>
                </div>
              </div>
              <div style={{ fontSize: 10, fontFamily: clFonts.mono, fontWeight: 600, padding: '3px 7px', borderRadius: 4, background: ts.b, color: ts.c, flexShrink: 0 }}>
                {c.tag}
              </div>
            </div>
          );
        })}
      </div>

      <ClTabBar />
    </PhoneShell>
  );
}

// ── 2. Карточка клиента ★ ────────────────────────────────────────────

function ClientCard() {
  return (
    <PhoneShell width={320} height={660} bg={CL.bg}>
      <ClHeader sub="КЛИЕНТКА" title="Марина К." back right={
        <div style={{ fontSize: 18, color: CL.mute, cursor: 'pointer' }}>⋯</div>
      } />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* hero */}
        <div style={{ padding: '20px 22px 16px', display: 'flex', gap: 14, alignItems: 'center', borderBottom: `1px solid ${CL.divider}` }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: `linear-gradient(135deg, ${CL.accent}, ${CL.accentDark})`, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
            МК
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: CL.ink, letterSpacing: -0.4 }}>Марина К.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ fontSize: 10, fontFamily: clFonts.mono, fontWeight: 700, padding: '3px 7px', borderRadius: 4, background: '#e7f4e7', color: CL.success }}>постоянная</div>
              <span style={{ fontSize: 11, color: CL.mute, fontFamily: clFonts.mono }}>с 12.01.26</span>
            </div>
          </div>
        </div>

        {/* contact */}
        <div style={{ padding: '12px 22px', borderBottom: `1px solid ${CL.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.mute, letterSpacing: 0.4 }}>TELEGRAM · ТЕЛ</div>
            <div style={{ color: CL.ink, fontFamily: clFonts.mono, marginTop: 2 }}>@marina_k · +7 ··· 4471</div>
          </div>
          <button style={{ background: 'transparent', border: `1px solid ${CL.divider}`, padding: '6px 12px', borderRadius: 8, fontSize: 11, color: CL.ink, cursor: 'pointer', fontFamily: 'inherit' }}>чат</button>
        </div>

        {/* metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: `1px solid ${CL.divider}` }}>
          {[
            ['ВИЗИТОВ', '4'],
            ['СР. ЧЕК', '2 500 ₽'],
            ['ВСЕГО', '10 000 ₽'],
          ].map(([k, v], i) => (
            <div key={i} style={{ padding: '14px 0', textAlign: 'center', borderRight: i < 2 ? `1px solid ${CL.divider}` : 'none' }}>
              <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.mute, letterSpacing: 0.4 }}>{k}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: CL.ink, letterSpacing: -0.4, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* note */}
        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${CL.divider}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.mute, letterSpacing: 0.4 }}>ЗАМЕТКА</div>
            <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.accent, cursor: 'pointer' }}>править</div>
          </div>
          <div style={{ background: CL.accentSoft, borderRadius: 10, padding: 12, fontSize: 13, color: CL.accentDark, lineHeight: 1.5 }}>
            «Аллергия на кобальт. Любит нюд и натуральную форму. Кофе с молоком 🤍»
          </div>
          {/* tags */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
            {['#аллергия', '#нюд', '#кофе'].map(t => (
              <span key={t} style={{ fontSize: 11, fontFamily: clFonts.mono, color: CL.inkSoft, background: CL.card, border: `1px solid ${CL.divider}`, padding: '3px 8px', borderRadius: 6 }}>{t}</span>
            ))}
            <span style={{ fontSize: 11, fontFamily: clFonts.mono, color: CL.mute, padding: '3px 8px' }}>+ тег</span>
          </div>
        </div>

        {/* upcoming */}
        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${CL.divider}` }}>
          <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.mute, letterSpacing: 0.4, marginBottom: 6 }}>БЛИЖАЙШАЯ ЗАПИСЬ</div>
          <div style={{ background: CL.card, border: `1px solid ${CL.accent}`, borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: CL.ink }}>Маникюр + покрытие</div>
              <div style={{ fontSize: 11, fontFamily: clFonts.mono, color: CL.accent, marginTop: 2 }}>СБ 29 АПР · 10:00</div>
            </div>
            <span style={{ fontSize: 9, fontFamily: clFonts.mono, color: '#fff', background: CL.accent, padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>BOT</span>
          </div>
        </div>

        {/* history */}
        <div style={{ padding: '14px 22px' }}>
          <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.mute, letterSpacing: 0.4, marginBottom: 8 }}>ИСТОРИЯ · 4 ВИЗИТА</div>
          {[
            ['12.04.26', 'Маникюр + покрытие', '2 500'],
            ['28.03.26', 'Маникюр + покрытие', '2 500'],
            ['10.03.26', 'Снятие гель-лака', '500'],
            ['12.01.26', 'Маникюр + покрытие', '2 500'],
          ].map(([d, s, p], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', padding: '8px 0', fontSize: 12.5, gap: 10, borderTop: i === 0 ? 'none' : `1px solid ${CL.divider}` }}>
              <span style={{ fontFamily: clFonts.mono, color: CL.mute, width: 64, fontSize: 11 }}>{d}</span>
              <span style={{ color: CL.ink, flex: 1 }}>{s}</span>
              <span style={{ fontFamily: clFonts.mono, color: CL.mute }}>{p} ₽</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 22px 16px', borderTop: `1px solid ${CL.divider}`, display: 'flex', gap: 8, background: CL.card }}>
        <button style={{ flex: 1, background: CL.ink, color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 600, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>Записать</button>
        <button style={{ flex: 1, background: 'transparent', color: CL.ink, border: `1px solid ${CL.divider}`, padding: '12px', borderRadius: 12, fontWeight: 500, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>Открыть чат</button>
      </div>
    </PhoneShell>
  );
}

// ── 3. Чат с клиенткой + перехват ────────────────────────────────────

function ClientChat() {
  return (
    <PhoneShell width={320} height={660} bg={CL.bg}>
      <div style={{ padding: '12px 22px 10px', borderBottom: `1px solid ${CL.divider}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 18, color: CL.ink, cursor: 'pointer' }}>←</div>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: CL.accentSoft, color: CL.accentDark, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>МК</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: CL.ink }}>Марина К.</div>
          <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.success }}>● бот отвечает</div>
        </div>
        <div style={{ fontSize: 16, color: CL.mute, cursor: 'pointer' }}>⋯</div>
      </div>

      <div style={{ flex: 1, padding: '14px 18px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* date */}
        <div style={{ alignSelf: 'center', fontSize: 10, fontFamily: clFonts.mono, color: CL.mute, padding: '3px 10px' }}>СЕГОДНЯ · 09:42</div>

        <div style={{ alignSelf: 'flex-start', maxWidth: '78%', background: CL.card, color: CL.ink, padding: '8px 12px', borderRadius: '12px 12px 12px 4px', fontSize: 13, lineHeight: 1.4, border: `1px solid ${CL.divider}` }}>привет! на завтра можно?</div>

        <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
          <div style={{ background: CL.accent, color: '#fff', padding: '8px 12px', borderRadius: '12px 12px 4px 12px', fontSize: 13, lineHeight: 1.4 }}>
            Здравствуйте, Марина! 🤍 На завтра свободно: 11:00 и 16:30. На обычный маникюр + покрытие?
          </div>
          <div style={{ fontSize: 9, fontFamily: clFonts.mono, color: CL.mute, textAlign: 'right', marginTop: 2, paddingRight: 4 }}>· бот · 09:42</div>
        </div>

        <div style={{ alignSelf: 'flex-start', maxWidth: '78%', background: CL.card, color: CL.ink, padding: '8px 12px', borderRadius: '12px 12px 12px 4px', fontSize: 13, lineHeight: 1.4, border: `1px solid ${CL.divider}` }}>11 норм</div>

        <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
          <div style={{ background: CL.accent, color: '#fff', padding: '8px 12px', borderRadius: '12px 12px 4px 12px', fontSize: 13, lineHeight: 1.4 }}>
            Записала на сб 29 апр, 11:00. Пришлю напоминание за 2ч 🤍
          </div>
          <div style={{ fontSize: 9, fontFamily: clFonts.mono, color: CL.mute, textAlign: 'right', marginTop: 2, paddingRight: 4 }}>· бот · 09:43</div>
        </div>
      </div>

      {/* takeover bar */}
      <div style={{ padding: '10px 18px', background: CL.accentSoft, borderTop: `1px solid ${CL.divider}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 12, color: CL.accentDark, flex: 1, lineHeight: 1.4 }}>
          <b>Бот ведёт диалог.</b> Хотите ответить сами?
        </div>
        <button style={{ background: CL.ink, color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Перехватить</button>
      </div>

      <div style={{ padding: '10px 14px 14px', borderTop: `1px solid ${CL.divider}`, display: 'flex', gap: 8, alignItems: 'center', background: CL.card }}>
        <input placeholder="Сначала перехватите бот…" disabled style={{ flex: 1, border: `1px solid ${CL.divider}`, background: CL.bg, padding: '9px 12px', borderRadius: 999, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: CL.mute }} />
        <button disabled style={{ width: 34, height: 34, borderRadius: '50%', background: CL.divider, color: '#fff', border: 'none', cursor: 'not-allowed', fontSize: 14 }}>↑</button>
      </div>
    </PhoneShell>
  );
}

// ── 4. Заметки и теги (sheet редактирования) ─────────────────────────

function NoteEdit() {
  return (
    <PhoneShell width={320} height={660} bg={CL.bg}>
      <div style={{ flex: 1, position: 'relative', background: 'rgba(31,20,22,0.55)' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.2, pointerEvents: 'none' }}>
          <ClHeader sub="КЛИЕНТКА" title="Марина К." back />
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 100, background: CL.card, borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: CL.divider }} />
          </div>
          <div style={{ padding: '6px 22px 14px', borderBottom: `1px solid ${CL.divider}`, display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.mute, letterSpacing: 0.4 }}>МАРИНА К. · ЗАМЕТКА</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: CL.ink, letterSpacing: -0.2 }}>Личная заметка</div>
            </div>
            <div style={{ fontSize: 18, color: CL.mute, cursor: 'pointer' }}>×</div>
          </div>

          <div style={{ flex: 1, padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <textarea defaultValue="Аллергия на кобальт. Любит нюд и натуральную форму. Кофе с молоком 🤍" style={{ minHeight: 110, padding: 12, borderRadius: 10, border: `1.5px solid ${CL.accent}`, background: CL.bg, fontSize: 14, color: CL.ink, lineHeight: 1.5, fontFamily: 'inherit', outline: 'none', resize: 'none' }} />
            <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.mute, letterSpacing: 0.4, marginTop: 4 }}>
              ВИДНО ТОЛЬКО ВАМ. БОТ ИСПОЛЬЗУЕТ В ОТВЕТАХ.
            </div>

            <div>
              <div style={{ fontSize: 10, fontFamily: clFonts.mono, color: CL.mute, letterSpacing: 0.4, marginBottom: 8 }}>ТЕГИ</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {[['аллергия', true], ['нюд', true], ['кофе', true], ['VIP', false], ['опаздывает', false], ['не любит запах', false]].map(([t, on], i) => (
                  <span key={i} style={{
                    fontSize: 11, fontFamily: clFonts.mono,
                    background: on ? CL.accent : 'transparent',
                    color: on ? '#fff' : CL.inkSoft,
                    border: on ? 'none' : `1px solid ${CL.divider}`,
                    padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                  }}>{on && '✓ '}#{t}</span>
                ))}
                <span style={{ fontSize: 11, fontFamily: clFonts.mono, color: CL.mute, padding: '5px 10px', border: `1px dashed ${CL.divider}`, borderRadius: 6, cursor: 'pointer' }}>+ новый</span>
              </div>
            </div>

            <div style={{ background: CL.accentSoft, borderRadius: 10, padding: 12, fontSize: 12, color: CL.accentDark, lineHeight: 1.5, marginTop: 'auto' }}>
              <b>Совет:</b> чем больше деталей — тем естественнее бот общается. Можно вкл «без кобальта», бот сам предупредит мастера наедине.
            </div>
          </div>

          <div style={{ padding: '12px 22px 18px', borderTop: `1px solid ${CL.divider}`, display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, background: CL.ink, color: '#fff', border: 'none', padding: '13px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Сохранить</button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ── 5. Сегменты ──────────────────────────────────────────────────────

function ClientSegments() {
  const segments = [
    { name: 'Постоянные', sub: '3+ визита, был меньше месяца назад', count: 18, color: CL.success, bg: '#e7f4e7', tip: 'Можно отправить серию «возврат» — бот предложит запись' },
    { name: 'Новенькие', sub: 'первый визит за последние 30 дней', count: 6, color: CL.accentDark, bg: CL.accentSoft, tip: 'Бот напоминает оставить отзыв через 2 дня' },
    { name: 'Спящие', sub: 'не было >2 месяцев', count: 12, color: CL.mute, bg: '#ece7e2', tip: 'Триггер «соскучилась?» с персональным предложением' },
    { name: 'VIP', sub: 'средний чек > 3 000 ₽ или 10+ визитов', count: 4, color: '#a86b3a', bg: '#f5ebd9', tip: 'Бот не предлагает скидки, отвечает первым' },
  ];
  return (
    <PhoneShell width={320} height={660} bg={CL.bg}>
      <ClHeader sub="БАЗА · СЕГМЕНТЫ" title="Группы клиенток" back />
      <div style={{ flex: 1, padding: '14px 22px 18px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: CL.inkSoft, lineHeight: 1.5 }}>
          Бот автоматически распределяет клиенток по группам — на основе истории визитов.
        </p>
        {segments.map((s, i) => (
          <div key={i} style={{ background: CL.card, border: `1px solid ${CL.divider}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${CL.divider}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, color: s.color, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, fontFamily: clFonts.mono }}>{s.count}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: CL.ink }}>{s.name}</div>
                <div style={{ fontSize: 11, color: CL.mute, marginTop: 1 }}>{s.sub}</div>
              </div>
              <div style={{ fontSize: 14, color: CL.mute }}>›</div>
            </div>
            <div style={{ padding: '8px 14px', fontSize: 11, color: CL.inkSoft, fontStyle: 'italic', background: CL.bg }}>
              <span style={{ fontFamily: clFonts.mono, color: CL.accent, fontStyle: 'normal', fontWeight: 600, marginRight: 6 }}>↻</span>
              {s.tip}
            </div>
          </div>
        ))}
      </div>
      <ClTabBar />
    </PhoneShell>
  );
}

// ── 6. Пустое состояние ──────────────────────────────────────────────

function ClientEmpty() {
  return (
    <PhoneShell width={320} height={660} bg={CL.bg}>
      <ClHeader sub="БАЗА · 0 КЛИЕНТОК" title="Клиентки" right={
        <div style={{ width: 32, height: 32, borderRadius: 8, background: CL.ink, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>+</div>
      } />

      <div style={{ flex: 1, padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
        {/* abstract figure */}
        <div style={{ width: 88, height: 88, borderRadius: 24, background: CL.card, border: `1px solid ${CL.divider}`, position: 'relative', display: 'grid', placeItems: 'center' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: CL.accentSoft, border: `2px dashed ${CL.accent}` }} />
          <div style={{ position: 'absolute', bottom: -8, right: -8, width: 28, height: 28, borderRadius: 8, background: CL.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 600 }}>+</div>
        </div>

        <h2 style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, color: CL.ink, letterSpacing: -0.4 }}>Пока никого нет</h2>
        <p style={{ margin: 0, fontSize: 13.5, color: CL.inkSoft, lineHeight: 1.5, maxWidth: 240 }}>
          Карточки появятся автоматически, когда клиентки напишут боту. Или добавьте первую вручную.
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <button style={{ background: CL.ink, color: '#fff', border: 'none', padding: '13px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Добавить вручную</button>
          <button style={{ background: 'transparent', color: CL.ink, border: `1px solid ${CL.divider}`, padding: '13px', borderRadius: 12, fontWeight: 500, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Импорт из CSV</button>
        </div>

        <div style={{ marginTop: 18, padding: '12px 14px', background: CL.accentSoft, borderRadius: 10, fontSize: 12, color: CL.accentDark, lineHeight: 1.5, textAlign: 'left' }}>
          <b>Совет:</b> когда клиентка впервые напишет, бот сам спросит имя и телефон, и заведёт карточку — вам ничего делать не надо.
        </div>
      </div>

      <ClTabBar />
    </PhoneShell>
  );
}

// ── Prototype ─────────────────────────────────────────────────────────

function ClientPrototype() {
  const [view, setView] = React.useState('list');
  const screens = {
    list: <ClientList />,
    card: <ClientCard />,
    chat: <ClientChat />,
    note: <NoteEdit />,
    seg: <ClientSegments />,
    empty: <ClientEmpty />,
  };
  const labels = [
    ['list', '1 · База'],
    ['card', '2 · Карточка ★'],
    ['chat', '3 · Чат + перехват'],
    ['note', '4 · Заметка/теги'],
    ['seg', '5 · Сегменты'],
    ['empty', '6 · Пустое'],
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#ece7e2', padding: 24, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', fontFamily: clFonts.body }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
        <div style={{ fontSize: 11, fontFamily: clFonts.mono, color: CL.mute, letterSpacing: 0.4, marginBottom: 4 }}>КЛИКНИТЕ →</div>
        {labels.map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} style={{
            background: view === id ? CL.ink : '#fff',
            color: view === id ? '#fff' : CL.ink,
            border: `1px solid ${view === id ? CL.ink : CL.divider}`,
            padding: '10px 14px', borderRadius: 10,
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            cursor: 'pointer', textAlign: 'left',
          }}>{l}</button>
        ))}
      </div>
      <div>{screens[view]}</div>
    </div>
  );
}

Object.assign(window, { ClientList, ClientCard, ClientChat, NoteEdit, ClientSegments, ClientEmpty, ClientPrototype });
