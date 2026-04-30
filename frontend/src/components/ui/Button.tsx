import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-coral-grad text-white shadow-coral hover:brightness-105 active:scale-[0.98]',
  secondary: 'bg-card text-ink border border-divider hover:bg-bg active:scale-[0.98]',
  ghost: 'bg-transparent text-ink hover:bg-divider/50',
  danger: 'bg-danger text-white hover:brightness-105 active:scale-[0.98]',
};

const SIZE: Record<Size, string> = {
  md: 'h-11 px-4 text-base rounded-xl',
  lg: 'h-14 px-6 text-lg rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className = '', variant = 'primary', size = 'md', full, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-semibold transition disabled:opacity-50 disabled:pointer-events-none ${VARIANT[variant]} ${SIZE[size]} ${full ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
