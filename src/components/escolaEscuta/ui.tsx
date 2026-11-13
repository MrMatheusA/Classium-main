import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Bold,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Loader2,
  Paperclip,
  RefreshCw,
  Trash2,
  Upload,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Field, Modal, cx, inputCls, EASE } from '../ui/kit';
import {
  type Escola,
  type Publico,
  type PreviaPublico,
  type Turma,
  descreverPublico,
  enviarAnexo,
  linkAnexo,
  listarDocentes,
  listarTurmas,
  previaPublico,
} from '../../services/escolaEscuta/api';

/* ---------------------------------------------------------------- */
/* Botões (mesmo padrão da Comunicação)                              */
/* ---------------------------------------------------------------- */

export const btn = {
  primary:
    'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-[14px] font-semibold text-[var(--accent-fg)] shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
  secondary:
    'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 text-[14px] font-semibold text-[var(--text-body)] transition-colors hover:bg-[var(--bg-card-alt)] disabled:cursor-not-allowed disabled:opacity-60',
  ghost:
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)] disabled:opacity-50',
  danger:
    'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#D92D20] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#B42318] disabled:cursor-not-allowed disabled:opacity-60',
  success:
    'inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#067647] px-4 text-[14px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60',
  icon: 'inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)]',
};

/* ---------------------------------------------------------------- */
/* Cabeçalho de página                                               */
/* ---------------------------------------------------------------- */

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
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
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_12px_24px_-14px_rgba(16,24,40,0.6)]"
            style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-[26px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)] sm:text-[28px]">{title}</h1>
            {subtitle && <p className="mt-1 text-[15px] text-[var(--text-muted)]">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-5">{children}</div>}
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Abas                                                              */
/* ---------------------------------------------------------------- */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: LucideIcon; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-1 rounded-[22px] bg-[var(--bg-card-alt)] p-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cx(
              'flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors',
              active ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm' : 'text-[var(--text-body)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]',
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            {t.label}
            {!!t.count && (
              <span
                className={cx(
                  'min-w-[20px] rounded-full px-1.5 text-center text-[11px] tabular-nums leading-5',
                  active ? 'bg-white/25' : 'bg-[#D92D20] text-white',
                )}
              >
                {t.count > 99 ? '99+' : t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Estados                                                           */
/* ---------------------------------------------------------------- */

export function Painel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5', className)}>{children}</div>;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-[var(--text-heading)]">{title}</p>
      {text && <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[var(--text-muted)]">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Carregando({ linhas = 3, altura = 'h-20' }: { linhas?: number; altura?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className={cx(altura, 'animate-pulse rounded-[20px] bg-[var(--bg-card-alt)]')} />
      ))}
    </div>
  );
}

export function ErroBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-[20px] border border-[#F5C2C0] bg-[#FEF3F2] p-4 text-[14px] text-[#B42318] sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {error}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold text-[#B42318] shadow-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
        </button>
      )}
    </div>
  );
}

export function InfoBox({ children, tone = 'info', icon: Icon = AlertCircle }: { children: React.ReactNode; tone?: 'info' | 'warning' | 'danger' | 'success'; icon?: LucideIcon }) {
  const t = {
    info: 'border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]',
    warning: 'border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]',
    danger: 'border-[#F5C2C0] bg-[#FEF3F2] text-[#B42318]',
    success: 'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]',
  }[tone];
  return (
    <div className={cx('flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-[13px] leading-relaxed', t)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export type Tom = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
const TOM: Record<Tom, string> = {
  success: 'bg-[#ECFDF3] text-[#067647]',
  warning: 'bg-[#FFFAEB] text-[#B54708]',
  danger: 'bg-[#FEF3F2] text-[#B42318]',
  info: 'bg-[#EFF8FF] text-[#175CD3]',
  neutral: 'bg-[var(--bg-card-alt)] text-[var(--text-body)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
};
export function Pill({ tone = 'neutral', children, className }: { tone?: Tom; children: React.ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium', TOM[tone], className)}>{children}</span>;
}

/* ---------------------------------------------------------------- */
/* Aviso flutuante (toast)                                           */
/* ---------------------------------------------------------------- */

export function useToast() {
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const t = useRef<number>();
  const show = (text: string, tone: 'success' | 'danger' = 'success') => {
    setToast({ text, tone });
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setToast(null), 4500);
  };
  const node = (
    <AnimatePresence>
      {toast && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18, ease: EASE }}
          className={cx(
            'fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 text-[14px] shadow-[0_20px_50px_-24px_rgba(16,24,40,0.5)]',
            toast.tone === 'success' ? 'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]' : 'border-[#F5C2C0] bg-[#FEF3F2] text-[#B42318]',
          )}
        >
          {toast.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar" className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { show, node };
}

/* ---------------------------------------------------------------- */
/* Painel lateral (editores)                                         */
/* ---------------------------------------------------------------- */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-2xl',
  bloqueado,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  bloqueado?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !bloqueado && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, bloqueado]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[rgba(16,24,40,0.45)] backdrop-blur-[2px]"
            onClick={() => !bloqueado && onClose()}
          />
          <motion.aside
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className={cx('relative flex h-full w-full flex-col bg-[var(--bg-card)] shadow-[0_0_80px_-20px_rgba(16,24,40,0.5)] sm:m-3 sm:h-[calc(100%-24px)] sm:rounded-[28px]', width)}
          >
            <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="truncate font-serif text-[20px] font-semibold text-[var(--text-heading)]">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} disabled={bloqueado} aria-label="Fechar" className={btn.icon}>
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4 sm:px-6">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- */
/* Confirmação                                                       */
/* ---------------------------------------------------------------- */

export function ConfirmModal({
  open,
  title,
  text,
  confirmLabel = 'Confirmar',
  tone = 'primary',
  loading,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  text?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={() => !loading && onClose()}
      size="md"
      title={title}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose} disabled={loading}>
            Voltar
          </button>
          <button type="button" className={tone === 'danger' ? btn.danger : btn.primary} onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      {text && <div className="text-[14px] leading-relaxed text-[var(--text-body)]">{text}</div>}
      {children}
    </Modal>
  );
}

/* ---------------------------------------------------------------- */
/* Texto com formatação básica (negrito, itálico, listas, links)     */
/* Seguro: nada de HTML vindo do usuário é interpretado.             */
/* ---------------------------------------------------------------- */

function inline(texto: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(texto))) {
    if (m.index > last) out.push(texto.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={`${keyBase}-${i++}`}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('_')) out.push(<em key={`${keyBase}-${i++}`}>{tok.slice(1, -1)}</em>);
    else
      out.push(
        <a key={`${keyBase}-${i++}`} href={tok} target="_blank" rel="noopener noreferrer" className="break-all text-[var(--accent)] underline underline-offset-2">
          {tok}
        </a>,
      );
    last = m.index + tok.length;
  }
  if (last < texto.length) out.push(texto.slice(last));
  return out;
}

export function TextoFormatado({ texto, className }: { texto?: string | null; className?: string }) {
  const blocos = useMemo(() => (texto || '').replace(/\r/g, '').split(/\n{2,}/), [texto]);
  return (
    <div className={cx('space-y-3 text-[15px] leading-relaxed text-[var(--text-body)]', className)}>
      {blocos.map((b, bi) => {
        const linhas = b.split('\n');
        if (linhas.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5">
              {linhas.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-•]\s+/, ''), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} className="whitespace-pre-line">
            {inline(b, String(bi))}
          </p>
        );
      })}
    </div>
  );
}

export function EditorTexto({
  value,
  onChange,
  rows = 8,
  placeholder,
  max = 8000,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  max?: number;
  id?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const envolver = (antes: string, depois = antes) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e) || 'texto';
    const novo = value.slice(0, s) + antes + sel + depois + value.slice(e);
    onChange(novo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + antes.length, s + antes.length + sel.length);
    });
  };
  const lista = () => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const ini = value.lastIndexOf('\n', s - 1) + 1;
    onChange(value.slice(0, ini) + '- ' + value.slice(ini));
    requestAnimationFrame(() => el.focus());
  };
  const [preview, setPreview] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] focus-within:border-[var(--accent)]">
      <div className="flex items-center gap-0.5 border-b border-[var(--border)] bg-[var(--bg-card-alt)] px-1.5 py-1">
        <button type="button" className={btn.icon} onClick={() => envolver('**')} aria-label="Negrito" title="Negrito">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={btn.icon} onClick={() => envolver('_')} aria-label="Itálico" title="Itálico">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={btn.icon} onClick={lista} aria-label="Lista" title="Lista">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={btn.icon} onClick={() => envolver('https://', '')} aria-label="Link" title="Link">
          <Link2 className="h-4 w-4" />
        </button>
        <span className="flex-1" />
        <button type="button" className={btn.ghost} onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
          {preview ? 'Editar' : 'Prévia'}
        </button>
      </div>
      {preview ? (
        <div className="min-h-[160px] bg-[var(--bg-card)] p-3.5">
          {value.trim() ? <TextoFormatado texto={value} /> : <p className="text-[14px] text-[var(--text-muted)]">Nada para mostrar ainda.</p>}
        </div>
      ) : (
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full resize-y border-0 bg-[var(--bg-card)] p-3.5 text-[14px] leading-relaxed text-[var(--text-heading)] outline-none placeholder:text-[var(--text-muted)]"
        />
      )}
      <div className="flex justify-between border-t border-[var(--border)] bg-[var(--bg-card-alt)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
        <span>**negrito** · _itálico_ · - lista</span>
        <span className="tabular-nums">
          {value.length}/{max}
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Seleção de público com prévia do alcance                          */
/* ---------------------------------------------------------------- */

const TURNOS = ['Matutino', 'Vespertino', 'Noturno', 'Integral'];

export function PublicoPicker({
  orgId,
  value,
  onChange,
  permitirDocentes = true,
  permitirFamilias = true,
  onPrevia,
}: {
  orgId: string;
  value: Publico;
  onChange: (p: Publico) => void;
  permitirDocentes?: boolean;
  permitirFamilias?: boolean;
  onPrevia?: (p: PreviaPublico | null) => void;
}) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [docentes, setDocentes] = useState<{ user_id: string; nome: string }[]>([]);
  const [previa, setPrevia] = useState<PreviaPublico | null>(null);
  const [carregando, setCarregando] = useState(false);
  const onPreviaRef = useRef(onPrevia);
  onPreviaRef.current = onPrevia;

  useEffect(() => {
    listarTurmas(orgId).then((r) => setTurmas(r.data || []));
    if (permitirDocentes)
      listarDocentes(orgId).then((r) => {
        const visto = new Set<string>();
        setDocentes((r.data || []).filter((d) => d.user_id && !visto.has(d.user_id) && visto.add(d.user_id)));
      });
  }, [orgId, permitirDocentes]);

  const chave = JSON.stringify(value);
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    const t = window.setTimeout(async () => {
      const r = await previaPublico(orgId, value);
      if (!vivo) return;
      setPrevia(r.data || null);
      onPreviaRef.current?.(r.data || null);
      setCarregando(false);
    }, 350);
    return () => {
      vivo = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, chave]);

  const set = (patch: Partial<Publico>) => onChange({ ...value, ...patch });
  const toggle = (lista: string[] | undefined, item: string) => {
    const s = new Set(lista || []);
    s.has(item) ? s.delete(item) : s.add(item);
    return Array.from(s);
  };
  const turnosDisponiveis = Array.from(new Set([...TURNOS, ...turmas.map((t) => t.turno || '').filter(Boolean)]));

  return (
    <div className="space-y-4">
      {permitirFamilias && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Famílias</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: null, label: 'Nenhuma' },
              { id: 'todas', label: 'Todas as famílias' },
              { id: 'turnos', label: 'Por turno' },
              { id: 'turmas', label: 'Por turma' },
            ].map((o) => (
              <Chip key={String(o.id)} active={(value.familias || null) === o.id} onClick={() => set({ familias: o.id as Publico['familias'] })}>
                {o.label}
              </Chip>
            ))}
          </div>
          {value.familias === 'turnos' && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {turnosDisponiveis.map((t) => (
                <Chip key={t} small active={(value.turnos || []).map((x) => x.toLowerCase()).includes(t.toLowerCase())} onClick={() => set({ turnos: toggle(value.turnos, t.toLowerCase()) })}>
                  {t}
                </Chip>
              ))}
            </div>
          )}
          {value.familias === 'turmas' && (
            <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {turmas.length === 0 && <span className="text-[13px] text-[var(--text-muted)]">Nenhuma turma cadastrada.</span>}
              {turmas.map((t) => (
                <Chip key={t.id} small active={(value.turmas || []).includes(t.id)} onClick={() => set({ turmas: toggle(value.turmas, t.id) })}>
                  {t.nome}
                  {t.turno ? ` · ${t.turno}` : ''}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {permitirDocentes && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-[var(--text-body)]">Docentes</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: null, label: 'Nenhum' },
              { id: 'todos', label: 'Todos os docentes' },
              { id: 'selecionados', label: 'Escolher docentes' },
            ].map((o) => (
              <Chip key={String(o.id)} active={(value.docentes || null) === o.id} onClick={() => set({ docentes: o.id as Publico['docentes'] })}>
                {o.label}
              </Chip>
            ))}
          </div>
          {value.docentes === 'selecionados' && (
            <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {docentes.length === 0 && <span className="text-[13px] text-[var(--text-muted)]">Nenhum docente encontrado.</span>}
              {docentes.map((d) => (
                <Chip key={d.user_id} small active={(value.docente_ids || []).includes(d.user_id)} onClick={() => set({ docente_ids: toggle(value.docente_ids, d.user_id) })}>
                  {d.nome}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-3.5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-heading)]">
          <Users className="h-4 w-4 text-[var(--accent)]" />
          Alcance
          {carregando && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />}
        </div>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">{descreverPublico(value, turmas)}</p>
        {previa && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone={previa.total > 0 ? 'accent' : 'danger'}>{previa.total} destinatário(s)</Pill>
            {previa.familias > 0 && <Pill>{previa.familias} responsáveis (sem repetir irmãos)</Pill>}
            {previa.docentes > 0 && <Pill>{previa.docentes} docentes</Pill>}
            {previa.sem_acesso > 0 && <Pill tone="warning">{previa.sem_acesso} sem acesso ao portal</Pill>}
          </div>
        )}
      </div>
    </div>
  );
}

export function Chip({ active, onClick, children, small }: { active?: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'rounded-full border font-medium transition-colors',
        small ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]',
        active ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]',
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Anexos protegidos                                                 */
/* ---------------------------------------------------------------- */

export interface AnexoInfo {
  id?: string;
  path: string;
  nome: string;
  mime?: string | null;
  tamanho?: number | null;
}

const ehImagem = (a: AnexoInfo) => /^image\//.test(a.mime || '') || /\.(png|jpe?g|gif|webp)$/i.test(a.nome);
const tamanho = (n?: number | null) => (!n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function AnexoImagem({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    linkAnexo(path).then((u) => vivo && setUrl(u));
    return () => {
      vivo = false;
    };
  }, [path]);
  if (!url) return <div className={cx('animate-pulse bg-[var(--bg-card-alt)]', className)} />;
  return <img src={url} alt={alt} loading="lazy" className={cx('object-cover', className)} />;
}

export function AnexosLista({ anexos, onRemover }: { anexos: AnexoInfo[]; onRemover?: (a: AnexoInfo) => void }) {
  const [abrindo, setAbrindo] = useState<string | null>(null);
  if (!anexos.length) return null;
  const abrir = async (a: AnexoInfo, baixar: boolean) => {
    setAbrindo(a.path);
    const url = await linkAnexo(a.path, baixar ? a.nome : undefined);
    setAbrindo(null);
    if (url) window.open(url, '_blank', 'noopener');
  };
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {anexos.map((a) => (
        <li key={a.path} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
          {ehImagem(a) ? (
            <AnexoImagem path={a.path} alt={a.nome} className="h-12 w-12 shrink-0 rounded-xl" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card-alt)] text-[var(--text-muted)]">
              <FileText className="h-5 w-5" />
            </span>
          )}
          <button type="button" onClick={() => abrir(a, false)} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[13px] font-semibold text-[var(--text-heading)] hover:text-[var(--accent)]">{a.nome}</span>
            <span className="block text-[12px] text-[var(--text-muted)]">{tamanho(a.tamanho) || (ehImagem(a) ? 'Imagem' : 'Documento')}</span>
          </button>
          {abrindo === a.path ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
          ) : (
            <button type="button" onClick={() => abrir(a, true)} className={btn.icon} aria-label={`Baixar ${a.nome}`} title="Baixar">
              <Download className="h-4 w-4" />
            </button>
          )}
          {onRemover && (
            <button type="button" onClick={() => onRemover(a)} className={cx(btn.icon, 'hover:text-[#B42318]')} aria-label={`Remover ${a.nome}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function UploadAnexos({
  orgId,
  modulo,
  donoId,
  onEnviado,
  aceitar = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx',
  rotulo = 'Adicionar anexo',
  somenteImagem,
}: {
  orgId: string;
  modulo: string;
  donoId: string;
  onEnviado: (a: AnexoInfo) => void | Promise<void>;
  aceitar?: string;
  rotulo?: string;
  somenteImagem?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (files: FileList | null) => {
    if (!files?.length) return;
    setErro(null);
    setEnviando(true);
    try {
      for (const f of Array.from(files)) {
        const a = await enviarAnexo(orgId, modulo, donoId, f);
        await onEnviado(a);
      }
    } catch (e: any) {
      setErro(e?.message || 'Falha ao enviar.');
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <input ref={input} type="file" multiple={!somenteImagem} accept={somenteImagem ? 'image/*' : aceitar} className="sr-only" onChange={(e) => enviar(e.target.files)} />
      <button type="button" className={btn.secondary} onClick={() => input.current?.click()} disabled={enviando}>
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : somenteImagem ? <ImageIcon className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
        {enviando ? 'Enviando…' : rotulo}
      </button>
      <p className="mt-1.5 flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
        <Upload className="h-3 w-3" /> Até 20 MB. Arquivos ficam protegidos: só quem tem acesso consegue abrir.
      </p>
      {erro && <p className="mt-1 text-[12px] text-[#B42318]">{erro}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Seletor de escola (família com filhos em escolas diferentes)      */
/* ---------------------------------------------------------------- */

export function SeletorEscola({ escolas, value, onChange }: { escolas: Escola[]; value: string | null; onChange: (id: string) => void }) {
  const unicas = escolas.filter((e, i, a) => a.findIndex((x) => x.organization_id === e.organization_id) === i);
  if (unicas.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-2">
      <span className="px-2 text-[13px] text-[var(--text-muted)]">Escola:</span>
      {unicas.map((e) => (
        <Chip key={e.organization_id} active={value === e.organization_id} onClick={() => onChange(e.organization_id)}>
          {e.nome}
        </Chip>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Campos simples                                                    */
/* ---------------------------------------------------------------- */

export function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  max,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  max?: number;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Field label={required ? `${label} *` : label}>
        {(id) => <input id={id} type={type} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />}
      </Field>
      {hint && <p className="mt-1 text-[12px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export function CampoArea({ label, value, onChange, rows = 3, placeholder, max = 2000 }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; max?: number }) {
  return (
    <Field label={label}>
      {(id) => <textarea id={id} rows={rows} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'h-auto resize-y py-2.5 leading-relaxed')} />}
    </Field>
  );
}

export function CampoSelect<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Interruptor({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] px-3.5 py-3">
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[var(--text-heading)]">{label}</span>
        {hint && <span className="block text-[12px] text-[var(--text-muted)]">{hint}</span>}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden className={cx('flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors', checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}>
        <span className={cx('h-4 w-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </span>
    </label>
  );
}

export function Busca({ value, onChange, placeholder = 'Buscar' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cx(inputCls, 'pl-10')} />
    </div>
  );
}

/** Pequeno card de número (indicadores) */
export function Indicador({ label, valor, hint, cor = 'var(--text-heading)', icon: Icon }: { label: string; valor: React.ReactNode; hint?: string; cor?: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
        {Icon && <Icon className="h-4 w-4 opacity-70" style={{ color: cor }} />}
      </div>
      <p className="mt-1 text-[22px] font-semibold tabular-nums leading-none" style={{ color: cor }}>
        {valor}
      </p>
      {hint && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
