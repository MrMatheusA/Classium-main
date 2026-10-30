import React, { useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { supabase } from '../../lib/supabase';
import { 
  INITIAL_CLASSES, 
  INITIAL_SUBJECTS, 
  INITIAL_TEACHERS, 
  INITIAL_ROOMS, 
  INITIAL_CONSTRAINTS, 
  INITIAL_ALERTS, 
  INITIAL_HOURS, 
  INITIAL_ALLOCATIONS 
} from './smart-horarios/data';

import { 
  SmartClass, 
  SmartTeacher, 
  SmartSubject, 
  SmartRoom, 
  SmartConstraint, 
  SmartAlert, 
  TimePeriod, 
  GridAllocation 
} from './smart-horarios/types';

import { ConfigurationTab } from './smart-horarios/ConfigurationTab';
import { TablesTabs } from './smart-horarios/TablesTabs';
import { TeachersTab } from './smart-horarios/TeachersTab';
import { RestrictionsTab } from './smart-horarios/RestrictionsTab';
import { GeneratorTab } from './smart-horarios/GeneratorTab';
import { AIAssistantWidget } from './smart-horarios/AIAssistantWidget';
import { SmartHorariosPrimeLanding } from './smart-horarios/SmartHorariosPrimeLanding';

import { 
  Clock, Calendar, Users, GraduationCap, BookOpen, Warehouse, ShieldAlert, 
  Play, Eye, Share2, ChevronRight, BarChart3, Download, Search, CheckCircle, 
  UserCheck, AlertTriangle, MessageSquare, ArrowRight, Check, Sparkles, AlertCircle, RefreshCw, Zap
} from 'lucide-react';

export default function AdminSmartHorarios() {
  const [viewMode, setViewMode] = useState<'prime' | 'generator'>('prime');
  const [activeTab, setActiveTab] = useState<string>('configuracao');
  
  // Year & unit combos state
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedUnit, setSelectedUnit] = useState('Sede');
  const [selectedTurno, setSelectedTurno] = useState('Todos');

  // Module state
  const [status, setStatus] = useState<'Não iniciado' | 'Em configuração' | 'Gerando' | 'Publicado'>('Em configuração');
  
  // Helper to resolve state actions safely
  function resolveState<T>(action: React.SetStateAction<T>, prev: T): T {
    return typeof action === 'function' ? (action as Function)(prev) : action;
  }

  // Configuration store per shift/turno to maintain separate, persistent data
  const [turnoConfigs, setTurnoConfigs] = useState<Record<string, {
    hours: TimePeriod[];
    classes: SmartClass[];
    teachers: SmartTeacher[];
    rooms: SmartRoom[];
    subjects: SmartSubject[];
    constraints: SmartConstraint[];
    alerts: SmartAlert[];
    allocations: GridAllocation[];
  }>>({
    'Todos': {
      hours: INITIAL_HOURS,
      classes: INITIAL_CLASSES,
      teachers: INITIAL_TEACHERS,
      rooms: INITIAL_ROOMS,
      subjects: INITIAL_SUBJECTS,
      constraints: INITIAL_CONSTRAINTS,
      alerts: INITIAL_ALERTS,
      allocations: INITIAL_ALLOCATIONS
    },
    '1º Turno': {
      hours: [
        { id: 'hp-1', name: '1º horário', start: '07:00', end: '07:50' },
        { id: 'hp-2', name: '2º horário', start: '07:50', end: '08:40' },
        { id: 'hp-int', name: 'Intervalo', start: '08:40', end: '09:00', isInterval: true },
        { id: 'hp-3', name: '3º horário', start: '09:00', end: '09:50' },
        { id: 'hp-4', name: '4º horário', start: '09:50', end: '10:40' },
        { id: 'hp-5', name: '5º horário', start: '10:40', end: '11:30' },
      ],
      classes: INITIAL_CLASSES.filter(c => c.shift === '1º Turno'),
      teachers: INITIAL_TEACHERS.map(t => ({
        ...t,
        grades: t.grades.filter(g => ['5º Ano A', '6º Ano A', '7º Ano A', '8º Ano A'].includes(g))
      })).filter(t => t.grades.length > 0),
      rooms: INITIAL_ROOMS.filter(r => ['Sala 08', 'Sala 09', 'Sala 10', 'Sala 11', 'Sala Maker', 'Laboratório Ciências'].includes(r.name)),
      subjects: INITIAL_SUBJECTS,
      constraints: INITIAL_CONSTRAINTS,
      alerts: INITIAL_ALERTS.filter(a => !a.message.includes('1º Ano EM') && !a.message.includes('9º Ano A')),
      allocations: INITIAL_ALLOCATIONS.filter(al => al.classId !== 'c-9a' && al.classId !== 'c-1em')
    },
    '2º Turno': {
      hours: [
        { id: 'hp-1', name: '1º horário', start: '13:00', end: '13:50' },
        { id: 'hp-2', name: '2º horário', start: '13:50', end: '14:40' },
        { id: 'hp-int', name: 'Intervalo', start: '14:40', end: '15:00', isInterval: true },
        { id: 'hp-3', name: '3º horário', start: '15:00', end: '15:50' },
        { id: 'hp-4', name: '4º horário', start: '15:50', end: '16:40' },
        { id: 'hp-5', name: '5º horário', start: '16:40', end: '17:30' },
      ],
      classes: [
        { id: 'c-8b', name: '8º Ano B', shift: '2º Turno', room: 'Sala 11', studentsCount: 29, coordinator: 'Marcus', status: 'Ativa' },
        { id: 'c-9a', name: '9º Ano A', shift: '2º Turno', room: 'Sala 12', studentsCount: 32, coordinator: 'Roberto', status: 'Ativa' },
        { id: 'c-9b', name: '9º Ano B', shift: '2º Turno', room: 'Sala 12', studentsCount: 30, coordinator: 'Elaine', status: 'Ativa' },
      ],
      teachers: [
        {
          id: 't-carlos-2',
          name: 'Carlos Eduardo (Vespertino)',
          subject: 'Português',
          weeklyClasses: 12,
          grades: ['8º Ano B', '9º Ano A'],
          availableDays: ['Segunda', 'Quarta', 'Sexta'],
          unavailableTimes: [],
          preference: 'Primeiro horário',
          avoidSplitClasses: true,
          acceptWindows: false,
          maxClassesPerDay: 4,
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
        },
        {
          id: 't-sandra',
          name: 'Sandra Mara (Vespertino)',
          subject: 'Matemática',
          weeklyClasses: 12,
          grades: ['9º Ano A', '9º Ano B'],
          availableDays: ['Segunda', 'Terça', 'Quarta'],
          unavailableTimes: [],
          preference: 'Nenhuma',
          avoidSplitClasses: true,
          acceptWindows: true,
          maxClassesPerDay: 4,
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
        },
        {
          id: 't-patricia',
          name: 'Patricia Souza (Vespertino)',
          subject: 'História',
          weeklyClasses: 12,
          grades: ['8º Ano B', '9º Ano B'],
          availableDays: ['Terça', 'Quinta'],
          unavailableTimes: [],
          preference: 'Nenhuma',
          avoidSplitClasses: false,
          acceptWindows: true,
          maxClassesPerDay: 4,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
        },
        {
          id: 't-marina-2',
          name: 'Marina Peixoto (Vespertino)',
          subject: 'Geografia',
          weeklyClasses: 8,
          grades: ['8º Ano B', '9º Ano A', '9º Ano B'],
          availableDays: ['Segunda', 'Terça', 'Quinta'],
          unavailableTimes: [],
          preference: 'Nenhuma',
          avoidSplitClasses: true,
          acceptWindows: false,
          maxClassesPerDay: 3,
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
        }
      ],
      rooms: [
        { id: 'r-11', name: 'Sala 11', capacity: 35, type: 'Sala comum' },
        { id: 'r-12', name: 'Sala 12', capacity: 35, type: 'Sala comum' },
        { id: 'r-info', name: 'Informática', capacity: 40, type: 'Informática' },
        { id: 'r-cien', name: 'Laboratório Ciências', capacity: 32, type: 'Laboratório Ciências' },
      ],
      subjects: INITIAL_SUBJECTS,
      constraints: [
        { id: 'ct-2t', title: 'Professora Sandra sem Quinta', description: 'Professora Sandra Mara não trabalha nas quintas-feiras', type: 'teacher', active: true },
        { id: 'ct-4t', title: 'Limite de aulas consecutivas', description: 'Máximo de 4 aulas seguidas por professor para evitar estafa docente', type: 'general', active: true },
      ],
      alerts: [
        { id: 'a-1t', type: 'success', message: 'Configurações de carga horária para o 2º Turno validadas com sucesso.' },
        { id: 'a-2t', type: 'warning', message: 'Sala 12 com alta densidade de estudantes (32 alunos).' }
      ],
      allocations: [
        { id: 'g-2t1', day: 'Segunda', timeSlot: '13:00 - 13:50', classId: 'c-9a', subjectId: 's-port', teacherId: 't-carlos-2', roomId: 'r-12' },
        { id: 'g-2t2', day: 'Segunda', timeSlot: '13:50 - 14:40', classId: 'c-9a', subjectId: 's-port', teacherId: 't-carlos-2', roomId: 'r-12' },
        { id: 'g-2t3', day: 'Segunda', timeSlot: '15:00 - 15:50', classId: 'c-9a', subjectId: 's-mat', teacherId: 't-sandra', roomId: 'r-12' },
        { id: 'g-2t4', day: 'Terça', timeSlot: '13:00 - 13:50', classId: 'c-8b', subjectId: 's-hist', teacherId: 't-patricia', roomId: 'r-11' },
      ]
    },
    '3º Turno': {
      hours: [
        { id: 'hp-1', name: '1º horário', start: '19:00', end: '19:45' },
        { id: 'hp-2', name: '2º horário', start: '19:45', end: '20:30' },
        { id: 'hp-int', name: 'Intervalo', start: '20:30', end: '20:45', isInterval: true },
        { id: 'hp-3', name: '3º horário', start: '20:45', end: '21:30' },
        { id: 'hp-4', name: '4º horário', start: '21:30', end: '22:15' },
      ],
      classes: [
        { id: 'c-eja1', name: 'EJA - Módulo I', shift: '3º Turno', room: 'Sala 08', studentsCount: 22, coordinator: 'Roberto', status: 'Ativa' },
        { id: 'c-eja2', name: 'EJA - Módulo II', shift: '3º Turno', room: 'Sala 09', studentsCount: 25, coordinator: 'Elaine', status: 'Ativa' },
        { id: 'c-3emn', name: '3º Ano EM Noturno', shift: '3º Turno', room: 'Sala 10', studentsCount: 28, coordinator: 'Marcus', status: 'Ativa' },
      ],
      teachers: [
        {
          id: 't-fernando',
          name: 'Fernando Dias',
          subject: 'Português',
          weeklyClasses: 12,
          grades: ['EJA - Módulo I', 'EJA - Módulo II', '3º Ano EM Noturno'],
          availableDays: ['Segunda', 'Terça', 'Quarta'],
          unavailableTimes: [],
          preference: 'Nenhuma',
          avoidSplitClasses: true,
          acceptWindows: true,
          maxClassesPerDay: 4,
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
        },
        {
          id: 't-renata',
          name: 'Renata Melo',
          subject: 'Matemática',
          weeklyClasses: 12,
          grades: ['EJA - Módulo I', 'EJA - Módulo II', '3º Ano EM Noturno'],
          availableDays: ['Quarta', 'Quinta', 'Sexta'],
          unavailableTimes: [],
          preference: 'Nenhuma',
          avoidSplitClasses: true,
          acceptWindows: true,
          maxClassesPerDay: 4,
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
        },
        {
          id: 't-roberto-n',
          name: 'Roberto Rocha (Noturno)',
          subject: 'Educação Física',
          weeklyClasses: 4,
          grades: ['EJA - Módulo I', 'EJA - Módulo II'],
          availableDays: ['Quarta'],
          unavailableTimes: [],
          preference: 'Último horário',
          avoidSplitClasses: false,
          acceptWindows: true,
          maxClassesPerDay: 2,
          avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'
        }
      ],
      rooms: [
        { id: 'r-08', name: 'Sala 08', capacity: 35, type: 'Sala comum' },
        { id: 'r-09', name: 'Sala 09', capacity: 35, type: 'Sala comum' },
        { id: 'r-10', name: 'Sala 10', capacity: 35, type: 'Sala comum' },
        { id: 'r-info', name: 'Informática', capacity: 40, type: 'Informática' },
      ],
      subjects: INITIAL_SUBJECTS,
      constraints: [
        { id: 'ct-1n', title: 'Aulas reduzidas noturnas', description: 'Grade noturna com 45 minutos por módulo de aula por transporte', type: 'general', active: true }
      ],
      alerts: [
        { id: 'a-1n', type: 'success', message: 'Grade noturna do 3º turno otimizada para transporte escolar e menor evasão.' }
      ],
      allocations: [
        { id: 'g-3t1', day: 'Segunda', timeSlot: '19:00 - 19:45', classId: 'c-eja1', subjectId: 's-port', teacherId: 't-fernando', roomId: 'r-08' },
        { id: 'g-3t2', day: 'Segunda', timeSlot: '19:45 - 20:30', classId: 'c-eja2', subjectId: 's-port', teacherId: 't-fernando', roomId: 'r-09' },
      ]
    },
    'Integral': {
      hours: [
        { id: 'hp-1', name: '1º horário', start: '08:00', end: '09:30' },
        { id: 'hp-2', name: '2º horário', start: '09:30', end: '11:00' },
        { id: 'hp-int', name: 'Almoço & Lazer', start: '11:00', end: '13:00', isInterval: true },
        { id: 'hp-3', name: '3º horário', start: '13:00', end: '14:30' },
        { id: 'hp-4', name: '4º horário', start: '14:30', end: '16:00' },
      ],
      classes: [
        { id: 'c-1em', name: '1º Ano EM', shift: 'Integral', room: 'Sala Maker', studentsCount: 25, coordinator: 'Ana Julia', status: 'Ativa' },
        { id: 'c-2em', name: '2º Ano EM', shift: 'Integral', room: 'Sala Maker', studentsCount: 27, coordinator: 'Ana Julia', status: 'Ativa' },
      ],
      teachers: [
        {
          id: 't-juliana',
          name: 'Juliana Lins (Integral)',
          subject: 'Matemática',
          weeklyClasses: 24,
          grades: ['1º Ano EM', '2º Ano EM'],
          availableDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
          unavailableTimes: [],
          preference: 'Nenhuma',
          avoidSplitClasses: true,
          acceptWindows: true,
          maxClassesPerDay: 6,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
        },
        {
          id: 't-marcus-i',
          name: 'Marcus Vinicius (Integral)',
          subject: 'História',
          weeklyClasses: 12,
          grades: ['1º Ano EM', '2º Ano EM'],
          availableDays: ['Segunda', 'Quarta', 'Sexta'],
          unavailableTimes: [],
          preference: 'Último horário',
          avoidSplitClasses: false,
          acceptWindows: true,
          maxClassesPerDay: 4,
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
        }
      ],
      rooms: [
        { id: 'r-maker', name: 'Sala Maker', capacity: 30, type: 'Sala Maker' },
        { id: 'r-info', name: 'Informática', capacity: 40, type: 'Informática' },
      ],
      subjects: INITIAL_SUBJECTS,
      constraints: [
        { id: 'ct-1i', title: 'Aulas de 90 minutos', description: 'Grade integral opera em blocos de 90 minutos de aula', type: 'general', active: true }
      ],
      alerts: [
        { id: 'a-1i', type: 'success', message: 'Grade integral de alta performance validada com sucesso.' }
      ],
      allocations: [
        { id: 'g-i1', day: 'Segunda', timeSlot: '08:00 - 09:30', classId: 'c-1em', subjectId: 's-mat', teacherId: 't-juliana', roomId: 'r-maker' },
      ]
    }
  });

  // Active collection states loaded dynamically per Selected Turno
  const [classes, setClasses] = useState<SmartClass[]>(INITIAL_CLASSES);
  const [teachers, setTeachers] = useState<SmartTeacher[]>(INITIAL_TEACHERS);
  const [subjects, setSubjects] = useState<SmartSubject[]>(INITIAL_SUBJECTS);
  const [rooms, setRooms] = useState<SmartRoom[]>(INITIAL_ROOMS);
  const [constraints, setConstraints] = useState<SmartConstraint[]>(INITIAL_CONSTRAINTS);
  const { smartHorariosAllocations, updateSmartHorariosAllocations, currentUser } = usePlatform();
  const [alerts, setAlerts] = useState<SmartAlert[]>(INITIAL_ALERTS);
  const [hours, setHours] = useState<TimePeriod[]>(INITIAL_HOURS);
  const [allocations, setAllocations] = useState<GridAllocation[]>(smartHorariosAllocations || INITIAL_ALLOCATIONS);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const loadRealData = async () => {
      setLoading(true);
      setError(null);
      const activeOrgId = currentUser?.organizationId || '11111111-1111-1111-1111-111111111111';
      
      try {
        const [classesRes, subjectsRes, teachersRes] = await Promise.all([
          supabase.from('classes').select('*').eq('organization_id', activeOrgId).then(res => res, () => ({ data: null, error: { message: 'table not found' } })),
          supabase.from('subjects').select('*').eq('organization_id', activeOrgId).then(res => res, () => ({ data: null, error: { message: 'table not found' } })),
          supabase.from('teachers').select(`
            *,
            profiles:profile_id (
              full_name
            )
          `).eq('organization_id', activeOrgId).then(res => res, () => ({ data: null, error: { message: 'table not found' } }))
        ]);

        if (classesRes.data && classesRes.data.length > 0) {
          const realClasses = classesRes.data.map(c => ({
            id: c.id,
            name: c.name,
            shift: c.shift || '1º Turno',
            room: 'Sala Comum',
            studentsCount: 30,
            coordinator: 'Coordenação',
            status: 'Ativa' as const
          }));
          setClasses(realClasses);
          setTurnoConfigs(c => ({
            ...c,
            [selectedTurno]: { ...c[selectedTurno], classes: realClasses }
          }));
        }

        if (subjectsRes.data && subjectsRes.data.length > 0) {
          const realSubjects = subjectsRes.data.map(s => ({
            id: s.id,
            name: s.name,
            workload: 4,
            department: 'Geral',
            color: 'bg-blue-100 text-blue-800'
          }));
          setSubjects(realSubjects);
          setTurnoConfigs(c => ({
            ...c,
            [selectedTurno]: { ...c[selectedTurno], subjects: realSubjects }
          }));
        }

        if (teachersRes.data && teachersRes.data.length > 0) {
          const realTeachers = teachersRes.data.map(t => ({
            id: t.id,
            name: t.profiles?.full_name || t.name || 'Sem nome',
            maxHours: 20,
            disciplines: ['Geral'],
            availability: 'Disponível',
            status: 'Ativo' as const
          }));
          setTeachers(realTeachers);
          setTurnoConfigs(c => ({
            ...c,
            [selectedTurno]: { ...c[selectedTurno], teachers: realTeachers }
          }));
        }
        
      } catch (err: any) {
        console.warn('Smart horarios fallback to default local state:', err);
      } finally {
        setLoading(false);
      }
    };
    loadRealData();
  }, [currentUser?.organizationId, selectedTurno]);

  // Sync state if global context updates from external triggers
  React.useEffect(() => {
    if (smartHorariosAllocations && smartHorariosAllocations.length > 0) {
      setAllocations(smartHorariosAllocations);
    }
  }, [smartHorariosAllocations]);

  // Wrapped state setters that simultaneously update both the active state and the persistent turno configs!
  const setHoursWrapped = (val: React.SetStateAction<TimePeriod[]>) => {
    setHours(prev => {
      const next = resolveState(val, prev);
      setTurnoConfigs(c => ({
        ...c,
        [selectedTurno]: { ...c[selectedTurno], hours: next }
      }));
      return next;
    });
  };

  const setClassesWrapped = (val: React.SetStateAction<SmartClass[]>) => {
    setClasses(prev => {
      const next = resolveState(val, prev);
      setTurnoConfigs(c => ({
        ...c,
        [selectedTurno]: { ...c[selectedTurno], classes: next }
      }));
      return next;
    });
  };

  const setTeachersWrapped = (val: React.SetStateAction<SmartTeacher[]>) => {
    setTeachers(prev => {
      const next = resolveState(val, prev);
      setTurnoConfigs(c => ({
        ...c,
        [selectedTurno]: { ...c[selectedTurno], teachers: next }
      }));
      return next;
    });
  };

  const setRoomsWrapped = (val: React.SetStateAction<SmartRoom[]>) => {
    setRooms(prev => {
      const next = resolveState(val, prev);
      setTurnoConfigs(c => ({
        ...c,
        [selectedTurno]: { ...c[selectedTurno], rooms: next }
      }));
      return next;
    });
  };

  const setSubjectsWrapped = (val: React.SetStateAction<SmartSubject[]>) => {
    setSubjects(prev => {
      const next = resolveState(val, prev);
      setTurnoConfigs(c => ({
        ...c,
        [selectedTurno]: { ...c[selectedTurno], subjects: next }
      }));
      return next;
    });
  };

  const setConstraintsWrapped = (val: React.SetStateAction<SmartConstraint[]>) => {
    setConstraints(prev => {
      const next = resolveState(val, prev);
      setTurnoConfigs(c => ({
        ...c,
        [selectedTurno]: { ...c[selectedTurno], constraints: next }
      }));
      return next;
    });
  };

  const setAlertsWrapped = (val: React.SetStateAction<SmartAlert[]>) => {
    setAlerts(prev => {
      const next = resolveState(val, prev);
      setTurnoConfigs(c => ({
        ...c,
        [selectedTurno]: { ...c[selectedTurno], alerts: next }
      }));
      return next;
    });
  };

  const setAllocationsWrapped = (val: React.SetStateAction<GridAllocation[]>) => {
    setAllocations(prev => {
      const next = resolveState(val, prev);
      setTurnoConfigs(c => ({
        ...c,
        [selectedTurno]: { ...c[selectedTurno], allocations: next }
      }));
      updateSmartHorariosAllocations(next, "Horário alterado pela coordenação via Smart Horários");
      return next;
    });
  };

  // Turno change trigger function to dynamically load configurations
  const handleTurnoChange = (newTurno: string) => {
    const target = turnoConfigs[newTurno];
    if (target) {
      setHours(target.hours);
      setClasses(target.classes);
      setTeachers(target.teachers);
      setRooms(target.rooms);
      setSubjects(target.subjects);
      setConstraints(target.constraints);
      setAlerts(target.alerts);
      setAllocations(target.allocations);
    }
    setSelectedTurno(newTurno);
  };

  // Absence simulator states
  const [absenceTeacherId, setAbsenceTeacherId] = useState('');
  const [absenceDay, setAbsenceDay] = useState('Terça');
  const [absenceLoading, setAbsenceLoading] = useState(false);
  const [substitutionCandidates, setSubstitutionCandidates] = useState<{ teacher: SmartTeacher; score: number; reason: string }[] | null>(null);
  const [confirmedSub, setConfirmedSub] = useState<string | null>(null);

  // Reports state
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Left Internal Sidebar Navigation Items
  const menuItems = [
    { id: 'configuracao', label: 'Configuração', icon: Calendar, step: 1 },
    { id: 'turmas', label: 'Turmas', icon: GraduationCap, step: 2 },
    { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen, step: 3 },
    { id: 'salas', label: 'Salas', icon: Warehouse, step: 4 },
    { id: 'restricoes', label: 'Restrições', icon: ShieldAlert, step: 5 },
    { id: 'gerador-ia', label: 'Gerador Inteligente', icon: Play, step: 6 },
    { id: 'publicacao', label: 'Publicação', icon: Share2, step: 7 },
  ];

  const handleAITriggerCommand = (cmd: string) => {
    // If command states optimize/reduction of windows, open Generator IA tab
    if (cmd.includes('Monte') || cmd.includes('Otimize') || cmd.includes('geminadas') || cmd.includes('Educação Física')) {
      setActiveTab('gerador-ia');
    } else if (cmd.includes('conflitos') || cmd.includes('Carlos')) {
      setActiveTab('restricoes');
    } else if (cmd.includes('substituto') || cmd.includes('Ana')) {
      setActiveTab('publicacao');
      // pre-trigger the absence search for Carlos/Ana
      setAbsenceTeacherId('t-ana');
      setAbsenceDay('Quarta');
    }
  };

  const handleFindSubstitutes = () => {
    if (!absenceTeacherId) return;
    setAbsenceLoading(true);
    setSubstitutionCandidates(null);
    setConfirmedSub(null);

    setTimeout(() => {
      // Find candidate teachers that teach similar fields or have general availability
      const absentTeacher = teachers.find(t => t.id === absenceTeacherId);
      if (!absentTeacher) return;

      const candidates = teachers
        .filter(t => t.id !== absentTeacher.id)
        .map(t => {
          // Check if candidate shares subjects or availability
          const sameSubject = t.subject === absentTeacher.subject;
          const hasDayAvailable = t.availableDays.includes(absenceDay);
          
          let score = 60;
          let reason = 'Disponível na data com carga horária compatível.';
          
          if (sameSubject && hasDayAvailable) {
            score = 98;
            reason = `Especialista na disciplina (${t.subject}) e totalmente livre para cobertura direta.`;
          } else if (sameSubject) {
            score = 82;
            reason = `Leciona a mesma disciplina (${t.subject}) mas necessita de ajuste de janelas secundárias.`;
          } else if (hasDayAvailable) {
            score = 75;
            reason = `Pedagogo disponível de plantão geral para aplicação de plano de aula enviado.`;
          }

          return { teacher: t, score, reason };
        })
        .sort((a, b) => b.score - a.score);

      setSubstitutionCandidates(candidates.slice(0, 3));
      setAbsenceLoading(false);
    }, 1200);
  };

  const handleConfirmSub = (candidateName: string) => {
    setConfirmedSub(candidateName);
    setSubstitutionCandidates(null);
  };

  const handleExport = (format: string) => {
    setExportSuccess(format);
    setTimeout(() => setExportSuccess(null), 3000);
  };

  if (viewMode === 'prime') {
    return <SmartHorariosPrimeLanding onStartGenerator={() => setViewMode('generator')} />;
  }

  return (
    <div className="space-y-6 text-left">
      
      {error && (
        <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-xl text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. TOP HEADER & INTEGRATED MASTER NAVIGATION PANEL */}
      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4 relative">
        {loading && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl">
            <div className="flex items-center gap-3 text-cyan-400 font-bold bg-slate-900 px-6 py-3 rounded-full shadow-2xl border border-cyan-500/30">
              <Zap className="w-5 h-5 animate-spin" />
              <span>Sincronizando Inteligência...</span>
            </div>
          </div>
        )}
        
        {/* Row 1: Title and Dropdowns */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title Block */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 rounded-lg text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]">
                <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
              </span>
              <h1 className="font-serif text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                ⚡ Smart Horários <span className="text-xs bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 text-slate-950 font-black px-2 py-0.5 rounded-full border border-cyan-200">PREMIUM PRO</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">Planejamento e alocação escolar preditiva com Inteligência Artificial.</p>
          </div>

          {/* Filter Combos */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button
              onClick={() => setViewMode('prime')}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-amber-500/30 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Apresentação e Recursos do Smart Horários"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Visão Geral & Recursos</span>
            </button>
            {/* Ano Letivo */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-850">
              <span className="text-slate-500 font-bold uppercase text-[9px] font-mono">Ano</span>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-950 text-white border-none outline-none font-semibold cursor-pointer text-xs py-0 pl-1 pr-4"
              >
                <option value="2026" className="bg-slate-950 text-white">2026</option>
                <option value="2027" className="bg-slate-950 text-white">2027</option>
              </select>
            </div>

            {/* Unidade Escolar */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-850">
              <span className="text-slate-500 font-bold uppercase text-[9px] font-mono">Unidade</span>
              <select 
                value={selectedUnit} 
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="bg-slate-950 text-white border-none outline-none font-semibold cursor-pointer text-xs py-0 pl-1 pr-4"
              >
                <option value="Sede" className="bg-slate-950 text-white">Unidade Sede</option>
                <option value="Zona Norte" className="bg-slate-950 text-white">Filial Zona Norte</option>
                <option value="Zona Sul" className="bg-slate-950 text-white">Filial Zona Sul</option>
              </select>
            </div>

            {/* Turno */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-850">
              <span className="text-slate-500 font-bold uppercase text-[9px] font-mono">Turno</span>
              <select 
                value={selectedTurno} 
                onChange={(e) => handleTurnoChange(e.target.value)}
                className="bg-slate-950 text-white border-none outline-none font-semibold cursor-pointer text-xs py-0 pl-1 pr-4"
              >
                <option value="Todos" className="bg-slate-950 text-white">Todos os Turnos</option>
                <option value="1º Turno" className="bg-slate-950 text-white">1º Turno (Matutino)</option>
                <option value="2º Turno" className="bg-slate-950 text-white">2º Turno (Vespertino)</option>
                <option value="Integral" className="bg-slate-950 text-white">Integral</option>
                <option value="3º Turno" className="bg-slate-950 text-white">3º Turno (Noturno)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Separator Line */}
        <div className="h-px bg-slate-800/60 w-full" />

        {/* Row 2: Integrated Navigation Menu & Status */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {menuItems.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shrink-0 border ${
                    active 
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50 text-[#D4AF37] font-semibold' 
                      : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:bg-slate-900/60 hover:text-white hover:border-slate-800'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>

                  {item.step && (
                    <span className="text-[7.5px] uppercase tracking-wider font-mono bg-slate-950/80 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-850/60">
                      Step {item.step}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Status da Publicação inline badge */}
          <div className="flex items-center gap-3 shrink-0 pl-1 lg:pl-4 border-t lg:border-t-0 lg:border-l border-slate-850 pt-3 lg:pt-0">
            <div className="text-left flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">Grade:</span>
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-850/60 px-2.5 py-1.5 rounded-xl">
                <span className={`w-2 h-2 rounded-full ${status === 'Publicado' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
                <span className="text-white font-semibold text-[10px]">{status === 'Publicado' ? 'Ativo & Sincronizado' : 'Em Rascunho Interno'}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. MAIN CONTENT FRAME (FULL WIDTH) */}
      <div className="space-y-6">

           {/* STEP 1: CONFIGURATION VIEW */}
          {activeTab === 'configuracao' && (
            <ConfigurationTab
              hours={hours}
              setHours={setHoursWrapped}
              selectedTurno={selectedTurno}
            />
          )}
 
           {/* C. STEP 2: CADASTRO - TURMAS */}
          {activeTab === 'turmas' && (
            <TablesTabs
              classes={classes}
              subjects={subjects}
              rooms={rooms}
              teachers={teachers}
              setClasses={setClassesWrapped}
              setSubjects={setSubjectsWrapped}
              setRooms={setRoomsWrapped}
              subTab="turmas"
            />
          )}
 
           {/* D. STEP 2: CADASTRO - DISCIPLINAS */}
          {activeTab === 'disciplinas' && (
            <TablesTabs
              classes={classes}
              subjects={subjects}
              rooms={rooms}
              teachers={teachers}
              setClasses={setClassesWrapped}
              setSubjects={setSubjectsWrapped}
              setRooms={setRoomsWrapped}
              subTab="disciplinas"
            />
          )}

          {/* F. STEP 2: CADASTRO - SALAS */}
          {activeTab === 'salas' && (
            <TablesTabs
              classes={classes}
              subjects={subjects}
              rooms={rooms}
              teachers={teachers}
              setClasses={setClassesWrapped}
              setSubjects={setSubjectsWrapped}
              setRooms={setRoomsWrapped}
              subTab="salas"
            />
          )}
 
           {/* G. STEP 3: RESTRIÇÕES & DETECTOR INTELIGENTE */}
          {activeTab === 'restricoes' && (
            <RestrictionsTab
              constraints={constraints}
              setConstraints={setConstraintsWrapped}
              alerts={alerts}
              setAlerts={setAlertsWrapped}
            />
          )}
 
           {/* H. STEP 4: GERADOR IA & GRADE VISUAL */}
          {activeTab === 'gerador-ia' && (
            <GeneratorTab
              classes={classes}
              teachers={teachers}
              subjects={subjects}
              rooms={rooms}
              hours={hours}
              allocations={allocations}
              setAllocations={setAllocationsWrapped}
              alerts={alerts}
              setAlerts={setAlertsWrapped}
            />
          )}

          {/* I. STEP 5: PUBLICAÇÃO & ALTERAÇÃO INTELIGENTE */}
          {activeTab === 'publicacao' && (
            <div className="space-y-6">
              
              {/* Publication Trigger Banner */}
              <div className="p-6 bg-gradient-to-r from-blue-900/15 to-indigo-900/15 border border-blue-900/30 rounded-3xl text-left text-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1 max-w-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">Etapa Final do Orquestrador</span>
                  <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" /> Publicar e Sincronizar Grade 2026
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    A publicação distribuirá as agendas para todos os painéis escolares do Classium. O processo é automático e garante que pais, estudantes e professores fiquem cientes no mesmo instante.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setStatus('Publicado');
                    alert('Grade de horários 2026 oficializada e sincronizada com sucesso em todo o ERP!');
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl shadow-lg shadow-green-600/10 transition-all shrink-0 self-start md:self-center"
                >
                  ✓ Oficializar e Publicar
                </button>
              </div>

              {/* INTEGRATION VIEWPORTS (PANEL TEACHER & PANEL FAMILY) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-xs">
                
                {/* 1. Painel do Professor (Meu Horário Viewport) */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
                  <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Visualização Integrada: Painel do Professor</span>
                  <h4 className="font-serif text-sm font-bold text-white flex items-center gap-1.5">
                    <Users className="w-4.5 h-4.5 text-[#D4AF37]" /> Professor: Carlos Eduardo
                  </h4>
                  
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 space-y-2 max-h-[220px] overflow-y-auto font-mono text-[11px]">
                    <div className="text-slate-400 font-bold pb-1.5 border-b border-slate-900 flex justify-between">
                      <span>Horário</span>
                      <span>Turma / Disciplina / Sala</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900/30">
                      <span className="text-slate-400">Seg 07:00</span>
                      <span className="text-white font-semibold">5º Ano A • Português • Sala 08</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900/30">
                      <span className="text-slate-400">Seg 07:50</span>
                      <span className="text-white font-semibold">5º Ano A • Português • Sala 08</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900/30">
                      <span className="text-slate-400">Ter 09:00</span>
                      <span className="text-white font-semibold">5º Ano A • Português • Sala 08</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900/30">
                      <span className="text-slate-400">Ter 09:50</span>
                      <span className="text-white font-semibold">5º Ano A • Português • Sala 08</span>
                    </div>
                  </div>
                </div>

                {/* 2. Painel Família (Horário da Turma Viewport) */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
                  <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Visualização Integrada: Painel Família</span>
                  <h4 className="font-serif text-sm font-bold text-white flex items-center gap-1.5">
                    <GraduationCap className="w-4.5 h-4.5 text-[#D4AF37]" /> Turma: 5º Ano A (Matutino)
                  </h4>
                  
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 space-y-2 max-h-[220px] overflow-y-auto text-[11px]">
                    <div className="text-slate-400 font-bold pb-1.5 border-b border-slate-900 flex justify-between font-mono">
                      <span>Dia/Hora</span>
                      <span>Disciplina / Professor / Sala</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900/30">
                      <span className="text-slate-400 font-mono">Seg 07:00</span>
                      <span className="text-white font-semibold">Português • Carlos • Sala 08</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900/30">
                      <span className="text-slate-400 font-mono">Seg 09:00</span>
                      <span className="text-white font-semibold">Geografia • Marina • Sala 08</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900/30">
                      <span className="text-slate-400 font-mono">Ter 07:00</span>
                      <span className="text-white font-semibold">Matemática • Ana • Sala 08</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* REPORT & EXPORT EXCEL/PDF PANEL */}
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4 text-xs text-left">
                <div className="space-y-0.5">
                  <h4 className="font-serif text-sm font-bold text-white flex items-center gap-1.5">
                    <BarChart3 className="w-4.5 h-4.5 text-[#D4AF37]" /> Central de Relatórios e Exportação
                  </h4>
                  <p className="text-[11px] text-slate-500">Exporte mapas completos de carga horária e cronograma escolar.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleExport('PDF')}
                    className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between text-left group transition-all"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-200">Exportar para PDF</span>
                      <span className="text-[9px] text-slate-500 block">Mapa visual e impressão física</span>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                  </button>

                  <button
                    onClick={() => handleExport('Excel')}
                    className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between text-left group transition-all"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-200">Exportar para Excel</span>
                      <span className="text-[9px] text-slate-500 block">Planilha de conciliação de carga</span>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                  </button>

                  <button
                    onClick={() => handleExport('Word')}
                    className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between text-left group transition-all"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-200">Exportar para Word</span>
                      <span className="text-[9px] text-slate-500 block">Documento de parecer legal</span>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-[#D4AF37] transition-colors" />
                  </button>
                </div>

                {exportSuccess && (
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-center font-semibold text-[10px] animate-fade-in">
                    ✓ Arquivo {exportSuccess} exportado e baixado com sucesso!
                  </div>
                )}
              </div>

            </div>
          )}

      </div>

      {/* FIXED FLOATING AI ASSISTANT WIDGET */}
      <AIAssistantWidget onTriggerCommand={handleAITriggerCommand} />

    </div>
  );
}
