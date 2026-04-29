// Onboarding · Variant D · Гибрид B+C
// Vibe: розовый/коралловый акцент как в B, но строгая mono-сетка, минимум эмодзи,
// сдержанная типографика как в C. Тёплый, но взрослый.

const HYB = {
  bg: '#fbf6f4',
  card: '#ffffff',
  ink: '#1f1416',
  inkSoft: '#4a3236',
  mute: '#8a7378',
  accent: '#d96962',
  accentDark: '#b94a44',
  accentSoft: '#fbe4e0',
  divider: 'rgba(31,20,22,0.08)',
  success: '#3a8b3a',
};

const hybFonts = {
  body: '"Manrope", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", monospace',
};

function HybShell({ children, step, total = 5 }) {
  return (
    <PhoneShell width={320} height={660} bg={HYB.bg}>
      <div style={{ padding: '14px 22px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${HYB.divider}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: HYB.ink, fontFamily: hybFonts.mono, letterSpacing: -0.2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: HYB.accent }} />
          beauty/assistant
        </div>
        {step !== undefined && (
          <div style={{ fontSize: 11, color: HYB.mute, fontFamily: hybFonts.mono }}>
            {step + 1}/{total}
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: '20px 22px 22px', display: 'flex', flexDirection: 'column' }}>{children}</div>
    </PhoneShell>
  );
}

function HybTitle({ children, sub, num }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {num !== undefined && <div style={{ fontFamily: hybFonts.mono, fontSize: 11, color: HYB.accent, marginBottom: 8, letterSpacing: 0.4 }}>{num}</div>}
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: HYB.ink, letterSpacing: -0.6, lineHeight: 1.15 }}>{children}</h1>
      {sub && <p style={{ margin: '8px 0 0', fontSize: 13.5, color: HYB.inkSoft, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

function HybInput({ defaultValue, label, suffix }) {
  return (
    <div>
      {label && <label style={{ fontSize: 11, color: HYB.mute, fontFamily: hybFonts.mono, display: 'block', marginBottom: 4, letterSpacing: 0.4 }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'baseline', borderBottom: `1.5px solid ${HYB.divider}`, padding: '8px 0' }}>
        <input defaultValue={defaultValue} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 17, fontWeight: 500, color: HYB.ink, outline: 'none', fontFamily: 'inherit', padding: 0 }} />
        {suffix && <span style={{ fontSize: 12, color: HYB.mute, fontFamily: hybFonts.mono }}>{suffix}</span>}
      </div>
    </div>
  );
}

function HybScreen0() {
  return (
    <HybShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${HYB.accent}, ${HYB.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 28, boxShadow: `0 8px 20px ${HYB.accentSoft}` }}>B</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: HYB.ink, letterSpacing: -0.8, lineHeight: 1.1 }}>
            Бьюти-помощник.<br/>
            <span style={{ color: HYB.accent }}>Без рутины.</span>
          </h1>
          <p style={{ margin: '18px 0 0', fontSize: 14, color: HYB.inkSoft, lineHeight: 1.55 }}>
            Отвечает клиенткам в Telegram, записывает на услугу, напоминает о визите.
          </p>
          <div style={{ marginTop: 28, padding: '16px 0', borderTop: `1px solid ${HYB.divider}`, borderBottom: `1px solid ${HYB.divider}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Настройка — 30 минут', 'Без технических знаний', 'Бот общается от вашего имени'].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13.5, color: HYB.inkSoft }}>
                <span style={{ fontFamily: hybFonts.mono, color: HYB.accent, fontSize: 11, width: 18 }}>0{i+1}</span>{t}
              </div>
            ))}
          </div>
        </div>
        <div>
          <PhoneButton color={HYB.ink} fg="#fff" style={{ borderRadius: 12 }}>Начать настройку</PhoneButton>
          <button style={{ marginTop: 8, width: '100%', background: 'transparent', border: 'none', color: HYB.mute, fontSize: 13, padding: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Уже настроено — войти</button>
        </div>
      </div>
    </HybShell>
  );
}

function HybScreen1() {
  const [niche, setNiche] = React.useState('Маникюр');
  const niches = ['Маникюр', 'Ресницы', 'Брови', 'Парикмахер', 'Косметолог'];
  return (
    <HybShell step={0}>
      <HybTitle num="01 · ПРОФИЛЬ" sub="Имя увидит клиентка в первом сообщении бота.">Расскажите о себе</HybTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <HybInput label="ИМЯ" defaultValue="Аня" />
        <div>
          <label style={{ fontSize: 11, color: HYB.mute, fontFamily: hybFonts.mono, display: 'block', marginBottom: 8, letterSpacing: 0.4 }}>СПЕЦИАЛИЗАЦИЯ</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {niches.map(n => (
              <button key={n} onClick={() => setNiche(n)} style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                border: `1px solid ${niche === n ? HYB.accent : HYB.divider}`,
                background: niche === n ? HYB.accentSoft : 'transparent',
                color: niche === n ? HYB.accentDark : HYB.inkSoft,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={HYB.ink} fg="#fff" style={{ borderRadius: 12 }}>Продолжить →</PhoneButton>
    </HybShell>
  );
}

function HybScreen2() {
  return (
    <HybShell step={1}>
      <HybTitle num="02 · УСЛУГА" sub="Минимум одна — чтобы бот мог записывать. Остальные добавите потом.">Прайс</HybTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <HybInput label="НАЗВАНИЕ" defaultValue="Маникюр + покрытие" />
        <div style={{ display: 'flex', gap: 22 }}>
          <div style={{ flex: 1 }}><HybInput label="ДЛИТЕЛЬНОСТЬ" defaultValue="90" suffix="мин" /></div>
          <div style={{ flex: 1 }}><HybInput label="ЦЕНА" defaultValue="2 500" suffix="₽" /></div>
        </div>
        <HybInput label="ОПИСАНИЕ (опц.)" defaultValue="Аппаратный + гель-лак" />
      </div>
      <div style={{ marginTop: 18, padding: '12px 14px', background: HYB.accentSoft, borderRadius: 10, fontSize: 12.5, color: HYB.accentDark, lineHeight: 1.5 }}>
        <b>Совет:</b> начните с самой ходовой услуги — добавить остальные займёт минуту.
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={HYB.ink} fg="#fff" style={{ borderRadius: 12 }}>Сохранить →</PhoneButton>
    </HybShell>
  );
}

function HybScreen3() {
  const days = [['MON', 1], ['TUE', 1], ['WED', 1], ['THU', 1], ['FRI', 1], ['SAT', 0], ['SUN', 0]];
  return (
    <HybShell step={2}>
      <HybTitle num="03 · РАСПИСАНИЕ" sub="В рабочие часы бот предложит слоты клиенткам.">График</HybTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 14 }}>
        {days.map(([d, on], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${HYB.divider}` }}>
            <div style={{ fontSize: 12, fontFamily: hybFonts.mono, color: on ? HYB.ink : HYB.mute, width: 50, fontWeight: 600 }}>{d}</div>
            <div style={{ flex: 1, fontSize: 13.5, color: on ? HYB.ink : HYB.mute }}>
              {on ? '10:00 — 20:00' : 'выходной'}
            </div>
            <div style={{ width: 32, height: 18, borderRadius: 9, background: on ? HYB.accent : '#d4d0d0', position: 'relative', transition: 'background 0.15s' }}>
              <div style={{ position: 'absolute', top: 2, [on ? 'right' : 'left']: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
            </div>
          </div>
        ))}
      </div>
      <button style={{ background: 'transparent', border: `1px dashed ${HYB.divider}`, padding: '10px', borderRadius: 8, color: HYB.mute, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>+ Добавить перерыв</button>
      <div style={{ flex: 1 }} />
      <PhoneButton color={HYB.ink} fg="#fff" style={{ borderRadius: 12 }}>Продолжить →</PhoneButton>
    </HybShell>
  );
}

function HybScreen4() {
  return (
    <HybShell step={3}>
      <HybTitle num="04 · ИНТЕГРАЦИЯ" sub="Бот будет отвечать клиенткам с вашего Telegram-аккаунта.">Telegram Business</HybTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: `1px solid ${HYB.divider}` }}>
        {[
          ['1', 'Настройки → Telegram Business'],
          ['2', 'Включить «Чат-боты»'],
          ['3', <span>Имя бота: <code style={{ fontFamily: hybFonts.mono, fontSize: 12.5, color: HYB.accent, background: HYB.accentSoft, padding: '1px 6px', borderRadius: 4 }}>@beauty_assist_bot</code></span>],
          ['4', 'Права: «Отвечать на сообщения»'],
        ].map(([n, t], i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${HYB.divider}` }}>
            <div style={{ fontFamily: hybFonts.mono, fontSize: 12, color: HYB.accent, width: 18, fontWeight: 600 }}>0{n}</div>
            <div style={{ fontSize: 13.5, color: HYB.ink, lineHeight: 1.4, flex: 1 }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '12px 14px', background: HYB.accentSoft, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: HYB.accentDark }} />
        <div style={{ fontSize: 12.5, color: HYB.accentDark, fontFamily: hybFonts.mono }}>проверяем подключение…</div>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={HYB.ink} fg="#fff" style={{ borderRadius: 12 }}>Я подключила →</PhoneButton>
    </HybShell>
  );
}

function HybScreen5() {
  return (
    <HybShell step={4}>
      <HybTitle num="05 · ТЕСТ" sub="Напишите боту со своего телефона. Если ответит — всё готово.">Финальная проверка</HybTitle>
      <div style={{ background: HYB.card, border: `1px solid ${HYB.divider}`, borderRadius: 12, padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 10, color: HYB.mute, textAlign: 'center', fontFamily: hybFonts.mono, letterSpacing: 0.5 }}>ПРЕВЬЮ ЧАТА</div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: HYB.accent, color: '#fff', padding: '10px 14px', borderRadius: '14px 14px 4px 14px', fontSize: 14 }}>
          привет
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: HYB.bg, color: HYB.ink, padding: '10px 14px', borderRadius: '14px 14px 14px 4px', fontSize: 14, lineHeight: 1.45 }}>
          Здравствуйте! Я Аня. Записываю на маникюр + покрытие — 90 мин, 2 500 ₽. На какой день удобнее?
        </div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: HYB.accent, color: '#fff', padding: '10px 14px', borderRadius: '14px 14px 4px 14px', fontSize: 14 }}>
          в субботу
        </div>
        <div style={{ alignSelf: 'flex-start', fontSize: 11, color: HYB.mute, fontStyle: 'italic' }}>печатает…</div>
      </div>
      <div style={{ marginTop: 14 }}>
        <PhoneButton color={HYB.success} fg="#fff" style={{ borderRadius: 12 }}>✓ Готово, на главную</PhoneButton>
      </div>
    </HybShell>
  );
}

function HybScreen6() {
  return (
    <HybShell>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: HYB.mute, fontFamily: hybFonts.mono, letterSpacing: 0.4 }}>СБ · 29 АПР</div>
        <h1 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color: HYB.ink, letterSpacing: -0.5 }}>Доброе утро, Аня</h1>
      </div>

      <div style={{ border: `1px solid ${HYB.accent}`, background: HYB.accentSoft, borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: HYB.accentDark, fontWeight: 700, fontFamily: hybFonts.mono, letterSpacing: 0.4 }}>ДОДЕЛАТЬ · 4/8</div>
          <div style={{ fontSize: 11, color: HYB.accentDark }}>раскрыть →</div>
        </div>
        <div style={{ height: 3, background: 'rgba(217,105,98,0.2)', marginTop: 10, borderRadius: 2 }}>
          <div style={{ width: '50%', height: '100%', background: HYB.accent, borderRadius: 2 }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: HYB.inkSoft }}>фото · правила переноса · ещё услуги</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 18 }}>
        <div style={{ borderRight: `1px solid ${HYB.divider}`, paddingRight: 14 }}>
          <div style={{ fontSize: 11, color: HYB.mute, fontFamily: hybFonts.mono, letterSpacing: 0.4 }}>СЕГОДНЯ</div>
          <div style={{ fontSize: 30, color: HYB.ink, fontWeight: 700, marginTop: 4, letterSpacing: -1 }}>3</div>
          <div style={{ fontSize: 11, color: HYB.mute }}>записи</div>
        </div>
        <div style={{ paddingLeft: 14 }}>
          <div style={{ fontSize: 11, color: HYB.mute, fontFamily: hybFonts.mono, letterSpacing: 0.4 }}>НЕДЕЛЯ</div>
          <div style={{ fontSize: 22, color: HYB.ink, fontWeight: 700, marginTop: 4, letterSpacing: -0.5 }}>18,5к ₽</div>
          <div style={{ fontSize: 11, color: HYB.success }}>+12%</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: HYB.mute, fontFamily: hybFonts.mono, marginBottom: 8, letterSpacing: 0.4 }}>ЛЕНТА</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {[
          ['10:42', 'BOOK', 'Марина К. → сб 14:00', HYB.accent],
          ['09:15', 'CHAT', '+7 диалогов за ночь', HYB.mute],
          ['08:01', 'NOTE', 'Запас слотов на пт <30%', HYB.mute],
        ].map(([t, k, msg, c], i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 2 ? `1px solid ${HYB.divider}` : 'none', fontSize: 12.5, alignItems: 'center' }}>
            <span style={{ color: HYB.mute, fontFamily: hybFonts.mono, width: 36 }}>{t}</span>
            <span style={{ fontFamily: hybFonts.mono, fontSize: 10, color: '#fff', background: c, padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>{k}</span>
            <span style={{ color: HYB.inkSoft, flex: 1 }}>{msg}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', marginLeft: -22, marginRight: -22, marginBottom: -22, display: 'flex', justifyContent: 'space-around', padding: '12px 0 14px', borderTop: `1px solid ${HYB.divider}`, background: HYB.card, fontFamily: hybFonts.mono, fontSize: 11 }}>
        {[['home', true], ['cal'], ['bot'], ['cli'], ['cfg']].map(([l, on], k) => (
          <div key={k} style={{ color: on ? HYB.accent : HYB.mute, fontWeight: on ? 700 : 400 }}>{l}</div>
        ))}
      </div>
    </HybShell>
  );
}

function hybridOnboardingArtboards() {
  const screens = [
    ['hyb-0', '0 · Welcome', HybScreen0],
    ['hyb-1', '1 · Профиль', HybScreen1],
    ['hyb-2', '2 · Услуга', HybScreen2],
    ['hyb-3', '3 · График', HybScreen3],
    ['hyb-4', '4 · Telegram', HybScreen4],
    ['hyb-5', '5 · Тест', HybScreen5],
    ['hyb-6', '✓ Главная', HybScreen6],
  ];
  return screens.map(([id, label, Cmp]) => (
    <DCArtboard key={id} id={id} label={label} width={320} height={660}>
      <Cmp />
    </DCArtboard>
  ));
}

// System card for the hybrid (для секции дизайн-системы)
function SystemCardHybrid() {
  const vars = { ...HYB, mute: HYB.mute, divider: HYB.divider, radius: 12, tag: '· совет', vibe: 'розовый/коралловый акцент сохраняет тепло, mono-метки и сетка дают взрослую структуру. Эмоционально, но без эмодзи-перегруза.' };
  return (
    <div style={{ width: '100%', height: '100%', background: vars.bg, padding: '28px 28px 22px', display: 'flex', flexDirection: 'column', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box' }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: vars.accent, textTransform: 'uppercase', letterSpacing: 0.6 }}>Гибрид B+C · рекомендованный</div>
        <h1 style={{ margin: '6px 0 2px', fontSize: 30, fontWeight: 700, color: vars.ink, letterSpacing: -0.6 }}>Коралл + сетка</h1>
        <p style={{ margin: 0, fontSize: 13, color: vars.inkSoft }}>Тёплый акцент B, строгая структура C. Manrope + JetBrains Mono.</p>
      </div>
      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {[['bg', 'фон'], ['card', 'карта'], ['accentSoft', 'soft'], ['accent', 'accent'], ['ink', 'ink']].map(([k, l]) => (
          <div key={k}>
            <div style={{ height: 56, borderRadius: 10, background: vars[k], border: '1px solid rgba(0,0,0,0.06)' }} />
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: vars.mute, marginTop: 4 }}>{l}</div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: vars.ink }}>{vars[k]}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: vars.mute, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>типографика</div>
        <div style={{ background: vars.card, borderRadius: 12, padding: 16, border: `1px solid ${vars.divider}` }}>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: vars.accent, letterSpacing: 0.4 }}>СБ · 29 АПР</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: vars.ink, lineHeight: 1.1, letterSpacing: -0.5, marginTop: 4 }}>Доброе утро, Аня</div>
          <div style={{ fontSize: 14, color: vars.inkSoft, marginTop: 6, lineHeight: 1.45 }}>3 записи сегодня. Бот ответил на 7 диалогов за ночь.</div>
          <div style={{ fontSize: 11, color: vars.mute, fontFamily: 'JetBrains Mono, monospace', marginTop: 8 }}>10:42 · <span style={{ background: vars.accent, color: '#fff', padding: '1px 5px', borderRadius: 3 }}>BOOK</span> Марина К.</div>
        </div>
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={{ background: vars.ink, color: '#fff', border: 'none', padding: '11px 18px', borderRadius: 12, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'default' }}>Продолжить →</button>
        <button style={{ background: 'transparent', color: vars.ink, border: `1px solid ${vars.divider}`, padding: '11px 18px', borderRadius: 12, fontWeight: 500, fontSize: 13, fontFamily: 'inherit', cursor: 'default' }}>Отмена</button>
        <span style={{ background: vars.accentSoft, color: vars.accentDark, padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>совет</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${vars.divider}`, fontSize: 12, color: vars.mute, lineHeight: 1.5 }}>
        <b style={{ color: vars.ink }}>Vibe:</b> {vars.vibe}
      </div>
    </div>
  );
}

Object.assign(window, { hybridOnboardingArtboards, SystemCardHybrid, HYB });
