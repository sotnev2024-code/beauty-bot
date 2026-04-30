import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ children, className = '', padded = true }: Props) {
  return (
    <div
      className={`bg-card border border-divider rounded-2xl shadow-sm ${padded ? 'p-4' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
