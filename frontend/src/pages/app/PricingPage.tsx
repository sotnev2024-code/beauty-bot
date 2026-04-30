import { useEffect, useState } from 'react';

import { Billing } from '@/api';
import type { PaymentRow, PlanInfo, RoiData } from '@/api/types';
import { Button, Card } from '@/components/ui';

export function PricingPage() {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [roi, setRoi] = useState<RoiData | null>(null);
  const [history, setHistory] = useState<PaymentRow[]>([]);
  const [annual, setAnnual] = useState(false);
  const [busy, setBusy] = useState<'pro' | 'pro_plus' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Billing.plan().then(setPlan).catch(() => undefined);
    Billing.roi().then(setRoi).catch(() => undefined);
    Billing.history().then(setHistory).catch(() => undefined);
  }, []);

  const buy = async (which: 'pro' | 'pro_plus') => {
    setBusy(which);
    setError(null);
    try {
      const r = await Billing.checkout(which, annual);
      if (r.confirmation_url) {
        window.open(r.confirmation_url, '_blank');
      }
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Не удалось создать платёж');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink">Тарифы</h1>

      {plan && <CurrentPlanCard plan={plan} roi={roi} />}

      <div className="flex items-center justify-between bg-card rounded-2xl px-4 py-2.5 border border-divider">
        <span className="text-sm text-ink-soft">Платить за год</span>
        <button
          type="button"
          onClick={() => setAnnual((a) => !a)}
          className={`w-11 h-6 rounded-full transition relative ${annual ? 'bg-accent' : 'bg-divider'}`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-card transition ${annual ? 'left-[22px]' : 'left-0.5'}`}
          />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <PlanCard
          name="Pro"
          monthly={plan?.pro_price_monthly ?? 900}
          annual={annual}
          discount={plan?.annual_discount_percent ?? 20}
          highlight
          features={[
            'Безлимит на диалоги и записи',
            'AI-ассистент 24/7',
            'Все 4 пресета воронок',
            'Статистика и инсайты',
          ]}
          cta={`Перейти на Pro`}
          onBuy={() => buy('pro')}
          busy={busy === 'pro'}
        />
        <PlanCard
          name="Pro+"
          monthly={plan?.pro_plus_price_monthly ?? 2400}
          annual={annual}
          discount={plan?.annual_discount_percent ?? 20}
          features={[
            'Всё из Pro',
            'Команда мастеров (скоро)',
            'Кастомные интеграции (скоро)',
            'Приоритетная поддержка',
          ]}
          cta={`Перейти на Pro+`}
          onBuy={() => buy('pro_plus')}
          busy={busy === 'pro_plus'}
        />
      </div>

      {error && (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-ink">История платежей</h2>
          {history.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink">
                  {Math.round(Number(p.amount)).toLocaleString('ru-RU')} ₽
                </span>
                <span className="text-mute text-xs">{p.status}</span>
              </div>
              <span className="text-xs text-mute">
                {new Date(p.created_at).toLocaleString('ru-RU')}
              </span>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function CurrentPlanCard({ plan, roi }: { plan: PlanInfo; roi: RoiData | null }) {
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-mute">Текущий план</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${plan.is_active ? 'bg-success/10 text-success' : 'bg-divider text-mute'}`}
          >
            {plan.is_active ? 'активен' : 'истёк'}
          </span>
        </div>
        <span className="font-display text-xl text-ink">
          {plan.plan === 'trial'
            ? 'Trial · 14 дней'
            : plan.plan === 'pro'
              ? 'Pro'
              : 'Pro+'}
        </span>
        {plan.plan === 'trial' && plan.trial_ends_at && (
          <span className="text-xs text-mute">
            до {new Date(plan.trial_ends_at).toLocaleDateString('ru-RU')}
          </span>
        )}
        {plan.subscription_active_until && plan.plan !== 'trial' && (
          <span className="text-xs text-mute">
            продлено до{' '}
            {new Date(plan.subscription_active_until).toLocaleDateString('ru-RU')}
          </span>
        )}
        {roi && roi.roi_x && (
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-mute">ROI за 30 дней</span>
            <span className="text-accent-dark font-semibold">×{roi.roi_x}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function PlanCard({
  name,
  monthly,
  annual,
  discount,
  features,
  cta,
  onBuy,
  busy,
  highlight,
}: {
  name: string;
  monthly: number;
  annual: boolean;
  discount: number;
  features: string[];
  cta: string;
  onBuy: () => void;
  busy: boolean;
  highlight?: boolean;
}) {
  const annualTotal = Math.round(monthly * 12 * (1 - discount / 100));
  return (
    <Card className={highlight ? 'border-accent' : ''}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl text-ink">{name}</span>
          {highlight && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-soft text-accent-dark">
              рекомендуем
            </span>
          )}
        </div>
        <div>
          <span className="font-display text-2xl text-ink">
            {annual
              ? annualTotal.toLocaleString('ru-RU')
              : monthly.toLocaleString('ru-RU')}{' '}
            ₽
          </span>
          <span className="text-sm text-mute"> · {annual ? 'год' : 'мес'}</span>
          {annual && (
            <span className="text-xs text-success block mt-0.5">
              экономия {discount}%
            </span>
          )}
        </div>
        <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-accent">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button onClick={onBuy} disabled={busy} full size="md">
          {busy ? 'Создаём платёж…' : cta}
        </Button>
      </div>
    </Card>
  );
}
