import React, { useMemo, useState } from 'react';
import { ArrowRight, DoorClosed, GraduationCap, Pencil, Plus, Search, Trash2, UserCheck, Users, X } from 'lucide-react';
import { SimpleClassEntity } from '../../services/schedule/classScheduleService';
import { ClassStudentsModal } from './ClassStudentsModal';
import { Alert, Button, EmptyState, Skeleton, cx, inputCls } from '../ui/kit';

/*
 * Turmas do turno escolhido, em cartões.
 * Clicar no cartão abre a grade da turma; "Estudantes" abre a enturmação.
 */

interface SchoolClassesGridSectionProps {
  classes: SimpleClassEntity[];
  selectedClassId: string;
  selectedShiftKey: string;
  academicYear: string;
  syncStatus: 'synced' | 'syncing' | 'offline';
  loading: boolean;
  error?: string | null;
  onSelectClass: (c: SimpleClassEntity) => void;
  onAddClass: () => void;
  onEditClass: (c: SimpleClassEntity, e?: React.MouseEvent) => void;
  onDeleteClass: (c: SimpleClassEntity, e?: React.MouseEvent) => void;
  onRetry?: () => void;
  onShiftChange?: (shiftKey: string) => void;
}

const SHIFT_LABEL = (shift?: string) => {
  const s = (shift || '').toLowerCase();
  if (s.includes('vesp') || s.includes('tard') || s.startsWith('2')) return 'Tarde';
  if (s.includes('not') || s.includes('noit') || s.startsWith('3')) return 'Noite';
  if (s.includes('matut') || s.includes('manh') || s.startsWith('1')) return 'Manhã';
  return '';
};

const firstNumber = (str?: string) => {
  const m = (str || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 9999;
};

/** Ordem natural: série/ano, depois nome ("6º A" antes de "10º A") */
function naturalSort(a: SimpleClassEntity, b: SimpleClassEntity) {
  const diff = firstNumber(a.grade || a.name) - firstNumber(b.grade || b.name);
  if (diff !== 0) return diff;
  return (a.name || '').localeCompare(b.name || '', 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export const SchoolClassesGridSection: React.FC<SchoolClassesGridSectionProps> = ({
  classes,
  selectedClassId,
  selectedShiftKey,
  loading,
  error,
  onSelectClass,
  onAddClass,
  onEditClass,
  onDeleteClass,
  onRetry,
}) => {
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [room, setRoom] = useState('');
  const [managingStudents, setManagingStudents] = useState<SimpleClassEntity | null>(null);

  const grades = useMemo(
    () => Array.from(new Set(classes.map(c => c.grade?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })),
    [classes]
  );
  const rooms = useMemo(
    () => Array.from(new Set(classes.map(c => c.room?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })),
    [classes]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes
      .filter(c => !grade || c.grade?.trim() === grade)
      .filter(c => !room || c.room?.trim() === room)
      .filter(c => {
        if (!q) return true;
        return [c.name, c.code, c.grade, c.room, ...(c.teachers || [])].some(v => v?.toLowerCase().includes(q));
      })
      .sort(naturalSort);
  }, [classes, search, grade, room]);

  const hasFilters = !!(search || grade || room);
  const clearFilters = () => {
    setSearch('');
    setGrade('');
    setRoom('');
  };

  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h3 className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">
            Turmas da {SHIFT_LABEL(selectedShiftKey).toLowerCase() || 'escola'}
            <span className="ml-2 align-middle font-sans text-[14px] font-medium text-[var(--text-muted)]">
              {hasFilters ? `${filtered.length} de ${classes.length}` : classes.length}
            </span>
          </h3>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">Escolha uma turma para ver e editar a grade.</p>
        </div>
        <Button icon={Plus} onClick={onAddClass} className="shrink-0">Nova turma</Button>
      </div>

      {classes.length > 0 && (
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
            <input
              className={cx(inputCls, 'h-10 py-0 pl-10 pr-9')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar turma, sala ou professor"
              aria-label="Buscar turma"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-heading)]" aria-label="Limpar busca">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {grades.length > 1 && (
            <select className={cx(inputCls, 'h-10 py-0 sm:!w-44')} value={grade} onChange={e => setGrade(e.target.value)} aria-label="Filtrar por série">
              <option value="">Todas as séries</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          {rooms.length > 1 && (
            <select className={cx(inputCls, 'h-10 py-0 sm:!w-40')} value={room} onChange={e => setRoom(e.target.value)} aria-label="Filtrar por sala">
              <option value="">Todas as salas</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar</Button>}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-3xl" />)}
        </div>
      ) : error ? (
        <Alert tone="danger" action={onRetry ? <Button size="sm" variant="secondary" onClick={onRetry}>Tentar de novo</Button> : undefined}>
          {error}
        </Alert>
      ) : classes.length === 0 ? (
        <EmptyState
          compact
          icon={GraduationCap}
          title={`Nenhuma turma na ${SHIFT_LABEL(selectedShiftKey).toLowerCase() || 'escola'}`}
          text="Cadastre a turma para montar a grade e enturmar os estudantes."
          action={<Button icon={Plus} onClick={onAddClass}>Nova turma</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          icon={Search}
          title="Nenhuma turma encontrada"
          text="Tente outra busca ou limpe os filtros."
          action={<Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(c => {
            const selected = c.id === selectedClassId;
            const students = c.students_count ?? 0;
            const capacity = (c as any).capacity as number | null | undefined;
            const full = !!capacity && students >= capacity;
            const teachers = c.teachers?.length || 0;

            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectClass(c)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectClass(c);
                  }
                }}
                aria-pressed={selected}
                className={cx(
                  'group flex cursor-pointer flex-col rounded-3xl border p-4 text-left outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)]',
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_20px_40px_-28px_rgba(16,24,40,0.5)]'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-[18px] font-semibold text-[var(--text-heading)]">{c.name}</p>
                    <p className="truncate text-[12px] text-[var(--text-muted)]">
                      {[c.grade, c.code].filter(Boolean).join(' · ') || SHIFT_LABEL(c.shift) || ' '}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onEditClass(c, e);
                      }}
                      className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card-alt)] hover:text-[var(--text-heading)]"
                      aria-label={`Editar ${c.name}`}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteClass(c, e);
                      }}
                      className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[#FDECEC] hover:text-[#B42318]"
                      aria-label={`Excluir ${c.name}`}
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <dl className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-3 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-[var(--text-muted)]"><DoorClosed className="h-3.5 w-3.5" aria-hidden /> Sala</dt>
                    <dd className="truncate font-medium text-[var(--text-heading)]">{c.room || '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-[var(--text-muted)]"><Users className="h-3.5 w-3.5" aria-hidden /> Estudantes</dt>
                    <dd className={cx('font-medium tabular-nums', full ? 'text-[#B42318]' : 'text-[var(--text-heading)]')}>
                      {capacity ? `${students} de ${capacity}` : students}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-[var(--text-muted)]"><UserCheck className="h-3.5 w-3.5" aria-hidden /> Professores</dt>
                    <dd className="truncate font-medium text-[var(--text-heading)]" title={c.teachers?.join(', ')}>
                      {teachers ? teachers : 'Sem grade'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setManagingStudents(c);
                    }}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[12px] font-semibold text-[var(--text-body)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <Users className="h-3.5 w-3.5" /> Estudantes
                  </button>
                  <span
                    className={cx(
                      'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold',
                      selected ? 'bg-[var(--accent)] text-[var(--accent-fg)]' : 'bg-[var(--bg-card-alt)] text-[var(--text-body)] group-hover:text-[var(--accent)]'
                    )}
                  >
                    {selected ? 'Grade aberta' : 'Ver grade'} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ClassStudentsModal
        isOpen={!!managingStudents}
        onClose={() => setManagingStudents(null)}
        classItem={managingStudents}
        organizationId={managingStudents?.organization_id || classes[0]?.organization_id || ''}
        onRosterUpdated={() => onRetry?.()}
      />
    </section>
  );
};