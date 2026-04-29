// Onboarding · Variant A · Тёплая карамель
// Цвета: бежево-карамельный с глубоким коричневым текстом
// Vibe: тёплый, домашний, тактильный — текстурные кнопки, серифные заголовки

const WARM = {
  bg: '#fdf8f0',
  card: '#ffffff',
  ink: '#2a1f15',
  inkSoft: '#5a4634',
  mute: '#8a7867',
  accent: '#c08856',
  accentDark: '#a06d3e',
  accentSoft: '#f5e6d0',
  divider: 'rgba(42,31,21,0.08)',
};

const warmFonts = {
  display: '"Fraunces", "Times New Roman", serif',
  body: '"Manrope", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", monospace',
};

function WarmStep({ label, total, current }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 18 : 6, height: 6, borderRadius: 3,
          background: i <= current ? WARM.accent : 'rgba(42,31,21,0.12)',
          transition: 'all 0.3s'
        }} />
      ))}
      <span style={{ marginLeft: 8, fontSize: 12, color: WARM.mute, fontFamily: warmFonts.mono }}>
        {current + 1}/{total}
      </span>
    </div>
  );
}

function WarmShell({ children, title, step, totalSteps = 5 }) {
  return (
    <PhoneShell width={320} height={660} bg={WARM.bg}>
      <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: WARM.ink, fontFamily: warmFonts.body, letterSpacing: -0.1 }}>
          ✨ Beauty Bot
        </div>
        {step !== undefined && <WarmStep total={totalSteps} current={step} />}
      </div>
      <div style={{ flex: 1, padding: '8px 22px 22px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {children}
      </div>
    </PhoneShell>
  );
}

function WarmTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h1 style={{ margin: 0, fontFamily: warmFonts.display, fontSize: 28, fontWeight: 600, color: WARM.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>
        {children}
      </h1>
      {sub && <p style={{ margin: '8px 0 0', fontSize: 14, color: WARM.inkSoft, lineHeight: 1.45 }}>{sub}</p>}
    </div>
  );
}

function WarmCard({ children, onClick, active }) {
  return (
    <div onClick={onClick} style={{
      background: WARM.card, padding: '14px 16px', borderRadius: 14,
      border: `1px solid ${active ? WARM.accent : WARM.divider}`,
      boxShadow: active ? `0 0 0 3px ${WARM.accentSoft}` : '0 1px 0 rgba(42,31,21,0.03)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s',
    }}>
      {children}
    </div>
  );
}

// ─── Screens ────────────────────────────────────────────────

function WarmScreen0_Welcome({ onNext }) {
  return (
    <WarmShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 4px' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: `linear-gradient(135deg, ${WARM.accentSoft}, ${WARM.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, marginBottom: 24, boxShadow: '0 8px 24px rgba(192,136,86,0.3)' }}>
          ✨
        </div>
        <h1 style={{ margin: 0, fontFamily: warmFonts.display, fontSize: 30, fontWeight: 600, color: WARM.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Привет!<br/>Я ваш<br/><em style={{ color: WARM.accent, fontStyle: 'italic' }}>помощник</em>
        </h1>
        <p style={{ margin: '16px 4px 0', fontSize: 14, color: WARM.inkSoft, lineHeight: 1.5 }}>
          Буду отвечать клиенткам, записывать на услуги и напоминать о визитах. Настроим вместе за 30 минут ☕
        </p>
      </div>
      <PhoneButton onClick={onNext} color={WARM.ink} fg={WARM.bg}>Начать настройку →</PhoneButton>
      <button style={{ marginTop: 10, background: 'transparent', border: 'none', color: WARM.mute, fontSize: 13, padding: 8, cursor: 'pointer' }}>Уже настроено? Войти</button>
    </WarmShell>
  );
}

function WarmScreen1_Profile({ onNext }) {
  const [name, setName] = React.useState('Аня');
  const [niche, setNiche] = React.useState('Маникюр');
  const niches = ['Маникюр', 'Ресницы', 'Брови', 'Парикмахер', 'Косметолог'];
  return (
    <WarmShell step={0}>
      <WarmTitle sub="Это увидит клиентка в первом сообщении бота.">Расскажите о себе</WarmTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Как вас зовут</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid ${WARM.divider}`, background: WARM.card, fontSize: 16, color: WARM.ink, fontFamily: 'inherit', outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Ваша ниша</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {niches.map(n => (
              <button key={n} onClick={() => setNiche(n)} style={{
                padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                border: `1px solid ${niche === n ? WARM.accent : WARM.divider}`,
                background: niche === n ? WARM.accentSoft : WARM.card,
                color: niche === n ? WARM.accentDark : WARM.inkSoft,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton onClick={onNext} color={WARM.ink} fg={WARM.bg}>Дальше →</PhoneButton>
    </WarmShell>
  );
}

function WarmScreen2_Service({ onNext }) {
  return (
    <WarmShell step={1}>
      <WarmTitle sub="Добавим хотя бы одну, чтобы бот мог записывать клиенток. Остальные потом.">Первая услуга</WarmTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <WarmCard>
          <label style={{ fontSize: 11, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Название</label>
          <div style={{ fontSize: 17, color: WARM.ink, fontWeight: 500, marginTop: 4 }}>Маникюр + покрытие</div>
        </WarmCard>
        <div style={{ display: 'flex', gap: 10 }}>
          <WarmCard>
            <label style={{ fontSize: 11, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>⏱ Длит.</label>
            <div style={{ fontSize: 17, color: WARM.ink, fontWeight: 500, marginTop: 4 }}>1 ч 30 мин</div>
          </WarmCard>
          <WarmCard>
            <label style={{ fontSize: 11, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>₽ Цена</label>
            <div style={{ fontSize: 17, color: WARM.ink, fontWeight: 500, marginTop: 4 }}>2 500 ₽</div>
          </WarmCard>
        </div>
        <div style={{ background: WARM.accentSoft, padding: '12px 14px', borderRadius: 12, fontSize: 13, color: WARM.inkSoft, lineHeight: 1.4 }}>
          💡 <b>Совет:</b> начните с самой ходовой услуги. Остальные добавите позже одной кнопкой.
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton onClick={onNext} color={WARM.ink} fg={WARM.bg}>Сохранить и дальше →</PhoneButton>
    </WarmShell>
  );
}

function WarmScreen3_Schedule({ onNext }) {
  const days = [['Пн', true], ['Вт', true], ['Ср', true], ['Чт', true], ['Пт', true], ['Сб', false], ['Вс', false]];
  return (
    <WarmShell step={2}>
      <WarmTitle sub="В эти часы бот предлагает слоты. Можно поправить позже.">Когда вы работаете?</WarmTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {days.map(([d, on], i) => (
            <div key={i} style={{
              flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: 10,
              background: on ? WARM.accent : WARM.card, color: on ? '#fff' : WARM.mute,
              fontSize: 13, fontWeight: 600, border: `1px solid ${on ? WARM.accent : WARM.divider}`,
              cursor: 'pointer',
            }}>{d}</div>
          ))}
        </div>
        <WarmCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Часы работы</div>
              <div style={{ fontSize: 18, color: WARM.ink, fontWeight: 500, marginTop: 4, fontFamily: warmFonts.mono }}>10:00 — 20:00</div>
            </div>
            <div style={{ fontSize: 22, color: WARM.mute }}>↻</div>
          </div>
        </WarmCard>
        <WarmCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Перерыв на обед</div>
              <div style={{ fontSize: 14, color: WARM.inkSoft, marginTop: 4 }}>14:00 — 15:00</div>
            </div>
            <div style={{ fontSize: 12, color: WARM.accent, fontWeight: 600 }}>добавить</div>
          </div>
        </WarmCard>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton onClick={onNext} color={WARM.ink} fg={WARM.bg}>Дальше →</PhoneButton>
    </WarmShell>
  );
}

function WarmScreen4_Connect({ onNext, status = 'pending' }) {
  return (
    <WarmShell step={3}>
      <WarmTitle sub="Бот будет отвечать клиенткам с вашего аккаунта Telegram. Это безопасно — Telegram сам проверяет.">Подключим Telegram Business</WarmTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          ['1', 'Откройте Telegram → Настройки → Telegram Business'],
          ['2', 'Включите «Чат-боты»'],
          ['3', 'Вставьте имя бота: @beauty_assist_bot'],
          ['4', 'Дайте права: «Отвечать на сообщения»'],
        ].map(([n, t]) => (
          <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: WARM.card, padding: '12px 14px', borderRadius: 12, border: `1px solid ${WARM.divider}` }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: WARM.accentSoft, color: WARM.accentDark, fontFamily: warmFonts.mono, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
            <div style={{ fontSize: 13.5, color: WARM.inkSoft, lineHeight: 1.45 }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: status === 'ok' ? '#e8f5e0' : WARM.accentSoft, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 18 }}>{status === 'ok' ? '✓' : '⏳'}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: status === 'ok' ? '#3a6b1f' : WARM.accentDark }}>
            {status === 'ok' ? 'Подключено!' : 'Ожидаем подключение...'}
          </div>
          <div style={{ fontSize: 12, color: WARM.mute, marginTop: 2 }}>Проверяем каждые 3 секунды</div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton onClick={onNext} color={WARM.ink} fg={WARM.bg}>Я подключила, проверить →</PhoneButton>
    </WarmShell>
  );
}

function WarmScreen5_Test({ onNext }) {
  return (
    <WarmShell step={4}>
      <WarmTitle sub="Напишите боту от своего аккаунта что угодно — например, «привет». Если ответит — всё работает!">Тест в действии</WarmTitle>
      <div style={{ background: WARM.card, borderRadius: 16, padding: 14, border: `1px solid ${WARM.divider}`, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, color: WARM.mute, fontFamily: warmFonts.mono, textAlign: 'center' }}>чат с ботом · превью</div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: '#daf3c5', padding: '8px 12px', borderRadius: '14px 14px 4px 14px', fontSize: 14, color: WARM.ink }}>
          привет
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: WARM.accentSoft, padding: '10px 14px', borderRadius: '14px 14px 14px 4px', fontSize: 14, color: WARM.ink, lineHeight: 1.4 }}>
          Здравствуйте! Я Аня 💅<br/>Записываю на маникюр + покрытие (1ч30 / 2 500 ₽). Подскажите, на какой день вам удобнее?
        </div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: '#daf3c5', padding: '8px 12px', borderRadius: '14px 14px 4px 14px', fontSize: 14, color: WARM.ink }}>
          в субботу
        </div>
        <div style={{ alignSelf: 'flex-start', fontSize: 12, color: WARM.mute, fontStyle: 'italic' }}>бот печатает…</div>
      </div>
      <div style={{ marginTop: 14 }}>
        <PhoneButton onClick={onNext} color={WARM.accent} fg="#fff">🎉 Бот ответил — готово!</PhoneButton>
      </div>
    </WarmShell>
  );
}

function WarmScreen6_Home() {
  return (
    <WarmShell>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontFamily: warmFonts.display, fontSize: 26, fontWeight: 600, color: WARM.ink, letterSpacing: -0.4 }}>
          Доброе утро, Аня
        </h1>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: WARM.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👋</div>
      </div>

      {/* Checklist banner */}
      <div style={{ background: `linear-gradient(135deg, ${WARM.accentSoft}, #faf2e4)`, padding: 14, borderRadius: 14, marginBottom: 16, border: `1px solid rgba(192,136,86,0.2)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: WARM.ink }}>Доделать настройку</div>
          <div style={{ fontSize: 12, color: WARM.accentDark, fontFamily: warmFonts.mono }}>4/8 ✓</div>
        </div>
        <div style={{ height: 4, background: 'rgba(42,31,21,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: '50%', height: '100%', background: WARM.accent }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: WARM.inkSoft }}>
          Осталось: фото · правила переноса · ещё 2 услуги · шаблон воронки
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <WarmCard>
          <div style={{ fontSize: 11, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Сегодня</div>
          <div style={{ fontSize: 24, color: WARM.ink, fontFamily: warmFonts.display, fontWeight: 600, marginTop: 4 }}>3</div>
          <div style={{ fontSize: 12, color: WARM.mute }}>записи</div>
        </WarmCard>
        <WarmCard>
          <div style={{ fontSize: 11, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>За неделю</div>
          <div style={{ fontSize: 24, color: WARM.ink, fontFamily: warmFonts.display, fontWeight: 600, marginTop: 4 }}>18 500 ₽</div>
          <div style={{ fontSize: 12, color: '#3a8b3a' }}>↑ 12%</div>
        </WarmCard>
      </div>

      <div style={{ fontSize: 12, color: WARM.mute, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8 }}>Лента</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ background: WARM.card, padding: '10px 12px', borderRadius: 12, fontSize: 13, color: WARM.ink, border: `1px solid ${WARM.divider}` }}>
          <span style={{ fontSize: 11, color: WARM.mute, fontFamily: warmFonts.mono }}>10:42</span>
          <div>🎉 Новая запись: <b>Марина К.</b> · сб 14:00</div>
        </div>
        <div style={{ background: WARM.card, padding: '10px 12px', borderRadius: 12, fontSize: 13, color: WARM.ink, border: `1px solid ${WARM.divider}` }}>
          <span style={{ fontSize: 11, color: WARM.mute, fontFamily: warmFonts.mono }}>09:15</span>
          <div>💬 Бот ответил <b>+7 успешных диалогов</b> за ночь</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ marginTop: 'auto', marginLeft: -22, marginRight: -22, marginBottom: -22, display: 'flex', justifyContent: 'space-around', padding: '12px 0 14px', borderTop: `1px solid ${WARM.divider}`, background: WARM.card }}>
        {[['🏠', true], ['📅'], ['🤖'], ['👥'], ['⚙️']].map(([i, on], k) => (
          <div key={k} style={{ fontSize: 22, opacity: on ? 1 : 0.4 }}>{i}</div>
        ))}
      </div>
    </WarmShell>
  );
}

// ─── Artboard list builder ───────────────────────────────────

function warmOnboardingArtboards() {
  const screens = [
    ['warm-0', '0 · Welcome', WarmScreen0_Welcome],
    ['warm-1', '1 · Профиль', WarmScreen1_Profile],
    ['warm-2', '2 · Услуга', WarmScreen2_Service],
    ['warm-3', '3 · График', WarmScreen3_Schedule],
    ['warm-4', '4 · Telegram Business', WarmScreen4_Connect],
    ['warm-5', '5 · Тест', WarmScreen5_Test],
    ['warm-6', '✓ Главная', WarmScreen6_Home],
  ];
  return screens.map(([id, label, Cmp]) => (
    <DCArtboard key={id} id={id} label={label} width={320} height={660}>
      <Cmp onNext={() => {}} />
    </DCArtboard>
  ));
}

Object.assign(window, { warmOnboardingArtboards, WARM, warmFonts });
