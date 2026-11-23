import React, { createContext, useCallback, useContext, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/* ---------- Button ---------- */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'confirm' | 'info' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-gold text-deep hover:bg-gold-light font-semibold shadow-sm shadow-gold/20',
    secondary: 'bg-surface2 text-ink hover:bg-surface2/80 border border-white/10',
    outline: 'bg-transparent text-ink border border-white/15 hover:bg-surface2',
    ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-white/5',
    confirm: 'bg-confirm text-deep hover:brightness-110 font-semibold',
    info: 'bg-info text-deep hover:brightness-110 font-semibold',
    danger: 'bg-alert/15 text-red-300 border border-alert/35 hover:bg-alert/25',
  };
  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

/* ---------- Card ---------- */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-surface border border-white/[0.08] rounded-2xl p-5 shadow-lg shadow-black/25',
        className
      )}
      {...props}
    />
  );
}

/* ---------- Badge ---------- */
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'gold' | 'confirm' | 'info' | 'alert' | 'muted';
}

export function Badge({ className, tone = 'muted', ...props }: BadgeProps) {
  const tones: Record<NonNullable<BadgeProps['tone']>, string> = {
    gold: 'bg-gold/15 text-gold-light border-gold/30',
    confirm: 'bg-confirm/15 text-green-300 border-confirm/30',
    info: 'bg-info/15 text-sky-300 border-info/30',
    alert: 'bg-alert/15 text-red-300 border-alert/30',
    muted: 'bg-white/[0.06] text-ink-muted border-white/10',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

/* ---------- Input & Select ---------- */
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full bg-deep border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:border-gold transition-colors',
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full bg-deep border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-gold transition-colors',
        className
      )}
      {...props}
    />
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface border border-white/15 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg bg-surface2 text-ink-muted hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Empty State ---------- */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-surface/70 border border-dashed border-white/15 rounded-2xl p-8 text-center">
      <h4 className="text-base font-semibold text-ink mb-1">{title}</h4>
      <p className="text-sm text-ink-muted max-w-md mx-auto mb-4">{description}</p>
      {action}
    </div>
  );
}

/* ---------- Toast System ---------- */
interface ToastItem {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

const ToastContext = createContext<{
  toast: (message: string, tone?: ToastItem['tone']) => void;
}>({
  toast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-20 right-4 left-4 sm:left-auto z-50 flex flex-col items-end gap-2 pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto max-w-sm px-4 py-3 rounded-xl text-sm font-medium bg-surface2 border shadow-xl',
              item.tone === 'success' && 'border-confirm/45 text-green-200',
              item.tone === 'error' && 'border-alert/45 text-red-200',
              item.tone === 'info' && 'border-gold/40 text-ink'
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
