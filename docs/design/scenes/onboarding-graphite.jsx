// Onboarding · Variant C · Графитовый минимал
// Vibe: сдержанно, технически, минимум декора. Похоже на Linear/Vercel в Mini App-формате.

const GRAPH = {
  bg: '#fafaf7',
  card: '#ffffff',
  ink: '#0c0c0c',
  inkSoft: '#3a3a3a',
  mute: '#787876',
  accent: '#0c0c0c',
  accentSoft: '#f0efe9',
  divider: 'rgba(12,12,12,0.08)',
  success: '#0a7a3e',
};

const graphFonts = {
  body: '"Manrope", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", monospace',
};

function GraphShell({ children, step, total = 5 }) {
  return (
    <PhoneShell width={320} height={660} bg={GRAPH.bg}>
      <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${GRAPH.divider}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: GRAPH.ink, fontFamily: graphFonts.mono, letterSpacing: -0.2 }}>
          beauty/assistant
        </div>
        {step !== undefined && (
          <div style={{ fontSize: 11, color: GRAPH.mute, fontFamily: graphFonts.mono }}>
            step {step + 1} of {total}
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: '18px 22px 22px', display: 'flex', flexDirection: 'column' }}>{children}</div>
    </PhoneShell>
  );
}

function GraphTitle({ children, sub, num }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {num !== undefined && <div style={{ fontFamily: graphFonts.mono, fontSize: 11, color: GRAPH.mute, marginBottom: 8 }}>{num}</div>}
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: GRAPH.ink, letterSpacing: -0.6, lineHeight: 1.15 }}>{children}</h1>
      {sub && <p style={{ margin: '8px 0 0', fontSize: 13.5, color: GRAPH.inkSoft, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

function GraphInput({ defaultValue, label, suffix }) {
  return (
    <div>
      {label && <label style={{ fontSize: 11, color: GRAPH.mute, fontFamily: graphFonts.mono, display: 'block', marginBottom: 4 }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${GRAPH.divider}`, padding: '8px 0' }}>
        <input defaultValue={defaultValue} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 16, color: GRAPH.ink, outline: 'none', fontFamily: 'inherit', padding: 0 }} />
        {suffix && <span style={{ fontSize: 12, color: GRAPH.mute, fontFamily: graphFonts.mono }}>{suffix}</span>}
      </div>
    </div>
  );
}

function GraphScreen0() {
  return (
    <GraphShell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: GRAPH.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 28 }}>B</div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: GRAPH.ink, letterSpacing: -0.8, lineHeight: 1.1 }}>
            Bot.<br/>Простой ассистент<br/>для бьюти-мастеров.
          </h1>
          <p style={{ margin: '18px 0 0', fontSize: 14, color: GRAPH.inkSoft, lineHeight: 1.55 }}>
            Отвечает клиенткам в Telegram. Записывает на услуги. Напоминает.
          </p>
          <div style={{ marginTop: 28, padding: '14px 0', borderTop: `1px solid ${GRAPH.divider}`, borderBottom: `1px solid ${GRAPH.divider}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Настройка — 30 минут', 'Не нужны технические знания', 'Бот общается от вашего имени'].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, color: GRAPH.inkSoft }}>
                <span style={{ fontFamily: graphFonts.mono, color: GRAPH.mute, fontSize: 11 }}>0{i+1}</span>{t}
              </div>
            ))}
          </div>
        </div>
        <div>
          <PhoneButton color={GRAPH.ink} fg="#fff" style={{ borderRadius: 10 }}>Начать</PhoneButton>
          <button style={{ marginTop: 8, width: '100%', background: 'transparent', border: 'none', color: GRAPH.mute, fontSize: 13, padding: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Войти →</button>
        </div>
      </div>
    </GraphShell>
  );
}

function GraphScreen1() {
  const [niche, setNiche] = React.useState('Маникюр');
  const niches = ['Маникюр', 'Ресницы', 'Брови', 'Парикмахер', 'Косметолог'];
  return (
    <GraphShell step={0}>
      <GraphTitle num="01 · ПРОФИЛЬ" sub="Имя увидит клиентка в первом сообщении бота.">Расскажите о себе</GraphTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <GraphInput label="ИМЯ" defaultValue="Аня" />
        <div>
          <label style={{ fontSize: 11, color: GRAPH.mute, fontFamily: graphFonts.mono, display: 'block', marginBottom: 8 }}>СПЕЦИАЛИЗАЦИЯ</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {niches.map(n => (
              <button key={n} onClick={() => setNiche(n)} style={{
                padding: '7px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                border: `1px solid ${niche === n ? GRAPH.ink : GRAPH.divider}`,
                background: niche === n ? GRAPH.ink : 'transparent',
                color: niche === n ? '#fff' : GRAPH.inkSoft,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={GRAPH.ink} fg="#fff" style={{ borderRadius: 10 }}>Продолжить</PhoneButton>
    </GraphShell>
  );
}

function GraphScreen2() {
  return (
    <GraphShell step={1}>
      <GraphTitle num="02 · УСЛУГА" sub="Минимум одна — чтобы бот мог записывать. Остальные добавите потом.">Прайс</GraphTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <GraphInput label="НАЗВАНИЕ" defaultValue="Маникюр + покрытие" />
        <div style={{ display: 'flex', gap: 22 }}>
          <div style={{ flex: 1 }}><GraphInput label="ДЛИТЕЛЬНОСТЬ" defaultValue="90" suffix="мин" /></div>
          <div style={{ flex: 1 }}><GraphInput label="ЦЕНА" defaultValue="2 500" suffix="₽" /></div>
        </div>
        <GraphInput label="ОПИСАНИЕ (опц.)" defaultValue="Аппаратный + гель-лак" />
      </div>
      <div style={{ marginTop: 18, padding: '10px 12px', borderLeft: `2px solid ${GRAPH.ink}`, fontSize: 12, color: GRAPH.inkSoft, lineHeight: 1.5 }}>
        Совет: начните с самой ходовой услуги. Прайс изменяется в один клик.
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={GRAPH.ink} fg="#fff" style={{ borderRadius: 10 }}>Сохранить</PhoneButton>
    </GraphShell>
  );
}

function GraphScreen3() {
  const days = [['MON', 1], ['TUE', 1], ['WED', 1], ['THU', 1], ['FRI', 1], ['SAT', 0], ['SUN', 0]];
  return (
    <GraphShell step={2}>
      <GraphTitle num="03 · РАСПИСАНИЕ" sub="В рабочие часы бот предложит слоты клиенткам.">График</GraphTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
        {days.map(([d, on], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${GRAPH.divider}` }}>
            <div style={{ fontSize: 13, fontFamily: graphFonts.mono, color: GRAPH.ink, width: 50 }}>{d}</div>
            <div style={{ flex: 1, fontSize: 13.5, color: on ? GRAPH.ink : GRAPH.mute }}>
              {on ? '10:00 — 20:00' : '— выходной'}
            </div>
            <div style={{ width: 32, height: 18, borderRadius: 9, background: on ? GRAPH.ink : '#d4d4d0', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 2, [on ? 'right' : 'left']: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
            </div>
          </div>
        ))}
      </div>
      <button style={{ background: 'transparent', border: `1px dashed ${GRAPH.divider}`, padding: '10px', borderRadius: 8, color: GRAPH.mute, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>+ Добавить перерыв</button>
      <div style={{ flex: 1 }} />
      <PhoneButton color={GRAPH.ink} fg="#fff" style={{ borderRadius: 10 }}>Продолжить</PhoneButton>
    </GraphShell>
  );
}

function GraphScreen4() {
  return (
    <GraphShell step={3}>
      <GraphTitle num="04 · INTEGRATION" sub="Бот будет отвечать клиенткам с вашего Telegram-аккаунта.">Telegram Business</GraphTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: `1px solid ${GRAPH.divider}` }}>
        {[
          ['1', 'Настройки → Telegram Business'],
          ['2', 'Включить «Чат-боты»'],
          ['3', 'Имя бота: @beauty_assist_bot'],
          ['4', 'Права: «Отвечать на сообщения»'],
        ].map(([n, t]) => (
          <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${GRAPH.divider}` }}>
            <div style={{ fontFamily: graphFonts.mono, fontSize: 12, color: GRAPH.mute, width: 18 }}>0{n}</div>
            <div style={{ fontSize: 13.5, color: GRAPH.ink, lineHeight: 1.4, flex: 1 }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '12px 14px', background: GRAPH.accentSoft, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GRAPH.success, animation: 'pulse 1.5s infinite' }} />
        <div style={{ fontSize: 12.5, color: GRAPH.ink, fontFamily: graphFonts.mono }}>checking connection…</div>
      </div>
      <div style={{ flex: 1 }} />
      <PhoneButton color={GRAPH.ink} fg="#fff" style={{ borderRadius: 10 }}>Проверить</PhoneButton>
    </GraphShell>
  );
}

function GraphScreen5() {
  return (
    <GraphShell step={4}>
      <GraphTitle num="05 · TEST" sub="Напишите боту со своего телефона. Если ответит — всё готово.">Финальная проверка</GraphTitle>
      <div style={{ background: GRAPH.card, border: `1px solid ${GRAPH.divider}`, borderRadius: 8, padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontFamily: graphFonts.mono }}>
        <div style={{ fontSize: 10, color: GRAPH.mute, textAlign: 'center' }}>chat preview</div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '76%', background: GRAPH.ink, color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
          &gt; привет
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: GRAPH.accentSoft, color: GRAPH.ink, padding: '10px 12px', borderRadius: 6, fontSize: 13, lineHeight: 1.4, fontFamily: graphFonts.body }}>
          Здравствуйте! Я Аня. Записываю на маникюр + покрытие — 90 мин, 2 500 ₽. На какой день удобнее?
        </div>
        <div style={{ alignSelf: 'flex-end', maxWidth: '76%', background: GRAPH.ink, color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
          &gt; в субботу
        </div>
        <div style={{ alignSelf: 'flex-start', fontSize: 11, color: GRAPH.mute }}>typing...</div>
      </div>
      <div style={{ marginTop: 14 }}>
        <PhoneButton color={GRAPH.success} fg="#fff" style={{ borderRadius: 10 }}>✓ Готово, на главную</PhoneButton>
      </div>
    </GraphShell>
  );
}

function GraphScreen6() {
  return (
    <GraphShell>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: GRAPH.mute, fontFamily: graphFonts.mono }}>SAT · 29 APR</div>
        <h1 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, color: GRAPH.ink, letterSpacing: -0.5 }}>Аня</h1>
      </div>

      <div style={{ border: `1px solid ${GRAPH.divider}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: GRAPH.ink, fontWeight: 600, fontFamily: graphFonts.mono }}>SETUP · 4/8</div>
          <div style={{ fontSize: 11, color: GRAPH.mute }}>раскрыть →</div>
        </div>
        <div style={{ height: 2, background: GRAPH.accentSoft, marginTop: 10 }}>
          <div style={{ width: '50%', height: '100%', background: GRAPH.ink }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 18 }}>
        <div style={{ borderRight: `1px solid ${GRAPH.divider}`, paddingRight: 14 }}>
          <div style={{ fontSize: 11, color: GRAPH.mute, fontFamily: graphFonts.mono }}>TODAY</div>
          <div style={{ fontSize: 30, color: GRAPH.ink, fontWeight: 700, marginTop: 4, letterSpacing: -1 }}>3</div>
          <div style={{ fontSize: 11, color: GRAPH.mute }}>записи</div>
        </div>
        <div style={{ paddingLeft: 14 }}>
          <div style={{ fontSize: 11, color: GRAPH.mute, fontFamily: graphFonts.mono }}>WEEK</div>
          <div style={{ fontSize: 22, color: GRAPH.ink, fontWeight: 700, marginTop: 4, letterSpacing: -0.5 }}>18,5к ₽</div>
          <div style={{ fontSize: 11, color: GRAPH.success }}>+12%</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: GRAPH.mute, fontFamily: graphFonts.mono, marginBottom: 8 }}>FEED</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {[
          ['10:42', 'BOOK', 'Марина К. → сб 14:00'],
          ['09:15', 'CHAT', '+7 диалогов за ночь'],
          ['08:01', 'NOTE', 'Запас слотов на пт <30%'],
        ].map(([t, k, msg], i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 2 ? `1px solid ${GRAPH.divider}` : 'none', fontSize: 12.5, alignItems: 'center' }}>
            <span style={{ color: GRAPH.mute, fontFamily: graphFonts.mono, width: 36 }}>{t}</span>
            <span style={{ fontFamily: graphFonts.mono, fontSize: 10, color: GRAPH.ink, background: GRAPH.accentSoft, padding: '1px 5px', borderRadius: 3 }}>{k}</span>
            <span style={{ color: GRAPH.inkSoft, flex: 1 }}>{msg}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', marginLeft: -22, marginRight: -22, marginBottom: -22, display: 'flex', justifyContent: 'space-around', padding: '12px 0 14px', borderTop: `1px solid ${GRAPH.divider}`, background: GRAPH.card, fontFamily: graphFonts.mono, fontSize: 11 }}>
        {[['home', true], ['cal'], ['bot'], ['cli'], ['cfg']].map(([l, on], k) => (
          <div key={k} style={{ color: on ? GRAPH.ink : GRAPH.mute, fontWeight: on ? 700 : 400 }}>{l}</div>
        ))}
      </div>
    </GraphShell>
  );
}

function graphiteOnboardingArtboards() {
  const screens = [
    ['graph-0', '0 · Welcome', GraphScreen0],
    ['graph-1', '1 · Профиль', GraphScreen1],
    ['graph-2', '2 · Услуга', GraphScreen2],
    ['graph-3', '3 · График', GraphScreen3],
    ['graph-4', '4 · Telegram', GraphScreen4],
    ['graph-5', '5 · Тест', GraphScreen5],
    ['graph-6', '✓ Главная', GraphScreen6],
  ];
  return screens.map(([id, label, Cmp]) => (
    <DCArtboard key={id} id={id} label={label} width={320} height={660}>
      <Cmp />
    </DCArtboard>
  ));
}

Object.assign(window, { graphiteOnboardingArtboards, GRAPH });
