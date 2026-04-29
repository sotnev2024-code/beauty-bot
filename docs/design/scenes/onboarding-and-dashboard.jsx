// Онбординг (под систему D) + Главный экран приложения
const OB = HYB;
const obFonts = { body: '"Manrope", sans-serif', display: '"Fraunces", serif', mono: '"JetBrains Mono", monospace' };

// ── progress dots ────────────────────────────────────────────────────
function ObProgress({ step, total = 6 }) {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '12px 22px 0' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < step ? OB.accent : (i === step ? OB.ink : OB.divider),
        }} />
      ))}
    </div>
  );
}

function ObFooter({ primary, secondary, onPrimary, onSecondary }) {
  return (
    <div style={{ padding: '12px 22px 18px', borderTop: `1px solid ${OB.divider}`, background: OB.card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={onPrimary} style={{
        width: '100%', background: OB.ink, color: '#fff', border: 'none',
        padding: '14px', borderRadius: 12, fontWeight: 600, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer',
      }}>{primary}</button>
      {secondary && <button onClick={onSecondary} style={{
        background: 'transparent', border: 'none', color: OB.mute, fontSize: 12.5, cursor: 'pointer', padding: 4, fontFamily: 'inherit',
      }}>{secondary}</button>}
    </div>
  );
}

// ── 1. Welcome ───────────────────────────────────────────────────────
function ObWelcome() {
  return (
    <PhoneShell width={320} height={660} bg={OB.bg}>
      <ObProgress step={0} />
      <div style={{ flex: 1, padding: '40px 28px 24px', display: 'flex', flexDirection: 'column' }}>
        {/* mark */}
        <div style={{ width: 56, height: 56, borderRadius: 14, background: OB.ink, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontFamily: obFonts.display, fontWeight: 600, fontStyle: 'italic' }}>b<sub style={{ fontSize: 12, fontStyle: 'normal' }}>·</sub></div>

        <div style={{ marginTop: 56 }}>
          <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4, marginBottom: 10 }}>BEAUTY · BOT</div>
          <h1 style={{ margin: 0, fontFamily: obFonts.display, fontSize: 40, fontWeight: 500, lineHeight: 1.05, color: OB.ink, letterSpacing: -1 }}>
            Бот, который<br/><i>знает</i> как вы<br/>работаете
          </h1>
          <p style={{ margin: '18px 0 0', fontSize: 14.5, color: OB.inkSoft, lineHeight: 1.55 }}>
            Записывает клиенток, отвечает в Telegram, помнит каждую — пока вы делаете маникюр, брови или массаж.
          </p>
        </div>

        <div style={{ flex: 1 }} />

        {/* trust strip */}
        <div style={{ display: 'flex', gap: 18, fontSize: 11, fontFamily: obFonts.mono, color: OB.mute, marginBottom: 4 }}>
          <span><b style={{ color: OB.ink }}>5 мин</b> настройка</span>
          <span><b style={{ color: OB.ink }}>0 ₽</b> до 50 клиенток</span>
        </div>
      </div>
      <ObFooter primary="Начать" secondary="Уже есть аккаунт →" />
    </PhoneShell>
  );
}

// ── 2. Niche ─────────────────────────────────────────────────────────
function ObNiche() {
  const [picked, setPicked] = React.useState('manicure');
  const niches = [
    { id: 'manicure', name: 'Маникюр / педикюр', sub: 'покрытие, дизайн, наращивание' },
    { id: 'brows', name: 'Брови / ресницы', sub: 'окрашивание, ламинирование, наращивание' },
    { id: 'hair', name: 'Волосы', sub: 'стрижка, окрашивание, уход' },
    { id: 'massage', name: 'Массаж / СПА', sub: 'классический, лимфодренаж, лица' },
    { id: 'cosmo', name: 'Косметология', sub: 'чистки, пилинги, инъекции' },
    { id: 'epil', name: 'Эпиляция / шугаринг', sub: 'воск, шугар, лазер' },
    { id: 'other', name: 'Другое', sub: 'настроите всё вручную' },
  ];
  return (
    <PhoneShell width={320} height={660} bg={OB.bg}>
      <ObProgress step={1} />
      <div style={{ padding: '20px 22px 14px' }}>
        <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4 }}>ШАГ 1 · НИША</div>
        <h2 style={{ margin: '6px 0 4px', fontFamily: obFonts.display, fontSize: 26, fontWeight: 500, color: OB.ink, letterSpacing: -0.5 }}>Чем вы занимаетесь?</h2>
        <p style={{ margin: 0, fontSize: 13, color: OB.mute, lineHeight: 1.5 }}>Подберём готовые воронки и шаблоны под вас.</p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 12px' }}>
        {niches.map(n => {
          const on = picked === n.id;
          return (
            <div key={n.id} onClick={() => setPicked(n.id)} style={{
              padding: '12px 14px',
              background: on ? OB.accentSoft : 'transparent',
              border: `1.5px solid ${on ? OB.accent : OB.divider}`,
              borderRadius: 10, marginBottom: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${on ? OB.accent : OB.divider}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {on && <div style={{ width: 8, height: 8, borderRadius: '50%', background: OB.accent }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: OB.ink }}>{n.name}</div>
                <div style={{ fontSize: 11, color: OB.mute, marginTop: 1 }}>{n.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
      <ObFooter primary="Дальше →" secondary="Назад" />
    </PhoneShell>
  );
}

// ── 3. Connect Business Bot ──────────────────────────────────────────
function ObConnect() {
  return (
    <PhoneShell width={320} height={660} bg={OB.bg}>
      <ObProgress step={2} />
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4 }}>ШАГ 2 · ПОДКЛЮЧЕНИЕ</div>
        <h2 style={{ margin: '6px 0 4px', fontFamily: obFonts.display, fontSize: 26, fontWeight: 500, color: OB.ink, letterSpacing: -0.5 }}>Подключаем бота к Telegram Business</h2>
        <p style={{ margin: 0, fontSize: 13, color: OB.mute, lineHeight: 1.5 }}>Бот будет отвечать клиенткам прямо в вашем личном чате.</p>
      </div>

      <div style={{ flex: 1, padding: '14px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* tg business hint */}
        <div style={{ padding: 12, background: OB.card, border: `1px solid ${OB.divider}`, borderRadius: 10, fontSize: 12, color: OB.inkSoft, lineHeight: 1.5 }}>
          <span style={{ display: 'inline-block', fontSize: 9, fontFamily: obFonts.mono, color: OB.success, fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>● TELEGRAM PREMIUM ВКЛЮЧЁН</span>
          <div>Подключение работает через <b style={{ color: OB.ink }}>Telegram Business</b> — клиентки пишут вам как обычно, а наш бот отвечает за вас.</div>
        </div>

        {[
          ['1', 'Откройте Telegram → Настройки', 'Раздел «Telegram для бизнеса».', 'done'],
          ['2', 'Выберите «Чат-боты»', 'Поле для ника бизнес-бота.', 'done'],
          ['3', 'Вставьте наш бот', null, 'active'],
          ['4', 'Подтвердите права', 'Читать и отвечать на сообщения от клиенток.', 'pending'],
        ].map(([n, t, sub, st]) => {
          const isDone = st === 'done', isActive = st === 'active';
          return (
            <div key={n} style={{
              display: 'flex', gap: 12, padding: 12,
              background: isActive ? OB.accentSoft : OB.card,
              border: `1px solid ${isActive ? OB.accent : OB.divider}`,
              borderRadius: 10,
              opacity: st === 'pending' ? 0.5 : 1,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: isDone ? OB.success : (isActive ? OB.accent : 'transparent'),
                color: '#fff', display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 700, fontFamily: obFonts.mono,
                border: !isDone && !isActive ? `1.5px solid ${OB.divider}` : 'none',
                boxShadow: isActive ? `0 0 0 4px rgba(217,105,98,0.15)` : 'none',
              }}>{isDone ? '✓' : <span style={{ color: !isDone && !isActive ? OB.mute : '#fff' }}>{n}</span>}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: OB.ink }}>{t}</div>
                {sub && <div style={{ fontSize: 11.5, color: OB.mute, marginTop: 2, lineHeight: 1.45 }}>{sub}</div>}
                {isActive && (
                  <div style={{ marginTop: 8, background: OB.card, border: `1.5px solid ${OB.accent}`, borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontFamily: obFonts.mono, fontSize: 13, fontWeight: 600, color: OB.ink }}>@beautybot_assistant</div>
                    <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.accentDark, background: OB.accentSoft, padding: '3px 7px', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>СКОПИРОВАТЬ</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* status */}
        <div style={{ marginTop: 4, padding: 12, background: OB.bg, border: `1px dashed ${OB.divider}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: OB.warn, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: OB.ink, fontWeight: 600 }}>Ждём подключения</div>
            <div style={{ fontSize: 11, color: OB.mute, marginTop: 1 }}>Как только добавите — увидим автоматически</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: OB.mute, lineHeight: 1.5, padding: '0 4px' }}>
          <b style={{ color: OB.ink }}>Нужен Telegram Premium</b> — Business доступен только с подпиской. У вас уже подключён ✓
        </div>
      </div>
      <ObFooter primary="Я подключил →" secondary="Не получается? Помощь" />
    </PhoneShell>
  );
}

// ── 4. Funnel pick ───────────────────────────────────────────────────
function ObFunnels() {
  const [picked, setPicked] = React.useState({ 0: true, 1: true, 2: false });
  const items = [
    { id: 0, name: 'Запись новой клиентки', steps: 5, why: 'Главное — без него бот бесполезен' },
    { id: 1, name: 'Напоминание за 24 часа', steps: 2, why: 'Минус 80% «забыла-не пришла»' },
    { id: 2, name: 'Возврат через 3 недели', steps: 3, why: 'Маникюр сходит — пора повторить' },
    { id: 3, name: 'Сбор отзыва после визита', steps: 3, why: 'После хорошего визита — самое время' },
  ];
  return (
    <PhoneShell width={320} height={660} bg={OB.bg}>
      <ObProgress step={3} />
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4 }}>ШАГ 3 · СЦЕНАРИИ</div>
        <h2 style={{ margin: '6px 0 4px', fontFamily: obFonts.display, fontSize: 24, fontWeight: 500, color: OB.ink, letterSpacing: -0.5 }}>Что бот будет делать?</h2>
        <p style={{ margin: 0, fontSize: 12.5, color: OB.mute, lineHeight: 1.5 }}>Готовые воронки. Их можно изменить позже.</p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(it => {
          const on = picked[it.id];
          return (
            <div key={it.id} onClick={() => setPicked({ ...picked, [it.id]: !on })} style={{
              padding: 14, background: on ? OB.accentSoft : OB.card,
              border: `1.5px solid ${on ? OB.accent : OB.divider}`,
              borderRadius: 12, cursor: 'pointer',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 18, height: 18, flexShrink: 0,
                borderRadius: 5, marginTop: 2,
                border: `1.5px solid ${on ? OB.accent : OB.divider}`,
                background: on ? OB.accent : 'transparent',
                display: 'grid', placeItems: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700,
              }}>{on && '✓'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: OB.ink }}>{it.name}</div>
                  <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.mute, flexShrink: 0 }}>{it.steps} шагов</div>
                </div>
                <div style={{ fontSize: 11.5, color: OB.inkSoft, marginTop: 4, lineHeight: 1.45 }}>{it.why}</div>
              </div>
            </div>
          );
        })}
      </div>
      <ObFooter primary="Создать 2 воронки →" secondary="Пропустить" />
    </PhoneShell>
  );
}

// ── 5. Services ──────────────────────────────────────────────────────
function ObServices() {
  return (
    <PhoneShell width={320} height={660} bg={OB.bg}>
      <ObProgress step={4} />
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4 }}>ШАГ 4 · УСЛУГИ</div>
        <h2 style={{ margin: '6px 0 4px', fontFamily: obFonts.display, fontSize: 26, fontWeight: 500, color: OB.ink, letterSpacing: -0.5 }}>Ваш прайс</h2>
        <p style={{ margin: 0, fontSize: 12.5, color: OB.mute, lineHeight: 1.5 }}>Отметьте что делаете и подправьте цены.</p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px 12px' }}>
        <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.mute, marginBottom: 8, letterSpacing: 0.4 }}>ИЗ ШАБЛОНА «МАНИКЮР» — РЕДАКТИРУЕМО</div>

        {[
          ['Маникюр + однотонное', 90, 2500, true],
          ['Маникюр + френч', 100, 2800, true],
          ['Маникюр + дизайн', 120, 3500, true],
          ['Наращивание', 180, 4500, true],
          ['Снятие чужого', 30, 800, false],
          ['Только покрытие', 60, 1800, false],
        ].map(([name, dur, price, on], i) => (
          <div key={i} style={{
            padding: '10px 12px',
            background: on ? OB.card : 'transparent',
            border: `1px solid ${on ? OB.divider : OB.divider}`,
            opacity: on ? 1 : 0.55,
            borderRadius: 8, marginBottom: 5,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${on ? OB.accent : OB.divider}`,
              background: on ? OB.accent : 'transparent',
              display: 'grid', placeItems: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700,
            }}>{on && '✓'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: OB.ink, fontWeight: 500 }}>{name}</div>
              <div style={{ fontSize: 10.5, color: OB.mute, fontFamily: obFonts.mono, marginTop: 1 }}>{dur} мин</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, fontFamily: obFonts.mono, fontSize: 13, fontWeight: 600, color: OB.ink }}>
              {price.toLocaleString('ru')} <span style={{ fontSize: 10, color: OB.mute }}>₽</span>
            </div>
          </div>
        ))}

        <button style={{
          width: '100%', marginTop: 6, padding: 10, borderRadius: 8,
          border: `1.5px dashed ${OB.divider}`, background: 'transparent',
          color: OB.mute, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>+ Добавить свою услугу</button>
      </div>
      <ObFooter primary="Сохранить 4 услуги →" secondary="Назад" />
    </PhoneShell>
  );
}

// ── 6. Schedule ──────────────────────────────────────────────────────
function ObSchedule() {
  const days = [
    ['Пн', '10:00', '20:00', true],
    ['Вт', '10:00', '20:00', true],
    ['Ср', '10:00', '20:00', true],
    ['Чт', '12:00', '21:00', true],
    ['Пт', '10:00', '20:00', true],
    ['Сб', '11:00', '18:00', true],
    ['Вс', '—', '—', false],
  ];
  return (
    <PhoneShell width={320} height={660} bg={OB.bg}>
      <ObProgress step={5} />
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4 }}>ШАГ 5 · РАСПИСАНИЕ</div>
        <h2 style={{ margin: '6px 0 4px', fontFamily: obFonts.display, fontSize: 26, fontWeight: 500, color: OB.ink, letterSpacing: -0.5 }}>Когда работаете?</h2>
        <p style={{ margin: 0, fontSize: 12.5, color: OB.mute, lineHeight: 1.5 }}>Бот не предложит запись вне этих часов.</p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px 12px' }}>
        {days.map(([d, from, to, on], i) => (
          <div key={i} style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 5,
            background: on ? OB.card : 'transparent',
            border: `1px solid ${OB.divider}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 30, fontSize: 13, fontWeight: 600, color: on ? OB.ink : OB.mute, fontFamily: obFonts.mono }}>{d}</div>
            <div style={{ flex: 1, fontSize: 13, color: on ? OB.ink : OB.mute, fontFamily: obFonts.mono }}>
              {on ? `${from} — ${to}` : 'выходной'}
            </div>
            <div style={{ width: 32, height: 20, borderRadius: 10, background: on ? OB.success : OB.divider, position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, [on ? 'right' : 'left']: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
            </div>
          </div>
        ))}

        <div style={{ marginTop: 14, background: OB.accentSoft, padding: 12, borderRadius: 10, fontSize: 12, color: OB.accentDark, lineHeight: 1.5 }}>
          <b>Перерыв на обед?</b> Можно настроить в Календаре после.
        </div>
      </div>
      <ObFooter primary="Сохранить →" secondary="Назад" />
    </PhoneShell>
  );
}

// ── 7. Done ──────────────────────────────────────────────────────────
function ObDone() {
  return (
    <PhoneShell width={320} height={660} bg={OB.bg}>
      <ObProgress step={6} total={6} />
      <div style={{ flex: 1, padding: '40px 28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        {/* big mark */}
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: OB.success, color: '#fff',
          display: 'grid', placeItems: 'center',
          fontSize: 32, fontWeight: 600,
          boxShadow: `0 8px 20px rgba(58,139,58,0.25)`,
        }}>✓</div>

        <div style={{ marginTop: 28, fontSize: 11, fontFamily: obFonts.mono, color: OB.success, letterSpacing: 0.4 }}>ГОТОВО · 4 МИН 12 СЕК</div>
        <h2 style={{ margin: '8px 0 0', fontFamily: obFonts.display, fontSize: 36, fontWeight: 500, color: OB.ink, letterSpacing: -0.8, lineHeight: 1.1 }}>Бот начал<br/><i>работать</i></h2>

        <div style={{ marginTop: 20, width: '100%', background: OB.card, border: `1px solid ${OB.divider}`, borderRadius: 14, overflow: 'hidden' }}>
          {[
            ['Telegram', 'бизнес-бот подключён к вашему профилю'],
            ['Воронки', '2 активны: запись · напоминание'],
            ['Услуги', '4 в каталоге'],
            ['Расписание', 'Пн–Сб, выходной — Вс'],
          ].map(([k, v], i) => (
            <div key={i} style={{
              padding: '11px 14px',
              borderTop: i === 0 ? 'none' : `1px solid ${OB.divider}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: OB.success, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, flexShrink: 0 }}>✓</div>
              <div style={{ fontSize: 12, color: OB.mute, fontFamily: obFonts.mono, width: 80, flexShrink: 0 }}>{k}</div>
              <div style={{ fontSize: 12.5, color: OB.ink, flex: 1 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, padding: 14, background: OB.accentSoft, borderRadius: 12, width: '100%' }}>
          <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.accentDark, fontWeight: 600, marginBottom: 4 }}>ЧТО ДАЛЬШЕ →</div>
          <div style={{ fontSize: 12.5, color: OB.accentDark, lineHeight: 1.5 }}>
Клиентки пишут вам как обычно — в ваш личный Telegram. Бот отвечает за вас и передаёт вам сложные вопросы.
          </div>
        </div>

        <div style={{ flex: 1 }} />
      </div>
      <ObFooter primary="Открыть приложение →" secondary="Написать себе — проверить бота" />
    </PhoneShell>
  );
}

// ── Onboarding prototype ─────────────────────────────────────────────

function OnboardingFlow() {
  const [step, setStep] = React.useState(0);
  const screens = [<ObWelcome />, <ObNiche />, <ObConnect />, <ObFunnels />, <ObServices />, <ObSchedule />, <ObDone />];
  const labels = ['1·Старт', '2·Ниша', '3·Telegram', '4·Воронки', '5·Услуги', '6·Расписание', '7·Готово'];
  return (
    <div style={{ width: '100%', height: '100%', background: '#ece7e2', padding: 24, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', fontFamily: obFonts.body }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 160 }}>
        <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.mute, letterSpacing: 0.4, marginBottom: 4 }}>ШАГИ →</div>
        {labels.map((l, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            background: step === i ? OB.ink : '#fff',
            color: step === i ? '#fff' : OB.ink,
            border: `1px solid ${step === i ? OB.ink : OB.divider}`,
            padding: '9px 12px', borderRadius: 10,
            fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit',
            cursor: 'pointer', textAlign: 'left',
          }}>{l}</button>
        ))}
      </div>
      <div>{screens[step]}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ── ГЛАВНЫЙ ЭКРАН ПРИЛОЖЕНИЯ (DASHBOARD) ────────────────────────────
// ════════════════════════════════════════════════════════════════════

function DashStat({ label, value, sub, accent }) {
  return (
    <div style={{ flex: 1, padding: '12px 14px', background: OB.card, border: `1px solid ${OB.divider}`, borderRadius: 12 }}>
      <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.mute, letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontFamily: obFonts.display, fontSize: 28, fontWeight: 500, color: accent || OB.ink, letterSpacing: -0.6, lineHeight: 1.1, marginTop: 3 }}>{value}</div>
      <div style={{ fontSize: 11, color: OB.mute, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function DashHome() {
  return (
    <PhoneShell width={320} height={660} bg={OB.bg}>
      {/* header */}
      <div style={{ padding: '16px 22px 14px', borderBottom: `1px solid ${OB.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: OB.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, fontFamily: obFonts.display, fontStyle: 'italic', fontWeight: 600 }}>А</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.mute }}>среда · 13 ноября</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: OB.ink, letterSpacing: -0.3 }}>Доброе утро, Аня</div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: OB.card, border: `1px solid ${OB.divider}`, display: 'grid', placeItems: 'center', fontSize: 14, color: OB.ink }}>⚙</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* today summary */}
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4, marginBottom: 8 }}>СЕГОДНЯ</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <DashStat label="ЗАПИСЕЙ" value="4" sub="следующая в 14:00" />
            <DashStat label="ДОХОД" value="11.2" sub="тыс. ₽ ожидаемо" />
            <DashStat label="БОТ" value="7" sub="диалогов вёл" accent={OB.accent} />
          </div>
        </div>

        {/* needs attention */}
        <div style={{ padding: '20px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4 }}>ТРЕБУЕТ ВНИМАНИЯ · 3</div>
            <div style={{ fontSize: 11, color: OB.mute, fontFamily: obFonts.mono }}>смотреть всё →</div>
          </div>

          {/* attention card 1 */}
          <div style={{ background: OB.card, border: `1.5px solid ${OB.accent}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.accent, fontWeight: 700, letterSpacing: 0.3 }}>● БОТ ЖДЁТ ВАС</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: OB.ink, marginTop: 4, lineHeight: 1.35 }}>Кристина спрашивает про дизайн</div>
                <div style={{ fontSize: 12, color: OB.inkSoft, marginTop: 4, lineHeight: 1.45, fontStyle: 'italic' }}>«А можно как у вас на 5-м фото в инсте?»</div>
              </div>
              <div style={{ fontSize: 10, color: OB.mute, fontFamily: obFonts.mono, flexShrink: 0 }}>5 мин</div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button style={{ flex: 1, background: OB.ink, color: '#fff', border: 'none', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Открыть чат</button>
              <button style={{ background: 'transparent', color: OB.mute, border: `1px solid ${OB.divider}`, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>Бот сам</button>
            </div>
          </div>

          {/* attention card 2 */}
          <div style={{ background: OB.card, border: `1px solid ${OB.divider}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.warn, fontWeight: 700, letterSpacing: 0.3 }}>● ПЕРЕНОС</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: OB.ink, marginTop: 4 }}>Марина → 16:00 на завтра</div>
                <div style={{ fontSize: 11.5, color: OB.mute, marginTop: 3 }}>Бот предложил 3 слота, она выбрала</div>
              </div>
              <div style={{ fontSize: 10, color: OB.mute, fontFamily: obFonts.mono, flexShrink: 0 }}>1 ч</div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button style={{ flex: 1, background: OB.success, color: '#fff', border: 'none', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Подтвердить</button>
              <button style={{ background: 'transparent', color: OB.inkSoft, border: `1px solid ${OB.divider}`, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>Отклонить</button>
            </div>
          </div>

          {/* attention card 3 — soft */}
          <div style={{ background: 'transparent', border: `1px dashed ${OB.divider}`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.mute, fontWeight: 600, letterSpacing: 0.3 }}>● ИДЕЯ</div>
            <div style={{ fontSize: 13, color: OB.ink, marginTop: 3, lineHeight: 1.4 }}>Лена не записывалась 6 недель. Включить «возврат»?</div>
          </div>
        </div>

        {/* upcoming */}
        <div style={{ padding: '24px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4 }}>БЛИЖАЙШИЕ ВИЗИТЫ</div>
            <div style={{ fontSize: 11, color: OB.mute, fontFamily: obFonts.mono }}>в календарь →</div>
          </div>
          {[
            ['14:00', 'Полина К.', 'Маникюр + дизайн', 'через 2 часа'],
            ['16:30', 'Анастасия Р.', 'Френч', '4:30'],
            ['18:30', 'Софья М.', 'Маникюр', '6:30'],
          ].map(([t, name, srv, eta], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? `1px solid ${OB.divider}` : 'none' }}>
              <div style={{ fontFamily: obFonts.mono, fontSize: 14, fontWeight: 600, color: OB.ink, width: 48 }}>{t}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: OB.ink }}>{name}</div>
                <div style={{ fontSize: 11, color: OB.mute, marginTop: 1 }}>{srv}</div>
              </div>
              <div style={{ fontSize: 10, color: OB.mute, fontFamily: obFonts.mono, flexShrink: 0 }}>{eta}</div>
            </div>
          ))}
        </div>

        {/* week summary */}
        <div style={{ padding: '24px 22px 16px' }}>
          <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.accent, letterSpacing: 0.4, marginBottom: 10 }}>НЕДЕЛЯ</div>
          <div style={{ background: OB.card, border: `1px solid ${OB.divider}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height: 60, marginBottom: 10 }}>
              {[40, 65, 50, 78, 90, 30, 0].map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: `${h}%`, background: i === 4 ? OB.accent : OB.divider, borderRadius: 3, minHeight: 2 }} />
                  <div style={{ fontSize: 9, fontFamily: obFonts.mono, color: i === 4 ? OB.accent : OB.mute }}>{['пн','вт','ср','чт','пт','сб','вс'][i]}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: OB.inkSoft, paddingTop: 10, borderTop: `1px solid ${OB.divider}` }}>
              <div>Записей: <b style={{ color: OB.ink }}>23</b></div>
              <div>Доход: <b style={{ color: OB.ink }}>52 400 ₽</b></div>
              <div>Возвраты: <b style={{ color: OB.success }}>4</b></div>
            </div>
          </div>
        </div>
      </div>

      {/* tabbar */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0 14px', borderTop: `1px solid ${OB.divider}`, background: OB.card, fontFamily: obFonts.mono, fontSize: 10 }}>
        {[['home', true], ['cal', false], ['bot', false], ['cli', false], ['cfg', false]].map(([l, on]) => (
          <div key={l} style={{ color: on ? OB.accent : OB.mute, fontWeight: on ? 700 : 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: on ? OB.accent : 'transparent' }} />
            {l}
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

// ── Dashboard variant: minimal (без статистики) ──────────────────────
function DashMinimal() {
  return (
    <PhoneShell width={320} height={660} bg={OB.bg}>
      <div style={{ padding: '20px 22px 18px' }}>
        <div style={{ fontSize: 11, fontFamily: obFonts.mono, color: OB.mute }}>среда · 13 ноября</div>
        <h1 style={{ margin: '4px 0 0', fontFamily: obFonts.display, fontSize: 32, fontWeight: 500, color: OB.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>4 визита<br/><i style={{ color: OB.accent }}>сегодня</i></h1>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 22px' }}>
        {/* Hero card — ближайший визит */}
        <div style={{ background: OB.ink, color: '#fff', borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: OB.accent, opacity: 0.4 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.4 }}>ЧЕРЕЗ 2 ЧАСА</div>
            <div style={{ fontFamily: obFonts.display, fontSize: 36, fontWeight: 500, marginTop: 6, letterSpacing: -0.8 }}>14:00</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>Полина К.</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>Маникюр + дизайн · 2 ч</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
              <button style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>Карточка</button>
              <button style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>В чат</button>
            </div>
          </div>
        </div>

        {/* attention */}
        <div style={{ marginTop: 18, padding: 14, background: OB.accentSoft, borderRadius: 12, border: `1px solid ${OB.accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.accentDark, fontWeight: 700, letterSpacing: 0.3 }}>● БОТ ЖДЁТ · 1</div>
            <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.mute }}>5 мин</div>
          </div>
          <div style={{ fontSize: 13, color: OB.ink, fontWeight: 600 }}>Кристина спрашивает про дизайн</div>
          <div style={{ fontSize: 12, color: OB.inkSoft, marginTop: 2, fontStyle: 'italic' }}>«А можно как у вас на 5-м фото?»</div>
        </div>

        {/* day list */}
        <div style={{ marginTop: 22, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontFamily: obFonts.mono, color: OB.mute, letterSpacing: 0.4, marginBottom: 10 }}>ДАЛЬШЕ СЕГОДНЯ</div>
          {[
            ['16:30', 'Анастасия Р.', 'Френч'],
            ['18:30', 'Софья М.', 'Маникюр'],
            ['20:00', 'Виктория Д.', 'Снятие + покрытие'],
          ].map(([t, name, srv], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < 2 ? `1px solid ${OB.divider}` : 'none' }}>
              <div style={{ fontFamily: obFonts.mono, fontSize: 15, fontWeight: 600, color: OB.ink, width: 50 }}>{t}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: OB.ink }}>{name}</div>
                <div style={{ fontSize: 11, color: OB.mute, marginTop: 1 }}>{srv}</div>
              </div>
              <div style={{ fontSize: 16, color: OB.mute }}>›</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0 14px', borderTop: `1px solid ${OB.divider}`, background: OB.card, fontFamily: obFonts.mono, fontSize: 10 }}>
        {[['home', true], ['cal', false], ['bot', false], ['cli', false], ['cfg', false]].map(([l, on]) => (
          <div key={l} style={{ color: on ? OB.accent : OB.mute, fontWeight: on ? 700 : 400 }}>{l}</div>
        ))}
      </div>
    </PhoneShell>
  );
}

Object.assign(window, {
  OnboardingFlow, ObWelcome, ObNiche, ObConnect, ObFunnels, ObServices, ObSchedule, ObDone,
  DashHome, DashMinimal,
});
