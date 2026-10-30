import React, { useEffect, useId } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { HeroPattern } from '../landing/effects';

/*
 * Peças visuais dos painéis do Classium.
 * Todas as cores vêm do tema (theme/panelThemes.ts), então seguem a cor
 * escolhida pela escola e pelo usuário: var(--accent), var(--bg-card)...
 */

export const EASE = [0.22, 1, 0.36, 1] as const;

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* Estrutura                                                           */
/* ------------------------------------------------------------------ */

export function Page({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-7xl space-y-6 p-4 text-left sm:p-6 lg:p-8', className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {Icon && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">{eyebrow}</p>}
          <h1 className="mt-0.5 font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)] sm:text-[32px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-[var(--text-muted)]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Faixa na cor da marca, no mesmo estilo do hero da landing */
export function BrandHero({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cx(
        'relative isolate overflow-hidden rounded-[32px] p-6 shadow-[0_30px_60px_-40px_rgba(11,18,32,0.55)] sm:p-9',
        className,
      )}
      style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
    >
      <HeroPattern />
      <div className="relative">{children}</div>
    </motion.section>
  );
}

/** Etiqueta pequena acima do título do hero */
export function HeroEyebrow({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold"
      style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg-hover)', color: 'var(--sidebar-fg)' }}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--hero-highlight)' }} />}
      {children}
    </motion.p>
  );
}

/** Traço desenhado à mão embaixo da palavra em destaque (igual à landing) */
export function HandUnderline({ delay = 0.4 }: { delay?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 300 14" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-[0.26em] w-full" fill="none">
      <motion.path
        d="M3 9.5C55 4 120 2.5 180 4.5C220 5.8 262 7.5 297 6"
        stroke="var(--hero-highlight)"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      />
    </svg>
  );
}

/** Título grande do hero. `highlight` ganha o traço à mão. */
export function HeroTitle({ children, highlight }: { children?: React.ReactNode; highlight?: React.ReactNode }) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
      className="mt-4 font-serif text-[32px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[44px]"
    >
      {children}
      {highlight && (
        <>
          {children ? ' ' : null}
          <span className="relative inline-block whitespace-nowrap">
            {highlight}
            <HandUnderline delay={0.6} />
          </span>
        </>
      )}
    </motion.h1>
  );
}

export function HeroText({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
      className="mt-3 max-w-2xl text-[15px] leading-relaxed sm:text-[16px]"
      style={{ color: 'var(--sidebar-muted)' }}
    >
      {children}
    </motion.p>
  );
}

/** Botões dentro do hero (sobre a cor da marca) */
export function HeroButton({
  variant = 'solid',
  icon: Icon,
  children,
  loading,
  iconOnly = false,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'outline'; icon?: LucideIcon; loading?: boolean; iconOnly?: boolean }) {
  const solid = variant === 'solid';
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-all',
        iconOnly ? 'w-11' : 'px-5',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        solid ? 'shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)] hover:-translate-y-px' : 'border hover:brightness-110',
        className,
      )}
      style={
        solid
          ? { background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)' }
          : { borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg-hover)', color: 'var(--sidebar-fg)' }
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

/** Números em vidro dentro do hero */
export function HeroStats({ items }: { items: { label: string; value: React.ReactNode; hint?: React.ReactNode }[] }) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border lg:grid-cols-4" style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-border)' }}>
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 + i * 0.07, ease: EASE }}
          className="px-5 py-4 backdrop-blur-sm"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <p className="text-[12px] font-medium" style={{ color: 'var(--sidebar-muted)' }}>
            {it.label}
          </p>
          <p className="mt-1 font-serif text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{it.value}</p>
          {it.hint && (
            <p className="mt-1.5 text-[12px]" style={{ color: 'var(--sidebar-muted)' }}>
              {it.hint}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabelas                                                             */
/* ------------------------------------------------------------------ */

export const thCls = 'px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]';
export const tdCls = 'px-4 py-3.5 align-middle text-[14px] text-[var(--text-body)]';

export function TableShell({ children, minWidth = 760 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

/** Aviso flutuante no canto da tela */
export function Toast({ message, tone = 'success', onClose }: { message: string | null; tone?: 'success' | 'danger' | 'info'; onClose: () => void }) {
  const Icon = tone === 'danger' ? AlertCircle : tone === 'info' ? Info : CheckCircle2;
  const color = tone === 'danger' ? '#B42318' : tone === 'info' ? 'var(--accent)' : '#127A4B';
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="fixed bottom-24 right-4 z-[80] flex max-w-sm items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3.5 text-[14px] text-[var(--text-heading)] shadow-[0_24px_60px_-24px_rgba(11,18,32,0.45)] md:bottom-6 md:right-6"
        >
          <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color }} />
          <span className="leading-relaxed">{message}</span>
          <button onClick={onClose} aria-label="Fechar aviso" className="-mr-1 ml-1 rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)]">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Card({
  children,
  className = '',
  padded = true,
  as: Tag = 'section',
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag
      className={cx(
        'rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
        padded && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <IconTile icon={Icon} />}
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold text-[var(--text-heading)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function IconTile({ icon: Icon, size = 'md' }: { icon: LucideIcon; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cx('flex shrink-0 items-center justify-center rounded-xl', size === 'sm' ? 'h-8 w-8' : 'h-10 w-10')}
      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
    >
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Números e selos                                                     */
/* ------------------------------------------------------------------ */

type Tone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  neutral: { bg: 'var(--bg-card-alt)', fg: 'var(--text-body)' },
  success: { bg: '#E7F6EE', fg: '#127A4B' },
  warning: { bg: '#FEF4E6', fg: '#A15C07' },
  danger: { bg: '#FDECEC', fg: '#B42318' },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'accent',
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  index?: number;
}) {
  const t = TONES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: EASE }}
      className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-26px_rgba(16,24,40,0.45)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: t.bg }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-[var(--text-muted)]">{label}</p>
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: t.bg, color: t.fg }}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <p className="relative mt-2 font-serif text-[34px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-heading)] tabular-nums">{value}</p>
      {hint && <p className="relative mt-2 text-[12px] text-[var(--text-muted)]">{hint}</p>}
    </motion.div>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold', className)} style={{ background: t.bg, color: t.fg }}>
      {children}
    </span>
  );
}

export function Avatar({ name, src, size = 40 }: { name?: string | null; src?: string | null; size?: number }) {
  const initials =
    (name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, boxShadow: '0 0 0 2px var(--bg-card)' }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34), background: 'var(--accent-soft)', color: 'var(--accent)' }}
    >
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Botões e campos                                                     */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
};

export function Button({ variant = 'primary', size = 'md', icon: Icon, loading, children, className = '', disabled, style, ...rest }: ButtonProps) {
  const sizes = { sm: 'h-9 px-3.5 text-[13px]', md: 'h-11 px-5 text-[14px]', lg: 'h-12 px-6 text-[15px]' };
  const variants: Record<string, { cls: string; style?: React.CSSProperties }> = {
    primary: { cls: 'shadow-[0_8px_20px_-12px_rgba(16,24,40,0.5)] hover:brightness-[1.06]', style: { background: 'var(--accent)', color: 'var(--accent-fg)' } },
    secondary: { cls: 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-heading)] hover:border-[var(--accent)]' },
    ghost: { cls: 'text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)]' },
    danger: { cls: 'bg-[#FDECEC] text-[#B42318] hover:bg-[#FBD5D5]' },
  };
  const v = variants[variant];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{ ...v.style, ...style }}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        sizes[size],
        v.cls,
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: React.ReactNode;
  children: (id: string) => React.ReactNode;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text-heading)]">
        {label}
        {required && <span className="ml-0.5 text-[#B42318]">*</span>}
      </label>
      {children(id)}
      {hint && <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-2.5 text-[14px] text-[var(--text-heading)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]';

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'var(--border)' }}
    >
      <motion.span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
        animate={{ left: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

/** Navegação em pílulas (rola na horizontal no celular) */
export function PillNav<T extends string | number>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; label: string; icon?: LucideIcon; badge?: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto pb-1">
      <div className="flex w-max gap-1.5 px-1">
        {items.map(({ id, label: text, icon: Icon, badge }) => {
          const active = id === value;
          return (
            <button
              key={String(id)}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors',
                active ? '' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]',
              )}
              style={active ? { color: 'var(--accent-fg)' } : undefined}
            >
              {active && (
                <motion.span
                  layoutId={`pill-${label}`}
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                {text}
                {badge !== undefined && badge !== null && badge !== '' && (
                  <span
                    className="rounded-full px-1.5 text-[11px]"
                    style={active ? { background: 'rgba(255,255,255,0.22)' } : { background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    {badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Estados                                                             */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  text?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card-alt)] text-center',
        compact ? 'px-6 py-8' : 'px-6 py-14',
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-[var(--text-heading)]">{title}</p>
      {text && <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[var(--text-muted)]">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const map = {
    info: { icon: Info, bg: 'var(--accent-soft)', fg: 'var(--text-heading)', ic: 'var(--accent)' },
    success: { icon: CheckCircle2, bg: '#E7F6EE', fg: '#0E5A38', ic: '#127A4B' },
    warning: { icon: TriangleAlert, bg: '#FEF4E6', fg: '#7A4505', ic: '#A15C07' },
    danger: { icon: AlertCircle, bg: '#FDECEC', fg: '#8A1C13', ic: '#B42318' },
  }[tone];
  const Icon = map.icon;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className="flex flex-col gap-3 rounded-2xl px-4 py-3.5 text-[14px] leading-relaxed sm:flex-row sm:items-center"
      style={{ background: map.bg, color: map.fg }}
    >
      <div className="flex flex-1 items-start gap-3">
        <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: map.ic }} />
        <div>
          {title && <p className="font-semibold">{title}</p>}
          <div>{children}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-2xl bg-[var(--bg-card-alt)]', className)} />;
}

export function PageSkeleton() {
  return (
    <Page>
      <Skeleton className="h-40 rounded-[28px]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl' };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 cursor-default bg-[#0B1220]/50 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
            className={cx(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[var(--bg-card)] text-left shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)] sm:rounded-[28px]',
              widths[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div className="flex min-w-0 items-center gap-3">
                {icon}
                <div className="min-w-0">
                  <h2 id={titleId} className="truncate font-serif text-[22px] font-semibold text-[var(--text-heading)]">
                    {title}
                  </h2>
                  {subtitle && <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{subtitle}</p>}
                </div>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}