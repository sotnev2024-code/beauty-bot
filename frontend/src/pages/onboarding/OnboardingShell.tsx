import type { ReactNode } from 'react';

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function OnboardingShell({ step, total, title, subtitle, children, footer }: Props) {
  return (
    <div className="flex flex-col flex-1 px-5 pt-6 pb-[max(env(safe-area-inset-bottom),16px)] gap-6">
      <div className="flex flex-col gap-3">
        <ProgressBar step={step} total={total} />
        <div>
          <p className="text-xs uppercase tracking-wider text-mute font-medium">
            Шаг {step} из {total}
          </p>
          <h1 className="font-display text-2xl text-ink mt-1">{title}</h1>
          {subtitle && <p className="text-sm text-ink-soft mt-1.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4">{children}</div>
      {footer && <div className="flex flex-col gap-2">{footer}</div>}
    </div>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.min(100, Math.round((step / total) * 100));
  return (
    <div className="h-1 bg-divider rounded-full overflow-hidden">
      <div
        className="h-full bg-coral-grad transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
