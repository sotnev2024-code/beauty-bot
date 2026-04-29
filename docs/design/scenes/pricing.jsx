// Тарифы и монетизация — D · Коралл + сетка
const PR = HYB;
const prFonts = { body: '"Manrope", sans-serif', display: '"Fraunces", serif', mono: '"JetBrains Mono", monospace' };

function PrHeader({ title, sub, back, right }) {
  return (
    <div style={{ padding: '14px 22px 12px', borderBottom: `1px solid ${PR.divider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      {back && <div style={{ fontSize: 18, color: PR.ink, cursor: 'pointer' }}>←</div>}
      <div style={{ flex: 1 }}>
        {sub && <div style={{ fontSize: 11, fontFamily: prFonts.mono, color: PR.accent, letterSpacing: 0.4 }}>{sub}</div>}
        <div style={{ fontSize: 17, fontWeight: 700, color: PR.ink, letterSpacing: -0.3 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

// ── 1. Витрина тарифов ───────────────────────────────────────────────
function PricingShowcase() {
  const [cycle, setCycle] = React.useState('year');
  const [picked, setPicked] = React.useState('pro');

  const plans = [
    {
      id: 'free', name: 'Trial', tag: '14 дней',
      mo: 0, yr: 0,
      tagline: 'Попробовать всё',
      features: ['Все функции Pro', 'Без карты на старте', 'Лимит 50 клиенток'],
      cta: 'Текущий', muted: true,
    },
    {
      id: 'pro', name: 'Pro', tag: 'для соло-мастера',
      mo: 900, yr: 8640,
      tagline: 'Окупится за 2 записи в месяц',
      features: ['Безлимит клиенток', 'До 5 воронок', 'Перехват чата', 'Авто-сегменты', 'Портфолио в боте'],
      featured: true,
    },
    {
      id: 'proplus', name: 'Pro+', tag: 'для команды',
      mo: 2400, yr: 23040,
      tagline: 'Несколько мастеров под одним брендом',
      features: ['Всё из Pro', 'До 5 мастеров', 'Общий календарь', 'Аналитика по мастерам', 'Приоритет поддержки'],
    },
  ];

  return (
    <PhoneShell width={320} height={660} bg={PR.bg}>
      <PrHeader sub="ТАРИФЫ" title="Выбрать план" back />

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px 12px' }}>
        {/* cycle toggle */}
        <div style={{ display: 'flex', background: PR.card, border: `1px solid ${PR.divider}`, borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {[['mo', 'Месяц'], ['year', 'Год · −20%']].map(([id, l]) => {
            const on = cycle === id;
            return (
              <div key={id} onClick={() => setCycle(id)} style={{
                flex: 1, padding: '8px 0', textAlign: 'center',
                fontSize: 12, fontWeight: 600,
                background: on ? PR.ink : 'transparent',
                color: on ? '#fff' : PR.inkSoft,
                borderRadius: 8, cursor: 'pointer',
              }}>{l}</div>
            );
          })}
        </div>

        {plans.map(p => {
          const on = picked === p.id;
          const isFree = p.id === 'free';
          const price = cycle === 'year' ? Math.round(p.yr / 12) : p.mo;
          return (
            <div key={p.id} onClick={() => !isFree && setPicked(p.id)} style={{
              background: on && !isFree ? PR.ink : PR.card,
              border: `1.5px solid ${on && !isFree ? PR.ink : (p.featured && !on ? PR.accent : PR.divider)}`,
              borderRadius: 14, padding: 16, marginBottom: 10,
              cursor: isFree ? 'default' : 'pointer',
              position: 'relative',
              opacity: isFree ? 0.85 : 1,
            }}>
              {p.featured && !on && (
                <div style={{ position: 'absolute', top: -10, right: 12, fontSize: 9, fontFamily: prFonts.mono, fontWeight: 700, color: '#fff', background: PR.accent, padding: '3px 8px', borderRadius: 4, letterSpacing: 0.4 }}>ПОПУЛЯРНЫЙ</div>
              )}

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontFamily: prFonts.mono, color: on && !isFree ? 'rgba(255,255,255,0.5)' : PR.mute, letterSpacing: 0.4 }}>{p.tag.toUpperCase()}</div>
                {p.id === 'free' && <div style={{ fontSize: 10, fontFamily: prFonts.mono, color: PR.success, fontWeight: 700 }}>● АКТИВЕН · 9 ДН.</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontFamily: prFonts.display, fontSize: 28, fontWeight: 500, color: on && !isFree ? '#fff' : PR.ink, letterSpacing: -0.4 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, fontFamily: prFonts.mono }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: on && !isFree ? '#fff' : PR.ink }}>{price}</span>
                  <span style={{ fontSize: 11, color: on && !isFree ? 'rgba(255,255,255,0.6)' : PR.mute }}>₽/мес</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: on && !isFree ? 'rgba(255,255,255,0.7)' : PR.inkSoft, marginBottom: 10, fontStyle: 'italic' }}>{p.tagline}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {p.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: on && !isFree ? 'rgba(255,255,255,0.85)' : PR.inkSoft }}>
                    <span style={{ color: on && !isFree ? PR.accent : PR.success, fontSize: 11 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>

              {cycle === 'year' && !isFree && (
                <div style={{ marginTop: 10, padding: '6px 10px', background: on ? 'rgba(217,105,98,0.25)' : PR.accentSoft, borderRadius: 6, fontSize: 11, color: on ? '#fff' : PR.accentDark, fontFamily: prFonts.mono }}>
                  При оплате за год — {p.yr.toLocaleString('ru')} ₽ · экономия {Math.round(p.mo * 12 - p.yr).toLocaleString('ru')} ₽
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: 6, fontSize: 11, color: PR.mute, textAlign: 'center', lineHeight: 1.5 }}>
          Отмена в любой момент. Деньги за неиспользованные дни вернём.
        </div>
      </div>

      <div style={{ padding: '12px 22px 16px', borderTop: `1px solid ${PR.divider}`, background: PR.card }}>
        <button style={{ width: '100%', background: PR.accent, color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 600, fontSize: 14.5, fontFamily: 'inherit', cursor: 'pointer' }}>
          Перейти на Pro · 720 ₽/мес
        </button>
      </div>
    </PhoneShell>
  );
}

// ── 2. Текущий тариф / управление ────────────────────────────────────
function CurrentSubscription() {
  return (
    <PhoneShell width={320} height={660} bg={PR.bg}>
      <PrHeader sub="ПОДПИСКА" title="Управление" back />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px 16px' }}>
        {/* hero card */}
        <div style={{ background: PR.ink, color: '#fff', borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: PR.accent, opacity: 0.5 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 10, fontFamily: prFonts.mono, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.4 }}>ВАШ ТАРИФ</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <div style={{ fontFamily: prFonts.display, fontSize: 32, fontWeight: 500, letterSpacing: -0.6 }}>Pro</div>
              <div style={{ fontSize: 11, fontFamily: prFonts.mono, color: 'rgba(255,255,255,0.6)' }}>год</div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>До 12 января 2026</div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: prFonts.mono, color: 'rgba(255,255,255,0.7)' }}>
              <div><span style={{ color: '#fff', fontWeight: 700 }}>8 640 ₽</span> в год</div>
              <div>авто-продление ✓</div>
            </div>
          </div>
        </div>

        {/* ROI block */}
        <div style={{ background: PR.accentSoft, border: `1px solid ${PR.accent}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontFamily: prFonts.mono, color: PR.accentDark, fontWeight: 700, letterSpacing: 0.4, marginBottom: 6 }}>ROI ЗА ПОСЛЕДНИЙ МЕСЯЦ</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: prFonts.display, fontSize: 22, fontWeight: 600, color: PR.ink }}>14×</div>
              <div style={{ fontSize: 10.5, color: PR.inkSoft, marginTop: 1 }}>окупаемость</div>
            </div>
            <div style={{ flex: 1.5 }}>
              <div style={{ fontFamily: prFonts.display, fontSize: 22, fontWeight: 600, color: PR.ink }}>+ 23</div>
              <div style={{ fontSize: 10.5, color: PR.inkSoft, marginTop: 1 }}>записи через бота</div>
            </div>
            <div style={{ flex: 1.5 }}>
              <div style={{ fontFamily: prFonts.display, fontSize: 22, fontWeight: 600, color: PR.ink }}>10к</div>
              <div style={{ fontSize: 10.5, color: PR.inkSoft, marginTop: 1 }}>ч сэкономлено</div>
            </div>
          </div>
        </div>

        {/* actions */}
        <div style={{ background: PR.card, border: `1px solid ${PR.divider}`, borderRadius: 12, overflow: 'hidden' }}>
          {[
            ['Способ оплаты', '•••• 4521 · до 12/27', null],
            ['История платежей', '12 чеков', '→'],
            ['Промокод', null, '+ ввести'],
            ['Перейти на Pro+', 'для команды от 2 человек', '→'],
          ].map(([k, v, r], i) => (
            <div key={i} style={{ padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${PR.divider}`, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: PR.ink }}>{k}</div>
                {v && <div style={{ fontSize: 11, color: PR.mute, marginTop: 1, fontFamily: prFonts.mono }}>{v}</div>}
              </div>
              {r && <div style={{ fontSize: r === '→' ? 14 : 11, color: r === '→' ? PR.mute : PR.accent, fontFamily: r === '→' ? 'inherit' : prFonts.mono, fontWeight: r === '→' ? 400 : 600 }}>{r}</div>}
            </div>
          ))}
        </div>

        <button style={{ marginTop: 18, width: '100%', background: 'transparent', border: 'none', color: PR.mute, fontSize: 12, padding: 8, cursor: 'pointer', fontFamily: 'inherit' }}>Отменить подписку</button>
      </div>
    </PhoneShell>
  );
}

// ── 3. Чекаут ────────────────────────────────────────────────────────
function Checkout() {
  return (
    <PhoneShell width={320} height={660} bg={PR.bg}>
      <PrHeader sub="ОПЛАТА" title="Pro · год" back />

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px' }}>
        {/* receipt */}
        <div style={{ background: PR.card, border: `1px solid ${PR.divider}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          {[
            ['Pro · 12 месяцев', '10 800 ₽'],
            ['Скидка за год · −20%', '−2 160 ₽'],
            ['Промокод STARTER10', '−864 ₽'],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: i === 1 || i === 2 ? PR.success : PR.inkSoft }}>
              <div>{k}</div>
              <div style={{ fontFamily: prFonts.mono, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${PR.divider}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: PR.ink }}>К оплате</div>
            <div style={{ fontFamily: prFonts.display, fontSize: 26, fontWeight: 600, color: PR.ink, letterSpacing: -0.4 }}>7 776 ₽</div>
          </div>
          <div style={{ fontSize: 11, color: PR.mute, marginTop: 4, textAlign: 'right', fontFamily: prFonts.mono }}>≈ 648 ₽/мес</div>
        </div>

        {/* promocode */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input defaultValue="STARTER10" style={{ flex: 1, background: PR.card, border: `1.5px solid ${PR.success}`, borderRadius: 10, padding: '10px 12px', fontFamily: prFonts.mono, fontSize: 13, color: PR.ink, letterSpacing: 1, outline: 'none' }} />
          <div style={{ fontSize: 11, color: PR.success, fontFamily: prFonts.mono, fontWeight: 700 }}>✓ −10%</div>
        </div>

        {/* payment method */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontFamily: prFonts.mono, color: PR.mute, letterSpacing: 0.4, marginBottom: 8 }}>СПОСОБ ОПЛАТЫ</div>
          <div style={{ background: PR.card, border: `1.5px solid ${PR.accent}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 24, borderRadius: 4, background: 'linear-gradient(135deg, #1a3a8a, #2a5cd9)', display: 'grid', placeItems: 'center', fontSize: 9, color: '#fff', fontWeight: 700, fontFamily: prFonts.mono }}>VISA</div>
            <div style={{ flex: 1, fontFamily: prFonts.mono, fontSize: 13, color: PR.ink, fontWeight: 500 }}>•••• 4521</div>
            <div style={{ fontSize: 11, color: PR.mute }}>изменить</div>
          </div>
          <div style={{ fontSize: 11, color: PR.mute, marginTop: 6, lineHeight: 1.5 }}>Через ЮKassa · 3-D Secure</div>
        </div>

        {/* legal */}
        <div style={{ fontSize: 10.5, color: PR.mute, lineHeight: 1.6 }}>
          Нажимая «Оплатить», вы соглашаетесь с <span style={{ color: PR.accent, textDecoration: 'underline' }}>условиями</span>. Подписка продлится автоматически 12 января 2026 на ту же сумму. Отменить можно в любой момент.
        </div>
      </div>

      <div style={{ padding: '12px 22px 16px', borderTop: `1px solid ${PR.divider}`, background: PR.card }}>
        <button style={{ width: '100%', background: PR.ink, color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 600, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>
          Оплатить 7 776 ₽
        </button>
      </div>
    </PhoneShell>
  );
}

// ── 4. Paywall (мягкая блокировка) ───────────────────────────────────
function Paywall() {
  return (
    <PhoneShell width={320} height={660} bg={PR.bg}>
      <div style={{ padding: '14px 22px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: 18, color: PR.mute, cursor: 'pointer' }}>×</div>
      </div>

      <div style={{ flex: 1, padding: '14px 28px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 11, fontFamily: prFonts.mono, color: PR.warn, letterSpacing: 0.4, fontWeight: 700 }}>● TRIAL · ОСТАЛОСЬ 2 ДНЯ</div>
        <h1 style={{ margin: '8px 0 12px', fontFamily: prFonts.display, fontSize: 32, fontWeight: 500, color: PR.ink, letterSpacing: -0.7, lineHeight: 1.1 }}>За 14 дней<br/>бот <i style={{ color: PR.accent }}>заработал</i><br/>вам</h1>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontFamily: prFonts.display, fontSize: 56, fontWeight: 600, color: PR.ink, letterSpacing: -2, lineHeight: 1 }}>34 200</div>
          <div style={{ fontSize: 14, color: PR.mute, fontFamily: prFonts.mono }}>₽</div>
        </div>
        <div style={{ fontSize: 12.5, color: PR.inkSoft, marginTop: 2 }}>23 записи · 12 возвратов · 7 отзывов</div>

        <div style={{ marginTop: 24, padding: 14, background: PR.card, border: `1px solid ${PR.divider}`, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: PR.inkSoft }}>Стоимость Pro</div>
            <div style={{ fontFamily: prFonts.mono, fontSize: 13, fontWeight: 600, color: PR.ink }}>900 ₽/мес</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: PR.inkSoft }}>Окупается с</div>
            <div style={{ fontFamily: prFonts.mono, fontSize: 13, fontWeight: 600, color: PR.success }}>2-й записи</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button style={{ background: PR.accent, color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 600, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>
          Продолжить с Pro · 900 ₽/мес
        </button>
        <button style={{ background: 'transparent', border: 'none', color: PR.mute, fontSize: 12, padding: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Напомнить за день до конца</button>
      </div>
    </PhoneShell>
  );
}

// ── 5. История платежей ─────────────────────────────────────────────
function PaymentHistory() {
  const items = [
    ['12 окт 2025', 'Pro · год', '7 776 ₽', 'оплачен'],
    ['12 окт 2024', 'Pro · год', '8 640 ₽', 'оплачен'],
    ['28 сен 2024', 'Доплата · промокод', '−864 ₽', 'возврат'],
    ['12 апр 2024', 'Pro · полгода', '4 320 ₽', 'оплачен'],
    ['12 окт 2023', 'Pro · мес', '900 ₽', 'оплачен'],
    ['12 сен 2023', 'Pro · мес', '900 ₽', 'оплачен'],
    ['12 авг 2023', 'Trial завершён', '0 ₽', 'инфо'],
  ];

  return (
    <PhoneShell width={320} height={660} bg={PR.bg}>
      <PrHeader sub="ИСТОРИЯ" title="Платежи" back right={
        <div style={{ fontSize: 11, fontFamily: prFonts.mono, color: PR.accent, fontWeight: 600, cursor: 'pointer' }}>PDF</div>
      } />

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px 16px' }}>
        {/* totals */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <div style={{ flex: 1, padding: '10px 12px', background: PR.card, border: `1px solid ${PR.divider}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontFamily: prFonts.mono, color: PR.mute, letterSpacing: 0.4 }}>ВСЕГО</div>
            <div style={{ fontFamily: prFonts.display, fontSize: 22, fontWeight: 500, color: PR.ink, marginTop: 2, letterSpacing: -0.4 }}>22 672 ₽</div>
          </div>
          <div style={{ flex: 1, padding: '10px 12px', background: PR.card, border: `1px solid ${PR.divider}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontFamily: prFonts.mono, color: PR.mute, letterSpacing: 0.4 }}>ОКУПАЕМОСТЬ</div>
            <div style={{ fontFamily: prFonts.display, fontSize: 22, fontWeight: 500, color: PR.success, marginTop: 2 }}>14×</div>
          </div>
        </div>

        {/* list */}
        {items.map(([date, name, amount, st], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: i < items.length - 1 ? `1px solid ${PR.divider}` : 'none', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: st === 'возврат' ? PR.warn : (st === 'инфо' ? PR.divider : PR.success), flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: PR.ink }}>{name}</div>
              <div style={{ fontSize: 10.5, color: PR.mute, marginTop: 1, fontFamily: prFonts.mono }}>{date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: prFonts.mono, fontSize: 13, fontWeight: 600, color: amount.startsWith('−') ? PR.warn : PR.ink }}>{amount}</div>
              <div style={{ fontSize: 10, color: PR.mute, marginTop: 1, fontFamily: prFonts.mono, cursor: 'pointer' }}>чек ↗</div>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

// ── 6. Реферальная программа ─────────────────────────────────────────
function Referral() {
  return (
    <PhoneShell width={320} height={660} bg={PR.bg}>
      <PrHeader sub="ПРИГЛАШЕНИЯ" title="Приведи мастера" back />

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px 16px' }}>
        {/* hero */}
        <div style={{ background: PR.ink, color: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: PR.accent, opacity: 0.55 }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 10, fontFamily: prFonts.mono, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.4 }}>ВЫ ОТДАЁТЕ</div>
            <div style={{ fontFamily: prFonts.display, fontSize: 30, fontWeight: 500, marginTop: 4, letterSpacing: -0.6 }}>−20%</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>другому мастеру на первый месяц</div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: 10, fontFamily: prFonts.mono, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.4 }}>ВЫ ПОЛУЧАЕТЕ</div>
              <div style={{ fontFamily: prFonts.display, fontSize: 30, fontWeight: 500, marginTop: 4, letterSpacing: -0.6 }}>1 месяц</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Pro бесплатно — за каждую</div>
            </div>
          </div>
        </div>

        {/* code */}
        <div style={{ fontSize: 10, fontFamily: prFonts.mono, color: PR.mute, letterSpacing: 0.4, marginBottom: 6 }}>ВАШ КОД</div>
        <div style={{ background: PR.card, border: `1.5px dashed ${PR.accent}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: prFonts.mono, fontSize: 18, fontWeight: 700, color: PR.ink, letterSpacing: 2 }}>ANYA20</div>
          <div style={{ fontSize: 11, fontFamily: prFonts.mono, color: PR.accentDark, background: PR.accentSoft, padding: '5px 10px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>СКОПИРОВАТЬ</div>
        </div>

        <button style={{ width: '100%', background: PR.ink, color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', marginBottom: 18 }}>
          Поделиться в Telegram →
        </button>

        {/* progress */}
        <div style={{ background: PR.card, border: `1px solid ${PR.divider}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: PR.ink }}>Привели мастеров</div>
            <div style={{ fontFamily: prFonts.mono, fontSize: 13, color: PR.success, fontWeight: 700 }}>3 / ∞</div>
          </div>
          {[
            ['Лена · @lena_brows', '+1 мес активирован', PR.success],
            ['Кристина · @krist_nails', '+1 мес активирован', PR.success],
            ['Марина · @marina_lash', 'на пробном — 4 дня', PR.warn],
          ].map(([n, st, c], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? `1px solid ${PR.divider}` : 'none', borderBottom: i === 2 ? 'none' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
              <div style={{ flex: 1, fontSize: 12, color: PR.ink }}>{n}</div>
              <div style={{ fontSize: 10.5, color: PR.mute, fontFamily: prFonts.mono }}>{st}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: 12, background: PR.accentSoft, borderRadius: 10, fontSize: 11.5, color: PR.accentDark, lineHeight: 1.5 }}>
          <b>Совет:</b> отправьте код в чат с коллегами по студии — обычно из 5 приглашённых 2-3 остаются.
        </div>
      </div>
    </PhoneShell>
  );
}

// ── Prototype ────────────────────────────────────────────────────────
function PricingPrototype() {
  const [view, setView] = React.useState('show');
  const screens = {
    show: <PricingShowcase />,
    cur: <CurrentSubscription />,
    co: <Checkout />,
    pw: <Paywall />,
    hist: <PaymentHistory />,
    ref: <Referral />,
  };
  const labels = [
    ['show', '1 · Витрина'],
    ['cur', '2 · Текущий тариф'],
    ['co', '3 · Чекаут'],
    ['pw', '4 · Paywall'],
    ['hist', '5 · История'],
    ['ref', '6 · Рефералы'],
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#ece7e2', padding: 24, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', fontFamily: prFonts.body }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
        <div style={{ fontSize: 11, fontFamily: prFonts.mono, color: PR.mute, letterSpacing: 0.4, marginBottom: 4 }}>ЭКРАНЫ →</div>
        {labels.map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} style={{
            background: view === id ? PR.ink : '#fff',
            color: view === id ? '#fff' : PR.ink,
            border: `1px solid ${view === id ? PR.ink : PR.divider}`,
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

Object.assign(window, { PricingShowcase, CurrentSubscription, Checkout, Paywall, PaymentHistory, Referral, PricingPrototype });
