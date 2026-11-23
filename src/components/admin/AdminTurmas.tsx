import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { classesService } from '../../services/classes/classes.service';
import { useActiveOrgId } from '../../hooks/useActiveOrgId';
import { Alert, Badge, Button, EmptyState, Field, Modal, Skeleton, TableShell, Toast, cx, inputCls, tdCls, thCls } from '../ui/kit';
import { ConfirmModal, MetricStrip, ModuleHeader, RoundIconButton, Segmented } from '../ui/ModuleParts';

/*
 * Turmas da escola em tabela: código, série, turno, sala, vagas e
 * controle de numeração, kit escolar e uniforme (marca direto na linha).
 */

type ShiftId = 'todos' | 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral';
type CheckField = 'numeration_status' | 'kit_escolar_status' | 'uniform_status';

const SHIFTS: { id: Exclude<ShiftId, 'todos'>; label: string }[] = [
  { id: 'Matutino', label: 'Manhã' },
  { id: 'Vespertino', label: 'Tarde' },
  { id: 'Noturno', label: 'Noite' },
  { id: 'Integral', label: 'Integral' },
];

const CHECKS: { id: CheckField; label: string }[] = [
  { id: 'numeration_status', label: 'Numeração' },
  { id: 'kit_escolar_status', label: 'Kit escolar' },
  { id: 'uniform_status', label: 'Uniforme' },
];

const CURRENT_YEAR = new Date().getFullYear();

/** "1º Turno (Matutino)", "manhã", "Matutino" → Matutino */
function normShift(s?: string): Exclude<ShiftId, 'todos'> | '' {
  const v = (s || '').toLowerCase();
  if (v.includes('integral')) return 'Integral';
  if (v.includes('matut') || v.includes('manh') || v.startsWith('1')) return 'Matutino';
  if (v.includes('vesp') || v.includes('tard') || v.startsWith('2')) return 'Vespertino';
  if (v.includes('not') || v.includes('noit') || v.startsWith('3')) return 'Noturno';
  return '';
}
const shiftLabel = (s?: string) => SHIFTS.find(x => x.id === normShift(s))?.label || s || '—';

interface Row {
  id: string;
  code: string;
  name: string;
  grade: string;
  shift: string;
  room: string;
  capacity: number | null;
  students: number;
  year: string;
  school_days: number | null;
  numeration_status: boolean;
  kit_escolar_status: boolean;
  uniform_status: boolean;
}

interface FormState {
  id?: string;
  name: string;
  code: string;
  grade: string;
  shift: Exclude<ShiftId, 'todos'>;
  room: string;
  capacity: string;
  year: string;
  school_days: string;
  numeration_status: boolean;
  kit_escolar_status: boolean;
  uniform_status: boolean;
}

const EMPTY: FormState = {
  name: '', code: '', grade: '', shift: 'Matutino', room: '', capacity: '', year: String(CURRENT_YEAR), school_days: '200',
  numeration_status: false, kit_escolar_status: false, uniform_status: false,
};

function toRow(c: any): Row {
  return {
    id: c.id,
    code: c.code || '',
    name: c.name || '',
    grade: c.grade || '',
    shift: c.shift || '',
    room: c.room || '',
    capacity: c.max_capacity ?? c.capacity ?? null,
    students: c.students_count || 0,
    year: c.academic_year ? String(c.academic_year) : '',
    school_days: c.school_days ?? null,
    numeration_status: !!c.numeration_status,
    kit_escolar_status: !!c.kit_escolar_status,
    uniform_status: !!c.uniform_status,
  };
}

export function AdminTurmas() {
  const { currentOrganization, schoolInfo } = usePlatform();
  const { orgId, resolving } = useActiveOrgId(currentOrganization?.id, schoolInfo?.id);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<ShiftId>('todos');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(async (silent = false) => {
    if (resolving) return;
    if (!silent) setLoading(true);
    const list = await classesService.getClassesByOrganization(orgId);
    setRows((list as any[]).map(toRow));
    setLoading(false);
  }, [orgId, resolving]);

  useEffect(() => {
    load();
    const onChange = () => load(true);
    window.addEventListener('classium_classes_updated', onChange);
    return () => window.removeEventListener('classium_classes_updated', onChange);
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => shift === 'todos' || normShift(r.shift) === shift)
      .filter(r => !q || [r.name, r.code, r.grade, r.room].some(v => v.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }));
  }, [rows, shift, search]);

  const totals = useMemo(() => {
    const students = rows.reduce((s, r) => s + r.students, 0);
    const capacity = rows.reduce((s, r) => s + (r.capacity || 0), 0);
    const full = rows.filter(r => r.capacity && r.students >= r.capacity).length;
    const pending = rows.filter(r => !r.numeration_status || !r.kit_escolar_status || !r.uniform_status).length;
    const noCapacity = rows.filter(r => !r.capacity).length;
    return { students, capacity, full, pending, noCapacity };
  }, [rows]);

  /* ---------------------------- Ações ---------------------------- */

  const openNew = () => {
    setFormError(null);
    setForm({ ...EMPTY, shift: shift === 'todos' ? 'Matutino' : shift });
  };

  const openEdit = (r: Row) => {
    setFormError(null);
    setForm({
      id: r.id,
      name: r.name,
      code: r.code,
      grade: r.grade,
      shift: normShift(r.shift) || 'Matutino',
      room: r.room,
      capacity: r.capacity ? String(r.capacity) : '',
      year: r.year || String(CURRENT_YEAR),
      school_days: r.school_days ? String(r.school_days) : '',
      numeration_status: r.numeration_status,
      kit_escolar_status: r.kit_escolar_status,
      uniform_status: r.uniform_status,
    });
  };

  const save = async () => {
    if (!form) return;
    setFormError(null);
    if (!form.name.trim()) return setFormError('Informe o nome da turma.');
    const capacity = form.capacity ? Number(form.capacity) : undefined;
    if (capacity !== undefined && (!Number.isFinite(capacity) || capacity <= 0)) return setFormError('A capacidade precisa ser um número maior que zero.');

    const payload: any = {
      name: form.name,
      code: form.code,
      grade: form.grade,
      shift: form.shift,
      room: form.room,
      max_capacity: capacity,
      academic_year: form.year,
      school_days: form.school_days ? Number(form.school_days) : undefined,
      numeration_status: form.numeration_status,
      kit_escolar_status: form.kit_escolar_status,
      uniform_status: form.uniform_status,
    };

    setSaving(true);
    const res = form.id ? await classesService.updateClass(form.id, payload, orgId) : await classesService.createClass(payload, orgId);
    setSaving(false);
    if (!res.success) return setFormError(res.error || 'Não foi possível salvar a turma.');
    setForm(null);
    setToast({ message: form.id ? 'Turma salva.' : `Turma ${form.name.trim()} cadastrada.`, tone: 'success' });
    await load(true);
  };

  const toggleCheck = async (r: Row, field: CheckField) => {
    const key = `${r.id}:${field}`;
    const next = !r[field];
    setTogglingKey(key);
    setRows(prev => prev.map(x => (x.id === r.id ? { ...x, [field]: next } : x)));
    const res = await classesService.updateClass(r.id, { [field]: next } as any, orgId);
    setTogglingKey(null);
    if (!res.success) {
      setRows(prev => prev.map(x => (x.id === r.id ? { ...x, [field]: !next } : x)));
      setToast({ message: res.error || 'Não foi possível salvar.', tone: 'danger' });
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const res = await classesService.deleteClass(toDelete.id, orgId);
    setDeleting(false);
    setToast(res.success ? { message: `Turma ${toDelete.name} excluída.`, tone: 'success' } : { message: res.error || 'Não foi possível excluir.', tone: 'danger' });
    setToDelete(null);
    if (res.success) await load(true);
  };

  /* ---------------------------- Visual ---------------------------- */

  return (
    <div className="space-y-6 pb-16 text-left">
      <ModuleHeader
        icon={GraduationCap}
        title="Turmas"
        count={loading ? undefined : rows.length}
        text="Todas as turmas do ano, com vagas e entrega de numeração, kit escolar e uniforme."
        actions={
          <>
            <RoundIconButton icon={RefreshCw} label="Atualizar" onClick={() => load()} spinning={loading} disabled={loading} />
            <Button icon={Plus} onClick={openNew}>Nova turma</Button>
          </>
        }
      >
        <MetricStrip
          items={[
            { label: 'Estudantes enturmados', value: totals.students, hint: totals.noCapacity ? `${totals.noCapacity} turma(s) sem número de vagas` : totals.capacity ? `de ${totals.capacity} vagas` : undefined },
            { label: 'Turmas lotadas', value: totals.full, tone: totals.full ? 'danger' : 'neutral' },
            { label: 'Com pendência de entrega', value: totals.pending, tone: totals.pending ? 'warning' : 'success', hint: 'numeração, kit ou uniforme' },
          ]}
        />
      </ModuleHeader>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<ShiftId>
          label="Turno"
          value={shift}
          onChange={setShift}
          items={[
            { id: 'todos', label: 'Todas', count: rows.length },
            ...SHIFTS.map(s => ({ id: s.id as ShiftId, label: s.label, count: rows.filter(r => normShift(r.shift) === s.id).length })),
          ]}
        />
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
          <input className={cx(inputCls, 'h-10 py-0 pl-10 pr-9')} placeholder="Buscar turma, código ou sala" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar turma" />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-label="Limpar busca">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={rows.length === 0 ? 'Nenhuma turma cadastrada' : 'Nenhuma turma encontrada'}
          text={rows.length === 0 ? 'Cadastre as turmas do ano para enturmar estudantes e montar os horários.' : 'Tente outro turno ou outra busca.'}
          action={rows.length === 0 ? <Button icon={Plus} onClick={openNew}>Cadastrar a primeira</Button> : undefined}
        />
      ) : (
        <TableShell minWidth={980}>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-card-alt)]">
              <th className={thCls}>Turma</th>
              <th className={thCls}>Turno</th>
              <th className={thCls}>Sala</th>
              <th className={thCls}>Estudantes</th>
              {CHECKS.map(c => <th key={c.id} className={cx(thCls, 'text-center')}>{c.label}</th>)}
              <th className={cx(thCls, 'text-right')}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => {
              const full = !!r.capacity && r.students >= r.capacity;
              return (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-alt)]">
                  <td className={tdCls}>
                    <p className="font-semibold text-[var(--text-heading)]">{r.name}</p>
                    <p className="text-[12px] text-[var(--text-muted)]">{[r.grade, r.code, r.year].filter(Boolean).join(' · ') || '—'}</p>
                  </td>
                  <td className={tdCls}>{shiftLabel(r.shift)}</td>
                  <td className={tdCls}>{r.room || '—'}</td>
                  <td className={tdCls}>
                    <span className={cx('tabular-nums font-medium', full ? 'text-[#B42318]' : 'text-[var(--text-heading)]')}>
                      {r.capacity ? `${r.students} de ${r.capacity}` : r.students}
                    </span>
                    {full && <Badge tone="danger" className="ml-2">Lotada</Badge>}
                  </td>
                  {CHECKS.map(c => {
                    const on = r[c.id];
                    const busy = togglingKey === `${r.id}:${c.id}`;
                    return (
                      <td key={c.id} className={cx(tdCls, 'text-center')}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          aria-label={`${c.label} de ${r.name}`}
                          onClick={() => toggleCheck(r, c.id)}
                          disabled={busy}
                          className={cx(
                            'inline-flex h-7 min-w-[86px] items-center justify-center rounded-full px-3 text-[12px] font-semibold transition-colors disabled:opacity-60',
                            on ? 'bg-[#E7F6EE] text-[#0E5A38]' : 'bg-[var(--bg-card-alt)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                          )}
                        >
                          {on ? 'Entregue' : 'Pendente'}
                        </button>
                      </td>
                    );
                  })}
                  <td className={cx(tdCls, 'text-right')}>
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openEdit(r)} className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-[var(--accent)]" aria-label={`Editar ${r.name}`} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setToDelete(r)} className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[#FDECEC] hover:text-[#B42318]" aria-label={`Excluir ${r.name}`} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        size="lg"
        icon={<GraduationCap className="h-5 w-5" />}
        title={form?.id ? 'Editar turma' : 'Nova turma'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} loading={saving}>{form?.id ? 'Salvar' : 'Cadastrar turma'}</Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            {formError && <Alert tone="danger">{formError}</Alert>}
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <Field label="Nome da turma" required>
                {id => <input id={id} className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: 6º ano A" autoFocus />}
              </Field>
              <Field label="Código" hint="Opcional">
                {id => <input id={id} className={inputCls} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Ex.: 611" />}
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Série ou etapa">
                {id => <input id={id} className={inputCls} value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="Ex.: 6º ano" />}
              </Field>
              <Field label="Turno">
                {id => (
                  <select id={id} className={cx(inputCls, 'h-10 py-0')} value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value as FormState['shift'] })}>
                    {SHIFTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Sala">
                {id => <input id={id} className={inputCls} value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="Ex.: Sala 8" />}
              </Field>
              <Field label="Capacidade" hint="Número de vagas">
                {id => <input id={id} className={inputCls} inputMode="numeric" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value.replace(/\D/g, '').slice(0, 3) })} />}
              </Field>
              <Field label="Ano letivo">
                {id => (
                  <select id={id} className={cx(inputCls, 'h-10 py-0')} value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}>
                    {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Dias letivos">
                {id => <input id={id} className={inputCls} inputMode="numeric" value={form.school_days} onChange={e => setForm({ ...form, school_days: e.target.value.replace(/\D/g, '').slice(0, 3) })} />}
              </Field>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Entregas</p>
              <div className="flex flex-wrap gap-2">
                {CHECKS.map(c => {
                  const on = form[c.id];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setForm({ ...form, [c.id]: !on })}
                      className={cx(
                        'h-10 rounded-full border px-4 text-[13px] font-semibold transition-colors',
                        on ? 'border-[#0E5A38] bg-[#E7F6EE] text-[#0E5A38]' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                      )}
                    >
                      {c.label}: {on ? 'entregue' : 'pendente'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title={`Excluir ${toDelete?.name || 'turma'}?`}
        confirmLabel="Excluir turma"
      >
        {toDelete && toDelete.students > 0 ? (
          <p>Esta turma tem {toDelete.students} estudante(s). Mude os estudantes de turma antes; senão a exclusão será recusada.</p>
        ) : (
          <p>A turma e a grade de horários dela serão apagadas. Isso não pode ser desfeito.</p>
        )}
      </ConfirmModal>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

export default AdminTurmas;