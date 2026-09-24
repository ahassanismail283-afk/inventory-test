import React from 'react';
import { Minus, Plus, LucideIcon } from 'lucide-react';
import { Role, TransactionType } from '../types';

// Shared building blocks for the whole interface.
// Shape rule: controls (inputs, buttons) use rounded-xl; containers (cards, panels) use rounded-2xl;
// badges and chips are fully rounded pills.
// Color rule: cool slate neutrals plus the single cobalt `primary` accent. Emerald and rose are
// reserved for the in/out meaning of a movement, red for destructive actions and empty stock.

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

export const inputClass =
  'block w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 ' +
  'placeholder:text-slate-500 transition-colors hover:border-slate-300 ' +
  'focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/15 ' +
  'disabled:bg-slate-100 disabled:text-slate-500';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white shadow-sm shadow-primary-600/30 hover:bg-primary-700 focus-visible:outline-primary-600',
  secondary: 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-500',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-500',
  danger: 'text-red-700 hover:bg-red-50 focus-visible:outline-red-600',
  // For use on the cobalt header band
  inverse: 'bg-white text-primary-800 shadow-sm hover:bg-primary-50 focus-visible:outline-white',
};

export const buttonClass = (variant: ButtonVariant = 'primary', extra = '') =>
  cx(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium',
    'transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    buttonVariants[variant],
    extra
  );

export const iconButtonClass = (variant: 'ghost' | 'danger' = 'ghost') =>
  cx(
    'inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
    variant === 'danger'
      ? 'text-slate-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-red-600'
      : 'text-slate-500 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-primary-600'
  );

// Page title. It sits on the cobalt band at the top of every page, so it is set in white.
export const PageHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode }> = ({
  title,
  description,
  actions,
}) => (
  <div className="mb-6 flex flex-col gap-4 text-white sm:flex-row sm:items-end sm:justify-between no-print">
    <div>
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 max-w-[65ch] text-sm text-primary-100/90">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cx('rounded-2xl border border-slate-200/70 bg-white shadow-card', className)}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
  <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-5">
    <h2 className="text-base font-semibold text-slate-900">{children}</h2>
    {aside}
  </div>
);

export const Field: React.FC<{ label: string; htmlFor: string; hint?: string; children: React.ReactNode }> = ({
  label,
  htmlFor,
  hint,
  children,
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-600">{hint}</p>}
  </div>
);

export const TxTypeBadge: React.FC<{ type: TransactionType }> = ({ type }) => {
  const isAddition = type === 'إضافة';
  const Icon = isAddition ? Plus : Minus;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-2 text-xs font-medium',
        isAddition ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {isAddition ? 'وارد' : 'منصرف'}
    </span>
  );
};

export const StockValue: React.FC<{ value: number }> = ({ value }) =>
  value <= 0 ? (
    <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-red-50 px-2.5 py-0.5 font-semibold tabular-nums text-red-700">
      {value}
    </span>
  ) : (
    <span className="font-semibold tabular-nums text-slate-900">{value}</span>
  );

export const EmptyState: React.FC<{ icon: LucideIcon; title: string; hint?: string }> = ({ icon: Icon, title, hint }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
      <Icon className="h-6 w-6" strokeWidth={1.75} />
    </div>
    <p className="font-semibold text-slate-900">{title}</p>
    {hint && <p className="mt-1 max-w-sm text-sm text-slate-600">{hint}</p>}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div className="divide-y divide-slate-100 motion-safe:animate-pulse" aria-hidden="true">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-6 px-5 py-4">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className={cx('h-4 rounded-full bg-slate-200', c === 0 ? 'flex-[2]' : 'flex-1')} />
        ))}
      </div>
    ))}
  </div>
);

export const roleLabels: Record<Role, string> = {
  ADMIN: 'مدير النظام',
  MANAGER: 'مراقب',
  CLIENT: 'مدخل بيانات',
};

// Table cell styles shared by every data table
export const th = 'px-5 py-3 text-right text-xs font-medium text-slate-500';
export const td = 'px-5 py-3.5 text-sm text-slate-800';
export const theadClass = 'border-y border-slate-100 bg-slate-50/60';
