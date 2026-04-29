// Календарь записей — D · Коралл + сетка
const CAL = HYB;
const calFonts = { body: '"Manrope", sans-serif', mono: '"JetBrains Mono", monospace' };

// shared header with view switcher
function CalHeader({ view, onView, dateLabel = 'СБ · 29 АПР' }) {
  return (
    <>
      <div style={{ padding: '14px 22px 10px', borderBottom: `1px solid ${CAL.divider}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: calFonts.mono, color: CAL.accent, letterSpacing: 0.4 }}>{dateLabel}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: CAL.ink, letterSpacing: -0.5 }}>Календарь</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: CAL.ink, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>+</div>
      </div>
      <div style={{ display: 'flex', padding: '8px 22px', borderBottom: `1px solid ${CAL.divider}`, gap: 6, fontFamily: calFonts.mono, fontSize: 11 }}>
        {['день', 'неделя', 'месяц'].map(v => (
          <div key={v} onClick={() => onView && onView(v)} style={{
            padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            background: v === view ? CAL.ink : 'transparent',
            color: v === view ? '#fff' : CAL.mute,
            border: v === view ? 'none' : `1px solid ${CAL.divider}`,
          }}>{v}</div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', color: CAL.mute }}>
          <span style={{ cursor: 'pointer' }}>‹</span>
          <span style={{ color: CAL.ink, fontWeight: 600, padding: '0 8px' }}>сегодня</span>
          <span style={{ cursor: 'pointer' }}>›</span>
        </div>
      </div>
    </>
  );
}

function CalTabBar() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0 14px', borderTop: `1px solid ${CAL.divider}`, background: CAL.card, fontFamily: calFonts.mono, fontSize: 11 }}>
      {[['home', 0], ['cal', 1], ['bot', 0], ['cli', 0], ['cfg', 0]].map(([l, on], k) => (
        <div key={k} style={{ color: on ? CAL.accent : CAL.mute, fontWeight: on ? 700 : 400 }}>{l}</div>
      ))}
    </div>
  );
}

// ── 1. День ──────────────────────────────────────────────────────────

const DAY_BOOKINGS = [
  { start: 10, end: 11.5, name: 'Марина К.', service: 'Маникюр + покрытие', status: 'confirmed', source: 'BOT' },
  { start: 13, end: 14, name: 'Алина Р.',  service: 'Снятие гель-лака', status: 'confirmed', source: 'BOT' },
  { start: 16, end: 18, name: 'Юлия В.',  service: 'Маникюр + педикюр', status: 'pending', source: 'MANUAL' },
];
const NOW_HOUR = 11.2;

function CalDay() {
  const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const HOUR_PX = 50;
  const startHour = 10;
  return (
    <PhoneShell width={320} height={660} bg={CAL.bg}>
      <CalHeader view="день" />
      {/* day summary */}
      <div style={{ padding: '10px 22px', display: 'flex', gap: 18, fontSize: 11, fontFamily: calFonts.mono, color: CAL.mute, borderBottom: `1px solid ${CAL.divider}` }}>
        <div><span style={{ color: CAL.ink, fontWeight: 700, fontSize: 13 }}>3</span> записи</div>
        <div><span style={{ color: CAL.ink, fontWeight: 700, fontSize: 13 }}>4.5ч</span> работы</div>
        <div><span style={{ color: CAL.success, fontWeight: 700, fontSize: 13 }}>6.2к ₽</span></div>
      </div>
      {/* timeline */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative', padding: '8px 0 16px' }}>
        <div style={{ position: 'relative', marginLeft: 50, marginRight: 18 }}>
          {/* hour rows */}
          {hours.map((h, i) => (
            <div key={h} style={{ position: 'relative', height: HOUR_PX, borderTop: i === 0 ? 'none' : `1px solid ${CAL.divider}` }}>
              <div style={{ position: 'absolute', left: -42, top: -6, fontSize: 10, fontFamily: calFonts.mono, color: CAL.mute }}>
                {String(h).padStart(2, '0')}:00
              </div>
            </div>
          ))}
          {/* now line */}
          <div style={{ position: 'absolute', left: -50, right: -18, top: (NOW_HOUR - startHour) * HOUR_PX, height: 0, borderTop: `1.5px dashed ${CAL.accent}`, zIndex: 5 }}>
            <div style={{ position: 'absolute', left: 0, top: -5, fontSize: 9, fontFamily: calFonts.mono, fontWeight: 700, color: CAL.accent, background: CAL.bg, padding: '0 4px' }}>СЕЙЧАС</div>
          </div>
          {/* bookings */}
          {DAY_BOOKINGS.map((b, i) => {
            const top = (b.start - startHour) * HOUR_PX + 1;
            const height = (b.end - b.start) * HOUR_PX - 4;
            const pending = b.status === 'pending';
            return (
              <div key={i} style={{
                position: 'absolute', left: 4, right: 4, top, height,
                background: pending ? '#fff' : CAL.accentSoft,
                border: `1.5px ${pending ? 'dashed' : 'solid'} ${CAL.accent}`,
                borderLeft: `4px solid ${CAL.accent}`,
                borderRadius: 8, padding: '6px 10px',
                display: 'flex', flexDirection: 'column', gap: 2,
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: CAL.ink, letterSpacing: -0.1 }}>{b.name}</div>
                  <div style={{ fontSize: 9, fontFamily: calFonts.mono, color: '#fff', background: b.source === 'BOT' ? CAL.accent : CAL.mute, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>{b.source}</div>
                </div>
                <div style={{ fontSize: 11, color: CAL.inkSoft, lineHeight: 1.3 }}>{b.service}</div>
                <div style={{ fontSize: 10, fontFamily: calFonts.mono, color: CAL.mute }}>
                  {fmt(b.start)} — {fmt(b.end)}
                  {pending && <span style={{ marginLeft: 6, color: CAL.accentDark, fontWeight: 600 }}>· не подтверждена</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <CalTabBar />
    </PhoneShell>
  );
}
function fmt(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ── 2. Неделя ─────────────────────────────────────────────────────────

function CalWeek() {
  const days = [
    { d: 'ПН', n: 24, slots: [{ s: 10, e: 12 }, { s: 14, e: 15 }] },
    { d: 'ВТ', n: 25, slots: [{ s: 11, e: 13 }, { s: 15, e: 16 }, { s: 17, e: 19 }] },
    { d: 'СР', n: 26, slots: [] },
    { d: 'ЧТ', n: 27, slots: [{ s: 10, e: 11.5 }] },
    { d: 'ПТ', n: 28, slots: [{ s: 12, e: 13.5 }, { s: 16, e: 18 }] },
    { d: 'СБ', n: 29, slots: [{ s: 10, e: 11.5 }, { s: 13, e: 14 }, { s: 16, e: 18 }], today: true },
    { d: 'ВС', n: 30, slots: [], off: true },
  ];
  const HOUR_PX = 36;
  const hours = [10, 12, 14, 16, 18, 20];
  return (
    <PhoneShell width={320} height={660} bg={CAL.bg}>
      <CalHeader view="неделя" dateLabel="24–30 АПРЕЛЯ · НЕД 17" />
      {/* day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', borderBottom: `1px solid ${CAL.divider}`, background: CAL.card }}>
        <div />
        {days.map(d => (
          <div key={d.d} style={{ textAlign: 'center', padding: '8px 0', borderLeft: `1px solid ${CAL.divider}` }}>
            <div style={{ fontSize: 9, fontFamily: calFonts.mono, color: d.today ? CAL.accent : CAL.mute, fontWeight: 700 }}>{d.d}</div>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: d.today ? '#fff' : (d.off ? CAL.mute : CAL.ink),
              background: d.today ? CAL.accent : 'transparent',
              width: 22, height: 22, borderRadius: '50%', margin: '2px auto 0',
              display: 'grid', placeItems: 'center',
            }}>{d.n}</div>
          </div>
        ))}
      </div>
      {/* grid */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            {hours.map((h, i) => (
              <div key={h} style={{ height: HOUR_PX * 2, position: 'relative', fontSize: 9, fontFamily: calFonts.mono, color: CAL.mute, paddingTop: 4, textAlign: 'right', paddingRight: 4 }}>
                {h}
              </div>
            ))}
          </div>
          {days.map(d => (
            <div key={d.d} style={{ position: 'relative', borderLeft: `1px solid ${CAL.divider}`, background: d.off ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
              {hours.map((h, i) => (
                <div key={h} style={{ height: HOUR_PX * 2, borderTop: i === 0 ? 'none' : `1px solid ${CAL.divider}` }} />
              ))}
              {d.slots.map((sl, i) => {
                const top = (sl.s - 10) * HOUR_PX;
                const height = (sl.e - sl.s) * HOUR_PX - 1;
                return (
                  <div key={i} style={{
                    position: 'absolute', left: 1, right: 1, top, height,
                    background: d.today ? CAL.accent : CAL.accentSoft,
                    border: d.today ? 'none' : `1px solid ${CAL.accent}`,
                    borderRadius: 3, opacity: 0.95,
                  }} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* summary */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 14px', borderTop: `1px solid ${CAL.divider}`, fontSize: 11, fontFamily: calFonts.mono, color: CAL.mute }}>
        <div><span style={{ color: CAL.ink, fontWeight: 700 }}>11</span> записей</div>
        <div><span style={{ color: CAL.success, fontWeight: 700 }}>22.4к ₽</span></div>
        <div>загр. <span style={{ color: CAL.ink, fontWeight: 700 }}>62%</span></div>
      </div>
      <CalTabBar />
    </PhoneShell>
  );
}

// ── 3. Месяц ──────────────────────────────────────────────────────────

function CalMonth() {
  // 35 cells, april 2026, fri = 1
  const monthData = [
    null, null, // mon, tue
    null, // wed
    1, 2, 3, // thu fri sat
    4, // sun
    5, 6, 7, 8, 9, 10, 11,
    12, 13, 14, 15, 16, 17, 18,
    19, 20, 21, 22, 23, 24, 25,
    26, 27, 28, 29, 30, null, null,
  ];
  const heat = {
    1: 2, 2: 4, 3: 6, 4: 0,
    5: 3, 6: 4, 7: 2, 8: 5, 9: 3, 10: 5, 11: 6,
    12: 0, 13: 3, 14: 4, 15: 2, 16: 4, 17: 5, 18: 6,
    19: 0, 20: 4, 21: 3, 22: 5, 23: 4, 24: 5, 25: 7,
    26: 0, 27: 2, 28: 3, 29: 3, 30: 4,
  };
  const heatColor = n => {
    if (n === undefined) return 'transparent';
    if (n === 0) return 'rgba(0,0,0,0.03)';
    if (n <= 2) return 'rgba(217,105,98,0.18)';
    if (n <= 4) return 'rgba(217,105,98,0.4)';
    if (n <= 5) return 'rgba(217,105,98,0.65)';
    return CAL.accent;
  };
  return (
    <PhoneShell width={320} height={660} bg={CAL.bg}>
      <CalHeader view="месяц" dateLabel="АПРЕЛЬ · 2026" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 16px 0', fontFamily: calFonts.mono, fontSize: 10, color: CAL.mute, gap: 0 }}>
        {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 16px', gap: 4 }}>
        {monthData.map((n, i) => {
          const today = n === 29;
          return (
            <div key={i} style={{
              aspectRatio: '1 / 1', borderRadius: 8,
              background: heatColor(heat[n]),
              display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
              padding: 5, position: 'relative',
              cursor: n ? 'pointer' : 'default',
              outline: today ? `2px solid ${CAL.ink}` : 'none',
              outlineOffset: -2,
            }}>
              {n && (
                <div style={{
                  fontSize: 11, fontWeight: today ? 700 : 500,
                  color: heat[n] >= 5 ? '#fff' : (n ? CAL.ink : CAL.mute),
                  fontFamily: calFonts.mono,
                }}>{n}</div>
              )}
              {heat[n] > 0 && (
                <div style={{
                  position: 'absolute', bottom: 4, right: 4,
                  fontSize: 9, fontFamily: calFonts.mono, fontWeight: 700,
                  color: heat[n] >= 5 ? '#fff' : CAL.accentDark,
                }}>{heat[n]}</div>
              )}
            </div>
          );
        })}
      </div>
      {/* legend */}
      <div style={{ padding: '14px 22px 4px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontFamily: calFonts.mono, color: CAL.mute }}>
        <span>загрузка</span>
        {[0, 2, 4, 5, 7].map(n => (
          <div key={n} style={{ width: 14, height: 14, borderRadius: 3, background: heatColor(n) }} />
        ))}
        <span>+</span>
      </div>
      {/* selected day stub */}
      <div style={{ flex: 1, padding: '10px 22px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
        <div style={{ fontSize: 11, fontFamily: calFonts.mono, color: CAL.mute }}>СБ · 29 АПР · 3 ЗАПИСИ</div>
        {DAY_BOOKINGS.map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 2 ? `1px solid ${CAL.divider}` : 'none', fontSize: 12, alignItems: 'center' }}>
            <span style={{ fontFamily: calFonts.mono, color: CAL.mute, width: 50 }}>{fmt(b.start)}</span>
            <span style={{ color: CAL.ink, fontWeight: 600, flex: 1 }}>{b.name}</span>
            <span style={{ color: CAL.mute, fontSize: 11 }}>{b.service.split(' ')[0]}</span>
          </div>
        ))}
      </div>
      <CalTabBar />
    </PhoneShell>
  );
}

// ── 4. Карточка записи ───────────────────────────────────────────────

function BookingSheet() {
  return (
    <PhoneShell width={320} height={660} bg={CAL.bg}>
      <div style={{ flex: 1, position: 'relative', background: 'rgba(31,20,22,0.55)' }}>
        {/* peek */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.2, pointerEvents: 'none' }}>
          <CalHeader view="день" />
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 80, background: CAL.card, borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: CAL.divider }} />
          </div>
          {/* header */}
          <div style={{ padding: '6px 22px 14px', borderBottom: `1px solid ${CAL.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: CAL.accentSoft, color: CAL.accentDark, display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 700 }}>МК</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: CAL.ink, letterSpacing: -0.2 }}>Марина К.</div>
              <div style={{ fontSize: 11, fontFamily: calFonts.mono, color: CAL.mute }}>+7 ··· 4471 · 4-й визит</div>
            </div>
            <div style={{ fontSize: 9, fontFamily: calFonts.mono, color: '#fff', background: CAL.accent, padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>BOT</div>
          </div>

          <div style={{ flex: 1, padding: '14px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* time block */}
            <div style={{ background: CAL.bg, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontFamily: calFonts.mono, color: CAL.mute }}>СБ · 29 АПР</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: CAL.ink, letterSpacing: -0.4, marginTop: 2 }}>10:00 — 11:30</div>
                <div style={{ fontSize: 12, color: CAL.inkSoft }}>Маникюр + покрытие · 90 мин</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: CAL.success, fontFamily: calFonts.mono }}>2 500 ₽</div>
                <div style={{ fontSize: 10, color: CAL.mute, fontFamily: calFonts.mono }}>оплата на месте</div>
              </div>
            </div>

            {/* note */}
            <div>
              <div style={{ fontSize: 10, fontFamily: calFonts.mono, color: CAL.mute, letterSpacing: 0.4, marginBottom: 4 }}>ЗАМЕТКА</div>
              <div style={{ fontSize: 13, color: CAL.ink, lineHeight: 1.5 }}>«Аллергия на кобальт. Любит нюд». <span style={{ color: CAL.mute, fontSize: 11 }}>(из карточки)</span></div>
            </div>

            {/* history */}
            <div>
              <div style={{ fontSize: 10, fontFamily: calFonts.mono, color: CAL.mute, letterSpacing: 0.4, marginBottom: 6 }}>ИСТОРИЯ</div>
              <div>
                {[['12.04', 'Маникюр', '2 500'], ['28.03', 'Маникюр', '2 500'], ['10.03', 'Снятие', '500']].map(([d, s, p], i) => (
                  <div key={i} style={{ display: 'flex', padding: '6px 0', fontSize: 12, gap: 12, borderTop: i === 0 ? 'none' : `1px solid ${CAL.divider}` }}>
                    <span style={{ fontFamily: calFonts.mono, color: CAL.mute, width: 48 }}>{d}</span>
                    <span style={{ color: CAL.ink, flex: 1 }}>{s}</span>
                    <span style={{ fontFamily: calFonts.mono, color: CAL.mute }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* actions */}
          <div style={{ padding: '12px 22px 18px', borderTop: `1px solid ${CAL.divider}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button style={{ background: CAL.ink, color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 600, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>Открыть чат</button>
            <button style={{ background: 'transparent', color: CAL.ink, border: `1px solid ${CAL.divider}`, padding: '12px', borderRadius: 12, fontWeight: 500, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>Перенести</button>
            <button style={{ gridColumn: '1 / -1', background: 'transparent', color: CAL.accentDark, border: 'none', padding: '8px', fontWeight: 500, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>Отменить запись</button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ── 5. Перенос ────────────────────────────────────────────────────────

function Reschedule() {
  const days = [
    { d: 'ПН', n: 1, free: 4 },
    { d: 'ВТ', n: 2, free: 2 },
    { d: 'СР', n: 3, free: 6, sel: true },
    { d: 'ЧТ', n: 4, free: 3 },
    { d: 'ПТ', n: 5, free: 1 },
    { d: 'СБ', n: 6, free: 5 },
    { d: 'ВС', n: 7, free: 0 },
  ];
  const slots = [
    { t: '10:00', taken: false },
    { t: '11:30', taken: true },
    { t: '12:00', taken: false, sel: true },
    { t: '14:00', taken: false },
    { t: '15:30', taken: true },
    { t: '17:00', taken: false },
    { t: '18:30', taken: false },
  ];
  return (
    <PhoneShell width={320} height={660} bg={CAL.bg}>
      <div style={{ padding: '14px 22px 10px', borderBottom: `1px solid ${CAL.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 18, color: CAL.ink, cursor: 'pointer' }}>←</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: calFonts.mono, color: CAL.accent, letterSpacing: 0.4 }}>ЗАПИСЬ · ПЕРЕНОС</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: CAL.ink, letterSpacing: -0.3 }}>Марина К. → новый слот</div>
        </div>
      </div>

      {/* current */}
      <div style={{ padding: '10px 22px', borderBottom: `1px solid ${CAL.divider}`, fontSize: 12, color: CAL.mute, fontFamily: calFonts.mono }}>
        было: <span style={{ color: CAL.ink, textDecoration: 'line-through' }}>СБ 29 апр · 10:00</span>
      </div>

      {/* week picker */}
      <div style={{ padding: '14px 16px 8px' }}>
        <div style={{ fontSize: 10, fontFamily: calFonts.mono, color: CAL.mute, letterSpacing: 0.4, marginBottom: 8, paddingLeft: 6 }}>ВЫБЕРИТЕ ДЕНЬ · МАЙ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {days.map((d, i) => (
            <div key={i} style={{
              aspectRatio: '1 / 1.1', borderRadius: 10,
              background: d.sel ? CAL.accent : (d.free === 0 ? 'transparent' : CAL.card),
              border: d.sel ? 'none' : (d.free === 0 ? `1px dashed ${CAL.divider}` : `1px solid ${CAL.divider}`),
              color: d.sel ? '#fff' : (d.free === 0 ? CAL.mute : CAL.ink),
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
              cursor: d.free === 0 ? 'not-allowed' : 'pointer',
            }}>
              <div style={{ fontSize: 9, fontFamily: calFonts.mono, opacity: 0.7 }}>{d.d}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{d.n}</div>
              <div style={{ fontSize: 9, fontFamily: calFonts.mono, opacity: 0.85 }}>{d.free === 0 ? '—' : `${d.free} своб.`}</div>
            </div>
          ))}
        </div>
      </div>

      {/* slot picker */}
      <div style={{ padding: '10px 22px', flex: 1, overflow: 'auto' }}>
        <div style={{ fontSize: 10, fontFamily: calFonts.mono, color: CAL.mute, letterSpacing: 0.4, marginBottom: 8 }}>СВОБОДНОЕ ВРЕМЯ · СР 3 МАЯ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {slots.map((s, i) => (
            <div key={i} style={{
              padding: '10px', borderRadius: 8, textAlign: 'center', fontSize: 13, fontFamily: calFonts.mono, fontWeight: 600,
              background: s.sel ? CAL.accent : (s.taken ? 'transparent' : CAL.card),
              border: s.sel ? 'none' : `1px solid ${s.taken ? CAL.divider : CAL.divider}`,
              color: s.sel ? '#fff' : (s.taken ? CAL.mute : CAL.ink),
              textDecoration: s.taken ? 'line-through' : 'none',
              cursor: s.taken ? 'not-allowed' : 'pointer',
              opacity: s.taken ? 0.5 : 1,
            }}>{s.t}</div>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 22px', borderTop: `1px solid ${CAL.divider}`, background: CAL.accentSoft, fontSize: 12, color: CAL.accentDark, lineHeight: 1.5 }}>
        Бот пришлёт Марине: «Перенесли на ср 3 мая, 12:00. Подтвердить?»
      </div>

      <div style={{ padding: '12px 22px 18px', display: 'flex', gap: 8 }}>
        <button style={{ flex: 1, background: CAL.ink, color: '#fff', border: 'none', padding: '13px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Перенести и уведомить</button>
      </div>
    </PhoneShell>
  );
}

// ── 6. Ручное добавление ──────────────────────────────────────────────

function AddBooking() {
  const [client, setClient] = React.useState('Алина Р.');
  const [service, setService] = React.useState('Маникюр + покрытие');
  return (
    <PhoneShell width={320} height={660} bg={CAL.bg}>
      <div style={{ padding: '14px 22px 10px', borderBottom: `1px solid ${CAL.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 18, color: CAL.ink, cursor: 'pointer' }}>×</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: calFonts.mono, color: CAL.accent, letterSpacing: 0.4 }}>НОВАЯ ЗАПИСЬ</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: CAL.ink, letterSpacing: -0.3 }}>Записать клиентку</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '18px 22px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{ fontSize: 11, color: CAL.mute, fontFamily: calFonts.mono, display: 'block', marginBottom: 6, letterSpacing: 0.4 }}>КЛИЕНТКА</label>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1.5px solid ${CAL.divider}`, padding: '8px 0', gap: 8 }}>
            <input value={client} onChange={e => setClient(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 16, fontWeight: 500, color: CAL.ink, outline: 'none', fontFamily: 'inherit', padding: 0 }} />
            <span style={{ fontSize: 10, fontFamily: calFonts.mono, color: CAL.success, background: '#e7f4e7', padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>✓ из базы</span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, color: CAL.mute, fontFamily: calFonts.mono, display: 'block', marginBottom: 8, letterSpacing: 0.4 }}>УСЛУГА</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {['Маникюр + покрытие', 'Маникюр без', 'Снятие', 'Педикюр'].map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${CAL.divider}`, cursor: 'pointer', fontSize: 13.5, color: CAL.ink }}>
                <span>{s}</span>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${service === s ? CAL.accent : CAL.divider}`, display: 'grid', placeItems: 'center' }}>
                  {service === s && <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAL.accent }} />}
                </div>
                <input type="radio" checked={service === s} onChange={() => setService(s)} style={{ display: 'none' }} />
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: CAL.mute, fontFamily: calFonts.mono, display: 'block', marginBottom: 6, letterSpacing: 0.4 }}>ДАТА</label>
            <div style={{ borderBottom: `1.5px solid ${CAL.divider}`, padding: '8px 0', fontSize: 16, fontWeight: 500, color: CAL.ink }}>сб, 29 апр</div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: CAL.mute, fontFamily: calFonts.mono, display: 'block', marginBottom: 6, letterSpacing: 0.4 }}>НАЧАЛО</label>
            <div style={{ borderBottom: `1.5px solid ${CAL.divider}`, padding: '8px 0', fontSize: 16, fontWeight: 500, color: CAL.ink }}>13:00</div>
          </div>
        </div>

        <div style={{ background: CAL.accentSoft, borderRadius: 10, padding: 12, fontSize: 12.5, color: CAL.accentDark, lineHeight: 1.5, display: 'flex', gap: 10 }}>
          <span style={{ fontFamily: calFonts.mono, fontWeight: 700 }}>↻</span>
          <span>Слот <b>13:00 — 14:30</b> свободен. Бот пришлёт Алине напоминание за 24ч и за 2ч.</span>
        </div>
      </div>

      <div style={{ padding: '12px 22px 18px', borderTop: `1px solid ${CAL.divider}` }}>
        <button style={{ width: '100%', background: CAL.ink, color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Записать</button>
      </div>
    </PhoneShell>
  );
}

// ── Prototype ─────────────────────────────────────────────────────────

function CalendarPrototype() {
  const [view, setView] = React.useState('day');
  const screens = {
    day: <CalDay />,
    week: <CalWeek />,
    month: <CalMonth />,
    sheet: <BookingSheet />,
    reschedule: <Reschedule />,
    add: <AddBooking />,
  };
  const labels = [
    ['day', '1 · День'],
    ['week', '2 · Неделя'],
    ['month', '3 · Месяц'],
    ['sheet', '4 · Карточка'],
    ['reschedule', '5 · Перенос'],
    ['add', '6 · Новая запись'],
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#ece7e2', padding: 24, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', fontFamily: calFonts.body }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
        <div style={{ fontSize: 11, fontFamily: calFonts.mono, color: CAL.mute, letterSpacing: 0.4, marginBottom: 4 }}>КЛИКНИТЕ →</div>
        {labels.map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} style={{
            background: view === id ? CAL.ink : '#fff',
            color: view === id ? '#fff' : CAL.ink,
            border: `1px solid ${view === id ? CAL.ink : CAL.divider}`,
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

Object.assign(window, { CalDay, CalWeek, CalMonth, BookingSheet, Reschedule, AddBooking, CalendarPrototype });
