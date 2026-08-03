import type { ReactNode } from 'react';

const VARIANTS = {
  role: 'bg-olive-100 text-olive-800',
  success: 'bg-success-fill text-success',
  neutral: 'bg-[#EDF0F3] text-ink-secondary',
} as const;

const HOLES = {
  role: 'border-olive-800/40',
  success: 'border-success/40',
  neutral: 'border-ink-tertiary/50',
} as const;

export function Hangtag({
  variant = 'role',
  children,
}: {
  variant?: keyof typeof VARIANTS;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-[3px_6px_6px_3px] pr-2.5 pl-2 text-xs font-medium whitespace-nowrap ${VARIANTS[variant]}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 flex-none rounded-full border bg-surface ${HOLES[variant]}`}
      />
      {children}
    </span>
  );
}
