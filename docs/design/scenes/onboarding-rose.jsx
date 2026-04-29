// Onboarding · Variant B · Мягкий розовый, эмодзи-форвард
// Vibe: тёплый сорбет, больше визуальных акцентов, сильнее эмоция

const ROSE = {
  bg: '#fef5f3',
  card: '#ffffff',
  ink: '#3d1f24',
  inkSoft: '#6b4248',
  mute: '#a08488',
  accent: '#e8857f',
  accentDark: '#d96962',
  accentSoft: '#fde2dd',
  mint: '#cfe9d6',
  divider: 'rgba(61,31,36,0.08)',
};

const roseFonts = {
  display: '"Manrope", sans-serif',
  body: '"Manrope", sans-serif',
  mono: '"JetBrains Mono", monospace',
};

function RoseShell({ children, step, total = 5 }) {
  return (
    <PhoneShell width={320} height={660} bg={ROSE.bg}>
      <div style={{ padding: '14px 22px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ROSE.ink, letterSpacing: -0.1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: `linear-gradient(135deg, ${ROSE.accent}, ${ROSE.accentDark})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>💖</span>
          Бьюти-помощник
        </div>
        {step !== undefined && (
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{ width: 22, height: 4, borderRadius: 2, background: i <= step ? ROSE.accent : 'rgba(61,31,36,0.1)' }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: '10px 22px 22px', display: 'flex', flexDirection: 'column' }}>{children}</div>
    </PhoneShell>
  );
}

function RoseTitle({ emoji, children, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {emoji && <div style={{ fontSize: 36, marginBottom: 8 }}>{emoji}</div>}
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: ROSE.ink, letterSpacing: -0.6, lineHeight: 1.15 }}>{children}</h1>
      {sub && <p style={{ margin: '6px 0 0', fontSize: 14, color: ROSE.inkSoft, lineHeight: 1.45 }}>{sub}</p>}
    </div>
  );
}

function RoseScreen0() {
  return (
    <RoseShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${ROSE.accentSoft}, ${ROSE.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50 }}>💅</div>
          <div style={{ position: 'absolute', top: -4, right: -6, fontSize: 22 }}>✨</div>
          <div style={{ position: 'absolute', bottom: 0, left: -10, fontSize: 18 }}>💕</div>
        </div>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: ROSE.ink, letterSpacing: -0.7, lineHeight: 1.1 }}>
          Привет, красотка!
        </h1>
        <p style={{ margin: '14px 8px 0', fontSize: 15, color: ROSE.inkSoft, lineHeight: 1.5 }}>
          Я отвечу клиенткам, запишу на услугу и напомню о визите. <b style={{ color: ROSE.accentDark }}>Настроим за 30 минут</b> 🍵
        </p>
      </div>
      <PhoneButton color={ROSE.accentDark} fg="#fff" style={{ borderRadius: 18 }}>Поехали 💫</PhoneButton>
      <button style={{ marginTop: 10, background: 'transparent', border: 'none', color: ROSE.mute, fontSize: 13, padding: 8, cursor: 'pointer' }}>Уже есть аккаунт</button>
    </RoseShell>
  );
}

function RoseScreen1() {
  const [niche, setNiche] = React.useState('Маникюр');
  return (
    <RoseShell step={0}>
      <RoseTitle emoji="👋" sub="Это первое, что увидит клиентка от бота.">Как вас зовут?</RoseTitle>
      <input defaultValue="Аня" style={{ width: '100%', padding: '16px 18px', borderRadius: 16, border: 'none', background: ROSE.card, fontSize: 17, color: ROSE.ink, fontFamily: 'inherit', outline: 'none', boxShadow: '0 2px 8px rgba(61,31,36,0.04)' }} />
      <div style={{ marginTop: 18, fontSize: 13, fontWeight: 700, color: ROSE.ink, marginBottom: 10 }}>Ваша специализация ✨</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[['💅', 'Маникюр'], ['👁', 'Ресницы'], ['✨', 'Брови'], ['💇', 'Парикмахер'], ['🌸', 'Косметолог'], ['+', 'Другое']].map(([e, n]) => (
          <button key={n} onClick={() => setNiche(n)} style={{
            padding: '14px 12px', borderRadius: 14, border: 'none',
            background: niche === n ? ROSE.accent : ROSE.card,
            color: niche === n ? '#fff' : ROSE.ink,
            fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: niche === n ? '0 4px 14px rgba(232,133,127,0.4)' : '0 2px 6px rgba(61,31,36,0.04)',
            transition: 'all 0.15s',
          }}><span style={{ fontSize: 18 }}>{e}</span>{n}</button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={ROSE.accentDark} fg="#fff" style={{ borderRadius: 18 }}>Дальше 💖</PhoneButton>
    </RoseShell>
  );
}

function RoseScreen2() {
  return (
    <RoseShell step={1}>
      <RoseTitle emoji="💅" sub="Хотя бы одну, чтобы бот мог записывать. Остальные добавим вместе позже.">Первая услуга</RoseTitle>
      <div style={{ background: ROSE.card, borderRadius: 20, padding: 18, boxShadow: '0 4px 16px rgba(61,31,36,0.06)' }}>
        <input defaultValue="Маникюр + покрытие" style={{ width: '100%', padding: '6px 0', border: 'none', borderBottom: `1.5px dashed ${ROSE.divider}`, fontSize: 17, fontWeight: 600, color: ROSE.ink, outline: 'none', fontFamily: 'inherit', background: 'transparent' }} />
        <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: ROSE.mute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>⏱ Длит.</div>
            <div style={{ fontSize: 22, color: ROSE.ink, fontWeight: 700, marginTop: 4 }}>1ч 30м</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: ROSE.mute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>💰 Цена</div>
            <div style={{ fontSize: 22, color: ROSE.ink, fontWeight: 700, marginTop: 4 }}>2 500 ₽</div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: ROSE.mint, fontSize: 13, color: '#2d5238', lineHeight: 1.45 }}>
        <b>💡 Совет от нас:</b> начните с самой популярной у вас услуги. Прайс полностью спрячете в один клик.
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={ROSE.accentDark} fg="#fff" style={{ borderRadius: 18 }}>Сохранить 🌸</PhoneButton>
    </RoseShell>
  );
}

function RoseScreen3() {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const on = [1, 1, 1, 1, 1, 0, 0];
  return (
    <RoseShell step={2}>
      <RoseTitle emoji="📅" sub="В эти часы бот предложит слоты клиенткам.">Когда вы работаете?</RoseTitle>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'space-between', marginBottom: 14 }}>
        {days.map((d, i) => (
          <div key={i} style={{
            flex: 1, padding: '12px 0', textAlign: 'center', borderRadius: 12,
            background: on[i] ? ROSE.accent : ROSE.card, color: on[i] ? '#fff' : ROSE.mute,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: on[i] ? '0 4px 12px rgba(232,133,127,0.3)' : 'none',
          }}>{d}</div>
        ))}
      </div>
      <div style={{ background: ROSE.card, borderRadius: 18, padding: 18, marginBottom: 10, boxShadow: '0 2px 8px rgba(61,31,36,0.05)' }}>
        <div style={{ fontSize: 11, color: ROSE.mute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Часы 🕙</div>
        <div style={{ fontSize: 26, color: ROSE.ink, fontWeight: 700, marginTop: 6 }}>10:00 → 20:00</div>
        <div style={{ height: 4, background: ROSE.bg, borderRadius: 2, marginTop: 12, position: 'relative' }}>
          <div style={{ position: 'absolute', left: '8%', right: '17%', top: 0, bottom: 0, background: ROSE.accent, borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ background: ROSE.card, borderRadius: 18, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(61,31,36,0.05)' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: ROSE.ink }}>🥗 Перерыв на обед</div>
          <div style={{ fontSize: 12, color: ROSE.mute, marginTop: 2 }}>14:00 — 15:00</div>
        </div>
        <div style={{ width: 36, height: 22, borderRadius: 11, background: ROSE.accent, position: 'relative' }}>
          <div style={{ position: 'absolute', right: 2, top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={ROSE.accentDark} fg="#fff" style={{ borderRadius: 18 }}>Готово 🎀</PhoneButton>
    </RoseShell>
  );
}

function RoseScreen4() {
  return (
    <RoseShell step={3}>
      <RoseTitle emoji="🔗" sub="Чтобы бот отвечал клиенткам с вашего имени в Telegram.">Подключим Telegram</RoseTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          ['1', '🛠', 'Откройте Настройки → Telegram Business'],
          ['2', '🤖', 'Включите «Чат-боты»'],
          ['3', '📋', 'Имя бота: @beauty_assist_bot'],
          ['4', '✅', 'Дайте права отвечать'],
        ].map(([n, e, t]) => (
          <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'center', background: ROSE.card, padding: '12px 14px', borderRadius: 14, boxShadow: '0 1px 4px rgba(61,31,36,0.04)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: ROSE.accentSoft, color: ROSE.accentDark, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
            <div style={{ fontSize: 18 }}>{e}</div>
            <div style={{ fontSize: 13.5, color: ROSE.inkSoft, lineHeight: 1.4, flex: 1 }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 16, background: ROSE.mint, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 22 }}>⏳</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2d5238' }}>Ждём подключения...</div>
          <div style={{ fontSize: 12, color: '#5b8463', marginTop: 2 }}>Обычно занимает 1 минуту</div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={ROSE.accentDark} fg="#fff" style={{ borderRadius: 18 }}>Я подключила ✓</PhoneButton>
    </RoseShell>
  );
}

function RoseScreen5() {
  return (
    <RoseShell step={4}>
      <RoseTitle emoji="🎉" sub="Напишите боту любое сообщение со своего телефона. Если ответит — всё работает!">Финальный тест</RoseTitle>
      <div style={{ background: ROSE.card, borderRadius: 20, padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(61,31,36,0.05)' }}>
        <div style={{ fontSize: 11, color: ROSE.mute, textAlign: 'center', fontFamily: roseFonts.mono }}>превью чата</div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: ROSE.accent, padding: '10px 14px', borderRadius: '18px 18px 4px 18px', fontSize: 14, color: '#fff' }}>привет 🌸</div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: ROSE.bg, padding: '10px 14px', borderRadius: '18px 18px 18px 4px', fontSize: 14, color: ROSE.ink, lineHeight: 1.4 }}>
          Здравствуйте, дорогая! 💖<br/>Я Аня. Записываю на маникюр + покрытие — 1ч30, 2 500 ₽. На какой день вам удобнее?
        </div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: ROSE.accent, padding: '10px 14px', borderRadius: '18px 18px 4px 18px', fontSize: 14, color: '#fff' }}>в субботу!</div>
      </div>
      <div style={{ marginTop: 14 }}>
        <PhoneButton color={ROSE.accentDark} fg="#fff" style={{ borderRadius: 18 }}>🥳 Всё работает — на главную</PhoneButton>
      </div>
    </RoseShell>
  );
}

function RoseScreen6() {
  return (
    <RoseShell>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: ROSE.mute }}>Доброе утро ☀️</div>
          <h1 style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 800, color: ROSE.ink, letterSpacing: -0.6 }}>Аня</h1>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg, ${ROSE.accent}, ${ROSE.accentDark})`, color: '#fff', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>А</div>
      </div>
      <div style={{ background: `linear-gradient(135deg, ${ROSE.accent}, ${ROSE.accentDark})`, padding: 16, borderRadius: 18, marginBottom: 14, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>✨ Доделать настройку</div>
          <div style={{ fontSize: 12, opacity: 0.85, fontFamily: roseFonts.mono }}>4 / 8</div>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: '50%', height: '100%', background: '#fff' }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>Фото · правила переноса · ещё услуги</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: ROSE.card, padding: 14, borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: ROSE.mute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Сегодня 📅</div>
          <div style={{ fontSize: 28, color: ROSE.ink, fontWeight: 800, marginTop: 4 }}>3</div>
          <div style={{ fontSize: 12, color: ROSE.mute }}>записи</div>
        </div>
        <div style={{ background: ROSE.card, padding: 14, borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: ROSE.mute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Неделя 💰</div>
          <div style={{ fontSize: 22, color: ROSE.ink, fontWeight: 800, marginTop: 4 }}>18,5к</div>
          <div style={{ fontSize: 12, color: '#3a8b3a' }}>↑ 12%</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: ROSE.mute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Что нового</div>
      <div style={{ background: ROSE.card, padding: '12px 14px', borderRadius: 14, fontSize: 13, color: ROSE.ink }}>
        🎉 <b>Марина К.</b> записалась — сб 14:00
      </div>
      <div style={{ marginTop: 'auto', marginLeft: -22, marginRight: -22, marginBottom: -22, display: 'flex', justifyContent: 'space-around', padding: '12px 0 14px', background: ROSE.card, borderTop: `1px solid ${ROSE.divider}` }}>
        {[['🏠', true], ['📅'], ['🤖'], ['👥'], ['⚙️']].map(([i, on], k) => (
          <div key={k} style={{ fontSize: 22, opacity: on ? 1 : 0.4 }}>{i}</div>
        ))}
      </div>
    </RoseShell>
  );
}

function roseOnboardingArtboards() {
  const screens = [
    ['rose-0', '0 · Welcome', RoseScreen0],
    ['rose-1', '1 · Профиль', RoseScreen1],
    ['rose-2', '2 · Услуга', RoseScreen2],
    ['rose-3', '3 · График', RoseScreen3],
    ['rose-4', '4 · Telegram', RoseScreen4],
    ['rose-5', '5 · Тест', RoseScreen5],
    ['rose-6', '✓ Главная', RoseScreen6],
  ];
  return screens.map(([id, label, Cmp]) => (
    <DCArtboard key={id} id={id} label={label} width={320} height={660}>
      <Cmp />
    </DCArtboard>
  ));
}

Object.assign(window, { roseOnboardingArtboards, ROSE });
