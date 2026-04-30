import { forwardRef, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, error, className = '', ...rest }, ref) => {
    return (
      <label className="flex flex-col gap-1.5">
        {label && <span className="text-sm text-ink-soft font-medium">{label}</span>}
        <input
          ref={ref}
          className={`h-11 px-3.5 rounded-xl bg-card border border-divider text-base text-ink placeholder:text-mute focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''} ${className}`}
          {...rest}
        />
        {error ? (
          <span className="text-xs text-danger">{error}</span>
        ) : hint ? (
          <span className="text-xs text-mute">{hint}</span>
        ) : null}
      </label>
    );
  }
);
Input.displayName = 'Input';
