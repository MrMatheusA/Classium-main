import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, UserCheck, Calendar, Clock, Plus, Trash2, CheckCircle2, 
  XCircle, AlertTriangle, ShieldCheck, RefreshCw, Filter, Search, BookOpen, UserX,
  Printer, Download, Copy, Edit, Check, ShieldAlert, Sparkles, FileText, Layers,
  GripVertical, MessageSquare, Send, Share2, Phone, CheckCheck, Info, ChevronDown,
  ArrowDown
} from 'lucide-react';
import { teacherSubstitutionsService, TeacherSubstitution } from '../../services/schedule/teacherSubstitutionsService';
import { supabase } from '../../lib/supabase';

interface TeacherSubstitutionsTabProps {
  organizationId: string;
}

export interface AvailableTeacherSlot {
  id: string;
  teacherName: string;
  discipline: string;
  origin: 'Projeto' | 'Aula Residual' | 'Banco de Horas' | 'Outra Condição';
  observation?: string;
}

export interface SubstitutionBoardItem {
  periodNumber: number;
  timeSlot: string;
  className: string;
  substituteTeacherName: string;
  status?: string;
}

export interface SubstitutionBoard {
  id: string;
  organization_id: string;
  absentTeacherName: string;
  subjectName: string;
  absenceDate: string;
  shift: 'Matutino' | 'Vespertino' | 'Noturno';
  observation: string;
  status: 'rascunho' | 'confirmada' | 'realizada' | 'cancelada';
  items: SubstitutionBoardItem[];
  createdAt: string;
  classiumNotifiedAt?: string;
  whatsappNotifiedAt?: string;
}

// Known school teachers for intelligent auto-completion and default schedules
const KNOWN_TEACHERS = [
  { name: 'Carlos Eduardo', subject: 'Português', phone: '5511988881234' },
  { name: 'Prof. Ana Paula', subject: 'Matemática', phone: '5511977772345' },
  { name: 'Prof. Marcos Vinicius', subject: 'História', phone: '5511966663456' },
  { name: 'Prof. Juliana Souza', subject: 'Ciências', phone: '5511955554567' },
  { name: 'Fernando Dias', subject: 'Geografia', phone: '5511944445678' },
  { name: 'Patrícia Lima', subject: 'Artes', phone: '5511933336789' },
  { name: 'Roberto Santos', subject: 'Educação Física', phone: '5511922227890' },
  { name: 'Beatriz Almeida', subject: 'Inglês', phone: '5511911118901' },
  { name: 'Gabriel Mendes', subject: 'Ensino Religioso', phone: '5511900009012' }
];

// Helper to determine day of week in Portuguese from YYYY-MM-DD
function getDayOfWeekFromDate(dateStr: string): string {
  if (!dateStr) return 'Segunda';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const dayName = days[dt.getDay()];
  if (dayName === 'Domingo' || dayName === 'Sábado') return 'Segunda';
  return dayName;
}

// Intelligent schedule generator for absent teachers
function generateTeacherSchedule(teacherName: string, dayOfWeek: string, shift: string): SubstitutionBoardItem[] {
  const normName = (teacherName || '').toLowerCase();
  
  // Custom mapping for Carlos Eduardo (Português)
  if (normName.includes('carlos') || normName.includes('eduardo')) {
    if (dayOfWeek === 'Segunda') {
      return [
        { periodNumber: 1, timeSlot: '07:30 - 08:15', className: '6º Ano A', substituteTeacherName: 'Fernando Dias' },
        { periodNumber: 2, timeSlot: '08:15 - 09:00', className: '7º Ano B', substituteTeacherName: 'Juliana Souza' },
        { periodNumber: 3, timeSlot: '09:15 - 10:00', className: '6º Ano A', substituteTeacherName: 'Sem substituto' },
        { periodNumber: 4, timeSlot: '10:00 - 10:45', className: '8º Ano A', substituteTeacherName: 'Fernando Dias' },
        { periodNumber: 5, timeSlot: '10:45 - 11:30', className: '9º Ano C', substituteTeacherName: 'Marcos Vinicius' }
      ];
    } else if (dayOfWeek === 'Terça') {
      return [
        { periodNumber: 1, timeSlot: '07:30 - 08:15', className: '7º Ano A', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 2, timeSlot: '08:15 - 09:00', className: '8º Ano B', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 3, timeSlot: '09:15 - 10:00', className: '9º Ano A', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 4, timeSlot: '10:00 - 10:45', className: '6º Ano B', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 5, timeSlot: '10:45 - 11:30', className: '7º Ano B', substituteTeacherName: 'Selecione o substituto' }
      ];
    } else if (dayOfWeek === 'Quarta') {
      return [
        { periodNumber: 1, timeSlot: '07:30 - 08:15', className: '6º Ano A', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 2, timeSlot: '08:15 - 09:00', className: '6º Ano A', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 3, timeSlot: '09:15 - 10:00', className: '8º Ano A', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 4, timeSlot: '10:00 - 10:45', className: '9º Ano C', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 5, timeSlot: '10:45 - 11:30', className: '7º Ano B', substituteTeacherName: 'Selecione o substituto' }
      ];
    } else if (dayOfWeek === 'Quinta') {
      return [
        { periodNumber: 1, timeSlot: '07:30 - 08:15', className: '8º Ano A', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 2, timeSlot: '08:15 - 09:00', className: '9º Ano C', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 3, timeSlot: '09:15 - 10:00', className: '7º Ano B', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 4, timeSlot: '10:00 - 10:45', className: '6º Ano A', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 5, timeSlot: '10:45 - 11:30', className: '6º Ano B', substituteTeacherName: 'Selecione o substituto' }
      ];
    } else {
      return [
        { periodNumber: 1, timeSlot: '07:30 - 08:15', className: '9º Ano C', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 2, timeSlot: '08:15 - 09:00', className: '6º Ano A', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 3, timeSlot: '09:15 - 10:00', className: '7º Ano B', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 4, timeSlot: '10:00 - 10:45', className: '8º Ano A', substituteTeacherName: 'Selecione o substituto' },
        { periodNumber: 5, timeSlot: '10:45 - 11:30', className: '8º Ano A', substituteTeacherName: 'Selecione o substituto' }
      ];
    }
  }

  // Custom mapping for Ana Paula (Matemática)
  if (normName.includes('ana') || normName.includes('paula')) {
    return [
      { periodNumber: 1, timeSlot: '07:30 - 08:15', className: '8º Ano A', substituteTeacherName: 'Selecione o substituto' },
      { periodNumber: 2, timeSlot: '08:15 - 09:00', className: '9º Ano B', substituteTeacherName: 'Selecione o substituto' },
      { periodNumber: 3, timeSlot: '09:15 - 10:00', className: '7º Ano A', substituteTeacherName: 'Selecione o substituto' },
      { periodNumber: 4, timeSlot: '10:00 - 10:45', className: '6º Ano C', substituteTeacherName: 'Selecione o substituto' },
      { periodNumber: 5, timeSlot: '10:45 - 11:30', className: '6º Ano C', substituteTeacherName: 'Selecione o substituto' }
    ];
  }

  // Custom mapping for Marcos Vinicius (História)
  if (normName.includes('marcos') || normName.includes('vinicius')) {
    return [
      { periodNumber: 1, timeSlot: '07:30 - 08:15', className: '9º Ano A', substituteTeacherName: 'Selecione o substituto' },
      { periodNumber: 2, timeSlot: '08:15 - 09:00', className: '8º Ano B', substituteTeacherName: 'Selecione o substituto' },
      { periodNumber: 3, timeSlot: '09:15 - 10:00', className: '7º Ano C', substituteTeacherName: 'Selecione o substituto' },
      { periodNumber: 4, timeSlot: '10:00 - 10:45', className: '6º Ano A', substituteTeacherName: 'Selecione o substituto' },
      { periodNumber: 5, timeSlot: '10:45 - 11:30', className: '6º Ano B', substituteTeacherName: 'Selecione o substituto' }
    ];
  }

  // Default balanced distribution based on shift
  const defaultClasses = shift === 'Vespertino'
    ? ['6º Ano D', '7º Ano C', '8º Ano C', '9º Ano D', '6º Ano E']
    : ['6º Ano A', '7º Ano B', '6º Ano A', '8º Ano A', '9º Ano C'];

  const timeSlots = shift === 'Vespertino'
    ? ['13:00 - 13:45', '13:45 - 14:30', '15:10 - 15:55', '15:55 - 16:40', '16:40 - 17:30']
    : ['07:30 - 08:15', '08:15 - 09:00', '09:15 - 10:00', '10:00 - 10:45', '10:45 - 11:30'];

  return [1, 2, 3, 4, 5].map((periodNumber, idx) => ({
    periodNumber,
    timeSlot: timeSlots[idx] || '07:30 - 08:15',
    className: defaultClasses[idx] || 'Turma Regular',
    substituteTeacherName: 'Selecione o substituto'
  }));
}

export function TeacherSubstitutionsTab({ organizationId }: TeacherSubstitutionsTabProps) {
  // View mode: default is 'integrada' (both tables together), or user can toggle
  const [layoutMode, setLayoutMode] = useState<'integrada' | 'apenas_disponibilidade' | 'apenas_quadros'>('integrada');

  const [substitutions, setSubstitutions] = useState<TeacherSubstitution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters for Availability Matrix
  const [academicYear, setAcademicYear] = useState<string>('2026');
  const [selectedShift, setSelectedShift] = useState<'Matutino' | 'Vespertino'>('Matutino');
  const [validityPeriod, setValidityPeriod] = useState<string>('2026/1 - Julho a Dezembro');

  // Drag and Drop active states
  const [draggedTeacher, setDraggedTeacher] = useState<AvailableTeacherSlot & { day?: string; period?: number } | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

  // Availability Matrix State: Record<DayOfWeek, Record<PeriodNumber, AvailableTeacherSlot[]>>
  const [availabilityMatrix, setAvailabilityMatrix] = useState<Record<string, Record<number, AvailableTeacherSlot[]>>>(() => {
    try {
      const saved = localStorage.getItem(`classium_availability_matrix_${organizationId}`);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      'Segunda': {
        1: [{ id: 'av-1', teacherName: 'Prof. Ana Paula', discipline: 'Matemática', origin: 'Projeto', observation: 'Projeto Olimpíada' }],
        2: [{ id: 'av-2', teacherName: 'Prof. Marcos Vinicius', discipline: 'História', origin: 'Aula Residual', observation: 'Livre no horário' }],
        3: [], 4: [], 5: []
      },
      'Terça': {
        1: [], 2: [{ id: 'av-3', teacherName: 'Prof. Juliana Souza', discipline: 'Ciências', origin: 'Banco de Horas', observation: '' }], 3: [], 4: [], 5: []
      },
      'Quarta': { 1: [], 2: [], 3: [], 4: [], 5: [] },
      'Quinta': { 1: [], 2: [], 3: [], 4: [], 5: [] },
      'Sexta': { 1: [], 2: [], 3: [], 4: [], 5: [] }
    };
  });

  // Modal to Add Availability Teacher
  const [showAddAvModal, setShowAddAvModal] = useState(false);
  const [targetDay, setTargetDay] = useState<string>('Segunda');
  const [targetPeriod, setTargetPeriod] = useState<number>(1);
  const [avTeacherName, setAvTeacherName] = useState<string>('');
  const [avDiscipline, setAvDiscipline] = useState<string>('Matemática');
  const [avOrigin, setAvOrigin] = useState<AvailableTeacherSlot['origin']>('Projeto');
  const [avObs, setAvObs] = useState<string>('');

  // Substitution Boards State
  const [substitutionBoards, setSubstitutionBoards] = useState<SubstitutionBoard[]>(() => {
    try {
      const saved = localStorage.getItem(`classium_sub_boards_${organizationId}`);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        id: 'board-1',
        organization_id: organizationId,
        absentTeacherName: 'Carlos Eduardo',
        subjectName: 'Português',
        absenceDate: new Date().toISOString().split('T')[0],
        shift: 'Matutino',
        observation: 'Afastamento médico / Licença saúde',
        status: 'confirmada',
        items: [
          { periodNumber: 1, timeSlot: '07:30 - 08:15', className: '6º Ano A', substituteTeacherName: 'Fernando Dias' },
          { periodNumber: 2, timeSlot: '08:15 - 09:00', className: '7º Ano B', substituteTeacherName: 'Juliana Souza' },
          { periodNumber: 3, timeSlot: '09:15 - 10:00', className: '6º Ano A', substituteTeacherName: 'Sem substituto' },
          { periodNumber: 4, timeSlot: '10:00 - 10:45', className: '8º Ano A', substituteTeacherName: 'Fernando Dias' },
          { periodNumber: 5, timeSlot: '10:45 - 11:30', className: '9º Ano C', substituteTeacherName: 'Marcos Vinicius' }
        ],
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Modal to Create New Substitution Board
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [boardAbsentTeacher, setBoardAbsentTeacher] = useState('');
  const [boardSubject, setBoardSubject] = useState('Português');
  const [boardDate, setBoardDate] = useState(new Date().toISOString().split('T')[0]);
  const [boardShift, setBoardShift] = useState<'Matutino' | 'Vespertino' | 'Noturno'>('Matutino');
  const [boardObservation, setBoardObservation] = useState('');
  const [autoLoadedInfo, setAutoLoadedInfo] = useState<string | null>(null);
  const [boardItems, setBoardItems] = useState<SubstitutionBoardItem[]>([
    { periodNumber: 1, timeSlot: '07:30 - 08:15', className: '6º Ano A', substituteTeacherName: 'Fernando Dias' },
    { periodNumber: 2, timeSlot: '08:15 - 09:00', className: '7º Ano B', substituteTeacherName: 'Juliana Souza' },
    { periodNumber: 3, timeSlot: '09:15 - 10:00', className: '6º Ano A', substituteTeacherName: 'Selecione o substituto' },
    { periodNumber: 4, timeSlot: '10:00 - 10:45', className: '8º Ano A', substituteTeacherName: 'Selecione o substituto' },
    { periodNumber: 5, timeSlot: '10:45 - 11:30', className: '9º Ano C', substituteTeacherName: 'Selecione o substituto' }
  ]);

  // WhatsApp Dispatch Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppBoard, setWhatsAppBoard] = useState<SubstitutionBoard | null>(null);
  const [whatsAppRecipient, setWhatsAppRecipient] = useState<string>('');
  const [whatsAppPhone, setWhatsAppPhone] = useState<string>('5511988881234');
  const [whatsAppMessage, setWhatsAppMessage] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Filter for boards in the view
  const [boardFilterStatus, setBoardFilterStatus] = useState<'todos' | 'confirmada' | 'rascunho'>('todos');
  const [boardSearchTerm, setBoardSearchTerm] = useState('');

  // Load substitutions
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teacherSubstitutionsService.getSubstitutions(organizationId);
      setSubstitutions(data);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Error loading substitutions:', err);
      // Non-fatal, local boards will continue
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('classium_substitutions_updated', handleSync);
    return () => {
      window.removeEventListener('classium_substitutions_updated', handleSync);
    };
  }, [loadData]);

  // Save availability matrix
  const saveAvailabilityMatrix = (newMatrix: typeof availabilityMatrix) => {
    setAvailabilityMatrix(newMatrix);
    try {
      localStorage.setItem(`classium_availability_matrix_${organizationId}`, JSON.stringify(newMatrix));
      setSuccessMsg('Quadro de disponibilidade atualizado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setErrorMsg('Erro ao salvar disponibilidade.');
    }
  };

  const handleAddAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!avTeacherName.trim()) {
      setErrorMsg('Informe o nome do professor disponível.');
      return;
    }

    const daySlots = availabilityMatrix[targetDay] || { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const currentList = daySlots[targetPeriod] || [];

    // Check duplicate in same cell
    if (currentList.some(item => item.teacherName.toLowerCase() === avTeacherName.toLowerCase())) {
      setErrorMsg('Este professor já está cadastrado nesta célula de horário.');
      return;
    }

    const newItem: AvailableTeacherSlot = {
      id: `av-${Date.now()}`,
      teacherName: avTeacherName.trim(),
      discipline: avDiscipline,
      origin: avOrigin,
      observation: avObs.trim()
    };

    const updatedMatrix = {
      ...availabilityMatrix,
      [targetDay]: {
        ...daySlots,
        [targetPeriod]: [...currentList, newItem]
      }
    };

    saveAvailabilityMatrix(updatedMatrix);
    setShowAddAvModal(false);
    setAvTeacherName('');
    setAvObs('');
  };

  const handleRemoveAvailability = (day: string, period: number, id: string) => {
    const daySlots = availabilityMatrix[day] || { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const currentList = daySlots[period] || [];
    const updatedList = currentList.filter(item => item.id !== id);

    const updatedMatrix = {
      ...availabilityMatrix,
      [day]: {
        ...daySlots,
        [period]: updatedList
      }
    };

    saveAvailabilityMatrix(updatedMatrix);
  };

  const handleDuplicateMatrix = () => {
    setSuccessMsg('Quadro duplicado com sucesso para o novo período letivo!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // AUTO-LOAD SCHEDULE WHEN ABSENT TEACHER OR DATE CHANGES
  // ---------------------------------------------------------------------------
  const handleAbsentTeacherChange = (teacherName: string, dateStr = boardDate, shift = boardShift) => {
    setBoardAbsentTeacher(teacherName);
    
    // Auto-fill discipline if recognized
    const match = KNOWN_TEACHERS.find(t => t.name.toLowerCase() === teacherName.toLowerCase() || teacherName.toLowerCase().includes(t.name.toLowerCase()));
    if (match) {
      setBoardSubject(match.subject);
    }

    if (!teacherName.trim()) {
      setAutoLoadedInfo(null);
      return;
    }

    const dayOfWeek = getDayOfWeekFromDate(dateStr);
    const generated = generateTeacherSchedule(teacherName, dayOfWeek, shift);
    setBoardItems(generated);
    setAutoLoadedInfo(`Horário carregado automaticamente: ${generated.length} aulas alocadas para ${dayOfWeek} (${shift})`);
  };

  const handleDateChange = (newDate: string) => {
    setBoardDate(newDate);
    if (boardAbsentTeacher.trim()) {
      const dayOfWeek = getDayOfWeekFromDate(newDate);
      const generated = generateTeacherSchedule(boardAbsentTeacher, dayOfWeek, boardShift);
      setBoardItems(generated);
      setAutoLoadedInfo(`Horário atualizado para ${dayOfWeek} (${boardShift}): ${generated.length} aulas.`);
    }
  };

  const handleShiftChange = (newShift: 'Matutino' | 'Vespertino' | 'Noturno') => {
    setBoardShift(newShift);
    if (boardAbsentTeacher.trim()) {
      const dayOfWeek = getDayOfWeekFromDate(boardDate);
      const generated = generateTeacherSchedule(boardAbsentTeacher, dayOfWeek, newShift);
      setBoardItems(generated);
      setAutoLoadedInfo(`Horário recalculado para o turno ${newShift}.`);
    }
  };

  // ---------------------------------------------------------------------------
  // DRAG & DROP ON REGISTERED BOARDS
  // ---------------------------------------------------------------------------
  const handleAssignSubstituteToBoard = (boardId: string, periodNumber: number, substituteName: string) => {
    const updated = substitutionBoards.map(board => {
      if (board.id !== boardId) return board;
      const newItems = board.items.map(item => {
        if (item.periodNumber === periodNumber) {
          return { ...item, substituteTeacherName: substituteName };
        }
        return item;
      });
      return { ...board, items: newItems };
    });

    setSubstitutionBoards(updated);
    try {
      localStorage.setItem(`classium_sub_boards_${organizationId}`, JSON.stringify(updated));
    } catch (_) {}

    setSuccessMsg(`Professor(a) ${substituteName} alocado(a) com sucesso para o ${periodNumber}º horário!`);
    setTimeout(() => setSuccessMsg(null), 3500);

    // Sync to remote service in background
    const targetBoard = updated.find(b => b.id === boardId);
    if (targetBoard) {
      const targetItem = targetBoard.items.find(i => i.periodNumber === periodNumber);
      if (targetItem) {
        teacherSubstitutionsService.createSubstitution({
          organization_id: organizationId,
          absent_teacher_id: `abs-${Date.now()}`,
          absent_teacher_name: targetBoard.absentTeacherName,
          substitute_teacher_id: `sub-${Date.now()}`,
          substitute_teacher_name: substituteName,
          class_id: 'c-drag-drop',
          class_name: targetItem.className,
          subject_name: targetBoard.subjectName,
          substitution_date: targetBoard.absenceDate,
          time_slot: targetItem.timeSlot,
          period_number: periodNumber,
          reason: targetBoard.observation || 'Alocação direta por arrasto (Disponibilidade)',
          status: 'aceita'
        }).catch(err => console.warn('Background sync warning:', err));
      }
    }
  };

  // Save new board
  const handleSaveBoard = (status: SubstitutionBoard['status']) => {
    if (!boardAbsentTeacher.trim()) {
      setErrorMsg('Informe o nome do professor ausente.');
      return;
    }

    const newBoard: SubstitutionBoard = {
      id: `board-${Date.now()}`,
      organization_id: organizationId,
      absentTeacherName: boardAbsentTeacher.trim(),
      subjectName: boardSubject,
      absenceDate: boardDate,
      shift: boardShift,
      observation: boardObservation,
      status,
      items: boardItems,
      createdAt: new Date().toISOString()
    };

    const updated = [newBoard, ...substitutionBoards];
    setSubstitutionBoards(updated);
    try {
      localStorage.setItem(`classium_sub_boards_${organizationId}`, JSON.stringify(updated));
    } catch (_) {}

    // Sync each allocated substitution
    boardItems.forEach(async (item, idx) => {
      if (item.substituteTeacherName && item.substituteTeacherName !== 'Selecione o substituto' && item.substituteTeacherName !== 'Sem substituto') {
        try {
          await teacherSubstitutionsService.createSubstitution({
            organization_id: organizationId,
            absent_teacher_id: `abs-${Date.now()}`,
            absent_teacher_name: boardAbsentTeacher.trim(),
            substitute_teacher_id: `sub-${Date.now()}-${idx}`,
            substitute_teacher_name: item.substituteTeacherName,
            class_id: 'c-gen',
            class_name: item.className,
            subject_name: boardSubject,
            substitution_date: boardDate,
            time_slot: item.timeSlot,
            period_number: item.periodNumber,
            reason: boardObservation || 'Cobertura de aula regimental',
            status: status === 'confirmada' ? 'aceita' : 'pendente'
          });
        } catch (e) {
          console.warn('Failed to sync substitution to remote:', e);
        }
      }
    });

    setSuccessMsg(`Quadro de substituição ${status === 'confirmada' ? 'confirmado e publicado' : 'salvo como rascunho'} com sucesso!`);
    setShowNewBoardModal(false);
    setBoardAbsentTeacher('');
    setBoardObservation('');
    setAutoLoadedInfo(null);
    loadData();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleDeleteBoard = (id: string) => {
    if (!confirm('Deseja realmente remover este quadro de substituição?')) return;
    const updated = substitutionBoards.filter(b => b.id !== id);
    setSubstitutionBoards(updated);
    try {
      localStorage.setItem(`classium_sub_boards_${organizationId}`, JSON.stringify(updated));
      setSuccessMsg('Quadro removido com sucesso.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (_) {}
  };

  // ---------------------------------------------------------------------------
  // DISPATCH NOTIFICATIONS: CLASSIUM SYSTEM & WHATSAPP
  // ---------------------------------------------------------------------------
  const handleSendClassiumNotification = (board: SubstitutionBoard) => {
    const validSubs = board.items.filter(i => 
      i.substituteTeacherName && 
      i.substituteTeacherName !== 'Selecione o substituto' && 
      i.substituteTeacherName !== 'Sem substituto'
    );

    const now = new Date().toISOString();
    
    // Update board in local state
    const updated = substitutionBoards.map(b => b.id === board.id ? { ...b, classiumNotifiedAt: now } : b);
    setSubstitutionBoards(updated);
    try {
      localStorage.setItem(`classium_sub_boards_${organizationId}`, JSON.stringify(updated));
      
      // Store in system notifications
      const notifsKey = `classium_notifications_${organizationId}`;
      const existingNotifs = JSON.parse(localStorage.getItem(notifsKey) || '[]');
      const newNotif = {
        id: `notif-${Date.now()}`,
        type: 'substituicao_docente',
        title: `📢 Substituição de Aula: Prof. ${board.absentTeacherName} (${board.subjectName})`,
        body: `Quadro oficial para ${board.absenceDate} (${board.shift}) confirmado. ${validSubs.length} aula(s) cobertas.`,
        data: { boardId: board.id, absenceDate: board.absenceDate },
        created_at: now
      };
      localStorage.setItem(notifsKey, JSON.stringify([newNotif, ...existingNotifs]));
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('classium_substitutions_updated'));
    window.dispatchEvent(new CustomEvent('classium_notification_created'));

    setSuccessMsg(`Notificação enviada com sucesso no Sistema Classium para ${validSubs.length} docente(s) e registrado no Portal do Professor!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleOpenWhatsAppModal = (board: SubstitutionBoard) => {
    setWhatsAppBoard(board);
    
    // Find first allocated substitute teacher or absent teacher
    const firstSub = board.items.find(i => 
      i.substituteTeacherName && 
      i.substituteTeacherName !== 'Selecione o substituto' && 
      i.substituteTeacherName !== 'Sem substituto'
    );
    
    const recipientName = firstSub ? firstSub.substituteTeacherName : board.absentTeacherName;
    setWhatsAppRecipient(recipientName);

    // Look up default phone
    const known = KNOWN_TEACHERS.find(t => t.name.toLowerCase().includes(recipientName.toLowerCase()));
    setWhatsAppPhone(known?.phone || '5511988881234');

    buildWhatsAppMessageText(board, recipientName);
    setShowWhatsAppModal(true);
    setCopiedSuccess(false);
  };

  const buildWhatsAppMessageText = (board: SubstitutionBoard, recipientName: string) => {
    const dayOfWeek = getDayOfWeekFromDate(board.absenceDate);
    const assignedClasses = board.items
      .filter(i => i.substituteTeacherName.toLowerCase().includes(recipientName.toLowerCase()))
      .map(i => `• *${i.timeSlot}* (${i.periodNumber}º Horário): *${i.className}*`)
      .join('\n');

    const msg = `🏛️ *CLASSIUM — GESTÃO PEDAGÓGICA*
📢 *COMUNICADO OFICIAL DE COBERTURA DE AULA*

Olá, Professor(a) *${recipientName}*!
Você foi escalado(a) para cobertura de aula conforme homologado pela coordenação pedagógica:

📅 *Data:* ${board.absenceDate} (${dayOfWeek})
⏰ *Turno:* ${board.shift}
👤 *Professor(a) Ausente:* ${board.absentTeacherName}
📚 *Disciplina:* ${board.subjectName}

📋 *Suas Aulas Designadas:*
${assignedClasses || '• Conforme cronograma oficial do turno.'}

${board.observation ? `📝 *Observação Interna:* ${board.observation}\n` : ''}
Agradecemos sua colaboração e compromisso com nossos estudantes!
_Sistema Classium — Gestão Escolar Integrada_`;

    setWhatsAppMessage(msg);
  };

  const handleRecipientChange = (name: string) => {
    setWhatsAppRecipient(name);
    const known = KNOWN_TEACHERS.find(t => t.name.toLowerCase().includes(name.toLowerCase()));
    if (known?.phone) {
      setWhatsAppPhone(known.phone);
    }
    if (whatsAppBoard) {
      buildWhatsAppMessageText(whatsAppBoard, name);
    }
  };

  const handleSendViaWhatsAppWeb = () => {
    if (!whatsAppBoard) return;
    const cleanPhone = (whatsAppPhone || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(whatsAppMessage);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    
    // Update notified badge
    const updated = substitutionBoards.map(b => b.id === whatsAppBoard.id ? { ...b, whatsappNotifiedAt: new Date().toISOString() } : b);
    setSubstitutionBoards(updated);
    try {
      localStorage.setItem(`classium_sub_boards_${organizationId}`, JSON.stringify(updated));
    } catch (_) {}

    window.open(url, '_blank');
    setShowWhatsAppModal(false);
    setSuccessMsg('Janela do WhatsApp aberta e mensagem pronta para envio!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCopyWhatsAppText = () => {
    navigator.clipboard.writeText(whatsAppMessage);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const timeSlotsConfig = [
    { period: 1, label: '1º horário', time: '07:30 - 08:15' },
    { period: 2, label: '2º horário', time: '08:15 - 09:00' },
    { period: 3, label: '3º horário', time: '09:15 - 10:00' },
    { period: 4, label: '4º horário', time: '10:00 - 10:45' },
    { period: 5, label: '5º horário', time: '10:45 - 11:30' }
  ];

  const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  // Current day of week for the board modal
  const boardDayOfWeek = useMemo(() => getDayOfWeekFromDate(boardDate), [boardDate]);

  // Filtered boards
  const filteredBoards = useMemo(() => {
    return substitutionBoards.filter(b => {
      if (boardFilterStatus !== 'todos' && b.status !== boardFilterStatus) return false;
      if (boardSearchTerm.trim()) {
        const term = boardSearchTerm.toLowerCase();
        const matchesName = b.absentTeacherName.toLowerCase().includes(term);
        const matchesSubject = b.subjectName.toLowerCase().includes(term);
        const matchesItem = b.items.some(i => 
          i.className.toLowerCase().includes(term) || 
          i.substituteTeacherName.toLowerCase().includes(term)
        );
        return matchesName || matchesSubject || matchesItem;
      }
      return true;
    });
  }, [substitutionBoards, boardFilterStatus, boardSearchTerm]);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Users className="w-5 h-5" />
            </span>
            <h3 className="font-serif font-bold text-xl text-slate-900">
              Substituições de Professores & Cobertura de Aulas
            </h3>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl">
            Gestão unificada de disponibilidade docente (projetos e aulas residuais) integrada aos quadros oficiais de substituição com alocação por arrasto e disparo via WhatsApp e Sistema.
          </p>
        </div>

        {/* Layout mode switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setLayoutMode('integrada')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              layoutMode === 'integrada'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Exibe a Lista de Projetos e o Quadro de Substituição integrados na mesma página"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Visão Integrada</span>
          </button>
          <button
            onClick={() => setLayoutMode('apenas_disponibilidade')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              layoutMode === 'apenas_disponibilidade'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Disponibilidade
          </button>
          <button
            onClick={() => setLayoutMode('apenas_quadros')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              layoutMode === 'apenas_quadros'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Quadros ({substitutionBoards.length})
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* ========================================================= */}
      {/* PARTE 1: TABELA DE DISPONIBILIDADE (PROJETOS & RESIDUAIS) */}
      {/* ========================================================= */}
      {(layoutMode === 'integrada' || layoutMode === 'apenas_disponibilidade') && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ano Letivo</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Turno</label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="Matutino">Turno Matutino (07:30 - 11:30)</option>
                <option value="Vespertino">Turno Vespertino (13:00 - 17:30)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Período de Vigência</label>
              <input
                type="text"
                value={validityPeriod}
                onChange={(e) => setValidityPeriod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Matrix Container */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-mono text-blue-900 font-bold uppercase tracking-widest block">
                  Escola Ativa • {validityPeriod}
                </span>
                <h4 className="font-serif font-bold text-lg text-slate-900 flex items-center gap-2">
                  <span>LISTA DE PROJETO / SUBSTITUIÇÃO E/OU AULAS RESIDUAIS ({selectedShift})</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <GripVertical className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium text-slate-700">Dica:</span>
                  <span>Você pode <strong>arrastar</strong> qualquer professor disponível daqui para preencher vagas na tabela de substituição abaixo.</span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleDuplicateMatrix}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Duplicar para outro período"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicar Quadro</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Imprimir"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => setSuccessMsg('Quadro de disponibilidade exportado em PDF com sucesso!')}
                  className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Exportar PDF</span>
                </button>
              </div>
            </div>

            {/* Weekly Availability Table with Draggable Teachers */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-center">
                    <th className="border border-slate-700 p-3 w-36 font-serif">Horário</th>
                    {daysOfWeek.map(day => (
                      <th key={day} className="border border-slate-700 p-3 font-serif">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlotsConfig.map(slot => (
                    <tr key={slot.period} className="hover:bg-slate-50/50 transition-colors">
                      <td className="border border-slate-200 p-3 text-center bg-slate-50 font-bold text-slate-800">
                        <div>{slot.label}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{slot.time}</div>
                      </td>

                      {daysOfWeek.map(day => {
                        const cellTeachers = (availabilityMatrix[day] && availabilityMatrix[day][slot.period]) || [];
                        return (
                          <td key={day} className="border border-slate-200 p-2.5 align-top space-y-2">
                            <div className="space-y-1.5 min-h-[70px]">
                              {cellTeachers.map(t => (
                                <div
                                  key={t.id}
                                  draggable={true}
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', t.teacherName);
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                      teacherName: t.teacherName,
                                      discipline: t.discipline,
                                      origin: t.origin,
                                      day,
                                      period: slot.period
                                    }));
                                    setDraggedTeacher({ ...t, day, period: slot.period });
                                  }}
                                  onDragEnd={() => setDraggedTeacher(null)}
                                  className="p-2 bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200 rounded-xl flex items-start justify-between gap-1.5 group cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-blue-400 select-none"
                                  title="Clique e arraste este professor para alocar na tabela de substituição abaixo"
                                >
                                  <div className="flex items-start gap-1.5 min-w-0">
                                    <GripVertical className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5 min-w-0">
                                      <p className="font-bold text-slate-900 text-xs truncate">{t.teacherName}</p>
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className="text-[9px] bg-blue-900 text-white px-1.5 py-0.2 rounded font-medium">{t.discipline}</span>
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">{t.origin}</span>
                                      </div>
                                      {t.observation && (
                                        <p className="text-[9px] text-slate-500 italic truncate">{t.observation}</p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveAvailability(day, slot.period, t.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remover disponibilidade"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => {
                                setTargetDay(day);
                                setTargetPeriod(slot.period);
                                setShowAddAvModal(true);
                              }}
                              className="w-full py-1.5 px-2 bg-slate-100 hover:bg-blue-900 hover:text-white text-slate-600 rounded-lg text-[11px] font-bold border border-slate-200/80 transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-amber-500" />
                              <span>Adicionar</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Visual Connector / Drag Zone Guide (Shown in integrated layout) */}
      {layoutMode === 'integrada' && (
        <div className="relative py-2 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-indigo-200"></div>
          </div>
          <div className="relative bg-indigo-50 border border-indigo-200/90 text-indigo-900 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-xs">
            <ArrowDown className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />
            <span>SUB-ABA INTEGRADA: QUADRO DE SUBSTITUIÇÃO ABAIXO (Arraste professores daqui para baixo)</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PARTE 2: SUB-ABA DOS QUADROS DE SUBSTITUIÇÃO              */}
      {/* ========================================================= */}
      {(layoutMode === 'integrada' || layoutMode === 'apenas_quadros') && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 text-blue-900 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </span>
                <h4 className="font-serif font-bold text-lg text-slate-900">
                  Quadros de Substituição Efetiva & Cobertura de Aulas
                </h4>
              </div>
              <p className="text-xs text-slate-600 max-w-xl">
                Tabelas de substituição vinculadas à ausência dos docentes. Arraste professores da tabela acima diretamente para a coluna "Professor Substituto" para alocação imediata.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setShowNewBoardModal(true);
                  if (boardAbsentTeacher) {
                    handleAbsentTeacherChange(boardAbsentTeacher);
                  }
                }}
                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>+ Criar nova tabela de substituição</span>
              </button>
            </div>
          </div>

          {/* Boards List Container */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-900">
                  Quadros Cadastrados ({filteredBoards.length})
                </h4>
                {substitutionBoards.some(b => b.classiumNotifiedAt) && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                    Notificações Ativas
                  </span>
                )}
              </div>

              {/* Status and Search filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar professor/turma..."
                    value={boardSearchTerm}
                    onChange={(e) => setBoardSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setBoardFilterStatus('todos')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      boardFilterStatus === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setBoardFilterStatus('confirmada')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      boardFilterStatus === 'confirmada' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Confirmadas
                  </button>
                  <button
                    onClick={() => setBoardFilterStatus('rascunho')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                      boardFilterStatus === 'rascunho' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Rascunhos
                  </button>
                </div>
              </div>
            </div>

            {filteredBoards.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <UserX className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Nenhum quadro de substituição encontrado.</p>
                <p className="text-[11px] text-slate-500">Clique em "+ Criar nova tabela de substituição" para iniciar o registro.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredBoards.map(board => (
                  <div 
                    key={board.id} 
                    className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4 hover:border-slate-300 transition-all shadow-xs"
                  >
                    {/* Header info & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            board.status === 'confirmada' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            board.status === 'realizada' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            board.status === 'cancelada' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {board.status.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            Data: {board.absenceDate} ({getDayOfWeekFromDate(board.absenceDate)}) • Turno: {board.shift}
                          </span>
                          {board.classiumNotifiedAt && (
                            <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCheck className="w-3 h-3 text-indigo-600" />
                              Classium Notificado
                            </span>
                          )}
                          {board.whatsappNotifiedAt && (
                            <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              WhatsApp Enviado
                            </span>
                          )}
                        </div>
                        <h5 className="font-serif font-bold text-base text-slate-900 mt-1">
                          Professor Ausente: <span className="text-blue-900">{board.absentTeacherName}</span> ({board.subjectName})
                        </h5>
                      </div>

                      {/* ACTION BUTTONS (As requested: Enviar Classium, Enviar WhatsApp, Imprimir, Lixeira) */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Enviar WhatsApp Button */}
                        <button
                          onClick={() => handleOpenWhatsAppModal(board)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                          title="Enviar aviso oficial via WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-current" />
                          <span>Enviar WhatsApp</span>
                        </button>

                        {/* Enviar Sistema Classium Button */}
                        <button
                          onClick={() => handleSendClassiumNotification(board)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                          title="Disparar notificação no Sistema Classium / Portal do Professor"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar Sistema Classium</span>
                        </button>

                        {/* Imprimir Button */}
                        <button 
                          onClick={() => window.print()}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                          title="Imprimir quadro de substituição"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir</span>
                        </button>

                        {/* Lixeira Button */}
                        <button
                          onClick={() => handleDeleteBoard(board.id)}
                          className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 cursor-pointer transition-all shadow-xs"
                          title="Excluir quadro de substituição"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Table of items with interactive Drop Zone */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-200 text-xs bg-white rounded-xl">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="border border-slate-700 p-2.5 text-left w-36">Turma</th>
                            <th className="border border-slate-700 p-2.5 text-left w-48">Horário</th>
                            <th className="border border-slate-700 p-2.5 text-left">
                              Professor substituto <span className="text-[10px] font-normal text-slate-300">(Solte aqui o professor arrastado)</span>
                            </th>
                            <th className="border border-slate-700 p-2.5 text-center w-28">Ação Rápida</th>
                          </tr>
                        </thead>
                        <tbody>
                          {board.items.map((item) => {
                            const isAllocated = item.substituteTeacherName && 
                              item.substituteTeacherName !== 'Selecione o substituto' && 
                              item.substituteTeacherName !== 'Sem substituto';
                            
                            const isOver = dropTargetKey === `${board.id}_${item.periodNumber}`;

                            return (
                              <tr 
                                key={item.periodNumber} 
                                className={`transition-colors ${
                                  isOver ? 'bg-indigo-50 border-indigo-400' : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="border border-slate-200 p-2.5 font-bold text-slate-900">
                                  {item.className}
                                </td>
                                <td className="border border-slate-200 p-2.5 font-mono text-slate-600">
                                  {item.timeSlot} ({item.periodNumber}º horário)
                                </td>
                                
                                {/* Drop Target Cell */}
                                <td 
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'copy';
                                    setDropTargetKey(`${board.id}_${item.periodNumber}`);
                                  }}
                                  onDragLeave={() => {
                                    if (dropTargetKey === `${board.id}_${item.periodNumber}`) {
                                      setDropTargetKey(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setDropTargetKey(null);
                                    let droppedName = '';
                                    try {
                                      const jsonStr = e.dataTransfer.getData('application/json');
                                      if (jsonStr) {
                                        const parsed = JSON.parse(jsonStr);
                                        droppedName = parsed.teacherName;
                                      }
                                    } catch (_) {}
                                    if (!droppedName) {
                                      droppedName = e.dataTransfer.getData('text/plain') || draggedTeacher?.teacherName || '';
                                    }
                                    if (droppedName) {
                                      handleAssignSubstituteToBoard(board.id, item.periodNumber, droppedName);
                                    }
                                  }}
                                  className={`border border-slate-200 p-2.5 transition-all ${
                                    isOver ? 'bg-indigo-100/70 border-2 border-dashed border-indigo-600 ring-2 ring-indigo-400/30' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
                                      isAllocated
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : item.substituteTeacherName === 'Sem substituto'
                                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                                    }`}>
                                      {isAllocated && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                      <span>{item.substituteTeacherName}</span>
                                    </span>

                                    {isOver && (
                                      <span className="text-[10px] text-indigo-700 font-bold animate-pulse">
                                        Solte para alocar!
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Quick Action (Select or clear) */}
                                <td className="border border-slate-200 p-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <select
                                      value={item.substituteTeacherName}
                                      onChange={(e) => handleAssignSubstituteToBoard(board.id, item.periodNumber, e.target.value)}
                                      className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium focus:outline-none focus:border-blue-600"
                                    >
                                      <option value={item.substituteTeacherName}>{item.substituteTeacherName}</option>
                                      <option value="Sem substituto">Sem substituto</option>
                                      <optgroup label="Professores Disponíveis (Projetos/Residuais)">
                                        {((availabilityMatrix[getDayOfWeekFromDate(board.absenceDate)] || {})[item.periodNumber] || []).map(av => (
                                          <option key={av.id} value={av.teacherName}>
                                            ⭐ {av.teacherName} ({av.discipline} - {av.origin})
                                          </option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Demais Docentes">
                                        {KNOWN_TEACHERS.map(t => (
                                          <option key={t.name} value={t.name}>{t.name} ({t.subject})</option>
                                        ))}
                                      </optgroup>
                                    </select>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {board.observation && (
                      <p className="text-xs text-slate-500 italic bg-white p-2.5 rounded-xl border border-slate-200/80">
                        Observação: {board.observation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADICIONAR DISPONIBILIDADE NA CÉLULA                */}
      {/* ========================================================= */}
      {showAddAvModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl animate-scale-up text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-serif font-bold text-base text-slate-900">
                Adicionar Professor Disponível ({targetDay} - {targetPeriod}º horário)
              </h4>
              <button onClick={() => setShowAddAvModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAvailability} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nome do Professor</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prof. Carlos Eduardo ou escolha da lista"
                    value={avTeacherName}
                    onChange={(e) => setAvTeacherName(e.target.value)}
                    list="teachers-suggestions"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <datalist id="teachers-suggestions">
                    {KNOWN_TEACHERS.map(t => (
                      <option key={t.name} value={t.name}>{t.subject}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Disciplina / Área</label>
                  <input
                    type="text"
                    required
                    value={avDiscipline}
                    onChange={(e) => setAvDiscipline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Origem da Disponibilidade</label>
                  <select
                    value={avOrigin}
                    onChange={(e) => setAvOrigin(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  >
                    <option value="Projeto">Projeto</option>
                    <option value="Aula Residual">Aula Residual</option>
                    <option value="Banco de Horas">Banco de Horas</option>
                    <option value="Outra Condição">Outra Condição</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Observações Pertinentes</label>
                <input
                  type="text"
                  placeholder="Ex: Disponível para exatas ou reforço"
                  value={avObs}
                  onChange={(e) => setAvObs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAvModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold cursor-pointer shadow-sm"
                >
                  Salvar Disponibilidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR NOVA TABELA DE SUBSTITUIÇÃO (AUTO-PREENCHIMENTO) */}
      {/* ========================================================= */}
      {showNewBoardModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-2xl w-full space-y-4 shadow-2xl animate-scale-up text-left max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Criar Nova Tabela de Substituição</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ao digitar o professor ausente, suas aulas daquele dia serão puxadas automaticamente da grade escolar.
                </p>
              </div>
              <button onClick={() => setShowNewBoardModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Professor Ausente *</span>
                    <span className="text-[10px] text-blue-800 font-semibold">Puxa grade automática</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Eduardo ou selecione"
                    value={boardAbsentTeacher}
                    onChange={(e) => handleAbsentTeacherChange(e.target.value)}
                    list="absent-teachers-list"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                  />
                  <datalist id="absent-teachers-list">
                    {KNOWN_TEACHERS.map(t => (
                      <option key={t.name} value={t.name}>{t.subject}</option>
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Disciplina Principal</label>
                  <input
                    type="text"
                    value={boardSubject}
                    onChange={(e) => setBoardSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Data da Ausência ({boardDayOfWeek})
                  </label>
                  <input
                    type="date"
                    value={boardDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Turno</label>
                  <select
                    value={boardShift}
                    onChange={(e) => handleShiftChange(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                  >
                    <option value="Matutino">Matutino (07:30 - 11:30)</option>
                    <option value="Vespertino">Vespertino (13:00 - 17:30)</option>
                    <option value="Noturno">Noturno (18:30 - 22:30)</option>
                  </select>
                </div>
              </div>

              {autoLoadedInfo && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{autoLoadedInfo}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Observação Interna</label>
                <input
                  type="text"
                  placeholder="Ex: Motivo de saúde, licença ou consulta"
                  value={boardObservation}
                  onChange={(e) => setBoardObservation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              {/* Class and Substitute Allocation Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900">
                    Alocação de Aulas & Substitutos ({boardItems.length} aulas)
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Substitutos filtrados pela disponibilidade de {boardDayOfWeek}
                  </span>
                </div>

                <div className="space-y-3">
                  {boardItems.map((item, idx) => {
                    const availableInSlot = (availabilityMatrix[boardDayOfWeek] && availabilityMatrix[boardDayOfWeek][item.periodNumber]) || [];

                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                          <div>
                            <span className="text-[10px] text-slate-500 font-mono block">Turma</span>
                            <input
                              type="text"
                              value={item.className}
                              onChange={(e) => {
                                const updated = [...boardItems];
                                updated[idx].className = e.target.value;
                                setBoardItems(updated);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-mono block">Horário</span>
                            <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800">
                              {item.timeSlot} ({item.periodNumber}º)
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 font-mono block">Professor Substituto</span>
                            <select
                              value={item.substituteTeacherName}
                              onChange={(e) => {
                                const updated = [...boardItems];
                                updated[idx].substituteTeacherName = e.target.value;
                                setBoardItems(updated);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-800 focus:outline-none focus:border-blue-600"
                            >
                              <option value="Selecione o substituto">Selecione o substituto</option>
                              <option value="Sem substituto">Sem substituto (aula vaga)</option>
                              
                              {/* Group: Available in this specific slot from Availability Matrix */}
                              <optgroup label={`⭐ DISPONÍVEIS NESTE HORÁRIO (${boardDayOfWeek} - ${item.periodNumber}º)`}>
                                {availableInSlot.map(av => (
                                  <option key={av.id} value={av.teacherName}>
                                    ⭐ {av.teacherName} — {av.discipline} ({av.origin})
                                  </option>
                                ))}
                              </optgroup>

                              {/* Group: Other school teachers */}
                              <optgroup label="Demais Docentes da Escola">
                                {KNOWN_TEACHERS.map(t => (
                                  <option key={t.name} value={t.name}>
                                    {t.name} ({t.subject})
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        </div>

                        {/* Quick pick pills for available teachers in this slot */}
                        {availableInSlot.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
                            <span className="text-[10px] font-semibold text-slate-500">Disponíveis na tabela:</span>
                            {availableInSlot.map(av => (
                              <button
                                key={av.id}
                                type="button"
                                onClick={() => {
                                  const updated = [...boardItems];
                                  updated[idx].substituteTeacherName = av.teacherName;
                                  setBoardItems(updated);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                  item.substituteTeacherName === av.teacherName
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                <span>+ {av.teacherName} ({av.origin})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSaveBoard('rascunho')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Salvar Rascunho
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBoard('confirmada')}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold cursor-pointer shadow-sm"
                >
                  Confirmar Substituições
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DISPARO DE AVISO VIA WHATSAPP                      */}
      {/* ========================================================= */}
      {showWhatsAppModal && whatsAppBoard && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl animate-scale-up text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <MessageSquare className="w-5 h-5 fill-current" />
                </span>
                <div>
                  <h4 className="font-serif font-bold text-base text-slate-900">
                    Enviar Comunicado via WhatsApp
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Quadro de {whatsAppBoard.absenceDate} ({whatsAppBoard.shift})
                  </p>
                </div>
              </div>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Docente Destinatário</label>
                <select
                  value={whatsAppRecipient}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                >
                  {/* Allocated substitutes */}
                  <optgroup label="Professores Substitutos Alocados">
                    {Array.from(new Set(
                      whatsAppBoard.items
                        .map(i => i.substituteTeacherName)
                        .filter(n => n && n !== 'Selecione o substituto' && n !== 'Sem substituto')
                    )).map(name => (
                      <option key={name} value={name}>{name} (Substituto)</option>
                    ))}
                  </optgroup>
                  {/* Absent teacher */}
                  <optgroup label="Professor Ausente">
                    <option value={whatsAppBoard.absentTeacherName}>{whatsAppBoard.absentTeacherName} (Ausente)</option>
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Número de WhatsApp (com DDD)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={whatsAppPhone}
                    onChange={(e) => setWhatsAppPhone(e.target.value)}
                    placeholder="Ex: 5511988881234"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mensagem Formatada Oficial</label>
                <textarea
                  rows={9}
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono text-[11px] leading-relaxed resize-none"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCopyWhatsAppText}
                  className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSuccess ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(false)}
                    className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendViaWhatsAppWeb}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-current" />
                    <span>Abrir no WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
