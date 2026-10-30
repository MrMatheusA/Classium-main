import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';

/** Cartão de atalho para uma área do módulo */
export interface CategoryCardProps {
  title: string;
  description?: React.ReactNode;
  tag?: string;
  icon?: LucideIcon;
  /** amber, blue, emerald, indigo, cyan, rose, purple... (tom do ícone) */
  categoryColor?: string;
  metricLabel?: string;
  statusBadge?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  className?: string;
  [key: string]: unknown;
}

const TINTS: Record<string, { bg: string; fg: string }> = {
  amber: { bg: '#FEF4E6', fg: '#A15C07' },
  orange: { bg: '#FFF1E8', fg: '#B54708' },
  emerald: { bg: '#E7F6EE', fg: '#127A4B' },
  green: { bg: '#E7F6EE', fg: '#127A4B' },
  rose: { bg: '#FDECEF', fg: '#B42346' },
  red: { bg: '#FDECEC', fg: '#B42318' },
  purple: { bg: '#F2EDFB', fg: '#6941C6' },
  cyan: { bg: '#E6F6FA', fg: '#0E7490' },
  teal: { bg: '#E6F6F3', fg: '#0F766E' },
};

/** "MÓDULO ATIVO" -> "Módulo ativo" */
const pretty = (s?: string) => (s && s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

export function CategoryCard({
  title,
  description,
  tag,
  icon: Icon,
  categoryColor = 'accent',
  metricLabel,
  statusBadge,
  onClick,
  showChevron = false,
  className = '',
}: CategoryCardProps) {
  // azul / índigo / dourado seguem a cor da escola
  const tint = TINTS[categoryColor] ?? { bg: 'var(--accent-soft)', fg: 'var(--accent)' };
  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={[
        'group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 text-left transition-all duration-300',
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_24px_44px_-30px_rgba(16,24,40,0.55)]' : '',
        className,
      ].join(' ')}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: tint.bg }}
      />

      <div className="relative flex items-start justify-between gap-3">
        {Icon && (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: tint.bg, color: tint.fg }}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        {showChevron && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition-all group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]">
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        )}
      </div>

      {tag && <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: tint.fg }}>{pretty(tag)}</p>}
      <h3 className="relative mt-1 text-[16px] font-semibold leading-snug text-[var(--text-heading)]">{title}</h3>
      {description && <p className="relative mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{description}</p>}

      {(metricLabel || statusBadge) && (
        <div className="relative mt-4 border-t border-[var(--border)] pt-3">
          {metricLabel && <p className="text-[12px] text-[var(--text-muted)]">{metricLabel}</p>}
          {statusBadge && <p className="mt-0.5 text-[13px] font-semibold text-[var(--text-heading)]">{statusBadge}</p>}
        </div>
      )}
    </Tag>
  );
}

export default CategoryCard;