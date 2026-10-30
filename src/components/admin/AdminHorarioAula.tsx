import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Clock, 
  Calendar, 
  Save, 
  RotateCcw, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  School, 
  DoorClosed, 
  GraduationCap, 
  BookOpen, 
  Check, 
  X,
  Layers,
  Edit2,
  Pencil,
  Building2,
  Landmark,
  MoreVertical,
  HelpCircle
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { 
  classScheduleService, 
  SimpleClassEntity, 
  ClassScheduleRecord, 
  STANDARD_DISCIPLINES,
  ShiftInfo,
  ShiftPeriodConfig,
  ScheduleTimeSlot
} from '../../services/schedule/classScheduleService';
import { SchoolClassesGridSection } from './SchoolClassesGridSection';

const SHIFT_OPTIONS = [
  '1º Turno (Matutino)',
  '2º Turno (Vespertino)'
];

export const AdminHorarioAula: React.FC = () => {
  const { currentOrganization, selectedUnit } = usePlatform();
  const organizationId = currentOrganization?.id || '11111111-1111-1111-1111-111111111111';
  const schoolName = currentOrganization?.name || selectedUnit || 'Escola Municipal Vereador José Ferreira de Aguiar';
  const academicYear = '2026';

  // --- Estados Principais ---
  const [classes, setClasses] = useState<SimpleClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedShiftKey, setSelectedShiftKey] = useState<string>('1º Turno (Matutino)');
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [conflictMessages, setConflictMessages] = useState<string[]>([]);
  
  // Realtime clock (Brasília)
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState<number>(1); // 1 = Seg, 2 = Ter...

  // Grid Matrix: key = `${day_of_week}_${period_number}` -> { discipline_name, teacher_name, room }
  const [scheduleMatrix, setScheduleMatrix] = useState<Record<string, { discipline_name: string; teacher_name: string; room: string }>>({});
  
  // Auxiliary Lists (Disciplines, Teachers)
  const [disciplinesList, setDisciplinesList] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [teachersList, setTeachersList] = useState<{ id: string; name: string }[]>([]);

  // Modals de Edição de Célula (Aula individual)
  const [editingCell, setEditingCell] = useState<{ day: number; period: number; startTime: string; endTime: string } | null>(null);
  const [tempDiscipline, setTempDiscipline] = useState<string>('Português');
  const [customDisciplineName, setCustomDisciplineName] = useState<string>('');
  const [tempTeacher, setTempTeacher] = useState<string>('');
  const [tempRoom, setTempRoom] = useState<string>('');

  // Modal de Limpeza de Horário
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);

  // Modal CRUD: Adicionar Turma
  const [showAddClassModal, setShowAddClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassRoom, setNewClassRoom] = useState<string>('Sala 01');
  const [newClassShift, setNewClassShift] = useState<string>('1º Turno (Matutino)');

  // Modal CRUD: Editar Turma
  const [editingClass, setEditingClass] = useState<SimpleClassEntity | null>(null);
  const [editClassName, setEditClassName] = useState<string>('');
  const [editClassRoom, setEditClassRoom] = useState<string>('');
  const [editClassShift, setEditClassShift] = useState<string>('1º Turno (Matutino)');

  // Modal CRUD: Excluir Turma
  const [deletingClass, setDeletingClass] = useState<SimpleClassEntity | null>(null);
  const [deleteChecking, setDeleteChecking] = useState<boolean>(false);
  const [deleteInfo, setDeleteInfo] = useState<{ count: number; hasHistory: boolean } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Modal Edição de Slot de Horário (Início/Fim do slot no turno)
  const [editingSlot, setEditingSlot] = useState<{
    slotOrder: number;
    periodNumber: number;
    label: string;
    startTime: string;
    endTime: string;
    isBreak: boolean;
  } | null>(null);
  const [slotStartTime, setSlotStartTime] = useState<string>('07:30');
  const [slotEndTime, setSlotEndTime] = useState<string>('08:15');
  const [slotEditError, setSlotEditError] = useState<string | null>(null);
  const [savingSlot, setSavingSlot] = useState<boolean>(false);

  // Modal Adicionar Horário (Período / Slot no Turno - Fase 5)
  const [showAddSlotModal, setShowAddSlotModal] = useState<boolean>(false);
  const [newSlotLabel, setNewSlotLabel] = useState<string>('');
  const [newSlotStartTime, setNewSlotStartTime] = useState<string>('11:30');
  const [newSlotEndTime, setNewSlotEndTime] = useState<string>('12:15');
  const [newSlotIsBreak, setNewSlotIsBreak] = useState<boolean>(false);
  const [addSlotError, setAddSlotError] = useState<string | null>(null);
  const [addingSlot, setAddingSlot] = useState<boolean>(false);

  // Turma selecionada
  const selectedClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Turmas filtradas pelo turno selecionado
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (!c.shift) return true;
      if (selectedShiftKey.includes('Matutino') || selectedShiftKey.includes('1º')) {
        return c.shift.toLowerCase().includes('matutino') || c.shift.includes('1º');
      }
      if (selectedShiftKey.includes('Vespertino') || selectedShiftKey.includes('2º')) {
        return c.shift.toLowerCase().includes('vespertino') || c.shift.includes('2º');
      }
      if (selectedShiftKey.includes('Noturno') || selectedShiftKey.includes('3º')) {
        return c.shift.toLowerCase().includes('noturno') || c.shift.includes('3º');
      }
      return true;
    });
  }, [classes, selectedShiftKey]);

  // Carregar ShiftInfo dinâmico da fonte única de dados
  const loadDynamicShiftInfo = useCallback(async (shiftKey: string) => {
    try {
      const info = await classScheduleService.getShiftInfo(organizationId, shiftKey, academicYear);
      setShiftInfo(info);
    } catch (e) {
      console.error('[AdminHorarioAula] Erro ao carregar informações dinâmicas do turno:', e);
    }
  }, [organizationId, academicYear]);

  // Relógio oficial de Brasília
  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });

        setCurrentTime(timeFormatter.format(now));
        const formattedDate = dateFormatter.format(now);
        setCurrentDateStr(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));

        const dayIdx = now.getDay();
        setCurrentDayOfWeek(dayIdx === 0 ? 7 : dayIdx);
      } catch (e) {
        setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
      }
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Datas calculadas da semana atual (Segunda a Sexta)
  const weekDates = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    const days = [
      { dayNumber: 1, name: 'SEGUNDA' },
      { dayNumber: 2, name: 'TERÇA' },
      { dayNumber: 3, name: 'QUARTA' },
      { dayNumber: 4, name: 'QUINTA' },
      { dayNumber: 5, name: 'SEXTA' },
    ];

    return days.map((d, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);
      const dayFormatted = String(dayDate.getDate()).padStart(2, '0');
      const monthFormatted = String(dayDate.getMonth() + 1).padStart(2, '0');
      const yearFormatted = dayDate.getFullYear();
      return {
        ...d,
        dateString: `${dayFormatted}/${monthFormatted}/${yearFormatted}`,
        isToday: currentDayOfWeek === d.dayNumber
      };
    });
  }, [currentDayOfWeek]);

  // Carregar turmas, disciplinas, professores e shiftInfo
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedClasses, fetchedDisciplines, fetchedTeachers] = await Promise.all([
        classScheduleService.getClasses(organizationId),
        classScheduleService.getDisciplines(organizationId),
        classScheduleService.getTeachers(organizationId)
      ]);

      setClasses(fetchedClasses);
      setDisciplinesList(fetchedDisciplines);
      setTeachersList(fetchedTeachers);

      await loadDynamicShiftInfo(selectedShiftKey);

      if (fetchedClasses.length > 0) {
        const currentValid = fetchedClasses.find(c => c.id === selectedClassId);
        if (!currentValid) {
          // Selecionar a primeira turma correspondente ao turno atual
          const matchShift = fetchedClasses.find(c => c.shift && c.shift.toLowerCase().includes(selectedShiftKey.toLowerCase().replace(/[^a-z]/g, '')));
          const initialClass = matchShift || fetchedClasses[0];
          setSelectedClassId(initialClass.id);
          if (initialClass.shift) {
            setSelectedShiftKey(initialClass.shift);
          }
        }
      }
    } catch (error) {
      console.error('[AdminHorarioAula] Erro ao carregar dados iniciais:', error);
      setSyncStatus('offline');
    } finally {
      setLoading(false);
    }
  }, [organizationId, selectedClassId, selectedShiftKey, loadDynamicShiftInfo]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Atualizar shiftInfo quando selectedShiftKey mudar
  useEffect(() => {
    loadDynamicShiftInfo(selectedShiftKey);
  }, [selectedShiftKey, loadDynamicShiftInfo]);

  // Carregar grade da turma selecionada
  const loadClassSchedule = useCallback(async (classId: string) => {
    if (!classId) return;
    try {
      setSyncStatus('syncing');
      const records = await classScheduleService.getClassSchedules(classId);
      
      const newMatrix: Record<string, { discipline_name: string; teacher_name: string; room: string }> = {};
      records.forEach(rec => {
        const key = `${rec.day_of_week}_${rec.period_number}`;
        newMatrix[key] = {
          discipline_name: rec.discipline_name || '',
          teacher_name: rec.teacher_name || '',
          room: rec.room || ''
        };
      });

      setScheduleMatrix(newMatrix);
      setHasUnsavedChanges(false);
      setSyncStatus('synced');
    } catch (err) {
      console.error('[AdminHorarioAula] Erro ao carregar horários da turma:', err);
      setSyncStatus('offline');
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadClassSchedule(selectedClassId);
    }
  }, [selectedClassId, loadClassSchedule]);

  // Supabase Realtime Listener
  useEffect(() => {
    if (!selectedClassId) return;
    const unsubscribeSchedule = classScheduleService.subscribeToClassSchedule(selectedClassId, () => {
      if (!hasUnsavedChanges) {
        loadClassSchedule(selectedClassId);
      }
    });

    const unsubscribeSlots = classScheduleService.subscribeToClassesAndSlots(organizationId, () => {
      loadDynamicShiftInfo(selectedShiftKey);
      loadInitialData();
    });

    const handleGlobalSync = () => {
      loadDynamicShiftInfo(selectedShiftKey);
      loadInitialData();
      if (selectedClassId) {
        loadClassSchedule(selectedClassId);
      }
    };

    window.addEventListener('classium_schedule_updated', handleGlobalSync);
    window.addEventListener('classium_classes_updated', handleGlobalSync);

    return () => {
      unsubscribeSchedule();
      unsubscribeSlots();
      window.removeEventListener('classium_schedule_updated', handleGlobalSync);
      window.removeEventListener('classium_classes_updated', handleGlobalSync);
    };
  }, [selectedClassId, hasUnsavedChanges, loadClassSchedule, organizationId, selectedShiftKey, loadDynamicShiftInfo, loadInitialData]);

  // Troca de turma
  const handleSelectClass = (c: SimpleClassEntity) => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm('Existem alterações não salvas nesta turma. Deseja trocar de turma e descartar?');
      if (!confirmDiscard) return;
    }
    setSelectedClassId(c.id);
    if (c.shift) {
      setSelectedShiftKey(c.shift);
    }
  };

  // Troca de turno
  const handleSelectShift = (shiftName: string) => {
    setSelectedShiftKey(shiftName);
    loadDynamicShiftInfo(shiftName);
    
    // Verificar se a turma atual pertence a este turno; se não, selecionar a primeira do turno
    const matchingClasses = classes.filter(c => {
      if (!c.shift) return true;
      if (shiftName.includes('Matutino')) return c.shift.toLowerCase().includes('matutino') || c.shift.includes('1º');
      if (shiftName.includes('Vespertino')) return c.shift.toLowerCase().includes('vespertino') || c.shift.includes('2º');
      if (shiftName.includes('Noturno')) return c.shift.toLowerCase().includes('noturno') || c.shift.includes('3º');
      return true;
    });

    if (matchingClasses.length > 0 && (!selectedClass || !matchingClasses.some(mc => mc.id === selectedClass.id))) {
      setSelectedClassId(matchingClasses[0].id);
    }
  };

  // Abrir modal de edição de célula de aula
  const handleOpenEditCell = (day: number, period: number, startTime: string, endTime: string) => {
    const key = `${day}_${period}`;
    const current = scheduleMatrix[key];
    const initialDisc = current?.discipline_name || 'Português';
    
    const isStandard = STANDARD_DISCIPLINES.some(d => d.name.toLowerCase() === initialDisc.toLowerCase());
    if (isStandard) {
      setTempDiscipline(initialDisc);
      setCustomDisciplineName('');
    } else if (initialDisc && initialDisc !== 'Sem aula' && initialDisc !== 'Sem aula alocada') {
      setTempDiscipline('Outro');
      setCustomDisciplineName(initialDisc);
    } else {
      setTempDiscipline('Português');
      setCustomDisciplineName('');
    }

    setTempTeacher(current?.teacher_name || '');
    setTempRoom(current?.room || selectedClass?.room || 'Sala 08');
    setEditingCell({ day, period, startTime, endTime });
  };

  // Salvar célula editada na matriz local
  const handleSaveCell = () => {
    if (!editingCell) return;
    const key = `${editingCell.day}_${editingCell.period}`;
    const finalDisciplineName = tempDiscipline === 'Outro' 
      ? (customDisciplineName.trim() || 'Outro')
      : tempDiscipline;

    setScheduleMatrix(prev => ({
      ...prev,
      [key]: {
        discipline_name: finalDisciplineName,
        teacher_name: tempTeacher.trim(),
        room: tempRoom.trim()
      }
    }));

    setHasUnsavedChanges(true);
    setEditingCell(null);
  };

  // Limpar célula individual
  const handleClearCell = () => {
    if (!editingCell) return;
    const key = `${editingCell.day}_${editingCell.period}`;
    setScheduleMatrix(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setHasUnsavedChanges(true);
    setEditingCell(null);
  };

  // Salvar grade inteira no Supabase
  const handleSaveFullSchedule = async () => {
    if (!selectedClassId || !shiftInfo) return;
    setSaving(true);
    setSyncStatus('syncing');

    try {
      const periodsConfig = shiftInfo.periods.filter(p => !p.isBreak);
      const recordsToSave: Array<Omit<ClassScheduleRecord, 'id' | 'created_at'>> = [];

      for (let day = 1; day <= 5; day++) {
        for (const p of periodsConfig) {
          const key = `${day}_${p.periodNumber}`;
          const item = scheduleMatrix[key];
          if (item && item.discipline_name && item.discipline_name !== 'Sem aula' && item.discipline_name !== 'Sem aula alocada') {
            recordsToSave.push({
              organization_id: organizationId,
              class_id: selectedClassId,
              day_of_week: day,
              period_number: p.periodNumber,
              start_time: `${p.startTime}:00`,
              end_time: `${p.endTime}:00`,
              discipline_name: item.discipline_name,
              teacher_name: item.teacher_name || undefined,
              room: item.room || selectedClass?.room || undefined
            });
          }
        }
      }

      const res = await classScheduleService.saveClassSchedules(organizationId, selectedClassId, recordsToSave);
      if (res.success) {
        setConflictMessages([]);
        setHasUnsavedChanges(false);
        setSaveSuccess(true);
        setSyncStatus('synced');
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const errorList = res.error ? res.error.split('\n').map(s => s.trim()).filter(Boolean) : ['Erro desconhecido ao salvar grade.'];
        setConflictMessages(errorList);
        setSyncStatus('offline');
      }
    } catch (e: any) {
      setConflictMessages([`Falha ao salvar horários: ${e.message}`]);
      setSyncStatus('offline');
    } finally {
      setSaving(false);
    }
  };

  // Limpar grade da turma
  const handleConfirmClearSchedule = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      await classScheduleService.clearClassSchedules(selectedClassId);
      setScheduleMatrix({});
      setHasUnsavedChanges(false);
      setShowClearConfirmModal(false);
      setSyncStatus('synced');
    } catch (err: any) {
      alert(`Erro ao limpar grade: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- CRUD DE TURMAS ---
  // 1. Criar Turma
  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      alert('Por favor, informe o nome da turma.');
      return;
    }
    try {
      const res = await classScheduleService.createClass(organizationId, {
        name: newClassName.trim(),
        room: newClassRoom.trim() || 'Sala 01',
        shift: newClassShift || selectedShiftKey,
        academic_year: academicYear
      });

      if (res.success && res.data) {
        setShowAddClassModal(false);
        setNewClassName('');
        setNewClassRoom('Sala 01');
        await loadInitialData();
        setSelectedClassId(res.data.id);
        if (res.data.shift) setSelectedShiftKey(res.data.shift);
      } else {
        alert(`Erro ao cadastrar turma: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Falha: ${e.message}`);
    }
  };

  // 2. Abrir Modal de Editar Turma
  const handleOpenEditClassModal = (c: SimpleClassEntity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClass(c);
    setEditClassName(c.name);
    setEditClassRoom(c.room || 'Sala 01');
    setEditClassShift(c.shift || selectedShiftKey);
  };

  // 2. Salvar Edição da Turma
  const handleSaveEditClass = async () => {
    if (!editingClass || !editClassName.trim()) return;
    try {
      const res = await classScheduleService.updateClass(editingClass.id, {
        name: editClassName.trim(),
        room: editClassRoom.trim() || 'Sala 01',
        shift: editClassShift
      });

      if (res.success && res.data) {
        setEditingClass(null);
        await loadInitialData();
      } else {
        alert(`Erro ao atualizar turma: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Falha ao editar turma: ${e.message}`);
    }
  };

  // 3. Abrir Modal de Excluir Turma (com verificação prévia)
  const handleOpenDeleteClassModal = async (c: SimpleClassEntity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingClass(c);
    setDeleteChecking(true);
    setDeleteError(null);
    try {
      setDeleteInfo({ count: c.students_count || 0, hasHistory: false });
    } catch (err: any) {
      setDeleteError(err?.message || 'Erro ao checar dados da turma.');
    } finally {
      setDeleteChecking(false);
    }
  };

  // 3. Confirmar Exclusão da Turma
  const handleConfirmDeleteClass = async () => {
    if (!deletingClass) return;
    try {
      const res = await classScheduleService.deleteClass(deletingClass.id);
      if (res.success) {
        const deletedId = deletingClass.id;
        setDeletingClass(null);
        // Atualizar lista de turmas
        const updatedClasses = classes.filter(c => c.id !== deletedId);
        setClasses(updatedClasses);
        if (selectedClassId === deletedId && updatedClasses.length > 0) {
          setSelectedClassId(updatedClasses[0].id);
        }
        await loadInitialData();
      } else {
        alert(`Erro ao excluir turma: ${res.error}`);
      }
    } catch (e: any) {
      alert(`Falha ao excluir turma: ${e.message}`);
    }
  };

  // --- EDIÇÃO DE SLOTS DE HORÁRIO ---
  const handleOpenEditSlotModal = (period: ShiftPeriodConfig) => {
    setEditingSlot({
      slotOrder: period.slotOrder,
      periodNumber: period.periodNumber,
      label: period.label,
      startTime: period.startTime,
      endTime: period.endTime,
      isBreak: Boolean(period.isBreak)
    });
    setSlotStartTime(period.startTime);
    setSlotEndTime(period.endTime);
    setSlotEditError(null);
  };

  const handleSaveSlotTime = async () => {
    if (!editingSlot) return;
    setSavingSlot(true);
    setSlotEditError(null);

    try {
      const res = await classScheduleService.updateShiftTimeSlot(
        organizationId,
        selectedShiftKey,
        editingSlot.slotOrder,
        slotStartTime,
        slotEndTime,
        academicYear
      );

      if (res.success && res.shiftInfo) {
        setShiftInfo(res.shiftInfo);
        setEditingSlot(null);
        // Recarregar a grade da turma para refletir os horários atualizados
        if (selectedClassId) {
          await loadClassSchedule(selectedClassId);
        }
      } else {
        setSlotEditError(res.error || 'Erro ao atualizar horário do slot.');
      }
    } catch (e: any) {
      setSlotEditError(e?.message || 'Falha na atualização do slot.');
    } finally {
      setSavingSlot(false);
    }
  };

  // Handler: Adicionar novo horário/período ao turno (Fase 5)
  const handleAddSlot = async () => {
    if (!newSlotStartTime || !newSlotEndTime) {
      setAddSlotError('Informe os horários de início e término.');
      return;
    }
    setAddingSlot(true);
    setAddSlotError(null);

    try {
      const res = await classScheduleService.addShiftTimeSlot(
        organizationId,
        selectedShiftKey,
        {
          label: newSlotLabel.trim() || (newSlotIsBreak ? 'Intervalo' : 'Nova Aula'),
          startTime: newSlotStartTime,
          endTime: newSlotEndTime,
          isBreak: newSlotIsBreak,
          academicYear
        }
      );

      if (res.success && res.shiftInfo) {
        setShiftInfo(res.shiftInfo);
        setShowAddSlotModal(false);
        setNewSlotLabel('');
        setNewSlotStartTime('11:30');
        setNewSlotEndTime('12:15');
        setNewSlotIsBreak(false);
        if (selectedClassId) {
          await loadClassSchedule(selectedClassId);
        }
      } else {
        setAddSlotError(res.error || 'Erro ao adicionar horário.');
      }
    } catch (err: any) {
      setAddSlotError(err?.message || 'Falha ao adicionar horário.');
    } finally {
      setAddingSlot(false);
    }
  };

  // Handler: Excluir período/slot do turno
  const handleDeleteSlot = async (slotOrder: number) => {
    if (!confirm('Deseja realmente remover este período do turno?')) return;
    try {
      const res = await classScheduleService.deleteShiftTimeSlot(
        organizationId,
        selectedShiftKey,
        slotOrder,
        academicYear
      );

      if (res.success && res.shiftInfo) {
        setShiftInfo(res.shiftInfo);
        setEditingSlot(null);
        if (selectedClassId) {
          await loadClassSchedule(selectedClassId);
        }
      } else {
        alert(res.error || 'Erro ao excluir período.');
      }
    } catch (err: any) {
      alert(err?.message || 'Falha ao excluir período.');
    }
  };

  // Helper para ajustar duração do slot rapidamente
  const handleQuickDurationAdjust = (durationMinutes: number, target: 'edit' | 'add' = 'edit') => {
    const baseStart = target === 'edit' ? slotStartTime : newSlotStartTime;
    if (!baseStart) return;
    const [h, m] = baseStart.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return;
    const totalMinutes = h * 60 + m + durationMinutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    const computedEnd = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    
    if (target === 'edit') {
      setSlotEndTime(computedEnd);
    } else {
      setNewSlotEndTime(computedEnd);
    }
  };

  // Helper para obter estilização da disciplina
  const getDisciplineMeta = (disciplineName?: string) => {
    if (!disciplineName || disciplineName === 'Sem aula' || disciplineName === 'Sem aula alocada') {
      return { name: 'Sem aula alocada', color: '#64748B', isAllocated: false, tag: '' };
    }

    const standard = STANDARD_DISCIPLINES.find(d => d.name.toLowerCase() === disciplineName.toLowerCase());
    if (standard) {
      return { name: standard.name, color: standard.color, isAllocated: true, tag: standard.tag };
    }

    const fromDb = disciplinesList.find(d => d.name.toLowerCase() === disciplineName.toLowerCase());
    if (fromDb) {
      return { name: fromDb.name, color: fromDb.color || '#38BDF8', isAllocated: true, tag: fromDb.name.substring(0, 4).toUpperCase() };
    }

    return { name: disciplineName, color: '#94A3B8', isAllocated: true, tag: disciplineName.substring(0, 4).toUpperCase() };
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn text-[var(--text-heading)]">
      {/* ========================================================================= */}
      {/* 4. CABEÇALHO DO MÓDULO & STATUS REALTIME                                  */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--accent-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-soft) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 55% 80% at 100% 0%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 55% 80% at 100% 0%, black, transparent)',
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            {/* 1, 2 & 3. BADGES DE TOPO: ANO LETIVO, STATUS & SINCRONIZAÇÃO */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-[var(--accent-soft)] text-[var(--accent)] text-[12px] font-semibold rounded-full flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" />
                Ano letivo {academicYear}
              </span>
              
              {/* Status de Sincronização */}
              {syncStatus === 'synced' && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-[12px] font-semibold rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Atualizado
                </span>
              )}
              {syncStatus === 'syncing' && (
                <span className="px-3 py-1 bg-amber-50 text-amber-800 text-[12px] font-semibold rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                  Salvando…
                </span>
              )}
              {syncStatus === 'offline' && (
                <span className="px-3 py-1 bg-rose-50 text-rose-800 text-[12px] font-semibold rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                  Sem conexão
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_12px_24px_-14px_rgba(16,24,40,0.6)]" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
                <Clock className="h-6 w-6" />
              </span>
              <div>
                <h1 className="font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)] sm:text-[32px]">Horário de aula</h1>
                <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[var(--text-muted)]">
                  A grade semanal de cada turma. O que você muda aqui aparece na hora para as famílias.
                </p>
              </div>
            </div>

            {/* Nome da Escola em Destaque Visual Moderno */}
            <div className="mt-3 inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[var(--bg-card-alt)] border border-[var(--border)] shadow-sm">
              <div className="p-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Landmark className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] text-[var(--text-muted)]">Escola</span>
                <span className="text-sm font-bold text-[var(--text-heading)] tracking-wide">{schoolName}</span>
              </div>
            </div>
          </div>

          {/* 9 & 10. HORÁRIO ESCOLAR OFICIAL & CONFIGURAÇÃO DOS TURNOS (FONTE ÚNICA DA VERDADE) */}
          <div className="bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between min-w-[300px]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-heading)] uppercase tracking-wider">
                <Clock className="w-4 h-4 text-[var(--accent)]" /> Horário Escolar Oficial
              </div>
              <span className="text-xs text-[var(--text-muted)] font-mono font-semibold">BRT (Brasília)</span>
            </div>

            <div className="text-center my-1.5">
              <div className="text-3xl font-mono font-semibold text-[var(--text-heading)] tracking-wider">
                {currentTime || 'Carregando...'}
              </div>
              <div className="text-xs text-[var(--text-body)] capitalize font-medium mt-0.5">
                {currentDateStr || 'Terça-feira, 15 de Setembro de 2026'}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <div className="text-[var(--text-body)] font-medium">Início das Aulas:</div>
              <div className="text-right font-mono font-bold text-[var(--text-heading)]">
                {shiftInfo?.startTime || '07:30'}
              </div>
              <div className="text-[var(--text-body)] font-medium">Recreio / Intervalo:</div>
              <div className="text-right font-mono font-bold text-amber-700">
                {shiftInfo ? `${shiftInfo.breakStart} às ${shiftInfo.breakEnd}` : '08:50 às 09:10'}
              </div>
              <div className="text-[var(--text-body)] font-medium">Término do Turno:</div>
              <div className="text-right font-mono font-bold text-[var(--text-heading)]">
                {shiftInfo?.endTime || '11:30'}
              </div>
              <div className="text-[var(--text-body)] font-medium">Turno Ativo:</div>
              <div className="text-right font-bold text-[var(--accent)] truncate">
                {shiftInfo?.label || selectedShiftKey}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RESUMO RÁPIDO DO CONTEXTO ATIVO: TURNO, SALA E TURMA ATUAL               */}
        {/* ========================================================================= */}
        <div className="mt-6 pt-6 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Turno Escolar Oficial */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[var(--accent)]" /> Turno Ativo
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-card-alt)] p-1.5 rounded-xl border border-[var(--border)]">
              {SHIFT_OPTIONS.map(shiftKey => {
                const isSelected = selectedShiftKey === shiftKey;
                const shortLabel = shiftKey.includes('Matutino') ? '1º Manhã' : '2º Tarde';
                return (
                  <button
                    key={shiftKey}
                    type="button"
                    onClick={() => handleSelectShift(shiftKey)}
                    className={`py-2 px-3 text-center rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm font-semibold'
                        : 'text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sala Principal da Turma Ativa */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider flex items-center gap-1.5">
              <DoorClosed className="w-4 h-4 text-[var(--accent)]" /> Sala Principal
            </label>
            <div className="bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl px-4 py-2.5 flex items-center justify-between min-h-[44px]">
              <span className="text-sm font-bold text-[var(--text-heading)] truncate">
                {selectedClass?.name || 'Selecione a turma'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-card-alt)] text-[var(--text-heading)] ml-2 shrink-0">
                {selectedClass?.room || 'Sala não definida'}
              </span>
            </div>
          </div>

          {/* Turma Ativa em Foco */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[var(--accent)]" /> Turma Ativa na Grade
            </label>
            <div className="bg-[var(--accent-soft)] border border-[var(--border)] rounded-xl px-4 py-2 flex items-center justify-between min-h-[44px]">
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm font-bold text-[var(--text-heading)] truncate">
                  {selectedClass ? selectedClass.name : 'Nenhuma selecionada'}
                </span>
                {selectedClass && (
                  <span className="text-[11px] font-semibold text-[var(--text-heading)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full shrink-0">
                    {selectedClass.grade || 'Ensino Fundamental'}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-[var(--accent)] shrink-0 ml-2">
                {selectedClass?.shift?.includes('Vespertino') ? '2º Tarde' : '1º Manhã'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO PREMIUM: TURMAS DA ESCOLA (GRADE DE CARDS + BUSCA + FILTROS)        */}
      {/* ========================================================================= */}
      <SchoolClassesGridSection
        classes={classes}
        selectedClassId={selectedClassId}
        selectedShiftKey={selectedShiftKey}
        academicYear={academicYear}
        syncStatus={syncStatus}
        loading={loading}
        error={null}
        onSelectClass={handleSelectClass}
        onAddClass={() => {
          setNewClassShift(selectedShiftKey);
          setShowAddClassModal(true);
        }}
        onEditClass={handleOpenEditClassModal}
        onDeleteClass={handleOpenDeleteClassModal}
        onRetry={loadInitialData}
        onShiftChange={handleSelectShift}
      />

      {/* ========================================================================= */}
      {/* 11. GRADE SEMANAL DE HORÁRIOS & BARRA DE AÇÕES                            */}
      {/* ========================================================================= */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
        {/* Barra de Ações do Gestor */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="text-xl font-bold font-serif text-[var(--text-heading)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--accent)]" />
              Grade Semanal de Horários — {selectedClass?.name || 'Selecione uma turma'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-body)] mt-0.5">
              Horários de aulas alocados. Mudanças feitas aqui refletem automaticamente no Portal Família.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Indicador de alterações pendentes */}
            {hasUnsavedChanges && (
              <span className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg flex items-center gap-1.5 ">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Alterações não salvas
              </span>
            )}
            {saveSuccess && (
              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                 Grade salva com sucesso!
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveFullSchedule}
              disabled={saving || !selectedClassId}
              className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-bold text-sm rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 min-h-[42px]"
            >
              <Save className="w-4 h-4" />
              {saving ? 'SALVANDO...' : 'SALVAR GRADE'}
            </button>

            <button
              type="button"
              onClick={() => {
                setAddSlotError(null);
                setShowAddSlotModal(true);
              }}
              className="px-3.5 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] border border-[var(--border)] text-[var(--text-heading)] text-sm font-bold rounded-xl flex items-center gap-1.5 transition-all min-h-[42px]"
              title="Adicionar novo período de aula ou intervalo ao turno"
            >
              <Plus className="w-4 h-4 text-[var(--accent)]" />
              Adicionar Horário
            </button>

            <button
              type="button"
              onClick={() => selectedClassId && loadClassSchedule(selectedClassId)}
              disabled={loading || saving}
              className="px-3.5 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] border border-[var(--border)] text-[var(--text-heading)] text-sm font-bold rounded-xl flex items-center gap-1.5 transition-all min-h-[42px]"
              title="Recarregar horários do banco"
            >
              <RotateCcw className="w-4 h-4 text-[var(--text-body)]" />
              Recarregar
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirmModal(true)}
              disabled={!selectedClassId}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-sm font-bold rounded-xl flex items-center gap-1.5 transition-all min-h-[42px]"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Horário
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BANNER DE AVISO DE CONFLITOS DE HORÁRIO / PROFESSOR / SALA                */}
        {/* ========================================================================= */}
        {conflictMessages.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-sm space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Atenção: Não foi possível salvar a grade devido a conflitos de integridade</span>
              </div>
              <button
                type="button"
                onClick={() => setConflictMessages([])}
                className="p-1 rounded-lg text-rose-600 hover:text-rose-900 hover:bg-rose-100 transition-colors text-xs font-bold"
              >
                 Fechar
              </button>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs font-medium text-rose-800 pl-1">
              {conflictMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TABELA DA GRADE SEMANAL                                                   */}
        {/* ========================================================================= */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] shadow-sm">
          <table className="w-full text-left border-collapse min-w-[800px]">
            {/* 12. CABEÇALHO DOS DIAS & DATAS OFICIAIS */}
            <thead>
              <tr className="bg-[var(--bg-card-alt)] border-b-2 border-[var(--border)] text-xs font-bold text-[var(--text-heading)] uppercase tracking-wider">
                <th className="p-3.5 w-44 text-center border-r border-[var(--border)]">HORÁRIO</th>
                {weekDates.map(day => (
                  <th
                    key={day.dayNumber}
                    className={`p-3.5 text-center border-r border-[var(--border)] transition-colors ${
                      day.isToday ? 'bg-[var(--accent-soft)] text-[var(--text-heading)] font-semibold border-b-2 border-b-blue-600' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className="text-sm font-bold tracking-wide">
                        {day.name}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-body)] font-mono">
                        {day.dateString}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* CORPO DA TABELA */}
            <tbody className="divide-y divide-[var(--border)] text-xs">
              {(shiftInfo?.periods || []).map((period) => {
                // Linha de Recreio / Intervalo
                if (period.isBreak) {
                  return (
                    <tr
                      key={`period-${period.slotOrder}-break`}
                      className="bg-amber-50 border-y-2 border-amber-300 text-amber-900 font-bold"
                    >
                      <td className="p-3.5 text-center border-r border-[var(--border)] font-mono bg-amber-50">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-amber-950 text-xs">{period.startTime} às {period.endTime}</span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSlotModal(period)}
                              title="Editar horário do recreio"
                              className="p-1 text-amber-800 hover:text-amber-950 hover:bg-amber-50 rounded transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-xs uppercase font-bold text-amber-800 mt-0.5 tracking-wider">
                            INTERVALO
                          </span>
                        </div>
                      </td>
                      <td colSpan={5} className="p-3.5 text-center uppercase tracking-widest text-amber-900 font-semibold text-xs">
                         INTERVALO ESCOLAR / RECREIO ({period.startTime} às {period.endTime})
                      </td>
                    </tr>
                  );
                }

                // Linha Normal de Aula
                return (
                  <tr key={`period-${period.periodNumber}`} className="hover:bg-[var(--bg-card-alt)] transition-colors">
                    {/* Coluna de Horário com Botão de Edição de Slot */}
                    <td className="p-3 text-center border-r border-[var(--border)] font-mono bg-[var(--bg-card-alt)] font-bold text-[var(--text-heading)]">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--text-heading)] text-sm font-bold">{period.startTime} — {period.endTime}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSlotModal(period)}
                            title="Editar horário desta aula no turno"
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-card-alt)] rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-xs text-[var(--accent)] uppercase tracking-wider font-bold mt-0.5">
                          {period.label}
                        </span>
                      </div>
                    </td>

                    {/* Células de Segunda a Sexta */}
                    {[1, 2, 3, 4, 5].map(dayNumber => {
                      const key = `${dayNumber}_${period.periodNumber}`;
                      const cellData = scheduleMatrix[key];
                      const meta = getDisciplineMeta(cellData?.discipline_name);
                      const isTodayCol = currentDayOfWeek === dayNumber;

                      return (
                        <td
                          key={dayNumber}
                          onClick={() => handleOpenEditCell(dayNumber, period.periodNumber, period.startTime, period.endTime)}
                          className={`p-2.5 border-r border-[var(--border)] cursor-pointer transition-all relative group hover:bg-[var(--accent-soft)] ${
                            isTodayCol ? 'bg-[var(--accent-soft)]' : ''
                          }`}
                        >
                          {meta.isAllocated ? (
                            <div className="bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-3 space-y-1.5 shadow-sm group-hover:shadow-md transition-all">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[var(--text-heading)] text-sm truncate flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: meta.color }}
                                  />
                                  {meta.name}
                                </span>
                                {meta.tag && (
                                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-[var(--bg-card-alt)] text-[var(--text-heading)] shrink-0">
                                    {meta.tag}
                                  </span>
                                )}
                              </div>

                              {/* Docente / Professor */}
                              <div className="text-xs text-[var(--text-body)] truncate flex items-center gap-1 font-medium">
                                <span className="text-[var(--text-heading)] font-bold">Prof:</span>
                                <span>{cellData?.teacher_name || 'Não informado'}</span>
                              </div>

                              {/* Sala */}
                              <div className="text-xs text-[var(--text-muted)] font-mono flex items-center justify-between pt-1 border-t border-[var(--border)]">
                                <span>{cellData?.room || selectedClass?.room || 'Sala 08'}</span>
                                <span className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                  Editar 
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="min-h-[72px] rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-card-alt)] hover:bg-[var(--accent-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-muted)] flex flex-col items-center justify-center p-3 text-xs font-semibold gap-1 transition-all">
                              <Plus className="w-4 h-4 opacity-70" />
                              <span>Alocar Aula</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDITAR CÉLULA INDIVIDUAL DA GRADE                                */}
      {/* ========================================================================= */}
      {editingCell && (
        <div className="fixed inset-0 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] space-y-5 text-[var(--text-heading)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[var(--accent)]" />
                  Editar Horário de Aula
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  {weekDates.find(d => d.dayNumber === editingCell.day)?.name} • {editingCell.startTime} às {editingCell.endTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--bg-card-alt)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seleção de Disciplinas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider">
                Selecione a Disciplina
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {STANDARD_DISCIPLINES.map(d => {
                  const isSelected = tempDiscipline === d.name;
                  return (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => setTempDiscipline(d.name)}
                      className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-heading)] font-semibold shadow-sm ring-2 ring-[var(--accent-soft)]'
                          : 'border-[var(--border)] bg-[var(--bg-card-alt)] text-[var(--text-body)] hover:border-[var(--border)] hover:bg-[var(--bg-card-alt)]'
                      }`}
                    >
                      <span className="truncate">{d.name}</span>
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 ml-1"
                        style={{ backgroundColor: d.color }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opção "Outro" */}
            {tempDiscipline === 'Outro' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">
                  Nome da Disciplina Personalizada
                </label>
                <input
                  type="text"
                  value={customDisciplineName}
                  onChange={(e) => setCustomDisciplineName(e.target.value)}
                  placeholder="Ex: Robótica Educacional, Empreendedorismo..."
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none placeholder:text-[var(--text-muted)] font-medium"
                />
              </div>
            )}

            {/* Professor */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider">
                Docente / Professor (Opcional)
              </label>
              <input
                type="text"
                value={tempTeacher}
                onChange={(e) => setTempTeacher(e.target.value)}
                placeholder="Digite o nome do professor"
                className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none placeholder:text-[var(--text-muted)] font-medium"
              />
            </div>

            {/* Sala */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider">
                Sala de Aula / Local
              </label>
              <input
                type="text"
                value={tempRoom}
                onChange={(e) => setTempRoom(e.target.value)}
                placeholder={selectedClass?.room || 'Sala 08'}
                className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none placeholder:text-[var(--text-muted)] font-medium"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleClearCell}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Desalocar Aula
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCell}
                  className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" /> Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR HORÁRIO DO SLOT (FONTE ÚNICA DA VERDADE)                 */}
      {/* ========================================================================= */}
      {editingSlot && (
        <div className="fixed inset-0 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] space-y-4 text-[var(--text-heading)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-[var(--accent)]" />
                  Editar Horário do Slot — {editingSlot.label}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Turno: <strong className="text-[var(--text-heading)]">{selectedShiftKey}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso de impacto no turno */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                Impacto em Todas as Turmas do Turno
              </div>
              <p className="text-amber-800 text-xs leading-relaxed">
                Esta alteração de horário é estrutural e atualizará o horário da <strong>{editingSlot.label}</strong> para todas as turmas vinculadas ao turno <strong>{selectedShiftKey}</strong> no Portal Gestor e no Portal Família.
              </p>
            </div>

            {/* Formulário de Horário Início e Término */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                  Horário de Início (HH:MM)
                </label>
                <input
                  type="time"
                  value={slotStartTime}
                  onChange={(e) => setSlotStartTime(e.target.value)}
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] font-mono font-bold focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                  Horário de Término (HH:MM)
                </label>
                <input
                  type="time"
                  value={slotEndTime}
                  onChange={(e) => setSlotEndTime(e.target.value)}
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] font-mono font-bold focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {/* Botões Rápidos de Duração */}
            <div>
              <span className="text-xs text-[var(--text-body)] block mb-1.5 font-bold">Ajuste Rápido de Duração:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '45 min', mins: 45 },
                  { label: '50 min', mins: 50 },
                  { label: '60 min (1h)', mins: 60 },
                  { label: '20 min (Recreio)', mins: 20 },
                  { label: '15 min', mins: 15 }
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleQuickDurationAdjust(item.mins)}
                    className="px-3 py-1.5 bg-[var(--bg-card-alt)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] text-[var(--text-body)] text-xs font-bold rounded-lg border border-[var(--border)] transition-colors"
                  >
                    +{item.label}
                  </button>
                ))}
              </div>
            </div>

            {slotEditError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                {slotEditError}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => editingSlot && handleDeleteSlot(editingSlot.slotOrder)}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                title="Remover este período do turno"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Período
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSlotTime}
                  disabled={savingSlot}
                  className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> {savingSlot ? 'Salvando...' : 'Salvar Horário do Turno'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRMAÇÃO DE LIMPAR HORÁRIO DA TURMA                           */}
      {/* ========================================================================= */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-rose-200 rounded-2xl max-w-md w-full p-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] space-y-4 text-[var(--text-heading)]">
            <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Limpar Grade Semanal
            </h3>
            <p className="text-sm text-[var(--text-body)] leading-relaxed">
              Tem certeza que deseja apagar todos os horários cadastrados para a turma <strong className="text-[var(--text-heading)]">{selectedClass?.name}</strong>? Esta ação não pode ser desfeita.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearSchedule}
                disabled={saving}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADICIONAR NOVA TURMA                                             */}
      {/* ========================================================================= */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] space-y-4 text-[var(--text-heading)]">
            <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--accent)]" /> Cadastrar Nova Turma
            </h3>
            <p className="text-xs text-[var(--text-body)]">
              Crie uma nova turma para vincular horários e estudantes.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                  Nome da Turma
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ex: 6º Ano A, 1º Ano Ensino Médio..."
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                  Sala Principal
                </label>
                <input
                  type="text"
                  value={newClassRoom}
                  onChange={(e) => setNewClassRoom(e.target.value)}
                  placeholder="Ex: Sala 08, Bloco B..."
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                  Turno
                </label>
                <select
                  value={newClassShift}
                  onChange={(e) => setNewClassShift(e.target.value)}
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none font-medium"
                >
                  {SHIFT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
                className="px-4 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateClass}
                className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Cadastrar Turma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: EDITAR TURMA                                                     */}
      {/* ========================================================================= */}
      {editingClass && (
        <div className="fixed inset-0 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] space-y-4 text-[var(--text-heading)]">
            <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[var(--accent)]" /> Editar Turma
            </h3>
            <p className="text-xs text-[var(--text-body)]">
              Altere os dados cadastrais da turma <strong className="text-[var(--text-heading)]">{editingClass.name}</strong>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                  Nome da Turma
                </label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                  Sala Principal
                </label>
                <input
                  type="text"
                  value={editClassRoom}
                  onChange={(e) => setEditClassRoom(e.target.value)}
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                  Turno
                </label>
                <select
                  value={editClassShift}
                  onChange={(e) => setEditClassShift(e.target.value)}
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none font-medium"
                >
                  {SHIFT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="px-4 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditClass}
                className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EXCLUIR TURMA (COM PROTEÇÃO DE DADOS HISTÓRICOS)                  */}
      {/* ========================================================================= */}
      {deletingClass && (
        <div className="fixed inset-0 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-rose-200 rounded-2xl max-w-md w-full p-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] space-y-4 text-[var(--text-heading)]">
            <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" /> Excluir Turma — {deletingClass.name}
            </h3>
            
            <p className="text-sm text-[var(--text-body)]">
              Deseja realmente remover a turma <strong className="text-[var(--text-heading)]">{deletingClass.name}</strong>?
            </p>

            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                Segurança de Dados Pedagógicos
              </div>
              <p className="text-xs text-rose-800">
                Se a turma possuir matrículas ou notas/frequências registradas, ela será <strong>inativada com segurança (soft delete)</strong>, preservando todo o histórico escolar. Turmas sem histórico serão removidas definitivamente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
                className="px-4 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: ADICIONAR HORÁRIO / PERÍODO AO TURNO (FASE 5)                    */}
      {/* ========================================================================= */}
      {showAddSlotModal && (
        <div className="fixed inset-0 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] space-y-4 text-[var(--text-heading)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--accent)]" /> Adicionar Horário ao Turno
              </h3>
              <span className="px-3 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--text-heading)] text-xs font-bold">
                {selectedShiftKey}
              </span>
            </div>

            <p className="text-xs text-[var(--text-body)]">
              Insira um novo período de aula ou intervalo (ex.: 6ª Aula das 11:30 às 12:15).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                  Nome / Rótulo do Período
                </label>
                <input
                  type="text"
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  placeholder="Ex: 6ª Aula ou Intervalo Extra"
                  className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                    Horário Início
                  </label>
                  <input
                    type="time"
                    value={newSlotStartTime}
                    onChange={(e) => setNewSlotStartTime(e.target.value)}
                    className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-body)] uppercase tracking-wider block mb-1">
                    Horário Término
                  </label>
                  <input
                    type="time"
                    value={newSlotEndTime}
                    onChange={(e) => setNewSlotEndTime(e.target.value)}
                    className="w-full bg-[var(--bg-card-alt)] border-2 border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-heading)] font-mono"
                  />
                </div>
              </div>

              {/* Ajustes rápidos de duração */}
              <div>
                <label className="text-xs text-[var(--text-body)] uppercase tracking-wider block mb-1.5 font-bold">
                  Ajuste Rápido de Duração:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '45 min', mins: 45 },
                    { label: '50 min', mins: 50 },
                    { label: '60 min (1h)', mins: 60 },
                    { label: '15 min (Recreio)', mins: 15 },
                    { label: '20 min (Recreio)', mins: 20 }
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleQuickDurationAdjust(item.mins, 'add')}
                      className="px-3 py-1.5 bg-[var(--bg-card-alt)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] text-[var(--text-body)] text-xs font-bold rounded-lg border border-[var(--border)] transition-colors"
                    >
                      +{item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox Recreio / Intervalo */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newSlotIsBreak}
                    onChange={(e) => setNewSlotIsBreak(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] bg-[var(--bg-card-alt)]"
                  />
                  <span className="text-xs text-[var(--text-body)] font-semibold">
                    Este período é um Intervalo / Recreio Escolar
                  </span>
                </label>
              </div>
            </div>

            {addSlotError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                {addSlotError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowAddSlotModal(false)}
                className="px-4 py-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddSlot}
                disabled={addingSlot}
                className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> {addingSlot ? 'Adicionando...' : 'Adicionar Horário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};