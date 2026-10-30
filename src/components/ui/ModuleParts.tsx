import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { Button, Modal, EASE, cx } from './kit';

/**
 * Peças comuns dos módulos do painel (Transporte, Portaria, Achados, Cardápio, Radar…).
 * Mesmo visual da landing: grade de caderno, título em serifa e cores do tema da escola.
 */

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_FG: Record<Tone, string> = {
  accent: 'var(--accent)',
  success: '#127A4B',
  warning: '#A15C07',
  danger: '#B42318',
  neutral: 'var(--text-muted)',
};

/* ------------------------------------------------------------------ */
/* Topo do módulo                                                      */
/* ------------------------------------------------------------------ */

export function ModuleHeader({
  icon: Icon,
  title,
  count,
  text,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  count?: React.ReactNode;
  text?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--accent-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-soft) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
        }}
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">
              {title}
              {count !== undefined && count !== null && (
                <span className="ml-2 align-middle font-sans text-[14px] font-medium text-[var(--text-muted)]">{count}</span>
              )}
            </h2>
            {text && <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-[var(--text-muted)]">{text}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">{actions}</div>}
      </div>
      {children && <div className="relative mt-5">{children}</div>}
    </section>
  );
}

/** Botão redondo só com ícone (atualizar, fechar…) */
export function RoundIconButton({
  icon: Icon,
  label,
  onClick,
  spinning,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  spinning?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
    >
      <Icon className={cx('h-4 w-4', spinning && 'animate-spin')} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Faixa de números                                                    */
/* ------------------------------------------------------------------ */

export interface Metric {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
}

export function MetricStrip({ items }: { items: Metric[] }) {
  const cols =
    items.length >= 5 ? 'sm:grid-cols-3 lg:grid-cols-5' : items.length === 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <div className={cx('grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--border)]', cols)}>
      {items.map((m, i) => {
        const Icon = m.icon;
        const fg = TONE_FG[m.tone || 'neutral'];
        return (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04, ease: EASE }}
            className="bg-[var(--bg-card)] px-5 py-4"
          >
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-muted)]">
              {Icon && <Icon className="h-3.5 w-3.5" style={{ color: m.tone && m.tone !== 'neutral' ? fg : undefined }} />}
              {m.label}
            </p>
            <p
              className="mt-1 font-serif text-[28px] font-semibold leading-none tabular-nums"
              style={{ color: m.tone && m.tone !== 'neutral' && m.tone !== 'accent' ? fg : 'var(--text-heading)' }}
            >
              {m.value}
            </p>
            {m.hint && <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">{m.hint}</p>}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confirmação (substitui o confirm() do navegador)                     */
/* ------------------------------------------------------------------ */

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirmar',
  loading,
  danger = true,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <Modal
      open={open}
      onClose={() => !loading && onClose()}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="secondary" disabled={loading} onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} icon={icon} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[14px] leading-relaxed text-[var(--text-body)]">{children}</div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Pequenos utilitários visuais                                        */
/* ------------------------------------------------------------------ */

/** Linha "rótulo — valor" usada em fichas */
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
      <span className="shrink-0 text-[var(--text-muted)]">{label}</span>
      <span className="min-w-0 text-right font-medium text-[var(--text-heading)]">{children}</span>
    </div>
  );
}

/** Barra de ocupação/progresso */
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct >= 100 ? '#B42318' : pct >= 75 ? '#B54708' : 'var(--accent)';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: EASE }}
      />
    </div>
  );
}

/** Seleção em segmentos (filtros curtos: Todos / Pendentes / Resolvidas) */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--bg-card-alt)] p-1">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(it.id)}
            className={cx(
              'flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors',
              active ? 'bg-[var(--bg-card)] text-[var(--text-heading)] shadow-[0_1px_3px_rgba(16,24,40,0.12)]' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]',
            )}
          >
            {it.label}
            {it.count !== undefined && <span className="text-[11px] font-medium tabular-nums text-[var(--text-muted)]">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}