// src/components/ui.tsx — reusable UI primitives (design system)

'use client';

import React, { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

// ---------- Button ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 hover:bg-slate-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-emerald-950 shadow-sm',
  secondary:
    'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700',
  ghost: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800',
  danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm',
  soft: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-3 text-base rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------- Card ----------

export function Card({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-5 pb-0">
      <div className="min-w-0">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ---------- Badge ----------

interface BadgeProps {
  children: ReactNode;
  color?: 'slate' | 'emerald' | 'amber' | 'blue' | 'rose' | 'violet';
  className?: string;
}

const badgeColors: Record<NonNullable<BadgeProps['color']>, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
};

export function Badge({ children, color = 'slate', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[color]} ${className}`}
    >
      {children}
    </span>
  );
}

// ---------- Inputs ----------

interface FieldProps {
  label?: string;
  hint?: string;
}

export function Input({
  label,
  hint,
  className = '',
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  return (
    <Field label={label} hint={hint} id={id}>
      <input
        id={id}
        className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${className}`}
        {...props}
      />
    </Field>
  );
}

export function Textarea({
  label,
  hint,
  className = '',
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  return (
    <Field label={label} hint={hint} id={id}>
      <textarea
        id={id}
        className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${className}`}
        {...props}
      />
    </Field>
  );
}

export function Select({
  label,
  hint,
  className = '',
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  return (
    <Field label={label} hint={hint} id={id}>
      <select
        id={id}
        className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}

function Field({
  label,
  hint,
  id,
  children,
}: {
  label?: string;
  hint?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ---------- Modal ----------

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-xl leading-none text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ---------- Empty State ----------

export function EmptyState({
  emoji = '🌱',
  title,
  message,
  action,
  className = '',
}: {
  emoji?: string;
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------- Stat ----------

export function Stat({
  label,
  value,
  icon,
  accentClass = 'text-slate-900 dark:text-white',
}: {
  label: string;
  value: ReactNode;
  icon?: string;
  accentClass?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
        {icon && <span aria-hidden>{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-black sm:text-3xl ${accentClass}`}>{value}</p>
    </Card>
  );
}

// ---------- Progress ----------

export function ProgressBar({
  value,
  className = '',
  color = 'bg-slate-900 dark:bg-emerald-500',
}: {
  value: number;
  className?: string;
  color?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

// ---------- Tag chip (toggleable) ----------

export function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'border border-slate-900 bg-slate-900 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950'
          : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

// ---------- Toggle switch ----------

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className = '',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex shrink-0 items-center transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {label && <span className="sr-only">{label}</span>}
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}