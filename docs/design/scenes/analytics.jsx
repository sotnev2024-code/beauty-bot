// Аналитика для мастера — D · Коралл + сетка
const AN = HYB;
const anF = { body: '"Manrope", sans-serif', display: '"Fraunces", serif', mono: '"JetBrains Mono", monospace' };

function AnHeader({ title, sub, back, right }) {
  return (
    <div style={{ padding: '14px 22px 12px', borderBottom: `1px solid ${AN.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      {back && <div style={{ fontSize: 18, color: AN.ink, cursor: 'pointer' }}>←</div>}
      <div style={{ flex: 1 }}>
        {sub && <div style={{ fontSize: 11, fontFamily: anF.mono, color: AN.accent, letterSpacing: 0.4 }}>{sub}</div>}
        <div style={{ fontSize: 17, fontWeight: 700, color: AN.ink, letterSpacing: -0.3 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

// ── 1. Overview ──────────────────────────────────────────────────────
function AnOverview() {
  const [period, setPeriod] = React.useState('mo');
  const bars = [3,5,4,6,5,8,7, 4,6,7,9,5,10,3, 6,8,5,7,9,11,8, 5,7,6,9,8,12,4];
  const mx = Math.max(...bars);
  return (
    <PhoneShell width={320} height={660} bg={AN.bg}>
      <AnHeader sub="АНАЛИТИКА" title="Сводка" />

      {/* period */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 22px', borderBottom: `1px solid ${AN.divider}` }}>
        {[['wk', 'Неделя'], ['mo', 'Месяц'], ['q', 'Квартал'], ['y', 'Год']].map(([id, l]) => {
          const on = period === id;
          return (
            <div key={id} onClick={() => setPeriod(id)} style={{
              flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 6,
              background: on ? AN.ink : 'transparent',
              color: on ? '#fff' : AN.inkSoft,
              fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              border: on ? 'none' : `1px solid ${AN.divider}`,
            }}>{l}</div>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px 16px' }}>
        {/* hero metric */}
        <div style={{ background: AN.ink, color: '#fff', borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: AN.accent, opacity: 0.4 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 10, fontFamily: anF.mono, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.4 }}>ДОХОД ЗА НОЯБРЬ</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <div style={{ fontFamily: anF.display, fontSize: 42, fontWeight: 500, letterSpacing: -1, lineHeight: 1 }}>168 400</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: anF.mono }}>₽</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 11, fontFamily: anF.mono, color: AN.success, background: 'rgba(58,139,58,0.25)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>↑ 23%</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>к октябрю · 137 200 ₽</span>
            </div>

            {/* bars */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', gap: 2, height: 50 }}>
              {bars.map((v, i) => (
                <div key={i} style={{
                  flex: 1, background: i === bars.length - 1 ? AN.accent : 'rgba(255,255,255,0.4)',
                  height: `${(v / mx) * 100}%`, minHeight: 2, borderRadius: 1,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: anF.mono, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              <span>1 ноя</span><span>сегодня</span>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            ['ВИЗИТОВ', '67', '↑ 18%', AN.success],
            ['СР. ЧЕК', '2 510 ₽', '↑ 4%', AN.success],
            ['НОВЫЕ', '14', '↑ 40%', AN.success],
            ['ОТМЕНЫ', '3', '↓ 50%', AN.success],
          ].map(([k, v, d, c], i) => (
            <div key={i} style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.4 }}>{k}</div>
              <div style={{ fontFamily: anF.display, fontSize: 22, fontWeight: 500, color: AN.ink, marginTop: 2, letterSpacing: -0.4 }}>{v}</div>
              <div style={{ fontSize: 10, color: c, fontFamily: anF.mono, marginTop: 1, fontWeight: 600 }}>{d}</div>
            </div>
          ))}
        </div>

        {/* bot impact */}
        <div style={{ background: AN.accentSoft, border: `1px solid ${AN.accent}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.accentDark, letterSpacing: 0.4, fontWeight: 700, marginBottom: 8 }}>ВКЛАД БОТА</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <div style={{ fontSize: 13, color: AN.inkSoft }}>Записей через бота</div>
            <div style={{ fontFamily: anF.mono, fontSize: 14, color: AN.ink, fontWeight: 700 }}>52 / 67 <span style={{ color: AN.mute, fontWeight: 400 }}>· 78%</span></div>
          </div>
          <div style={{ height: 6, background: 'rgba(217,105,98,0.15)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: '78%', height: '100%', background: AN.accent }} />
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: AN.accentDark }}>
            <div>Сэкономлено · <b style={{ color: AN.ink }}>43 ч</b></div>
            <div>ROI · <b style={{ color: AN.ink }}>14×</b></div>
          </div>
        </div>

        {/* sections */}
        <div style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 12, overflow: 'hidden' }}>
          {[
            ['Финансы', 'детальный разбор'],
            ['Клиенты', 'возвраты, удержание, LTV'],
            ['Воронки', 'эффективность по сценариям'],
            ['Услуги', 'топ и аутсайдеры'],
          ].map(([k, v], i) => (
            <div key={i} style={{ padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${AN.divider}`, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: AN.ink }}>{k}</div>
                <div style={{ fontSize: 11, color: AN.mute, marginTop: 1 }}>{v}</div>
              </div>
              <div style={{ fontSize: 14, color: AN.mute }}>›</div>
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

// ── 2. Финансы ───────────────────────────────────────────────────────
function AnFinance() {
  return (
    <PhoneShell width={320} height={660} bg={AN.bg}>
      <AnHeader sub="АНАЛИТИКА · ФИНАНСЫ" title="Доход" back right={
        <div style={{ fontSize: 11, fontFamily: anF.mono, color: AN.accent, fontWeight: 600, cursor: 'pointer' }}>PDF</div>
      } />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px' }}>
        {/* line chart */}
        <div style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.4, marginBottom: 8 }}>ДИНАМИКА · 6 МЕСЯЦЕВ</div>
          <svg viewBox="0 0 280 100" width="100%" height="100" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="anG" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#D96962" stopOpacity="0.3" />
                <stop offset="1" stopColor="#D96962" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,80 L46,70 L92,75 L138,55 L184,45 L230,35 L280,20 L280,100 L0,100 Z" fill="url(#anG)" />
            <path d="M0,80 L46,70 L92,75 L138,55 L184,45 L230,35 L280,20" stroke={AN.accent} strokeWidth="2" fill="none" />
            {[[0,80],[46,70],[92,75],[138,55],[184,45],[230,35],[280,20]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r="3" fill={i === 6 ? AN.accent : '#fff'} stroke={AN.accent} strokeWidth="1.5" />
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: AN.mute, fontFamily: anF.mono, marginTop: 4 }}>
            {['июн','июл','авг','сен','окт','ноя','+'].map(m => <span key={m}>{m}</span>)}
          </div>
        </div>

        {/* breakdown */}
        <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.4, marginBottom: 8 }}>СТРУКТУРА ДОХОДА · НОЯБРЬ</div>
        <div style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          {/* stacked bar */}
          <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ background: AN.accent, width: '52%' }} />
            <div style={{ background: '#cda88d', width: '24%' }} />
            <div style={{ background: '#a89880', width: '14%' }} />
            <div style={{ background: AN.divider, width: '10%' }} />
          </div>
          {[
            ['Маникюр + дизайн', 87568, '52%', AN.accent],
            ['Френч', 40416, '24%', '#cda88d'],
            ['Однотон', 23576, '14%', '#a89880'],
            ['Снятие + покрытие', 16840, '10%', AN.divider],
          ].map(([k, v, p, c], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12.5, color: AN.ink }}>{k}</div>
              <div style={{ fontFamily: anF.mono, fontSize: 12, color: AN.ink, fontWeight: 600 }}>{v.toLocaleString('ru')} ₽</div>
              <div style={{ fontFamily: anF.mono, fontSize: 11, color: AN.mute, width: 32, textAlign: 'right' }}>{p}</div>
            </div>
          ))}
        </div>

        {/* highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.3 }}>ЛУЧШИЙ ДЕНЬ</div>
            <div style={{ fontFamily: anF.display, fontSize: 18, fontWeight: 500, color: AN.ink, marginTop: 4 }}>пт, 8 ноя</div>
            <div style={{ fontSize: 11, color: AN.success, fontFamily: anF.mono, marginTop: 1, fontWeight: 600 }}>14 800 ₽</div>
          </div>
          <div style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.3 }}>ПИКОВОЕ ВРЕМЯ</div>
            <div style={{ fontFamily: anF.display, fontSize: 18, fontWeight: 500, color: AN.ink, marginTop: 4 }}>14:00–17:00</div>
            <div style={{ fontSize: 11, color: AN.mute, fontFamily: anF.mono, marginTop: 1 }}>43% записей</div>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ── 3. Клиенты — удержание ───────────────────────────────────────────
function AnClients() {
  return (
    <PhoneShell width={320} height={660} bg={AN.bg}>
      <AnHeader sub="АНАЛИТИКА · КЛИЕНТЫ" title="Удержание" back />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px' }}>
        {/* funnel */}
        <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.4, marginBottom: 10 }}>ВОРОНКА УДЕРЖАНИЯ · 90 ДНЕЙ</div>
        <div style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          {[
            ['Пришли впервые', 47, '100%', '#fff', AN.accent],
            ['Вернулись 2-й раз', 32, '68%', '#fff', '#cda88d'],
            ['Стали постоянными (3+)', 24, '51%', '#fff', '#a89880'],
            ['VIP (10+ визитов)', 8, '17%', '#fff', AN.ink],
          ].map(([k, v, p, fg, bg], i) => (
            <div key={i} style={{ position: 'relative', padding: '10px 12px', marginBottom: i < 3 ? 4 : 0, background: bg, color: fg, borderRadius: 8, width: `${85 + i * 5 - i * 18}%`, marginLeft: 'auto', marginRight: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: i === 3 ? '#fff' : AN.ink }}>{k}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontFamily: anF.mono, fontSize: 14, fontWeight: 700, color: i === 3 ? '#fff' : AN.ink }}>{v}</div>
                <div style={{ fontSize: 10, fontFamily: anF.mono, color: i === 3 ? 'rgba(255,255,255,0.6)' : AN.mute }}>{p}</div>
              </div>
            </div>
          ))}
        </div>

        {/* LTV */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.3 }}>СРЕДНИЙ LTV</div>
            <div style={{ fontFamily: anF.display, fontSize: 22, fontWeight: 500, color: AN.ink, marginTop: 4, letterSpacing: -0.4 }}>18 400 ₽</div>
            <div style={{ fontSize: 10.5, color: AN.success, marginTop: 2, fontFamily: anF.mono, fontWeight: 600 }}>↑ 12% к Q3</div>
          </div>
          <div style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.3 }}>СРОК ВОЗВРАТА</div>
            <div style={{ fontFamily: anF.display, fontSize: 22, fontWeight: 500, color: AN.ink, marginTop: 4, letterSpacing: -0.4 }}>21 день</div>
            <div style={{ fontSize: 10.5, color: AN.mute, marginTop: 2, fontFamily: anF.mono }}>в среднем</div>
          </div>
        </div>

        {/* alert */}
        <div style={{ background: '#fff8f6', border: `1.5px solid ${AN.accent}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.accent, fontWeight: 700, letterSpacing: 0.4, marginBottom: 4 }}>● ТРЕБУЕТ ВНИМАНИЯ · 7</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: AN.ink, marginBottom: 4 }}>«Спящие» клиентки</div>
          <div style={{ fontSize: 11.5, color: AN.inkSoft, lineHeight: 1.5, marginBottom: 8 }}>Не записывались более 6 недель. Запустить воронку «возврат»?</div>
          <button style={{ background: AN.accent, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Включить воронку</button>
        </div>
      </div>
    </PhoneShell>
  );
}

// ── 4. Воронки эффективность ─────────────────────────────────────────
function AnFunnels() {
  const items = [
    { name: 'Запись новой', conv: 84, count: 32, on: true, best: true },
    { name: 'Напоминание 24ч', conv: 96, count: 67, on: true },
    { name: 'Возврат 3 нед', conv: 41, count: 18, on: true },
    { name: 'Отзыв после визита', conv: 28, count: 24, on: true, weak: true },
    { name: 'День рождения', conv: 0, count: 0, on: false },
  ];
  return (
    <PhoneShell width={320} height={660} bg={AN.bg}>
      <AnHeader sub="АНАЛИТИКА · ВОРОНКИ" title="Эффективность" back />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px' }}>
        {items.map((f, i) => (
          <div key={i} style={{ background: AN.card, border: `1.5px solid ${f.best ? AN.success : (f.weak ? AN.warn : AN.divider)}`, borderRadius: 12, padding: 14, marginBottom: 8, opacity: f.on ? 1 : 0.55 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: AN.ink }}>{f.name}</div>
                {f.best && <div style={{ fontSize: 9, fontFamily: anF.mono, color: '#fff', background: AN.success, padding: '2px 5px', borderRadius: 3, fontWeight: 700 }}>★ ТОП</div>}
                {f.weak && <div style={{ fontSize: 9, fontFamily: anF.mono, color: '#fff', background: AN.warn, padding: '2px 5px', borderRadius: 3, fontWeight: 700 }}>СЛАБО</div>}
              </div>
              <div style={{ fontSize: 10, fontFamily: anF.mono, color: f.on ? AN.success : AN.mute }}>{f.on ? '● АКТИВНА' : '○ ВЫКЛ'}</div>
            </div>

            {f.on && <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <div style={{ fontFamily: anF.display, fontSize: 26, fontWeight: 500, color: f.weak ? AN.warn : (f.best ? AN.success : AN.ink), letterSpacing: -0.5, lineHeight: 1 }}>{f.conv}%</div>
                <div style={{ fontSize: 11, color: AN.mute, fontFamily: anF.mono }}>конверсия · {f.count} запусков</div>
              </div>
              <div style={{ height: 4, background: AN.divider, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${f.conv}%`, height: '100%', background: f.weak ? AN.warn : (f.best ? AN.success : AN.accent) }} />
              </div>
              {f.weak && <div style={{ fontSize: 11, color: AN.warn, marginTop: 6, lineHeight: 1.4 }}>Только 28% оставляют отзыв. Попробуйте упростить — спросить только звёзды.</div>}
            </>}

            {!f.on && <div style={{ fontSize: 11.5, color: AN.mute, lineHeight: 1.5 }}>Воронка не запущена. Включить?</div>}
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

// ── 5. Услуги: топ и аутсайдеры ──────────────────────────────────────
function AnServices() {
  return (
    <PhoneShell width={320} height={660} bg={AN.bg}>
      <AnHeader sub="АНАЛИТИКА · УСЛУГИ" title="Топ и аутсайдеры" back />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px' }}>
        <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.success, letterSpacing: 0.4, marginBottom: 8, fontWeight: 700 }}>★ ХИТЫ</div>
        {[
          ['Маникюр + дизайн', 28, 3500, 87568],
          ['Френч', 14, 2800, 40416],
          ['Однотон', 12, 2500, 23576],
        ].map(([n, c, pr, total], i) => (
          <div key={i} style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 10, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, fontFamily: anF.mono, fontSize: 18, fontWeight: 700, color: AN.success }}>#{i+1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: AN.ink }}>{n}</div>
              <div style={{ fontSize: 10.5, color: AN.mute, fontFamily: anF.mono, marginTop: 1 }}>{c} раз · {pr.toLocaleString('ru')} ₽</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: anF.mono, fontSize: 13, fontWeight: 700, color: AN.ink }}>{total.toLocaleString('ru')}</div>
              <div style={{ fontSize: 9.5, color: AN.mute, fontFamily: anF.mono }}>₽ всего</div>
            </div>
          </div>
        ))}

        <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.warn, letterSpacing: 0.4, margin: '18px 0 8px', fontWeight: 700 }}>○ ПРОСИТСЯ ВНИМАНИЕ</div>
        <div style={{ background: '#fff8f6', border: `1px solid ${AN.warn}`, borderRadius: 10, padding: 12, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: AN.ink, marginBottom: 4 }}>Наращивание</div>
          <div style={{ fontSize: 11.5, color: AN.inkSoft, lineHeight: 1.5, marginBottom: 6 }}>Делали 1 раз за 3 месяца. Маржа высокая (4 500 ₽), но клиентки не выбирают.</div>
          <div style={{ fontSize: 11, color: AN.warn, fontFamily: anF.mono }}>💡 добавьте фото в портфолио · клиентки не знают что вы это умеете</div>
        </div>
        <div style={{ background: '#fff8f6', border: `1px solid ${AN.warn}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: AN.ink, marginBottom: 4 }}>Снятие чужого</div>
          <div style={{ fontSize: 11.5, color: AN.inkSoft, lineHeight: 1.5 }}>Выручка 6 400 ₽, занимает 8 часов в месяц. Может убрать или поднять цену?</div>
        </div>

        {/* peak times */}
        <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.4, margin: '18px 0 8px' }}>ЗАГРУЗКА ПО ЧАСАМ · НОЯБРЬ</div>
        <div style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 50, marginBottom: 4 }}>
            {[20,30,45,60,80,95,90,75,55,40,25,15].map((v, i) => (
              <div key={i} style={{ flex: 1, height: `${v}%`, background: v > 75 ? AN.accent : (v > 50 ? '#cda88d' : AN.divider), borderRadius: 1, minHeight: 2 }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: AN.mute, fontFamily: anF.mono }}>
            <span>10</span><span>13</span><span>16</span><span>19</span><span>22</span>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ── 6. Инсайты ───────────────────────────────────────────────────────
function AnInsights() {
  return (
    <PhoneShell width={320} height={660} bg={AN.bg}>
      <AnHeader sub="АНАЛИТИКА · ИНСАЙТЫ" title="Что заметил бот" back />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px' }}>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: AN.inkSoft, lineHeight: 1.5 }}>
          Бот сравнивает ваши данные за разные периоды и предлагает что улучшить.
        </p>

        {/* insights */}
        {[
          { tag: '● ВОЗМОЖНОСТЬ', tagC: AN.success, title: 'Поднять цену на дизайн', body: '28 раз сделали по 3 500 ₽ — спрос есть. Конкуренты в радиусе 1 км: 4 200 ₽.', cta: 'Изменить цену' },
          { tag: '● РИСК', tagC: AN.warn, title: 'Пятница — перегружена', body: 'Загрузка 95%, перерывы 5 мин. За 3 месяца — 4 опоздания клиенток сместили день. Ввести 30-мин буфер?', cta: 'Настроить расписание' },
          { tag: '● ИДЕЯ', tagC: AN.accent, title: 'Лена — 6 недель тишины', body: 'Раньше приходила каждые 21 день. Возможно, ушла к другому. Запустить воронку «соскучилась»?', cta: 'Запустить' },
          { tag: '● ТРЕНД', tagC: AN.ink, title: 'Камифубуки в моде', body: '5 клиенток за месяц спрашивали — добавили в портфолио? Бот предлагает: «делаю с дизайном».', cta: 'Добавить работу' },
        ].map((ins, i) => (
          <div key={i} style={{ background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontFamily: anF.mono, color: ins.tagC, letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>{ins.tag}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: AN.ink, marginBottom: 6, letterSpacing: -0.2 }}>{ins.title}</div>
            <div style={{ fontSize: 12, color: AN.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>{ins.body}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ flex: 1, background: AN.ink, color: '#fff', border: 'none', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{ins.cta}</button>
              <button style={{ background: 'transparent', color: AN.mute, border: `1px solid ${AN.divider}`, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>Скрыть</button>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

// ── 7. Сравнение периодов ────────────────────────────────────────────
function AnCompare() {
  return (
    <PhoneShell width={320} height={660} bg={AN.bg}>
      <AnHeader sub="АНАЛИТИКА · СРАВНЕНИЕ" title="Ноябрь vs Октябрь" back />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, padding: '10px 12px', background: AN.card, border: `1.5px solid ${AN.accent}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.accent, letterSpacing: 0.3, fontWeight: 700 }}>А · НОЯБРЬ</div>
            <div style={{ fontFamily: anF.display, fontSize: 16, fontWeight: 500, color: AN.ink, marginTop: 2 }}>1–13</div>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', background: AN.card, border: `1px solid ${AN.divider}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.3 }}>Б · ОКТЯБРЬ</div>
            <div style={{ fontFamily: anF.display, fontSize: 16, fontWeight: 500, color: AN.inkSoft, marginTop: 2 }}>1–13</div>
          </div>
        </div>

        {[
          ['Доход', '74 200 ₽', '60 800 ₽', '+22%', AN.success],
          ['Записей', '32', '27', '+19%', AN.success],
          ['Ср. чек', '2 320 ₽', '2 250 ₽', '+3%', AN.success],
          ['Новых клиенток', '6', '4', '+50%', AN.success],
          ['Отмен', '1', '3', '−67%', AN.success],
          ['Средняя загрузка', '78%', '71%', '+10%', AN.success],
          ['Записей через бота', '78%', '64%', '+22%', AN.success],
          ['Конверсия «возврат»', '41%', '38%', '+8%', AN.success],
          ['Отзывы после визита', '7', '5', '+40%', AN.success],
        ].map(([k, a, b, d, c], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: i < 8 ? `1px solid ${AN.divider}` : 'none', gap: 10 }}>
            <div style={{ flex: 1.4, fontSize: 12, color: AN.inkSoft }}>{k}</div>
            <div style={{ flex: 1, textAlign: 'right', fontFamily: anF.mono, fontSize: 12.5, color: AN.ink, fontWeight: 700 }}>{a}</div>
            <div style={{ flex: 1, textAlign: 'right', fontFamily: anF.mono, fontSize: 11.5, color: AN.mute }}>{b}</div>
            <div style={{ width: 50, textAlign: 'right', fontFamily: anF.mono, fontSize: 11, color: c, fontWeight: 700 }}>{d}</div>
          </div>
        ))}

        <div style={{ marginTop: 16, padding: 14, background: AN.accentSoft, borderRadius: 10, fontSize: 12, color: AN.accentDark, lineHeight: 1.5 }}>
          <b>Главное:</b> ноябрь вырос по всем метрикам. Особенно — конверсия бота (+22%) после того как вы добавили вариант «однотон без дизайна».
        </div>
      </div>
    </PhoneShell>
  );
}

// ── Prototype ────────────────────────────────────────────────────────
function AnalyticsPrototype() {
  const [view, setView] = React.useState('ov');
  const screens = {
    ov: <AnOverview />, fin: <AnFinance />, cli: <AnClients />,
    fnl: <AnFunnels />, srv: <AnServices />, ins: <AnInsights />, cmp: <AnCompare />,
  };
  const labels = [
    ['ov', '1 · Сводка ★'],
    ['fin', '2 · Финансы'],
    ['cli', '3 · Удержание'],
    ['fnl', '4 · Воронки'],
    ['srv', '5 · Услуги'],
    ['ins', '6 · Инсайты ★'],
    ['cmp', '7 · Сравнение'],
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#ece7e2', padding: 24, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', fontFamily: anF.body }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
        <div style={{ fontSize: 11, fontFamily: anF.mono, color: AN.mute, letterSpacing: 0.4, marginBottom: 4 }}>ЭКРАНЫ →</div>
        {labels.map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} style={{
            background: view === id ? AN.ink : '#fff',
            color: view === id ? '#fff' : AN.ink,
            border: `1px solid ${view === id ? AN.ink : AN.divider}`,
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

Object.assign(window, { AnOverview, AnFinance, AnClients, AnFunnels, AnServices, AnInsights, AnCompare, AnalyticsPrototype });
