import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Clock, Coffee, Pencil, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import {
  classScheduleService,
  SimpleClassEntity,
  ClassScheduleRecord,
  STANDARD_DISCIPLINES,
  ShiftInfo,
  ShiftPeriodConfig,
} from '../../services/schedule/classScheduleService';
import { SchoolClassesGridSection } from './SchoolClassesGridSection';
import { Alert, Button, Card, EmptyState, Field, Modal, Skeleton, Toast, Toggle, cx, inputCls } from '../ui/kit';
import { ConfirmModal, ModuleHeader, RoundIconButton, Segmented } from '../ui/ModuleParts';
import { useActiveOrgId } from '../../hooks/useActiveOrgId';

/*
 * Horário de aula: grade semanal de cada turma.
 * Os horários de cada aula (início, fim, intervalo) são do turno e valem para todas as turmas dele.
 */

const SHIFT_OPTIONS = ['1º Turno (Matutino)', '2º Turno (Vespertino)', '3º Turno (Noturno)'] as const;
type ShiftKey = (typeof SHIFT_OPTIONS)[number];

const SHIFT_LABEL: Record<ShiftKey, string> = {
  '1º Turno (Matutino)': 'Manhã',
  '2º Turno (Vespertino)': 'Tarde',
  '3º Turno (Noturno)': 'Noite',
};

const DAYS = [
  { n: 1, name: 'Segunda' },
  { n: 2, name: 'Terça' },
  { n: 3, name: 'Quarta' },
  { n: 4, name: 'Quinta' },
  { n: 5, name: 'Sexta' },
];

const EMPTY_NAMES = ['', 'sem aula', 'sem aula alocada'];

type Cell = { discipline_name: string; teacher_name: string; room: string };

/** "Matutino", "1º Turno", "manhã"… → chave do turno */
function shiftKeyOf(shift?: string | null): ShiftKey | null {
  const s = (shift || '').toLowerCase();
  if (!s) return null;
  if (s.includes('matut') || s.includes('manh') || s.startsWith('1')) return '1º Turno (Matutino)';
  if (s.includes('vesp') || s.includes('tard') || s.startsWith('2')) return '2º Turno (Vespertino)';
  if (s.includes('not') || s.includes('noit') || s.startsWith('3')) return '3º Turno (Noturno)';
  return null;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const total = (h * 60 + m + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function todayDayNumber(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

export const AdminHorarioAula: React.FC = () => {
  const { currentOrganization, schoolInfo } = usePlatform();
  const { orgId: organizationId, resolving: resolvingOrg } = useActiveOrgId(currentOrganization?.id, schoolInfo?.id);
  const academicYear = String(new Date().getFullYear());
  const today = useMemo(todayDayNumber, []);

  const [classes, setClasses] = useState<SimpleClassEntity[]>([]);
  const [disciplines, setDisciplines] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [shiftKey, setShiftKey] = useState<ShiftKey>('1º Turno (Matutino)');
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [matrix, setMatrix] = useState<Record<string, Cell>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null);

  // Trocar de turma/turno com alterações não salvas
  const [pendingSwitch, setPendingSwitch] = useState<(() => void) | null>(null);

  // Célula
  const [editingCell, setEditingCell] = useState<{ day: number; period: number; start: string; end: string } | null>(null);
  const [cellDiscipline, setCellDiscipline] = useState('');
  const [cellCustom, setCellCustom] = useState('');
  const [cellTeacher, setCellTeacher] = useState('');
  const [cellRoom, setCellRoom] = useState('');
  const [cellError, setCellError] = useState<string | null>(null);

  // Limpar grade
  const [confirmClear, setConfirmClear] = useState(false);

  // Turma
  const [classForm, setClassForm] = useState<{ id?: string; name: string; room: string; shift: ShiftKey } | null>(null);
  const [classFormError, setClassFormError] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState<SimpleClassEntity | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Horários do turno
  const [slotForm, setSlotForm] = useState<{ slotOrder?: number; label: string; start: string; end: string; isBreak: boolean } | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState(false);

  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const selectedRef = useRef(selectedClassId);
  selectedRef.current = selectedClassId;

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId) || null, [classes, selectedClassId]);

  const classesOfShift = useMemo(
    () => classes.filter(c => !c.shift || shiftKeyOf(c.shift) === shiftKey),
    [classes, shiftKey]
  );

  const disciplineOptions = useMemo(() => {
    if (disciplines.length > 0) return disciplines.map(d => ({ name: d.name, color: d.color || '#64748B' }));
    return STANDARD_DISCIPLINES.filter(d => d.name !== 'Outro').map(d => ({ name: d.name, color: d.color }));
  }, [disciplines]);

  const lessonPeriods = useMemo(() => (shiftInfo?.periods || []).filter(p => !p.isBreak), [shiftInfo]);

  /* ----------------------------- Carregamento ----------------------------- */

  const loadShift = useCallback(
    async (key: ShiftKey) => {
      if (!organizationId) return;
      setShiftError(null);
      try {
        setShiftInfo(await classScheduleService.getShiftInfo(organizationId, key, academicYear));
      } catch (err: any) {
        console.error('[AdminHorarioAula] Turno:', err);
        setShiftInfo(null);
        setShiftError(err?.message || 'Não foi possível carregar os horários do turno.');
      }
    },
    [organizationId, academicYear]
  );

  const loadBase = useCallback(async () => {
    if (!organizationId) {
      if (resolvingOrg) return;
      setLoading(false);
      setLoadError('Não foi possível identificar a escola. Saia e entre de novo no sistema.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [cls, disc, teach] = await Promise.all([
        classScheduleService.getClasses(organizationId),
        classScheduleService.getDisciplines(organizationId),
        classScheduleService.getTeachers(organizationId),
      ]);
      setClasses(cls);
      setDisciplines(disc);
      setTeachers(teach);

      if (!cls.some(c => c.id === selectedRef.current) && cls.length > 0) {
        const first = cls[0];
        setSelectedClassId(first.id);
        const key = shiftKeyOf(first.shift);
        if (key) setShiftKey(key);
      }
    } catch (err) {
      console.error('[AdminHorarioAula] Carregamento:', err);
      setLoadError('Não foi possível carregar as turmas. Verifique a conexão e tente de novo.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, resolvingOrg]);

  const loadSchedule = useCallback(async (classId: string) => {
    if (!classId) return;
    setScheduleLoading(true);
    try {
      const records = await classScheduleService.getClassSchedules(classId);
      const next: Record<string, Cell> = {};
      records.forEach(r => {
        next[`${r.day_of_week}_${r.period_number}`] = {
          discipline_name: r.discipline_name || '',
          teacher_name: r.teacher_name || '',
          room: r.room || '',
        };
      });
      setMatrix(next);
      setDirty(false);
      setSaveErrors([]);
    } catch (err) {
      console.error('[AdminHorarioAula] Grade:', err);
      setToast({ message: 'Não foi possível carregar a grade desta turma.', tone: 'danger' });
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  useEffect(() => {
    loadShift(shiftKey);
  }, [shiftKey, loadShift]);

  useEffect(() => {
    if (selectedClassId) loadSchedule(selectedClassId);
  }, [selectedClassId, loadSchedule]);

  // Atualiza sozinho quando alguém muda em outro computador (sem perder o que está sendo editado)
  useEffect(() => {
    if (!selectedClassId || !organizationId) return;
    const unsubSchedule = classScheduleService.subscribeToClassSchedule(selectedClassId, () => {
      if (!dirtyRef.current) loadSchedule(selectedClassId);
    });
    const unsubSlots = classScheduleService.subscribeToClassesAndSlots(organizationId, () => {
      loadShift(shiftKey);
      loadBase();
    });
    const onClasses = () => loadBase();
    window.addEventListener('classium_classes_updated', onClasses);
    return () => {
      unsubSchedule();
      unsubSlots();
      window.removeEventListener('classium_classes_updated', onClasses);
    };
  }, [selectedClassId, organizationId, shiftKey, loadSchedule, loadShift, loadBase]);

  /* ----------------------------- Navegação ----------------------------- */

  const guard = (action: () => void) => {
    if (dirty) setPendingSwitch(() => action);
    else action();
  };

  const selectClass = (c: SimpleClassEntity) =>
    guard(() => {
      setSelectedClassId(c.id);
      const key = shiftKeyOf(c.shift);
      if (key) setShiftKey(key);
    });

  const selectShift = (key: ShiftKey) =>
    guard(() => {
      setShiftKey(key);
      const inShift = classes.filter(c => !c.shift || shiftKeyOf(c.shift) === key);
      if (!inShift.some(c => c.id === selectedClassId)) setSelectedClassId(inShift[0]?.id || '');
    });

  /* ----------------------------- Célula ----------------------------- */

  const openCell = (day: number, period: ShiftPeriodConfig) => {
    const current = matrix[`${day}_${period.periodNumber}`];
    const name = current?.discipline_name || '';
    const known = disciplineOptions.some(d => d.name.toLowerCase() === name.toLowerCase());
    setCellDiscipline(name && !EMPTY_NAMES.includes(name.toLowerCase()) ? (known ? name : '__outra') : '');
    setCellCustom(known ? '' : name);
    setCellTeacher(current?.teacher_name || '');
    setCellRoom(current?.room || '');
    setCellError(null);
    setEditingCell({ day, period: period.periodNumber, start: period.startTime, end: period.endTime });
  };

  const applyCell = () => {
    if (!editingCell) return;
    const name = cellDiscipline === '__outra' ? cellCustom.trim() : cellDiscipline;
    if (!name) return setCellError('Escolha a disciplina desta aula.');
    setMatrix(prev => ({
      ...prev,
      [`${editingCell.day}_${editingCell.period}`]: { discipline_name: name, teacher_name: cellTeacher.trim(), room: cellRoom.trim() },
    }));
    setDirty(true);
    setEditingCell(null);
  };

  const clearCell = () => {
    if (!editingCell) return;
    setMatrix(prev => {
      const next = { ...prev };
      delete next[`${editingCell.day}_${editingCell.period}`];
      return next;
    });
    setDirty(true);
    setEditingCell(null);
  };

  /* ----------------------------- Salvar grade ----------------------------- */

  const saveSchedule = async () => {
    if (!selectedClassId || !shiftInfo) return;
    setSaving(true);
    setSaveErrors([]);

    const records: Array<Omit<ClassScheduleRecord, 'id' | 'created_at'>> = [];
    for (const day of DAYS) {
      for (const p of lessonPeriods) {
        const item = matrix[`${day.n}_${p.periodNumber}`];
        if (!item || EMPTY_NAMES.includes(item.discipline_name.toLowerCase())) continue;
        records.push({
          organization_id: organizationId,
          class_id: selectedClassId,
          day_of_week: day.n,
          period_number: p.periodNumber,
          start_time: `${p.startTime}:00`,
          end_time: `${p.endTime}:00`,
          discipline_name: item.discipline_name,
          teacher_name: item.teacher_name || undefined,
          room: item.room || selectedClass?.room || undefined,
        });
      }
    }

    try {
      const res = await classScheduleService.saveClassSchedules(organizationId, selectedClassId, records);
      if (res.success) {
        setDirty(false);
        setToast({ message: `Grade de ${selectedClass?.name || 'turma'} salva.`, tone: 'success' });
      } else {
        setSaveErrors((res.error || 'Não foi possível salvar a grade.').split('\n').map(s => s.trim()).filter(Boolean));
      }
    } catch (err: any) {
      setSaveErrors([err?.message || 'Não foi possível salvar a grade. Tente de novo.']);
    } finally {
      setSaving(false);
    }
  };

  const clearSchedule = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      await classScheduleService.clearClassSchedules(selectedClassId);
      setMatrix({});
      setDirty(false);
      setConfirmClear(false);
      setToast({ message: 'Grade apagada.', tone: 'success' });
    } catch (err: any) {
      setConfirmClear(false);
      setToast({ message: err?.message || 'Não foi possível apagar a grade.', tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- Turmas ----------------------------- */

  const saveClass = async () => {
    if (!classForm) return;
    if (!classForm.name.trim()) return setClassFormError('Informe o nome da turma.');
    setSavingClass(true);
    setClassFormError(null);
    try {
      const payload = { name: classForm.name.trim(), room: classForm.room.trim(), shift: classForm.shift };
      const res = classForm.id
        ? await classScheduleService.updateClass(classForm.id, payload)
        : await classScheduleService.createClass(organizationId, { ...payload, academic_year: academicYear });

      if (!res.success) {
        setClassFormError(res.error || 'Não foi possível salvar a turma.');
        return;
      }
      const createdId = !classForm.id ? res.data?.id : undefined;
      setClassForm(null);
      await loadBase();
      if (createdId) {
        setSelectedClassId(createdId);
        setShiftKey(classForm.shift);
      }
      setToast({ message: classForm.id ? 'Turma atualizada.' : 'Turma cadastrada.', tone: 'success' });
    } catch (err: any) {
      setClassFormError(err?.message || 'Não foi possível salvar a turma.');
    } finally {
      setSavingClass(false);
    }
  };

  const deleteClass = async () => {
    if (!deletingClass) return;
    setDeletingBusy(true);
    try {
      const res = await classScheduleService.deleteClass(deletingClass.id);
      if (!res.success) {
        setToast({ message: res.error || 'Não foi possível excluir a turma.', tone: 'danger' });
        return;
      }
      if (selectedClassId === deletingClass.id) setSelectedClassId('');
      setToast({ message: `Turma ${deletingClass.name} excluída.`, tone: 'success' });
      await loadBase();
    } catch (err: any) {
      setToast({ message: err?.message || 'Não foi possível excluir a turma.', tone: 'danger' });
    } finally {
      setDeletingBusy(false);
      setDeletingClass(null);
    }
  };

  /* ----------------------------- Horários do turno ----------------------------- */

  const saveSlot = async () => {
    if (!slotForm) return;
    if (!slotForm.start || !slotForm.end) return setSlotError('Informe o início e o fim.');
    if (slotForm.end <= slotForm.start) return setSlotError('O fim precisa ser depois do início.');

    setSavingSlot(true);
    setSlotError(null);
    try {
      const res =
        slotForm.slotOrder !== undefined
          ? await classScheduleService.updateShiftTimeSlot(organizationId, shiftKey, slotForm.slotOrder, slotForm.start, slotForm.end, academicYear)
          : await classScheduleService.addShiftTimeSlot(organizationId, shiftKey, {
              label: slotForm.label.trim() || (slotForm.isBreak ? 'Intervalo' : `${lessonPeriods.length + 1}ª aula`),
              startTime: slotForm.start,
              endTime: slotForm.end,
              isBreak: slotForm.isBreak,
              academicYear,
            });

      if (!res.success || !res.shiftInfo) {
        setSlotError(res.error || 'Não foi possível salvar o horário.');
        return;
      }
      setShiftInfo(res.shiftInfo);
      setSlotForm(null);
      if (selectedClassId) await loadSchedule(selectedClassId);
    } catch (err: any) {
      setSlotError(err?.message || 'Não foi possível salvar o horário.');
    } finally {
      setSavingSlot(false);
    }
  };

  const deleteSlot = async () => {
    if (slotForm?.slotOrder === undefined) return;
    setSavingSlot(true);
    try {
      const res = await classScheduleService.deleteShiftTimeSlot(organizationId, shiftKey, slotForm.slotOrder, academicYear);
      if (!res.success || !res.shiftInfo) {
        setSlotError(res.error || 'Não foi possível remover o horário.');
        return;
      }
      setShiftInfo(res.shiftInfo);
      setSlotForm(null);
      if (selectedClassId) await loadSchedule(selectedClassId);
    } catch (err: any) {
      setSlotError(err?.message || 'Não foi possível remover o horário.');
    } finally {
      setSavingSlot(false);
      setConfirmDeleteSlot(false);
    }
  };

  const seedShift = async () => {
    setSeeding(true);
    try {
      const res = await classScheduleService.seedDefaultSlots(organizationId, shiftKey, academicYear);
      if (!res.success || !res.shiftInfo) {
        setToast({ message: res.error || 'Não foi possível usar o modelo.', tone: 'danger' });
        return;
      }
      setShiftInfo(res.shiftInfo);
      setToast({ message: 'Modelo aplicado. Ajuste os horários clicando em cada um.', tone: 'success' });
    } finally {
      setSeeding(false);
    }
  };

  /* ----------------------------- Visual ----------------------------- */

  const colorOf = (name: string) =>
    disciplineOptions.find(d => d.name.toLowerCase() === name.toLowerCase())?.color ||
    STANDARD_DISCIPLINES.find(d => d.name.toLowerCase() === name.toLowerCase())?.color ||
    '#94A3B8';

  const filledCount = lessonPeriods.reduce(
    (acc, p) => acc + DAYS.filter(d => {
      const c = matrix[`${d.n}_${p.periodNumber}`];
      return c && !EMPTY_NAMES.includes(c.discipline_name.toLowerCase());
    }).length,
    0
  );
  const roomLabel = (room?: string) => (!room ? '' : /^\d+$/.test(room.trim()) ? `sala ${room.trim()}` : room.trim());
  const totalSlots = lessonPeriods.length * DAYS.length;

  return (
    <div className="space-y-6 pb-16 text-left">
      <ModuleHeader
        icon={Clock}
        title="Horário de aula"
        text="A grade semanal de cada turma. Depois de salvar, as famílias e os professores veem a mesma grade."
        actions={
          <Segmented<ShiftKey>
            label="Turno"
            value={shiftKey}
            onChange={selectShift}
            items={SHIFT_OPTIONS.map(k => ({
              id: k,
              label: SHIFT_LABEL[k],
              count: classes.filter(c => shiftKeyOf(c.shift) === k).length,
            }))}
          />
        }
      >
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          {[
            { label: 'Início', value: shiftInfo?.startTime },
            { label: 'Intervalo', value: shiftInfo?.breakStart && shiftInfo?.breakEnd ? `${shiftInfo.breakStart} às ${shiftInfo.breakEnd}` : '' },
            { label: 'Término', value: shiftInfo?.endTime },
            { label: 'Aulas por dia', value: lessonPeriods.length ? String(lessonPeriods.length) : '' },
          ].map(item => (
            <div key={item.label} className="bg-[var(--bg-card)] px-4 py-3">
              <p className="text-[12px] text-[var(--text-muted)]">{item.label}</p>
              <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-[var(--text-heading)]">{item.value || '—'}</p>
            </div>
          ))}
        </div>
      </ModuleHeader>

      {loadError && (
        <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={loadBase}>Tentar de novo</Button>}>
          {loadError}
        </Alert>
      )}

      <SchoolClassesGridSection
        classes={classesOfShift}
        selectedClassId={selectedClassId}
        selectedShiftKey={shiftKey}
        academicYear={academicYear}
        syncStatus={loading ? 'syncing' : loadError ? 'offline' : 'synced'}
        loading={loading}
        error={loadError}
        onSelectClass={selectClass}
        onAddClass={() => {
          setClassFormError(null);
          setClassForm({ name: '', room: '', shift: shiftKey });
        }}
        onEditClass={(c: SimpleClassEntity, e?: React.MouseEvent) => {
          e?.stopPropagation();
          setClassFormError(null);
          setClassForm({ id: c.id, name: c.name, room: c.room || '', shift: shiftKeyOf(c.shift) || shiftKey });
        }}
        onDeleteClass={(c: SimpleClassEntity, e?: React.MouseEvent) => {
          e?.stopPropagation();
          setDeletingClass(c);
        }}
        onRetry={loadBase}
        onShiftChange={(k: string) => {
          const key = shiftKeyOf(k);
          if (key) selectShift(key);
        }}
      />

      <Card>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">
              {selectedClass ? `Grade de ${selectedClass.name}` : 'Grade semanal'}
            </h3>
            <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
              {selectedClass
                ? `${filledCount} de ${totalSlots} aulas preenchidas${selectedClass.room ? ` · ${roomLabel(selectedClass.room)}` : ''}. Clique numa aula para editar.`
                : 'Escolha uma turma acima para montar a grade.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {dirty && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF4E6] px-3 py-1.5 text-[12px] font-semibold text-[#7A4505]">
                <AlertTriangle className="h-3.5 w-3.5" /> Alterações não salvas
              </span>
            )}
            <Button
              variant="secondary"
              icon={Plus}
              onClick={() => {
                const last = shiftInfo?.periods?.[shiftInfo.periods.length - 1];
                const start = last?.endTime || '07:00';
                setSlotError(null);
                setSlotForm({ label: '', start, end: addMinutes(start, 45), isBreak: false });
              }}
              disabled={!organizationId}
            >
              Adicionar horário
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => setConfirmClear(true)} disabled={!selectedClassId || filledCount === 0}>
              Limpar
            </Button>
            <RoundIconButton
              icon={RotateCcw}
              label="Desfazer e recarregar"
              onClick={() => selectedClassId && loadSchedule(selectedClassId)}
              spinning={scheduleLoading}
              disabled={!selectedClassId || saving}
            />
            <Button icon={Save} onClick={saveSchedule} loading={saving} disabled={!selectedClassId || !dirty}>
              Salvar grade
            </Button>
          </div>
        </div>

        {saveErrors.length > 0 && (
          <div className="mb-4">
            <Alert tone="danger" title="A grade não foi salva">
              <ul className="list-disc space-y-0.5 pl-4">
                {saveErrors.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </Alert>
          </div>
        )}

        {!selectedClass ? (
          <EmptyState
            icon={BookOpen}
            compact
            title="A grade aparece aqui"
            text={classesOfShift.length === 0 && !loading ? 'Cadastre uma turma neste turno, logo acima.' : 'Escolha uma turma na lista acima.'}
          />
        ) : shiftError ? (
          <Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={() => loadShift(shiftKey)}>Tentar de novo</Button>}>
            {shiftError}
          </Alert>
        ) : !shiftInfo || shiftInfo.periods.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={`Nenhum horário cadastrado para a ${SHIFT_LABEL[shiftKey].toLowerCase()}`}
            text="Cadastre o horário de cada aula e do intervalo, ou comece por um modelo e ajuste. Vale para todas as turmas deste turno."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={seedShift} loading={seeding}>Usar modelo de horário</Button>
                <Button icon={Plus} onClick={() => setSlotForm({ label: '1ª aula', start: '07:00', end: '07:45', isBreak: false })}>
                  Cadastrar a primeira aula
                </Button>
              </div>
            }
          />
        ) : scheduleLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-36" />
                {DAYS.map(d => <col key={d.n} />)}
              </colgroup>
              <thead>
                <tr className="bg-[var(--bg-card-alt)]">
                  <th className="px-3 py-3 text-[12px] font-semibold text-[var(--text-muted)]">Horário</th>
                  {DAYS.map(d => (
                    <th
                      key={d.n}
                      className={cx('px-3 py-3 text-center text-[13px] font-semibold', d.n === today ? 'text-[var(--accent)]' : 'text-[var(--text-heading)]')}
                    >
                      {d.name}
                      {d.n === today && <span className="ml-1.5 text-[11px] font-medium text-[var(--text-muted)]">hoje</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shiftInfo.periods.map(period =>
                  period.isBreak ? (
                    <tr key={`b-${period.slotOrder}`} className="border-t border-[var(--border)] bg-[#FEF8EC]">
                      <td className="px-3 py-2.5">
                        <SlotLabel period={period} onEdit={() => setSlotForm({ slotOrder: period.slotOrder, label: period.label, start: period.startTime, end: period.endTime, isBreak: true })} />
                      </td>
                      <td colSpan={5} className="px-3 py-2.5 text-center text-[13px] font-semibold text-[#7A4505]">
                        <Coffee className="mr-1.5 inline h-4 w-4 align-[-3px]" aria-hidden />
                        {period.label || 'Intervalo'}
                      </td>
                    </tr>
                  ) : (
                    <tr key={`p-${period.periodNumber}`} className="border-t border-[var(--border)]">
                      <td className="bg-[var(--bg-card-alt)] px-3 py-2">
                        <SlotLabel period={period} onEdit={() => setSlotForm({ slotOrder: period.slotOrder, label: period.label, start: period.startTime, end: period.endTime, isBreak: false })} />
                      </td>
                      {DAYS.map(d => {
                        const cell = matrix[`${d.n}_${period.periodNumber}`];
                        const filled = cell && !EMPTY_NAMES.includes(cell.discipline_name.toLowerCase());
                        return (
                          <td key={d.n} className={cx('p-1.5', d.n === today && 'bg-[var(--accent-soft)]')}>
                            <button
                              type="button"
                              onClick={() => openCell(d.n, period)}
                              aria-label={`${d.name}, ${period.label}: ${filled ? cell.discipline_name : 'sem aula'}`}
                              className={cx(
                                'flex min-h-[68px] w-full flex-col justify-center rounded-xl px-3 py-2 text-left transition-all',
                                filled
                                  ? 'border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:shadow-[0_10px_24px_-18px_rgba(16,24,40,0.5)]'
                                  : 'items-center border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                              )}
                            >
                              {filled ? (
                                <>
                                  <span className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-[var(--text-heading)]">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(cell.discipline_name) }} />
                                    <span className="truncate">{cell.discipline_name}</span>
                                  </span>
                                  <span className="mt-0.5 truncate text-[12px] text-[var(--text-body)]">
                                    {cell.teacher_name || <span className="text-[var(--text-muted)]">Sem professor</span>}
                                  </span>
                                  {cell.room && <span className="truncate text-[11px] text-[var(--text-muted)]">{cell.room}</span>}
                                </>
                              ) : (
                                <span className="flex items-center gap-1 text-[12px] font-semibold">
                                  <Plus className="h-3.5 w-3.5" /> Aula
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Aula */}
      <Modal
        open={!!editingCell}
        onClose={() => setEditingCell(null)}
        icon={<BookOpen className="h-5 w-5" />}
        title="Aula"
        subtitle={editingCell ? `${DAYS.find(d => d.n === editingCell.day)?.name} · ${editingCell.start} às ${editingCell.end}${selectedClass ? ` · ${selectedClass.name}` : ''}` : undefined}
        footer={
          <>
            {editingCell && matrix[`${editingCell.day}_${editingCell.period}`] && (
              <Button variant="danger" icon={Trash2} onClick={clearCell} className="mr-auto">Deixar sem aula</Button>
            )}
            <Button variant="ghost" onClick={() => setEditingCell(null)}>Cancelar</Button>
            <Button onClick={applyCell}>Aplicar</Button>
          </>
        }
      >
        <div className="space-y-4">
          {cellError && <Alert tone="danger">{cellError}</Alert>}
          <div>
            <p className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Disciplina</p>
            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {[...disciplineOptions, { name: '__outra', color: '#94A3B8' }].map(d => {
                const active = cellDiscipline === d.name;
                return (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => setCellDiscipline(d.name)}
                    aria-pressed={active}
                    className={cx(
                      'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold transition-colors',
                      active ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-heading)]' : 'border-[var(--border)] text-[var(--text-body)] hover:border-[var(--accent)]'
                    )}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="truncate">{d.name === '__outra' ? 'Outra' : d.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {cellDiscipline === '__outra' && (
            <Field label="Nome da disciplina">
              {id => <input id={id} className={inputCls} value={cellCustom} onChange={e => setCellCustom(e.target.value)} placeholder="Ex.: Robótica" autoFocus />}
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Professor" hint={teachers.length === 0 ? 'Cadastre os professores em Funcionários para escolher da lista.' : undefined}>
              {id => (
                <>
                  <input id={id} className={inputCls} list="horario-professores" value={cellTeacher} onChange={e => setCellTeacher(e.target.value)} autoComplete="off" />
                  <datalist id="horario-professores">
                    {teachers.map(t => <option key={t.id} value={t.name} />)}
                  </datalist>
                </>
              )}
            </Field>
            <Field label="Sala">
              {id => <input id={id} className={inputCls} value={cellRoom} onChange={e => setCellRoom(e.target.value)} placeholder={selectedClass?.room || ''} />}
            </Field>
          </div>
        </div>
      </Modal>

      {/* Horário do turno */}
      <Modal
        open={!!slotForm}
        onClose={() => setSlotForm(null)}
        icon={<Clock className="h-5 w-5" />}
        title={slotForm?.slotOrder !== undefined ? `Horário: ${slotForm.label}` : 'Novo horário'}
        subtitle={`Vale para todas as turmas da ${SHIFT_LABEL[shiftKey].toLowerCase()}`}
        footer={
          <>
            {slotForm?.slotOrder !== undefined && (
              <Button variant="danger" icon={Trash2} onClick={() => setConfirmDeleteSlot(true)} className="mr-auto" disabled={savingSlot}>
                Remover
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSlotForm(null)} disabled={savingSlot}>Cancelar</Button>
            <Button onClick={saveSlot} loading={savingSlot}>Salvar horário</Button>
          </>
        }
      >
        {slotForm && (
          <div className="space-y-4">
            {slotError && <Alert tone="danger">{slotError}</Alert>}
            {slotForm.slotOrder === undefined && (
              <>
                <Field label="Nome">
                  {id => (
                    <input
                      id={id}
                      className={inputCls}
                      value={slotForm.label}
                      onChange={e => setSlotForm({ ...slotForm, label: e.target.value })}
                      placeholder={slotForm.isBreak ? 'Intervalo' : `${lessonPeriods.length + 1}ª aula`}
                    />
                  )}
                </Field>
                <label className="flex cursor-pointer items-center gap-3"><Toggle checked={slotForm.isBreak} onChange={v => setSlotForm({ ...slotForm, isBreak: v })} label="É intervalo (sem aula)" /><span className="text-[14px] font-medium text-[var(--text-heading)]">É intervalo (sem aula)</span></label>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Início">
                {id => <input id={id} type="time" className={inputCls} value={slotForm.start} onChange={e => setSlotForm({ ...slotForm, start: e.target.value })} />}
              </Field>
              <Field label="Fim">
                {id => <input id={id} type="time" className={inputCls} value={slotForm.end} onChange={e => setSlotForm({ ...slotForm, end: e.target.value })} />}
              </Field>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] text-[var(--text-muted)]">Duração a partir do início</p>
              <div className="flex flex-wrap gap-1.5">
                {[15, 20, 30, 40, 45, 50, 60].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSlotForm({ ...slotForm, end: addMinutes(slotForm.start, m) })}
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-[12px] font-semibold text-[var(--text-body)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
            {slotForm.slotOrder !== undefined && (
              <Alert tone="warning">Mudar este horário muda a grade de todas as turmas da {SHIFT_LABEL[shiftKey].toLowerCase()}.</Alert>
            )}
          </div>
        )}
      </Modal>

      {/* Turma */}
      <Modal
        open={!!classForm}
        onClose={() => setClassForm(null)}
        icon={<BookOpen className="h-5 w-5" />}
        title={classForm?.id ? 'Editar turma' : 'Nova turma'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setClassForm(null)} disabled={savingClass}>Cancelar</Button>
            <Button onClick={saveClass} loading={savingClass}>{classForm?.id ? 'Salvar' : 'Cadastrar turma'}</Button>
          </>
        }
      >
        {classForm && (
          <div className="space-y-4">
            {classFormError && <Alert tone="danger">{classFormError}</Alert>}
            <Field label="Nome da turma" required>
              {id => <input id={id} className={inputCls} value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} placeholder="Ex.: 6º ano A" autoFocus />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sala">
                {id => <input id={id} className={inputCls} value={classForm.room} onChange={e => setClassForm({ ...classForm, room: e.target.value })} placeholder="Ex.: Sala 8" />}
              </Field>
              <Field label="Turno">
                {id => (
                  <select id={id} className={cx(inputCls, 'h-10 py-0')} value={classForm.shift} onChange={e => setClassForm({ ...classForm, shift: e.target.value as ShiftKey })}>
                    {SHIFT_OPTIONS.map(k => <option key={k} value={k}>{SHIFT_LABEL[k]}</option>)}
                  </select>
                )}
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deletingClass}
        onClose={() => setDeletingClass(null)}
        onConfirm={deleteClass}
        loading={deletingBusy}
        title={`Excluir ${deletingClass?.name || 'turma'}?`}
        confirmLabel="Excluir turma"
      >
        {deletingClass && (deletingClass.students_count || 0) > 0 ? (
          <p>
            Esta turma tem {deletingClass.students_count} estudante(s). Mude os estudantes de turma antes de excluir, senão a exclusão será recusada.
          </p>
        ) : (
          <p>A turma e a grade dela serão apagadas. Isso não pode ser desfeito.</p>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearSchedule}
        loading={saving}
        title={`Apagar a grade de ${selectedClass?.name || 'turma'}?`}
        confirmLabel="Apagar grade"
      >
        <p>Todas as aulas desta turma saem da grade. Os horários do turno continuam.</p>
      </ConfirmModal>

      <ConfirmModal
        open={confirmDeleteSlot}
        onClose={() => setConfirmDeleteSlot(false)}
        onConfirm={deleteSlot}
        loading={savingSlot}
        title={`Remover ${slotForm?.label || 'este horário'}?`}
        confirmLabel="Remover horário"
      >
        <p>O horário sai da {SHIFT_LABEL[shiftKey].toLowerCase()} e as aulas marcadas nele, em todas as turmas, deixam de aparecer.</p>
      </ConfirmModal>

      <ConfirmModal
        open={!!pendingSwitch}
        onClose={() => setPendingSwitch(null)}
        onConfirm={() => {
          const action = pendingSwitch;
          setPendingSwitch(null);
          setDirty(false);
          action?.();
        }}
        title="Sair sem salvar?"
        confirmLabel="Descartar alterações"
      >
        <p>As mudanças na grade de {selectedClass?.name || 'esta turma'} ainda não foram salvas e serão perdidas.</p>
      </ConfirmModal>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
};

function SlotLabel({ period, onEdit }: { period: ShiftPeriodConfig; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left hover:bg-[var(--bg-card)]"
      title="Editar horário"
    >
      <span>
        <span className="block text-[13px] font-semibold tabular-nums text-[var(--text-heading)]">
          {period.startTime} – {period.endTime}
        </span>
        {!period.isBreak && <span className="block text-[11px] text-[var(--text-muted)]">{period.label}</span>}
      </span>
      <Pencil className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </button>
  );
}

export default AdminHorarioAula;