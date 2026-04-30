import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** When true, container is full-screen on mobile but framed on desktop. */
  framed?: boolean;
}

export function PhoneShell({ children, framed = true }: Props) {
  return (
    <div className="min-h-full w-full flex items-stretch justify-center bg-bg">
      <div
        className={`w-full ${
          framed
            ? 'sm:max-w-[400px] sm:my-6 sm:rounded-3xl sm:shadow-md sm:border sm:border-divider sm:bg-bg sm:overflow-hidden'
            : ''
        } flex flex-col min-h-screen sm:min-h-[760px]`}
      >
        {children}
      </div>
    </div>
  );
}
