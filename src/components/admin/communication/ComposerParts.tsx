import React, { useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Building2, CheckCircle2, Mail, Phone, Search, User, Users, X, type LucideIcon } from 'lucide-react';
import type { AudienceClass, AudienceStudent } from '../../../services/communicationRpcService';
import { Alert, Card, CardHeader, cx, inputCls, EASE } from '../../ui/kit';

/*
 * Peças comuns das abas de Comunicação (Assinaturas, Convocações, Informativos).
 * Cada aba tem uma cor de identidade (tom), mas tudo segue o tema da escola.
 */

export interface Tone {
  solid: string;
  soft: string;
  fg: string;
}

export const TONES = {
  amber: { solid: '#B54708', soft: '#FEF4E6', fg: '#A15C07' },
  accent: { solid: 'var(--accent)', soft: 'var(--accent-soft)', fg: 'var(--accent)' },
  emerald: { solid: '#127A4B', soft: '#E7F6EE', fg: '#127A4B' },
} satisfies Record<string, Tone>;

/** "1. Autorização para excursão" -> "Autorização para excursão" */
export const cleanTitle = (t: string) => t.replace(/^\d+\.\s*/, '');

/** "2026-11-05" -> "05/11/2026" sem erro de fuso */
export function formatISODate(iso?: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** Se o servidor não responder, libera a tela em vez de travar */
export function withTimeout<T>(promise: Promise<T>, ms = 25000): Promise<T | { error: string }> {
  return Promise.race([
    promise,
    new Promise<{ error: string }>((resolve) =>
      window.setTimeout(() => resolve({ error: 'O servidor demorou para responder. Confira a lista de envios antes de tentar de novo.' }), ms),
    ),
  ]);
}

/* ------------------------------------------------------------------ */
/* Topo da aba                                                         */
/* ------------------------------------------------------------------ */

export function ComposerHeader({
  icon: Icon,
  title,
  text,
  tone,
  right,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  tone: Tone;
  right?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl" style={{ background: tone.soft }} />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_12px_24px_-14px_rgba(16,24,40,0.6)]"
            style={{ background: tone.solid, color: tone.solid === 'var(--accent)' ? 'var(--accent-fg)' : '#fff' }}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">{title}</h2>
            <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-[var(--text-muted)]">{text}</p>
          </div>
        </div>
        {right}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Aviso de envio                                                      */
/* ------------------------------------------------------------------ */

export type SendStatus = { tone: 'success' | 'danger' | 'info'; text: string } | null;

export function StatusBanner({ status, busy, onClose }: { status: SendStatus; busy: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {status && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
          <Alert
            tone={status.tone}
            action={
              !busy ? (
                <button type="button" onClick={onClose} aria-label="Fechar aviso" className="rounded-full p-1.5 opacity-70 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              ) : undefined
            }
          >
            {status.text}
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Grade de modelos                                                    */
/* ------------------------------------------------------------------ */

export function ModelGrid<M extends { id: string; title: string; description: string; icon?: LucideIcon }>({
  models,
  selectedId,
  onSelect,
  meta,
  tone,
  fallbackIcon,
  title = '1. Escolha um modelo',
  subtitle = 'Você pode ajustar o texto depois.',
  headerIcon,
}: {
  models: M[];
  selectedId: string;
  onSelect: (m: M) => void;
  meta?: (m: M) => string;
  tone: Tone;
  fallbackIcon: LucideIcon;
  title?: string;
  subtitle?: string;
  headerIcon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader icon={headerIcon} title={title} subtitle={subtitle} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {models.map((model) => {
          const Icon = model.icon || fallbackIcon;
          const isSelected = selectedId === model.id;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onSelect(model)}
              aria-pressed={isSelected}
              title={model.description}
              className={cx(
                'group flex min-h-[100px] flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-200',
                isSelected ? 'shadow-[0_14px_28px_-22px_rgba(16,24,40,0.6)]' : 'border-[var(--border)] bg-[var(--bg-card)] hover:-translate-y-0.5',
              )}
              style={isSelected ? { borderColor: tone.solid, background: tone.soft } : undefined}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
                style={
                  isSelected
                    ? { background: tone.solid, color: tone.solid === 'var(--accent)' ? 'var(--accent-fg)' : '#fff' }
                    : { background: 'var(--bg-card-alt)', color: tone.fg }
                }
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold leading-snug text-[var(--text-heading)]">{cleanTitle(model.title)}</span>
                {meta && <span className="mt-0.5 block text-[11px] font-medium text-[var(--text-muted)]">{meta(model)}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Quem recebe                                                         */
/* ------------------------------------------------------------------ */

export type TargetType = 'student' | 'class' | 'multi' | 'all';

export interface AudienceState {
  targetType: TargetType;
  selectedStudent: AudienceStudent | null;
  selectedClassId: string;
  selectedClassIds: string[];
}

/** Quantos estudantes recebem. null = não dá para saber (turma sem alunos ligados na lista) */
export function useReach(students: AudienceStudent[], a: AudienceState) {
  return useMemo(() => {
    if (a.targetType === 'student') return { count: a.selectedStudent ? 1 : 0, canSend: Boolean(a.selectedStudent) };
    if (a.targetType === 'class') {
      const n = students.filter((s) => s.class_id === a.selectedClassId).length;
      return { count: n || null, canSend: Boolean(a.selectedClassId) };
    }
    if (a.targetType === 'multi') {
      const set = new Set(a.selectedClassIds);
      const n = students.filter((s) => s.class_id && set.has(s.class_id)).length;
      return { count: n || null, canSend: a.selectedClassIds.length > 0 };
    }
    return { count: students.length || null, canSend: true };
  }, [students, a.targetType, a.selectedStudent, a.selectedClassId, a.selectedClassIds]);
}

export function reachLabel(count: number | null, a: AudienceState, unit: [string, string] = ['estudante', 'estudantes']) {
  if (count !== null) return `${count} ${count === 1 ? unit[0] : unit[1]}`;
  if (a.targetType === 'class') return 'a turma escolhida';
  if (a.targetType === 'multi') return `${a.selectedClassIds.length} ${a.selectedClassIds.length === 1 ? 'turma' : 'turmas'}`;
  return 'toda a escola';
}

const TARGET_OPTIONS: { id: TargetType; label: string; icon: LucideIcon }[] = [
  { id: 'student', label: 'Um estudante', icon: User },
  { id: 'class', label: 'Uma turma', icon: Users },
  { id: 'multi', label: 'Várias turmas', icon: Users },
  { id: 'all', label: 'Toda a escola', icon: Building2 },
];

export function AudiencePicker({
  students,
  classes,
  state,
  order = ['student', 'class', 'multi', 'all'],
  onTargetType,
  onStudent,
  onClass,
  onClasses,
  reach,
  tone,
  title = '2. Para quem?',
  allText = 'Vai para os responsáveis de todos os estudantes da escola.',
}: {
  students: AudienceStudent[];
  classes: AudienceClass[];
  state: AudienceState;
  order?: TargetType[];
  onTargetType: (t: TargetType) => void;
  onStudent: (s: AudienceStudent) => void;
  onClass: (id: string) => void;
  onClasses: (ids: string[]) => void;
  reach: string;
  tone: Tone;
  title?: string;
  allText?: string;
}) {
  const options = order.map((id) => TARGET_OPTIONS.find((o) => o.id === id)!);
  return (
    <Card>
      <CardHeader icon={Users} title={title} subtitle="Os responsáveis recebem no Portal da Família" />

      <div className="grid grid-cols-2 gap-1 rounded-[20px] bg-[var(--bg-card-alt)] p-1" role="radiogroup" aria-label="Destinatários">
        {options.map((o) => {
          const active = state.targetType === o.id;
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onTargetType(o.id)}
              className={cx(
                'flex h-10 items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold transition-all',
                active ? 'bg-[var(--bg-card)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]',
              )}
              style={active ? { color: tone.fg } : undefined}
            >
              <Icon className="h-4 w-4" />
              {o.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {state.targetType === 'student' && <StudentPicker students={students} selected={state.selectedStudent} onSelect={onStudent} />}

        {state.targetType === 'class' &&
          (classes.length === 0 ? (
            <EmptyLine>Nenhuma turma carregada.</EmptyLine>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text-heading)]">Turma</span>
              <select value={state.selectedClassId} onChange={(e) => onClass(e.target.value)} className={inputCls}>
                <option value="">Escolha a turma</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {(c as any).shift ? ` · ${(c as any).shift}` : ''}
                  </option>
                ))}
              </select>
            </label>
          ))}

        {state.targetType === 'multi' &&
          (classes.length === 0 ? (
            <EmptyLine>Nenhuma turma carregada.</EmptyLine>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="font-semibold text-[var(--text-heading)]">Turmas</span>
                <button
                  type="button"
                  onClick={() => onClasses(state.selectedClassIds.length === classes.length ? [] : classes.map((c) => c.id))}
                  className="font-semibold text-[var(--accent)] hover:underline"
                >
                  {state.selectedClassIds.length === classes.length ? 'Limpar' : 'Marcar todas'}
                </button>
              </div>
              <div className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                {classes.map((c) => {
                  const checked = state.selectedClassIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => onClasses(checked ? state.selectedClassIds.filter((id) => id !== c.id) : [...state.selectedClassIds, c.id])}
                      className={cx(
                        'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                        checked ? 'font-semibold text-[var(--text-heading)]' : 'border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]',
                      )}
                      style={checked ? { borderColor: tone.solid, background: tone.soft } : undefined}
                    >
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                        style={checked ? { background: tone.solid, borderColor: tone.solid, color: '#fff' } : { borderColor: 'var(--border)' }}
                      >
                        {checked && <CheckCircle2 className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {state.targetType === 'all' && (
          <p className="rounded-2xl px-4 py-3 text-[13px] leading-relaxed" style={{ background: tone.soft, color: tone.fg }}>
            {allText}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--bg-card-alt)] px-4 py-3 text-[13px]">
        <span className="text-[var(--text-muted)]">Recebe</span>
        <span className="font-semibold text-[var(--text-heading)]">{reach}</span>
      </div>
    </Card>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-center text-[13px] text-[var(--text-muted)]">{children}</p>;
}

/** Busca de estudante leve, mesmo com milhares de alunos */
export function StudentPicker({
  students,
  selected,
  onSelect,
}: {
  students: AudienceStudent[];
  selected: AudienceStudent | null;
  onSelect: (s: AudienceStudent) => void;
}) {
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search);

  const list = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    if (!q) return students.slice(0, 8);
    const out: AudienceStudent[] = [];
    for (const s of students) {
      if (
        (s.name || '').toLowerCase().includes(q) ||
        (s.registration_code || '').toLowerCase().includes(q) ||
        (s.class_name || '').toLowerCase().includes(q)
      ) {
        out.push(s);
        if (out.length >= 12) break;
      }
    }
    return out;
  }, [deferred, students]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar estudante"
          placeholder="Nome, matrícula ou turma"
          className={cx(inputCls, 'pl-10')}
        />
      </div>

      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
        {students.length === 0 ? (
          <li>
            <EmptyLine>Nenhum estudante carregado.</EmptyLine>
          </li>
        ) : list.length === 0 ? (
          <li className="px-4 py-5 text-center text-[13px] text-[var(--text-muted)]">Ninguém encontrado.</li>
        ) : (
          list.map((s) => {
            const isSelected = selected?.id === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(s);
                    setSearch('');
                  }}
                  aria-pressed={isSelected}
                  className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors', isSelected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-card-alt)]')}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold"
                    style={isSelected ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : { background: 'var(--bg-card-alt)', color: 'var(--text-body)' }}
                  >
                    {(s.name || '?').substring(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-[var(--text-heading)]">{s.name || 'Sem nome'}</span>
                    <span className="block truncate text-[12px] text-[var(--text-muted)]">{s.class_name || 'Sem turma'}</span>
                  </span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
                </button>
              </li>
            );
          })
        )}
      </ul>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-3.5 text-[13px]"
          >
            <p className="text-[12px] text-[var(--text-muted)]">Responsável de {selected.name?.split(' ')[0] || 'estudante'}</p>
            {selected.guardian_name ? (
              <>
                <p className="font-semibold text-[var(--text-heading)]">{selected.guardian_name}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[var(--text-body)]">
                  {selected.guardian_phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {selected.guardian_phone}
                    </span>
                  )}
                  {(selected as any).guardian_email && (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{(selected as any).guardian_email}</span>
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[#A15C07]">Nenhum responsável vinculado.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Botão de envio na cor da aba                                        */
/* ------------------------------------------------------------------ */

export function ToneButton({
  tone,
  icon: Icon,
  children,
  loading,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone: Tone; icon?: LucideIcon; loading?: boolean }) {
  const fg = tone.solid === 'var(--accent)' ? 'var(--accent-fg)' : '#fff';
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-semibold shadow-[0_12px_24px_-16px_rgba(16,24,40,0.7)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      style={{ background: tone.solid, color: fg }}
    >
      {Icon && <Icon className={cx('h-4 w-4', loading && 'animate-spin')} />}
      {children}
    </button>
  );
}