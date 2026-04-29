// Настройки бота + Портфолио — D · Коралл + сетка
const ST = HYB;
const stFonts = { body: '"Manrope", sans-serif', mono: '"JetBrains Mono", monospace' };

function StHeader({ title, sub, back, right }) {
  return (
    <div style={{ padding: '14px 22px 12px', borderBottom: `1px solid ${ST.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      {back && <div style={{ fontSize: 18, color: ST.ink, cursor: 'pointer' }}>←</div>}
      <div style={{ flex: 1 }}>
        {sub && <div style={{ fontSize: 11, fontFamily: stFonts.mono, color: ST.accent, letterSpacing: 0.4 }}>{sub}</div>}
        <div style={{ fontSize: 17, fontWeight: 700, color: ST.ink, letterSpacing: -0.3 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function StTabBar({ active = 'cfg' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0 14px', borderTop: `1px solid ${ST.divider}`, background: ST.card, fontFamily: stFonts.mono, fontSize: 11 }}>
      {['home', 'cal', 'bot', 'cli', 'cfg'].map(l => (
        <div key={l} style={{ color: l === active ? ST.accent : ST.mute, fontWeight: l === active ? 700 : 400 }}>{l}</div>
      ))}
    </div>
  );
}

// ── 1. Главный экран настроек ────────────────────────────────────────

function SettingsHome() {
  const sections = [
    { ic: 'A', name: 'Голос бота', sub: 'дружеский · на «вы»', tag: null },
    { ic: 'B', name: 'Приветствие', sub: '«Здравствуйте! Я Аня, мастер маникюра…»', tag: null },
    { ic: 'C', name: 'О мастере', sub: 'адрес, как добраться, оплата', tag: 'заполнено 4/6' },
    { ic: 'D', name: 'Правила переноса', sub: 'за 24ч — без штрафа', tag: null },
    { ic: 'E', name: 'Портфолио', sub: '12 работ · 3 категории', tag: null },
    { ic: 'F', name: 'Уведомления', sub: 'за 24ч и 2ч до визита', tag: null },
  ];
  return (
    <PhoneShell width={320} height={660} bg={ST.bg}>
      <StHeader sub="НАСТРОЙКИ БОТА" title="Настройки" />

      {/* status */}
      <div style={{ padding: '14px 22px', borderBottom: `1px solid ${ST.divider}`, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: ST.success, boxShadow: '0 0 0 4px rgba(58,139,58,0.15)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: ST.ink }}>Бот включён и отвечает</div>
          <div style={{ fontSize: 11, fontFamily: stFonts.mono, color: ST.mute }}>подключён к @anya_master · 14 дн.</div>
        </div>
        <div style={{ width: 36, height: 22, borderRadius: 11, background: ST.success, position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {sections.map((s, i) => (
          <div key={i} style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${ST.divider}`, cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: ST.card, border: `1px solid ${ST.divider}`, color: ST.accent, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, fontFamily: stFonts.mono }}>{s.ic}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: ST.ink }}>{s.name}</div>
              <div style={{ fontSize: 11.5, color: ST.mute, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</div>
            </div>
            {s.tag && <div style={{ fontSize: 10, fontFamily: stFonts.mono, color: ST.accentDark, background: ST.accentSoft, padding: '3px 7px', borderRadius: 4, fontWeight: 600 }}>{s.tag}</div>}
            <div style={{ fontSize: 14, color: ST.mute }}>›</div>
          </div>
        ))}

        {/* danger zone */}
        <div style={{ padding: '20px 22px 12px' }}>
          <div style={{ fontSize: 10, fontFamily: stFonts.mono, color: ST.mute, letterSpacing: 0.4, marginBottom: 8 }}>ОПАСНАЯ ЗОНА</div>
          <button style={{ width: '100%', background: 'transparent', border: `1px solid ${ST.accent}`, color: ST.accentDark, padding: '12px', borderRadius: 12, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ST.accent }} />
            Выключить бота
          </button>
          <div style={{ fontSize: 11, color: ST.mute, lineHeight: 1.5, marginTop: 6, textAlign: 'center' }}>Бот замолчит. Вы продолжаете отвечать сами.</div>
        </div>
      </div>

      <StTabBar />
    </PhoneShell>
  );
}

// ── 2. Tone of voice ─────────────────────────────────────────────────

function ToneSetting() {
  const [tone, setTone] = React.useState(1);
  const tones = [
    { name: 'Формальный', sub: 'на «вы», без эмодзи', sample: 'Здравствуйте, Марина. Подскажите, пожалуйста, удобное время для записи на маникюр.' },
    { name: 'Дружеский', sub: 'на «вы» с теплотой и редким эмодзи', sample: 'Здравствуйте, Марина! 🤍 Подскажите, на какое время удобнее записаться?' },
    { name: 'На «ты»', sub: 'как с подругой', sample: 'Маринкаа, привет! 🌷 Какое время удобно для маникюра?' },
  ];
  return (
    <PhoneShell width={320} height={660} bg={ST.bg}>
      <StHeader sub="НАСТРОЙКИ · ГОЛОС" title="Голос бота" back />

      <div style={{ flex: 1, padding: '16px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: ST.inkSoft, lineHeight: 1.5 }}>
          Как бот общается с клиентками. Можно поменять в любой момент.
        </p>

        {tones.map((t, i) => {
          const on = tone === i;
          return (
            <div key={i} onClick={() => setTone(i)} style={{
              background: on ? ST.accentSoft : ST.card,
              border: `1.5px solid ${on ? ST.accent : ST.divider}`,
              borderRadius: 12, padding: 14, cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${on ? ST.accent : ST.divider}`, display: 'grid', placeItems: 'center' }}>
                  {on && <div style={{ width: 10, height: 10, borderRadius: '50%', background: ST.accent }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: ST.ink }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: ST.mute, marginTop: 1 }}>{t.sub}</div>
                </div>
              </div>
              <div style={{ background: on ? ST.card : ST.bg, borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: ST.ink, lineHeight: 1.5, fontStyle: 'italic', borderLeft: `3px solid ${on ? ST.accent : ST.divider}` }}>
                {t.sample}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '12px 22px 16px', borderTop: `1px solid ${ST.divider}`, background: ST.card }}>
        <button style={{ width: '100%', background: ST.ink, color: '#fff', border: 'none', padding: '13px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Сохранить</button>
      </div>
    </PhoneShell>
  );
}

// ── 3. О мастере / адрес ─────────────────────────────────────────────

function MasterInfo() {
  return (
    <PhoneShell width={320} height={660} bg={ST.bg}>
      <StHeader sub="НАСТРОЙКИ · О МАСТЕРЕ" title="Информация" back right={
        <div style={{ fontSize: 10, fontFamily: stFonts.mono, color: ST.accentDark, background: ST.accentSoft, padding: '3px 7px', borderRadius: 4, fontWeight: 600 }}>4/6</div>
      } />

      <div style={{ flex: 1, padding: '16px 22px 18px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: ST.inkSoft, lineHeight: 1.5 }}>
          Бот использует это в ответах. Чем больше — тем естественнее.
        </p>

        {/* Address */}
        <div>
          <label style={{ fontSize: 10, color: ST.mute, fontFamily: stFonts.mono, display: 'block', marginBottom: 6, letterSpacing: 0.4 }}>АДРЕС</label>
          <div style={{ borderBottom: `1.5px solid ${ST.divider}`, padding: '8px 0', fontSize: 15, fontWeight: 500, color: ST.ink }}>
            ул. Ленина, 24, кв. 17
          </div>
          {/* mini-map */}
          <div style={{ marginTop: 10, height: 100, borderRadius: 10, background: '#e6e2dc', border: `1px solid ${ST.divider}`, position: 'relative', overflow: 'hidden' }}>
            <svg viewBox="0 0 320 100" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              <path d="M0,40 L120,40 L120,80 L320,80" stroke="#c8c2b8" strokeWidth="14" fill="none" />
              <path d="M180,0 L180,60 L260,60 L260,100" stroke="#d8d2c8" strokeWidth="10" fill="none" />
              <path d="M40,0 L40,100" stroke="#d8d2c8" strokeWidth="6" fill="none" />
            </svg>
            <div style={{ position: 'absolute', left: '45%', top: '40%', width: 22, height: 22, borderRadius: '50% 50% 50% 0', background: ST.accent, transform: 'rotate(-45deg)', boxShadow: '0 4px 8px rgba(217,105,98,0.4)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', position: 'absolute', top: 6, left: 6 }} />
            </div>
            <div style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 10, fontFamily: stFonts.mono, color: ST.ink, background: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: 4 }}>открыть в Я.Картах ↗</div>
          </div>
        </div>

        {/* How to get */}
        <div>
          <label style={{ fontSize: 10, color: ST.mute, fontFamily: stFonts.mono, display: 'block', marginBottom: 6, letterSpacing: 0.4 }}>КАК ДОБРАТЬСЯ</label>
          <div style={{ background: ST.card, border: `1px solid ${ST.divider}`, borderRadius: 10, padding: 12, fontSize: 13, color: ST.ink, lineHeight: 1.5 }}>
            «От м. Чкаловская — 7 мин пешком. Подъезд со двора, домофон 17, 4 этаж.»
          </div>
        </div>

        {/* Payment */}
        <div>
          <label style={{ fontSize: 10, color: ST.mute, fontFamily: stFonts.mono, display: 'block', marginBottom: 8, letterSpacing: 0.4 }}>СПОСОБЫ ОПЛАТЫ</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[['Наличные', true], ['Сбербанк перевод', true], ['СБП', true], ['Тинькофф', false], ['Карта', false]].map(([t, on], i) => (
              <span key={i} style={{
                fontSize: 11.5, fontFamily: stFonts.mono,
                background: on ? ST.accent : 'transparent',
                color: on ? '#fff' : ST.inkSoft,
                border: on ? 'none' : `1px solid ${ST.divider}`,
                padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
              }}>{on && '✓ '}{t}</span>
            ))}
          </div>
        </div>

        {/* Working zone */}
        <div>
          <div style={{ fontSize: 10, color: ST.mute, fontFamily: stFonts.mono, marginBottom: 6, letterSpacing: 0.4 }}>ЗОНА ВЫЕЗДА</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <div style={{ width: 36, height: 22, borderRadius: 11, background: ST.divider, position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
            </div>
            <span style={{ fontSize: 13, color: ST.mute }}>Выезд к клиенту — выкл</span>
          </div>
        </div>

        {/* tip */}
        <div style={{ background: ST.accentSoft, borderRadius: 10, padding: 12, fontSize: 12, color: ST.accentDark, lineHeight: 1.5 }}>
          <b>Совет:</b> добавьте фото подъезда — бот сможет прислать клиентке прямо в чат.
        </div>
      </div>

      <div style={{ padding: '12px 22px 16px', borderTop: `1px solid ${ST.divider}` }}>
        <button style={{ width: '100%', background: ST.ink, color: '#fff', border: 'none', padding: '13px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Сохранить</button>
      </div>
    </PhoneShell>
  );
}

// ── 4. Правила переноса / отмены ─────────────────────────────────────

function CancelRules() {
  return (
    <PhoneShell width={320} height={660} bg={ST.bg}>
      <StHeader sub="НАСТРОЙКИ · ПРАВИЛА" title="Перенос и отмена" back />

      <div style={{ flex: 1, padding: '16px 22px 18px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: ST.inkSoft, lineHeight: 1.5 }}>
          Бот объясняет правила клиенткам и применяет их сам.
        </p>

        {/* free reschedule */}
        <div style={{ background: ST.card, border: `1px solid ${ST.divider}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontFamily: stFonts.mono, color: ST.success, fontWeight: 700, marginBottom: 4 }}>● БЕСПЛАТНО</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: ST.ink, marginBottom: 8 }}>Перенос без штрафа</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: ST.mute }}>не позднее чем за</span>
            <div style={{ background: ST.bg, border: `1px solid ${ST.divider}`, borderRadius: 6, padding: '4px 8px', fontFamily: stFonts.mono, fontSize: 14, fontWeight: 600, color: ST.ink }}>24 ч</div>
            <span style={{ fontSize: 12, color: ST.mute }}>до визита</span>
          </div>
        </div>

        {/* late reschedule */}
        <div style={{ background: ST.card, border: `1px solid ${ST.divider}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontFamily: stFonts.mono, color: ST.accentDark, fontWeight: 700, marginBottom: 4 }}>● ШТРАФ</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: ST.ink, marginBottom: 8 }}>Поздний перенос</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: ST.mute }}>менее чем за 24ч —</span>
            <div style={{ background: ST.bg, border: `1px solid ${ST.divider}`, borderRadius: 6, padding: '4px 8px', fontFamily: stFonts.mono, fontSize: 14, fontWeight: 600, color: ST.ink }}>50%</div>
            <span style={{ fontSize: 12, color: ST.mute }}>стоимости</span>
          </div>
          <div style={{ fontSize: 11, color: ST.mute }}>Бот предложит оплатить через СБП до новой записи.</div>
        </div>

        {/* no-show */}
        <div style={{ background: ST.card, border: `1px solid ${ST.divider}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontFamily: stFonts.mono, color: ST.accentDark, fontWeight: 700, marginBottom: 4 }}>● 100%</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: ST.ink, marginBottom: 4 }}>Не пришла</div>
          <div style={{ fontSize: 12, color: ST.inkSoft, lineHeight: 1.5 }}>Полная оплата перед следующей записью.</div>
        </div>

        <div style={{ background: ST.accentSoft, borderRadius: 10, padding: 12, fontSize: 12, color: ST.accentDark, lineHeight: 1.5 }}>
          <b>Бот скажет так:</b> «Перенос за 24ч и раньше — без проблем. Если позже, к сожалению, действует доплата 50%.»
        </div>
      </div>

      <div style={{ padding: '12px 22px 16px', borderTop: `1px solid ${ST.divider}` }}>
        <button style={{ width: '100%', background: ST.ink, color: '#fff', border: 'none', padding: '13px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Сохранить</button>
      </div>
    </PhoneShell>
  );
}

// ── 5. Приветствие ───────────────────────────────────────────────────

function Greeting() {
  return (
    <PhoneShell width={320} height={660} bg={ST.bg}>
      <StHeader sub="НАСТРОЙКИ · ПРИВЕТСТВИЕ" title="Первое сообщение" back />

      <div style={{ flex: 1, padding: '16px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: ST.inkSoft, lineHeight: 1.5 }}>
          Что бот пишет, когда клиентка обращается впервые.
        </p>

        <textarea defaultValue={"Здравствуйте! 🤍 Я Аня, мастер маникюра. Помогу записать вас на удобное время. Напишите, пожалуйста, ваше имя — так общаться приятнее."} style={{ minHeight: 130, padding: 12, borderRadius: 10, border: `1.5px solid ${ST.accent}`, background: ST.card, fontSize: 14, color: ST.ink, lineHeight: 1.5, fontFamily: 'inherit', outline: 'none', resize: 'none' }} />

        {/* variables */}
        <div>
          <div style={{ fontSize: 10, fontFamily: stFonts.mono, color: ST.mute, letterSpacing: 0.4, marginBottom: 6 }}>ПЕРЕМЕННЫЕ — ВСТАВИТЬ В ТЕКСТ</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {['{имя_мастера}', '{ниша}', '{адрес}', '{часы_работы}'].map(t => (
              <span key={t} style={{ fontSize: 11, fontFamily: stFonts.mono, color: ST.accent, background: ST.accentSoft, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* preview */}
        <div>
          <div style={{ fontSize: 10, fontFamily: stFonts.mono, color: ST.mute, letterSpacing: 0.4, marginBottom: 6 }}>КАК УВИДИТ КЛИЕНТКА</div>
          <div style={{ background: ST.card, border: `1px solid ${ST.divider}`, borderRadius: 10, padding: 12 }}>
            <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: '#e8e8e8', color: ST.ink, padding: '8px 12px', borderRadius: '12px 12px 4px 12px', fontSize: 13, marginLeft: 'auto', display: 'block', width: 'fit-content' }}>привет</div>
            <div style={{ marginTop: 8, background: ST.accent, color: '#fff', padding: '8px 12px', borderRadius: '12px 12px 12px 4px', fontSize: 13, lineHeight: 1.45, width: 'fit-content', maxWidth: '85%' }}>
              Здравствуйте! 🤍 Я Аня, мастер маникюра. Помогу записать вас на удобное время. Напишите, пожалуйста, ваше имя — так общаться приятнее.
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 22px 16px', borderTop: `1px solid ${ST.divider}` }}>
        <button style={{ width: '100%', background: ST.ink, color: '#fff', border: 'none', padding: '13px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Сохранить</button>
      </div>
    </PhoneShell>
  );
}

// ── 6. Kill-switch ───────────────────────────────────────────────────

function KillSwitch() {
  return (
    <PhoneShell width={320} height={660} bg={ST.bg}>
      <StHeader sub="БОТ · ВЫКЛЮЧЕНИЕ" title="Выключить бота?" back />
      <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ width: 64, height: 64, borderRadius: 18, background: ST.accentSoft, border: `2px solid ${ST.accent}`, display: 'grid', placeItems: 'center', margin: '8px auto 0' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: ST.accent }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: ST.ink, letterSpacing: -0.4 }}>Бот замолчит</h2>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: ST.inkSoft, lineHeight: 1.5 }}>
            Все диалоги остаются в Telegram. Вы продолжаете отвечать сами. Можно включить обратно в любой момент.
          </p>
        </div>

        <div style={{ background: ST.card, borderRadius: 12, border: `1px solid ${ST.divider}`, overflow: 'hidden' }}>
          {[
            ['ЧТО СОХРАНИТСЯ', 'воронки, услуги, расписание, клиентская база'],
            ['ЧТО СТАНЕТ', 'бот не отвечает на новые сообщения'],
            ['АКТИВНЫЕ ДИАЛОГИ', '3 — клиентки получат: «Спасибо! Мастер ответит лично 🤍»'],
          ].map(([k, v], i) => (
            <div key={i} style={{ padding: 14, borderTop: i === 0 ? 'none' : `1px solid ${ST.divider}` }}>
              <div style={{ fontSize: 10, fontFamily: stFonts.mono, color: ST.mute, letterSpacing: 0.4 }}>{k}</div>
              <div style={{ fontSize: 13, color: ST.ink, marginTop: 3, lineHeight: 1.45 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{ background: ST.accent, color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 600, fontSize: 14.5, fontFamily: 'inherit', cursor: 'pointer' }}>Да, выключить</button>
          <button style={{ background: 'transparent', color: ST.ink, border: `1px solid ${ST.divider}`, padding: '14px', borderRadius: 12, fontWeight: 500, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </PhoneShell>
  );
}

// ── 7. Портфолио — сетка ─────────────────────────────────────────────

const STRIPE_PALETTE = [
  ['#f3d8c7', '#e8b89a'],
  ['#e6c9a8', '#d6a87f'],
  ['#fbe2dd', '#f0c5be'],
  ['#e8d4c5', '#cda88d'],
  ['#e9d8e0', '#d2b6c2'],
  ['#fbe6d6', '#f4c89e'],
  ['#e6d3bd', '#c9a87e'],
  ['#f5e0d4', '#d9b09a'],
  ['#ebd3c2', '#cba588'],
  ['#f0d8c8', '#d4ad8e'],
  ['#fbe9e0', '#eec8b8'],
  ['#e1c8b3', '#b58e6e'],
];

function PortfolioPlaceholder({ idx, label }) {
  const [a, b] = STRIPE_PALETTE[idx % STRIPE_PALETTE.length];
  return (
    <div style={{
      width: '100%', aspectRatio: '1 / 1', borderRadius: 8,
      background: `repeating-linear-gradient(135deg, ${a} 0 8px, ${b} 8px 14px)`,
      position: 'relative', overflow: 'hidden',
      border: `1px solid rgba(0,0,0,0.05)`,
    }}>
      <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 9, fontFamily: stFonts.mono, color: 'rgba(0,0,0,0.5)' }}>{label}</div>
    </div>
  );
}

function Portfolio() {
  const [cat, setCat] = React.useState('all');
  const cats = [
    ['all', 'все · 12'],
    ['nude', 'нюд · 5'],
    ['french', 'френч · 4'],
    ['design', 'дизайн · 3'],
  ];
  const works = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    cat: ['nude', 'french', 'design', 'nude', 'nude', 'french', 'design', 'french', 'nude', 'french', 'nude', 'design'][i],
    likes: [12, 8, 24, 6, 3, 18, 9, 14, 22, 7, 5, 11][i],
  }));
  const filtered = cat === 'all' ? works : works.filter(w => w.cat === cat);

  return (
    <PhoneShell width={320} height={660} bg={ST.bg}>
      <StHeader sub="РАБОТЫ · 12" title="Портфолио" back right={
        <div style={{ width: 32, height: 32, borderRadius: 8, background: ST.ink, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>+</div>
      } />

      {/* categories */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 22px', overflowX: 'auto', borderBottom: `1px solid ${ST.divider}` }}>
        {cats.map(([id, l]) => {
          const on = cat === id;
          return (
            <div key={id} onClick={() => setCat(id)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontFamily: stFonts.mono, fontWeight: 500,
              background: on ? ST.ink : 'transparent',
              color: on ? '#fff' : ST.inkSoft,
              border: on ? 'none' : `1px solid ${ST.divider}`,
              whiteSpace: 'nowrap', cursor: 'pointer',
            }}>{l}</div>
          );
        })}
      </div>

      {/* grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {filtered.map(w => (
            <div key={w.id} style={{ position: 'relative' }}>
              <PortfolioPlaceholder idx={w.id} label={`#${String(w.id + 1).padStart(2, '0')}`} />
              <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, fontFamily: stFonts.mono, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '1px 5px', borderRadius: 3 }}>
                ♡ {w.likes}
              </div>
            </div>
          ))}
          <div style={{ aspectRatio: '1 / 1', border: `1.5px dashed ${ST.divider}`, borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer', color: ST.mute, fontSize: 22 }}>+</div>
        </div>
      </div>

      <div style={{ padding: '10px 22px', borderTop: `1px solid ${ST.divider}`, fontSize: 12, color: ST.mute, fontFamily: stFonts.mono, lineHeight: 1.5, background: ST.accentSoft, color: ST.accentDark }}>
        Бот покажет работы клиентке: <span style={{ fontWeight: 600 }}>«Хотите посмотреть примеры?»</span>
      </div>
      <StTabBar />
    </PhoneShell>
  );
}

// ── 8. Загрузка работы ───────────────────────────────────────────────

function PortfolioUpload() {
  const [cat, setCat] = React.useState('nude');
  return (
    <PhoneShell width={320} height={660} bg={ST.bg}>
      <StHeader sub="ПОРТФОЛИО · ДОБАВИТЬ" title="Новая работа" back />

      <div style={{ flex: 1, padding: '16px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* big preview */}
        <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 14, background: `repeating-linear-gradient(135deg, #fbe2dd 0 12px, #f0c5be 12px 22px)`, position: 'relative', overflow: 'hidden', border: `1px solid ${ST.divider}` }}>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, fontFamily: stFonts.mono, color: 'rgba(0,0,0,0.45)', textAlign: 'center', lineHeight: 1.5 }}>
              [ ФОТО РАБОТЫ ]<br/>1080 × 1080
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, display: 'flex', gap: 6 }}>
            <button style={{ flex: 1, background: 'rgba(255,255,255,0.92)', border: 'none', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: ST.ink, cursor: 'pointer', fontFamily: 'inherit' }}>Заменить</button>
            <button style={{ background: 'rgba(255,255,255,0.92)', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: ST.accentDark, cursor: 'pointer', fontFamily: 'inherit' }}>Кадрировать</button>
          </div>
        </div>

        {/* category */}
        <div>
          <label style={{ fontSize: 10, color: ST.mute, fontFamily: stFonts.mono, display: 'block', marginBottom: 8, letterSpacing: 0.4 }}>КАТЕГОРИЯ</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[['nude', 'Нюд'], ['french', 'Френч'], ['design', 'Дизайн'], ['other', 'Другое'], ['__new', '+ создать']].map(([id, l]) => {
              const on = cat === id;
              const isNew = id === '__new';
              return (
                <div key={id} onClick={() => !isNew && setCat(id)} style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: on ? ST.accent : 'transparent',
                  color: on ? '#fff' : (isNew ? ST.mute : ST.inkSoft),
                  border: on ? 'none' : `1px ${isNew ? 'dashed' : 'solid'} ${ST.divider}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>{l}</div>
              );
            })}
          </div>
        </div>

        {/* description */}
        <div>
          <label style={{ fontSize: 10, color: ST.mute, fontFamily: stFonts.mono, display: 'block', marginBottom: 6, letterSpacing: 0.4 }}>ОПИСАНИЕ (опц.)</label>
          <input defaultValue="Камифубуки + матовый топ" style={{ width: '100%', border: 'none', borderBottom: `1.5px solid ${ST.divider}`, background: 'transparent', padding: '8px 0', fontSize: 15, fontWeight: 500, color: ST.ink, outline: 'none', fontFamily: 'inherit' }} />
        </div>

        {/* tags */}
        <div>
          <label style={{ fontSize: 10, color: ST.mute, fontFamily: stFonts.mono, display: 'block', marginBottom: 8, letterSpacing: 0.4 }}>ТЕГИ</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {[['розовый', true], ['матовый', true], ['короткие', true], ['с дизайном', false], ['свадебный', false]].map(([t, on], i) => (
              <span key={i} style={{
                fontSize: 11, fontFamily: stFonts.mono,
                background: on ? ST.accentSoft : 'transparent',
                color: on ? ST.accentDark : ST.mute,
                border: on ? 'none' : `1px solid ${ST.divider}`,
                padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
              }}>{on && '✓ '}#{t}</span>
            ))}
          </div>
        </div>

        {/* show in bot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: ST.card, border: `1px solid ${ST.divider}`, borderRadius: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: ST.ink }}>Показывать в чате с ботом</div>
            <div style={{ fontSize: 11, color: ST.mute, marginTop: 1 }}>Бот пришлёт клиентке для выбора</div>
          </div>
          <div style={{ width: 36, height: 22, borderRadius: 11, background: ST.success, position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 22px 16px', borderTop: `1px solid ${ST.divider}` }}>
        <button style={{ width: '100%', background: ST.ink, color: '#fff', border: 'none', padding: '13px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Сохранить работу</button>
      </div>
    </PhoneShell>
  );
}

// ── Prototype ─────────────────────────────────────────────────────────

function SettingsPrototype() {
  const [view, setView] = React.useState('home');
  const screens = {
    home: <SettingsHome />,
    tone: <ToneSetting />,
    info: <MasterInfo />,
    rules: <CancelRules />,
    greet: <Greeting />,
    kill: <KillSwitch />,
    folio: <Portfolio />,
    upload: <PortfolioUpload />,
  };
  const labels = [
    ['home', '1 · Главный'],
    ['tone', '2 · Голос бота'],
    ['info', '3 · О мастере / адрес'],
    ['rules', '4 · Перенос/отмена'],
    ['greet', '5 · Приветствие'],
    ['kill', '6 · Выключить бота'],
    ['folio', '7 · Портфолио'],
    ['upload', '8 · Загрузить работу'],
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#ece7e2', padding: 24, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', fontFamily: stFonts.body }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
        <div style={{ fontSize: 11, fontFamily: stFonts.mono, color: ST.mute, letterSpacing: 0.4, marginBottom: 4 }}>КЛИКНИТЕ →</div>
        {labels.map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} style={{
            background: view === id ? ST.ink : '#fff',
            color: view === id ? '#fff' : ST.ink,
            border: `1px solid ${view === id ? ST.ink : ST.divider}`,
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

Object.assign(window, { SettingsHome, ToneSetting, MasterInfo, CancelRules, Greeting, KillSwitch, Portfolio, PortfolioUpload, SettingsPrototype });
