import type { MouseEvent, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

export function Card({ children, className = '', padded = true, onClick }: Props) {
  const interactive = onClick ? 'cursor-pointer' : '';
  return (
    <div
      className={`bg-card border border-divider rounded-2xl shadow-sm ${padded ? 'p-4' : ''} ${interactive} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
