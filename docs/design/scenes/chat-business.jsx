// Чат под Telegram Business — D · Коралл + сетка
const CB = HYB;
const cbF = { body: '"Manrope", sans-serif', display: '"Fraunces", serif', mono: '"JetBrains Mono", monospace' };

// ── Telegram-style header ────────────────────────────────────────────
function TgHeader({ name, status, back, isBusiness }) {
  return (
    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderBottom: `1px solid ${CB.divider}` }}>
      {back && <div style={{ fontSize: 18, color: '#3d8df0', cursor: 'pointer' }}>‹</div>}
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: CB.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, fontFamily: cbF.display, fontStyle: 'italic' }}>{name[0]}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: CB.ink }}>{name}</div>
          {isBusiness && <div style={{ fontSize: 8, fontFamily: cbF.mono, color: '#3d8df0', background: '#e8f1fc', padding: '1px 4px', borderRadius: 3, fontWeight: 700, letterSpacing: 0.4 }}>BIZ</div>}
        </div>
        <div style={{ fontSize: 11, color: CB.mute }}>{status}</div>
      </div>
      <div style={{ fontSize: 18, color: '#3d8df0' }}>⋯</div>
    </div>
  );
}

// ── Bubble ───────────────────────────────────────────────────────────
function Bubble({ side, children, time, fromBot, sent, read }) {
  const isMe = side === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
      <div style={{
        maxWidth: '78%',
        background: isMe ? '#dcf8c6' : '#fff',
        color: CB.ink, padding: '7px 10px',
        borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        fontSize: 13.5, lineHeight: 1.4,
        boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
        position: 'relative',
        borderLeft: fromBot ? `2.5px solid ${CB.accent}` : 'none',
      }}>
        {fromBot && <div style={{ fontSize: 9, fontFamily: cbF.mono, color: CB.accent, fontWeight: 700, letterSpacing: 0.4, marginBottom: 2 }}>● ОТВЕТ ОТ БОТА</div>}
        {children}
        <div style={{ fontSize: 9.5, color: CB.mute, fontFamily: cbF.mono, textAlign: 'right', marginTop: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
          {time}
          {isMe && <span style={{ color: read ? '#3d8df0' : CB.mute, fontSize: 11 }}>✓✓</span>}
        </div>
      </div>
    </div>
  );
}

// ── 1. Список чатов мастера (Telegram view) ──────────────────────────
function MasterChatList() {
  const chats = [
    { name: 'Кристина Л.', last: '🤖 Записал на 14:00 в среду. Подтверждаете?', t: '12:08', un: 0, botMode: true },
    { name: 'Полина К.', last: 'Спасибо! ❤️', t: '11:45', un: 0, botMode: false },
    { name: 'Марина С.', last: '🤖 Перенёс на 16:00 завтра ✓', t: '10:32', un: 0, botMode: true },
    { name: 'Анастасия Р.', last: 'А можно как у вас на 5-м фото?', t: '09:14', un: 1, botMode: true, attention: true },
    { name: 'Софья М.', last: 'буду в 18:30', t: 'вчера', un: 0, botMode: false },
    { name: 'Лена К.', last: '🤖 Прислал примеры из категории «дизайн»', t: 'вчера', un: 0, botMode: true },
    { name: 'Виктория Д.', last: 'Хочу записаться 🤍', t: 'пн', un: 2, botMode: true },
  ];

  return (
    <PhoneShell width={320} height={660} bg="#f0f1f4">
      {/* Telegram header */}
      <div style={{ padding: '14px 16px 10px', background: '#fff', borderBottom: `1px solid ${CB.divider}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: CB.ink }}>Чаты</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 16, color: '#3d8df0' }}>
            <span>✎</span>
          </div>
        </div>
        {/* Business banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'linear-gradient(90deg, #fbe8e5, #f5dad4)', borderRadius: 8, fontSize: 11, color: CB.accentDark }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: CB.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, fontFamily: cbF.display, fontStyle: 'italic' }}>b</div>
          <div style={{ flex: 1, lineHeight: 1.4 }}><b>Beauty Bot</b> отвечает за вас в этих чатах</div>
          <div style={{ fontFamily: cbF.mono, fontWeight: 700, fontSize: 10 }}>5</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
        {chats.map((c, i) => (
          <div key={i} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${CB.divider}`, background: c.attention ? '#fff8f6' : '#fff' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: ['#9d8b6e','#b58e6e','#d4a589','#e8c5a0','#a89880','#c9a87e','#b8a085'][i % 7], color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600 }}>{c.name[0]}</div>
              {c.botMode && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#fff', border: `2px solid #fff`, display: 'grid', placeItems: 'center' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: CB.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 8, fontFamily: cbF.display, fontStyle: 'italic', fontWeight: 700 }}>b</div>
              </div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: CB.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: 10.5, color: CB.mute, fontFamily: cbF.mono, flexShrink: 0 }}>{c.t}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                <div style={{ flex: 1, fontSize: 12, color: c.attention ? CB.accent : CB.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: c.attention ? 600 : 400 }}>{c.last}</div>
                {c.un > 0 && <div style={{ background: c.attention ? CB.accent : '#3d8df0', color: '#fff', minWidth: 18, height: 18, borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, padding: '0 5px' }}>{c.un}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

// ── 2. Чат — бот ведёт ───────────────────────────────────────────────
function ChatBotLeads() {
  return (
    <PhoneShell width={320} height={660} bg="#e6dfd6">
      <TgHeader name="Кристина Л." status="был(а) в сети 2 мин назад" back isBusiness />

      {/* bot status banner */}
      <div style={{ padding: '8px 14px', background: '#fff', borderBottom: `1px solid ${CB.divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: CB.accent }} />
        <div style={{ flex: 1, fontSize: 11, color: CB.inkSoft }}><b style={{ color: CB.accent }}>Бот ведёт диалог</b> · отвечает от вашего имени</div>
        <div style={{ fontSize: 10.5, fontFamily: cbF.mono, color: CB.accent, fontWeight: 700, cursor: 'pointer' }}>ВЗЯТЬ ↑</div>
      </div>

      <div style={{ flex: 1, padding: 12, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ alignSelf: 'center', fontSize: 10.5, color: CB.mute, fontFamily: cbF.mono, padding: '4px 10px', background: 'rgba(255,255,255,0.6)', borderRadius: 8, marginBottom: 8 }}>сегодня</div>

        <Bubble side="them" time="11:54">здравствуйте 🤍 хочу записаться на маникюр</Bubble>
        <Bubble side="me" fromBot sent read time="11:54">Здравствуйте, Кристина! 🤍 Конечно. Какое покрытие хотите?</Bubble>
        <Bubble side="them" time="12:01">однотон, нюд</Bubble>
        <Bubble side="me" fromBot sent read time="12:01">Отлично. Свободные слоты на эту неделю:<br/>· ср 14:00 · 2 ч<br/>· чт 16:30 · 2 ч<br/>· пт 11:00 · 2 ч</Bubble>
        <Bubble side="them" time="12:07">ср подойдёт</Bubble>
        <Bubble side="me" fromBot sent read time="12:08">Записал на ср 14 ноября в 14:00. Адрес: ул. Ленина 24, кв. 17. От м. Чкаловская — 7 мин пешком. Подтверждаете?</Bubble>

        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: '#fff', borderRadius: 12, padding: 10, marginTop: 6, fontSize: 12, color: CB.mute, fontStyle: 'italic', borderLeft: `2.5px dashed ${CB.accent}` }}>
          Бот печатает...
        </div>
      </div>

      <div style={{ padding: '8px 12px', background: '#f6f4f0', borderTop: `1px solid ${CB.divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, padding: '8px 12px', background: '#fff', borderRadius: 18, fontSize: 12, color: CB.mute, opacity: 0.6 }}>Бот отвечает за вас. Нажмите «взять» чтобы написать самой</div>
      </div>
    </PhoneShell>
  );
}

// ── 3. Перехват ──────────────────────────────────────────────────────
function ChatTakeover() {
  return (
    <PhoneShell width={320} height={660} bg="#e6dfd6">
      <TgHeader name="Анастасия Р." status="печатает..." back isBusiness />

      {/* takeover banner */}
      <div style={{ padding: '8px 14px', background: CB.ink, color: '#fff', borderBottom: `1px solid ${CB.divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
        <div style={{ flex: 1, fontSize: 11 }}><b>Вы перехватили диалог</b> · бот молчит</div>
        <div style={{ fontSize: 10.5, fontFamily: cbF.mono, color: '#fff', fontWeight: 700, opacity: 0.8, cursor: 'pointer' }}>ВЕРНУТЬ БОТА ↓</div>
      </div>

      <div style={{ flex: 1, padding: 12, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Bubble side="them" time="9:12">а можно как у вас на 5-м фото в инсте? с фольгой</Bubble>

        {/* bot suggestion */}
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: '#fff', borderRadius: 12, padding: 10, fontSize: 12, marginBottom: 6, border: `1.5px dashed ${CB.accent}` }}>
          <div style={{ fontSize: 9, fontFamily: cbF.mono, color: CB.accent, fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>● БОТ ХОТЕЛ ОТВЕТИТЬ</div>
          <div style={{ color: CB.inkSoft, fontStyle: 'italic', lineHeight: 1.4 }}>«Это работа с фольгой и втиркой — делаю, +500 ₽ к стоимости. Записать?»</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button style={{ flex: 1, background: CB.accent, color: '#fff', border: 'none', padding: '6px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Отправить</button>
            <button style={{ background: 'transparent', color: CB.mute, border: `1px solid ${CB.divider}`, padding: '6px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
          </div>
        </div>

        <Bubble side="me" sent read time="9:14">Привет! да, помню это покрытие 🤍 это с фольгой, делаю — +500 к нюду. На какую дату записываю?</Bubble>
        <Bubble side="them" time="9:15">прям обожаю когда сама пишешь ❤️</Bubble>
      </div>

      {/* input — active */}
      <div style={{ padding: '8px 12px', background: '#f6f4f0', borderTop: `1px solid ${CB.divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', color: CB.mute, fontSize: 16 }}>+</div>
        <div style={{ flex: 1, padding: '8px 12px', background: '#fff', borderRadius: 18, fontSize: 13, color: CB.ink, border: `1px solid ${CB.divider}` }}>Сообщение</div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: CB.accent, color: '#fff', display: 'grid', placeItems: 'center' }}>➤</div>
      </div>
    </PhoneShell>
  );
}

// ── 4. Карточка диалога в CRM ────────────────────────────────────────
function CrmChatCard() {
  return (
    <PhoneShell width={320} height={660} bg={CB.bg}>
      <div style={{ padding: '14px 22px 12px', borderBottom: `1px solid ${CB.divider}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 18, color: CB.ink, cursor: 'pointer' }}>←</div>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: CB.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, fontFamily: cbF.display, fontStyle: 'italic' }}>К</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: CB.ink }}>Кристина Л.</div>
          <div style={{ fontSize: 11, color: CB.success, fontFamily: cbF.mono }}>● воронка «новая клиентка» · шаг 4/5</div>
        </div>
      </div>

      {/* mode selector */}
      <div style={{ display: 'flex', padding: '10px 14px', background: CB.card, borderBottom: `1px solid ${CB.divider}`, gap: 6 }}>
        <div style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: CB.accent, color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'center', cursor: 'pointer' }}>● Бот ведёт</div>
        <div style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: 'transparent', color: CB.inkSoft, fontSize: 11, fontWeight: 500, textAlign: 'center', border: `1px solid ${CB.divider}`, cursor: 'pointer' }}>Я веду</div>
        <div style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: 'transparent', color: CB.mute, fontSize: 11, fontWeight: 500, textAlign: 'center', border: `1px solid ${CB.divider}`, cursor: 'pointer' }}>Тишина</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 22px' }}>
        <div style={{ fontSize: 10, fontFamily: cbF.mono, color: CB.mute, letterSpacing: 0.4, marginBottom: 8 }}>ПОСЛЕДНИЕ СООБЩЕНИЯ</div>
        <div style={{ background: CB.card, borderRadius: 12, padding: 12, border: `1px solid ${CB.divider}`, fontSize: 12, lineHeight: 1.5, color: CB.inkSoft, marginBottom: 14 }}>
          <div style={{ marginBottom: 6 }}><b style={{ color: CB.accent }}>Бот:</b> Записал на ср 14 ноября в 14:00…</div>
          <div style={{ marginBottom: 6 }}><b style={{ color: CB.ink }}>Кристина:</b> подтверждаю!</div>
          <div><b style={{ color: CB.accent }}>Бот:</b> Спасибо 🤍 Жду в среду!</div>
        </div>

        <div style={{ fontSize: 10, fontFamily: cbF.mono, color: CB.mute, letterSpacing: 0.4, marginBottom: 8 }}>ИЗ ДИАЛОГА БОТ ЗАПОМНИЛ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {[
            ['Хочет', 'нюд однотон'],
            ['Время записи', 'ср 14 ноября, 14:00'],
            ['Стоимость', '2 500 ₽'],
            ['Источник', 'инстаграм'],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: CB.card, borderRadius: 8, border: `1px solid ${CB.divider}`, fontSize: 12 }}>
              <div style={{ color: CB.mute }}>{k}</div>
              <div style={{ color: CB.ink, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, fontFamily: cbF.mono, color: CB.mute, letterSpacing: 0.4, marginBottom: 8 }}>ВНУТРЕННЯЯ ЗАМЕТКА</div>
        <div style={{ background: CB.accentSoft, border: `1.5px dashed ${CB.accent}`, borderRadius: 10, padding: 12, fontSize: 12, color: CB.accentDark, lineHeight: 1.5 }}>
          Чувствительная — без отдушек. В прошлый раз понравилась OPI Bubble Bath.
        </div>
      </div>

      <div style={{ padding: '12px 22px 14px', borderTop: `1px solid ${CB.divider}`, display: 'flex', gap: 8 }}>
        <button style={{ flex: 1, background: CB.ink, color: '#fff', border: 'none', padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Открыть в Telegram</button>
        <button style={{ background: 'transparent', border: `1px solid ${CB.divider}`, padding: '11px 14px', borderRadius: 10, fontSize: 13, color: CB.ink, cursor: 'pointer', fontFamily: 'inherit' }}>Карточка</button>
      </div>
    </PhoneShell>
  );
}

// ── 5. Шпаргалка-подсказка от бота ───────────────────────────────────
function BotSuggest() {
  return (
    <PhoneShell width={320} height={660} bg="#e6dfd6">
      <TgHeader name="Софья М." status="онлайн" back isBusiness />

      <div style={{ padding: '8px 14px', background: '#fff8f6', borderBottom: `1px solid ${CB.accent}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: CB.warn }} />
        <div style={{ flex: 1, fontSize: 11, color: CB.accentDark }}><b>Бот не уверен</b> · нужна ваша помощь</div>
      </div>

      <div style={{ flex: 1, padding: 12, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Bubble side="them" time="14:32">а можно мне приехать с ребёнком? ему 4</Bubble>

        {/* bot's hesitation card */}
        <div style={{ alignSelf: 'flex-start', maxWidth: '90%', background: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, border: `1.5px solid ${CB.accent}`, boxShadow: '0 2px 8px rgba(217,105,98,0.12)' }}>
          <div style={{ fontSize: 9, fontFamily: cbF.mono, color: CB.accent, fontWeight: 700, letterSpacing: 0.4, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>● ШПАРГАЛКА ОТ БОТА</span>
            <span style={{ color: CB.mute }}>уверенность 32%</span>
          </div>
          <div style={{ fontSize: 12.5, color: CB.ink, lineHeight: 1.5, marginBottom: 10 }}>
            В правилах не указано как насчёт детей. Подскажите, что ответить — я запомню на будущее.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {['Да, можно. У меня есть игрушки', 'Лучше без — рабочее место маленькое', 'Только если ребёнок спокойный'].map((t, i) => (
              <div key={i} style={{ padding: '8px 10px', background: CB.bg, borderRadius: 6, fontSize: 12, color: CB.inkSoft, lineHeight: 1.4, cursor: 'pointer', border: `1px solid ${CB.divider}` }}>{t}</div>
            ))}
            <div style={{ padding: '8px 10px', borderRadius: 6, fontSize: 11.5, color: CB.accentDark, fontFamily: cbF.mono, cursor: 'pointer', textAlign: 'center', fontWeight: 600 }}>+ Написать свой ответ</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 12px', background: '#f6f4f0', borderTop: `1px solid ${CB.divider}`, fontSize: 11, color: CB.mute, textAlign: 'center' }}>
        Бот подождёт пока вы решите
      </div>
    </PhoneShell>
  );
}

// ── 6. Авто-режимы ───────────────────────────────────────────────────
function AutoModes() {
  const [mode, setMode] = React.useState('smart');
  const modes = [
    { id: 'full', name: 'Бот ведёт всё', sub: 'Отвечает на любые сообщения. Передаёт вам только когда не уверен.', icon: '●●●' },
    { id: 'smart', name: 'Умный режим ★', sub: 'Бот ведёт стандартные диалоги (запись, перенос, отзыв). Сложное — вам.', icon: '●●○' },
    { id: 'partial', name: 'Только воронки', sub: 'Бот работает только когда клиентка прошла триггер (новая запись, напоминание).', icon: '●○○' },
    { id: 'off', name: 'Бот выключен', sub: 'Все сообщения идут только вам. CRM просто записывает диалоги.', icon: '○○○' },
  ];

  return (
    <PhoneShell width={320} height={660} bg={CB.bg}>
      <div style={{ padding: '14px 22px 12px', borderBottom: `1px solid ${CB.divider}` }}>
        <div style={{ fontSize: 11, fontFamily: cbF.mono, color: CB.accent, letterSpacing: 0.4 }}>РЕЖИМ РАБОТЫ БОТА</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: CB.ink, letterSpacing: -0.3, marginTop: 2 }}>Когда отвечает бот?</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px 16px' }}>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: CB.inkSoft, lineHeight: 1.5 }}>
          Можно настроить отдельно для каждой клиентки — этот режим по-умолчанию.
        </p>

        {modes.map(m => {
          const on = mode === m.id;
          return (
            <div key={m.id} onClick={() => setMode(m.id)} style={{
              padding: 14, background: on ? CB.accentSoft : CB.card,
              border: `1.5px solid ${on ? CB.accent : CB.divider}`,
              borderRadius: 12, marginBottom: 8, cursor: 'pointer',
              display: 'flex', gap: 12,
            }}>
              <div style={{ width: 36, fontFamily: cbF.mono, fontSize: 14, color: on ? CB.accent : CB.mute, fontWeight: 700, letterSpacing: -1 }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: CB.ink }}>{m.name}</div>
                  {on && <div style={{ fontSize: 9, fontFamily: cbF.mono, color: '#fff', background: CB.accent, padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>АКТИВНО</div>}
                </div>
                <div style={{ fontSize: 11.5, color: CB.inkSoft, marginTop: 4, lineHeight: 1.5 }}>{m.sub}</div>
              </div>
            </div>
          );
        })}

        {/* exception list */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, fontFamily: cbF.mono, color: CB.mute, letterSpacing: 0.4, marginBottom: 8 }}>ИСКЛЮЧЕНИЯ · 2</div>
          <div style={{ background: CB.card, border: `1px solid ${CB.divider}`, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#a89880', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12 }}>М</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: CB.ink }}>Марина (мама)</div>
                <div style={{ fontSize: 10, color: CB.mute, fontFamily: cbF.mono }}>бот выключен</div>
              </div>
              <div style={{ fontSize: 14, color: CB.mute }}>›</div>
            </div>
            <div style={{ padding: '10px 14px', borderTop: `1px solid ${CB.divider}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#c9a87e', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12 }}>Л</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: CB.ink }}>Лера (подруга)</div>
                <div style={{ fontSize: 10, color: CB.mute, fontFamily: cbF.mono }}>только воронки</div>
              </div>
              <div style={{ fontSize: 14, color: CB.mute }}>›</div>
            </div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ── Prototype ────────────────────────────────────────────────────────
function ChatBizPrototype() {
  const [view, setView] = React.useState('list');
  const screens = {
    list: <MasterChatList />,
    bot: <ChatBotLeads />,
    take: <ChatTakeover />,
    crm: <CrmChatCard />,
    sug: <BotSuggest />,
    modes: <AutoModes />,
  };
  const labels = [
    ['list', '1 · Список чатов'],
    ['bot', '2 · Бот ведёт ★'],
    ['take', '3 · Перехват ★'],
    ['crm', '4 · Карточка в CRM'],
    ['sug', '5 · Шпаргалка'],
    ['modes', '6 · Режимы'],
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#ece7e2', padding: 24, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', fontFamily: cbF.body }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
        <div style={{ fontSize: 11, fontFamily: cbF.mono, color: CB.mute, letterSpacing: 0.4, marginBottom: 4 }}>ЭКРАНЫ →</div>
        {labels.map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} style={{
            background: view === id ? CB.ink : '#fff',
            color: view === id ? '#fff' : CB.ink,
            border: `1px solid ${view === id ? CB.ink : CB.divider}`,
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

Object.assign(window, { MasterChatList, ChatBotLeads, ChatTakeover, CrmChatCard, BotSuggest, AutoModes, ChatBizPrototype });
