import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  Sparkles, 
  GraduationCap, 
  Lock,
  Info, 
  PhoneCall, 
  Users,
  Mail,
  UserCheck,
  Building2,
  CheckCircle2,
  Phone,
  Smartphone,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { supabase } from '../../lib/supabase';
import { institutionService } from '../../services/institutionService';
import { classScheduleService } from '../../services/schedule/classScheduleService';

interface ClassScheduleItem {
  id?: string;
  class_id: string;
  day_of_week: number | string;
  period_number?: number;
  start_time: string;
  end_time: string;
  discipline_name: string;
  teacher_name?: string;
  room?: string;
}

interface ManagementMember {
  id: string;
  name: string;
  role: string;
  custom_role_title?: string;
  email: string;
  phone: string;
  organization_id?: string;
  school_id?: string;
  is_active?: boolean;
}

interface SchoolContactData {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  email: string;
  phone_fixed: string;
  phone_mobile: string;
}

export interface StudentClassScheduleTabProps {
  targetClassId?: string;
}

export const StudentClassScheduleTab: React.FC<StudentClassScheduleTabProps> = ({ targetClassId: propTargetClassId }) => {
  const { 
    familyStudents,
    student,
    selectFamilyStudent,
    currentUser
  } = usePlatform();

  // 1. Authorized dependents resolution (strictly real official data, no mocks)
  const activeStudentList = useMemo(() => {
    if (familyStudents && familyStudents.length > 0) {
      return familyStudents;
    }
    if (student && student.id) {
      return [student];
    }
    return [];
  }, [familyStudents, student]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    return student?.id || activeStudentList[0]?.id || '';
  });

  // Sync state if student changes externally in PlatformContext
  useEffect(() => {
    if (student?.id && student.id !== selectedStudentId) {
      setSelectedStudentId(student.id);
    } else if (!selectedStudentId && activeStudentList.length > 0) {
      setSelectedStudentId(activeStudentList[0].id);
    }
  }, [student?.id, activeStudentList, selectedStudentId]);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Realtime Supabase Data States
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>([]);
  const [managementTeam, setManagementTeam] = useState<ManagementMember[]>([]);
  const [schoolContact, setSchoolContact] = useState<SchoolContactData>({
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Escola Municipal Vereador José Ferreira de Aguiar',
    address: 'Rua João Luiz Faria, nº 51, Darcy Ribeiro',
    city: 'Contagem',
    state: 'MG',
    postal_code: '32060-531',
    email: 'contato@joseferreira.educacao.gov.br',
    phone_fixed: '(31) 3352-5000',
    phone_mobile: '(31) 99849-5659'
  });
  const [shiftsInfo, setShiftsInfo] = useState({
    name: '1º Turno (Matutino)',
    startTime: '07:30',
    endTime: '12:00',
    intervalStart: '09:40',
    intervalEnd: '09:55'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Digital clock effect in Brasília Timezone
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current day of week in Portuguese
  const daysMap: { [key: number]: string } = {
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
    0: 'Domingo'
  };
  const todayDayName = daysMap[currentTime.getDay()] || 'Segunda';

  // Days list for schedule matrix (always full week)
  const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  // Current selected student info & grade name
  const studentObj = useMemo(() => {
    return activeStudentList.find(s => s.id === selectedStudentId) || student || activeStudentList[0] || null;
  }, [activeStudentList, selectedStudentId, student]);

  const gradeName = studentObj?.grade || (studentObj as any)?.class_name || '7º Ano';
  
  // Resolve school / organization ID for tenant isolation
  const targetSchoolId = useMemo(() => {
    const rawId = (
      studentObj?.school_id || 
      (studentObj as any)?.organization_id || 
      (studentObj as any)?.schoolId || 
      (currentUser as any)?.organizationId || 
      (currentUser as any)?.school_id
    );
    if (rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
      return rawId;
    }
    return '11111111-1111-1111-1111-111111111111';
  }, [studentObj, currentUser]);

  // Resolve class id cleanly
  const targetClassId = useMemo(() => {
    if (propTargetClassId) return propTargetClassId;
    if ((studentObj as any)?.class_id) return (studentObj as any).class_id;
    return '5af20502-39e1-4b86-8ca4-8a01c4eb017a';
  }, [propTargetClassId, studentObj]);

  const targetRoomName = useMemo(() => {
    if (studentObj?.room) return studentObj.room;
    return 'Sala 08';
  }, [studentObj?.room]);

  // Dynamic Time Slots (initialized from official school shifts in schedule_time_slots)
  const [timeSlots, setTimeSlots] = useState<Array<{ id: string; label: string; start: string; end: string; timeSlot: string; isInterval: boolean; periodNumber?: number }>>([
    { id: 'ts-1', label: '1ª AULA', start: '07:30', end: '08:15', timeSlot: '07:30 - 08:15', isInterval: false, periodNumber: 1 },
    { id: 'ts-2', label: '2ª AULA', start: '08:15', end: '09:00', timeSlot: '08:15 - 09:00', isInterval: false, periodNumber: 2 },
    { id: 'ts-int', label: 'INTERVALO ESCOLAR / RECREIO', start: '09:40', end: '09:55', timeSlot: '09:40 - 09:55', isInterval: true },
    { id: 'ts-3', label: '3ª AULA', start: '09:55', end: '10:40', timeSlot: '09:55 - 10:40', isInterval: false, periodNumber: 3 },
    { id: 'ts-4', label: '4ª AULA', start: '10:40', end: '11:30', timeSlot: '10:40 - 11:30', isInterval: false, periodNumber: 4 },
    { id: 'ts-5', label: '5ª AULA', start: '11:30', end: '12:00', timeSlot: '11:30 - 12:00', isInterval: false, periodNumber: 5 },
  ]);

  // 1. Fetch Management Team from Supabase school_management_team
  const loadManagementTeamData = async () => {
    try {
      const { data: teamData, error: teamErr } = await supabase
        .from('school_management_team')
        .select('*')
        .or(`organization_id.eq.${targetSchoolId},school_id.eq.${targetSchoolId}`)
        .order('created_at', { ascending: true });

      if (!teamErr && teamData && teamData.length > 0) {
        setManagementTeam(teamData);
        return;
      }

      const serviceTeam = await institutionService.getManagementTeam(targetSchoolId);
      if (serviceTeam && serviceTeam.length > 0) {
        setManagementTeam(serviceTeam);
        return;
      }

      const { data: staffData } = await supabase
        .from('school_staff')
        .select('*')
        .or(`organization_id.eq.${targetSchoolId},school_id.eq.${targetSchoolId}`)
        .order('created_at', { ascending: true });

      if (staffData && staffData.length > 0) {
        setManagementTeam(staffData.map(s => ({
          id: s.id,
          name: s.full_name || s.name,
          role: s.role,
          email: s.email,
          phone: s.phone,
          is_active: true
        })));
        return;
      }

      setManagementTeam([]);
    } catch (err) {
      console.warn('Aviso ao carregar Equipe Gestora:', err);
      setManagementTeam([]);
    }
  };

  // 2. Fetch School Address & Contact from public.schools / public.organizations
  const loadSchoolContactData = async () => {
    try {
      const { data: schoolRow } = await supabase
        .from('schools')
        .select('*')
        .eq('id', targetSchoolId)
        .maybeSingle();

      const orgData = await institutionService.getOrganization(targetSchoolId);

      const resolvedName = schoolRow?.name || orgData?.name || orgData?.official_name || studentObj?.schoolUnit || 'Escola Municipal Vereador José Ferreira de Aguiar';
      const resolvedAddress = schoolRow?.address || orgData?.address || 'Rua João Luiz Faria, nº 51, Darcy Ribeiro';
      const resolvedCity = schoolRow?.city || orgData?.city || 'Contagem';
      const resolvedState = schoolRow?.state || orgData?.state || 'MG';
      const resolvedCep = schoolRow?.postal_code || schoolRow?.cep || orgData?.postal_code || '32060-531';
      const resolvedEmail = schoolRow?.email || orgData?.email || 'contato@joseferreira.educacao.gov.br';
      const resolvedPhoneFixed = orgData?.phone_fixed || schoolRow?.phone || orgData?.phone || '(31) 3352-5000';
      const resolvedPhoneMobile = orgData?.phone_mobile || '(31) 99849-5659';

      setSchoolContact({
        id: targetSchoolId,
        name: resolvedName,
        address: resolvedAddress,
        city: resolvedCity,
        state: resolvedState,
        postal_code: resolvedCep,
        email: resolvedEmail,
        phone_fixed: resolvedPhoneFixed,
        phone_mobile: resolvedPhoneMobile
      });
    } catch (err) {
      console.warn('Aviso ao carregar canais de contato da escola:', err);
    }
  };

  // 3. Fetch Weekly Schedule and Shifts (Atomic & Multi-tenant)
  const loadScheduleData = async () => {
    if (!targetClassId) {
      setLoading(false);
      setSchedules([]);
      return;
    }

    try {
      setLoading(true);
      setFetchError(null);

      // 3.1 Fetch class schedules with exact existing database schema columns
      let loadedRecords: ClassScheduleItem[] = [];
      try {
        const { data: scheduleData, error: schedErr } = await supabase
          .from('class_schedules')
          .select('id, organization_id, class_id, day_of_week, period_number, start_time, end_time, discipline_name, teacher_name, room')
          .eq('class_id', targetClassId)
          .order('day_of_week', { ascending: true })
          .order('period_number', { ascending: true });

        if (!schedErr && scheduleData && scheduleData.length > 0) {
          loadedRecords = scheduleData;
        } else if (schedErr && schedErr.code !== 'PGRST116') {
          console.warn('[StudentClassScheduleTab] Supabase direct query notice:', schedErr.message);
        }
      } catch (e) {
        console.warn('[StudentClassScheduleTab] Direct query exception:', e);
      }

      // 3.2 If direct query returned empty or was restricted by RLS, query official API proxy
      if (loadedRecords.length === 0) {
        try {
          const res = await fetch(`/api/family/classes/${encodeURIComponent(targetClassId)}/schedule`, {
            headers: { 'x-organization-id': targetSchoolId }
          });
          if (res.ok) {
            const resJson = await res.json();
            if (resJson.success && Array.isArray(resJson.schedules)) {
              loadedRecords = resJson.schedules;
            }
          } else {
            console.warn('[StudentClassScheduleTab] API proxy responded with status:', res.status);
          }
        } catch (apiErr: any) {
          console.warn('[StudentClassScheduleTab] API proxy exception:', apiErr);
        }
      }

      setSchedules(loadedRecords);

      // 3.3 Fetch Shifts and Dynamic Time Slots from single source of truth
      try {
        const resolvedShiftName = studentObj?.shift || '1º Turno (Matutino)';
        const shiftData = await classScheduleService.getShiftInfo(targetSchoolId, resolvedShiftName);
        if (shiftData) {
          setShiftsInfo({
            name: shiftData.name || '1º Turno (Matutino)',
            startTime: shiftData.startTime || '07:30',
            endTime: shiftData.endTime || '12:00',
            intervalStart: shiftData.breakStart || '09:40',
            intervalEnd: shiftData.breakEnd || '09:55',
          });

          if (shiftData.periods && shiftData.periods.length > 0) {
            setTimeSlots(shiftData.periods.map(p => ({
              id: p.id,
              label: p.label.toUpperCase(),
              start: p.startTime,
              end: p.endTime,
              timeSlot: `${p.startTime} - ${p.endTime}`,
              isInterval: Boolean(p.isBreak),
              periodNumber: p.periodNumber
            })));
          }
        }
      } catch (shiftErr) {
        console.warn('Aviso ao carregar turno dinâmico:', shiftErr);
      }

    } catch (err: any) {
      console.error('[StudentClassScheduleTab] Erro ao carregar horários:', err);
      setFetchError('Não foi possível carregar a grade de horários. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Immediate reset & re-fetch when selected student changes
  const prevSelectedStudentIdRef = useRef<string>(selectedStudentId);
  useEffect(() => {
    if (prevSelectedStudentIdRef.current !== selectedStudentId) {
      prevSelectedStudentIdRef.current = selectedStudentId;
      // Immediately clear previous student's schedule to prevent obsolete data display
      setSchedules([]);
      setLoading(true);
      setFetchError(null);
    }
    loadScheduleData();
    loadManagementTeamData();
    loadSchoolContactData();
  }, [selectedStudentId, targetClassId, targetSchoolId]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!targetClassId) return;

    const scheduleChannel = supabase
      .channel(`family_class_schedules_rt_${targetClassId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'class_schedules', 
        filter: `class_id=eq.${targetClassId}` 
      }, () => {
        loadScheduleData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'schedule_time_slots' 
      }, () => {
        loadScheduleData();
      })
      .subscribe();

    const handleSlotUpdate = () => {
      loadScheduleData();
    };
    window.addEventListener('classium_schedule_slots_updated', handleSlotUpdate);
    window.addEventListener('classium_schedule_updated', handleSlotUpdate);

    return () => {
      supabase.removeChannel(scheduleChannel);
      window.removeEventListener('classium_schedule_slots_updated', handleSlotUpdate);
      window.removeEventListener('classium_schedule_updated', handleSlotUpdate);
    };
  }, [targetClassId]);

  // Helper to find allocation for a specific day & time slot (STRICTLY persisted DB data, NO fake mocks)
  const getAllocationForCell = (day: string, slotStart: string, slotPeriod?: number) => {
    const dayNumberMap: Record<string, number> = {
      'Segunda': 1,
      'Terça': 2,
      'Quarta': 3,
      'Quinta': 4,
      'Sexta': 5
    };
    const dayNum = dayNumberMap[day] || 1;

    // Search exclusively in persisted schedules
    const foundInDb = schedules.find(s => {
      const matchDay = Number(s.day_of_week) === dayNum || String(s.day_of_week).toLowerCase() === day.toLowerCase();
      const matchPeriod = slotPeriod !== undefined && Number(s.period_number) === slotPeriod;
      const matchTime = s.start_time?.startsWith(slotStart);
      return matchDay && (matchPeriod || matchTime);
    });

    if (foundInDb) {
      return {
        id: foundInDb.id,
        class_id: foundInDb.class_id,
        day_of_week: day,
        start_time: foundInDb.start_time,
        end_time: foundInDb.end_time,
        discipline_name: foundInDb.discipline_name || 'Disciplina',
        teacher_name: foundInDb.teacher_name || 'Docente a definir',
        room: foundInDb.room || targetRoomName
      };
    }

    return null;
  };

  // Helper to format subject card styles in Accessible Light Theme (WCAG AA Compliant)
  const getSubjectCardStyles = (subjectName: string = '') => {
    const s = subjectName.toLowerCase();
    if (s.includes('portugu')) {
      return {
        container: 'bg-slate-50 border-2 border-slate-300 text-slate-900 hover:border-slate-400 shadow-sm',
        badge: 'bg-slate-800 text-white border border-slate-700 font-bold',
        iconColor: 'text-slate-700'
      };
    }
    if (s.includes('matem')) {
      return {
        container: 'bg-amber-50/80 border-2 border-amber-300 text-amber-950 hover:border-amber-400 shadow-sm',
        badge: 'bg-amber-800 text-white border border-amber-700 font-bold',
        iconColor: 'text-amber-800'
      };
    }
    if (s.includes('geog')) {
      return {
        container: 'bg-sky-50/80 border-2 border-sky-300 text-sky-950 hover:border-sky-400 shadow-sm',
        badge: 'bg-sky-800 text-white border border-sky-700 font-bold',
        iconColor: 'text-sky-800'
      };
    }
    if (s.includes('hist')) {
      return {
        container: 'bg-rose-50/80 border-2 border-rose-300 text-rose-950 hover:border-rose-400 shadow-sm',
        badge: 'bg-rose-800 text-white border border-rose-700 font-bold',
        iconColor: 'text-rose-800'
      };
    }
    if (s.includes('ingl')) {
      return {
        container: 'bg-purple-50/80 border-2 border-purple-300 text-purple-950 hover:border-purple-400 shadow-sm',
        badge: 'bg-purple-800 text-white border border-purple-700 font-bold',
        iconColor: 'text-purple-800'
      };
    }
    if (s.includes('art')) {
      return {
        container: 'bg-pink-50/80 border-2 border-pink-300 text-pink-950 hover:border-pink-400 shadow-sm',
        badge: 'bg-pink-800 text-white border border-pink-700 font-bold',
        iconColor: 'text-pink-800'
      };
    }
    if (s.includes('educ') || s.includes('físic') || s.includes('fisica')) {
      return {
        container: 'bg-emerald-50/80 border-2 border-emerald-300 text-emerald-950 hover:border-emerald-400 shadow-sm',
        badge: 'bg-emerald-800 text-white border border-emerald-700 font-bold',
        iconColor: 'text-emerald-800'
      };
    }
    if (s.includes('relig')) {
      return {
        container: 'bg-orange-50/80 border-2 border-orange-300 text-orange-950 hover:border-orange-400 shadow-sm',
        badge: 'bg-orange-800 text-white border border-orange-700 font-bold',
        iconColor: 'text-orange-800'
      };
    }
    if (s.includes('ciênc') || s.includes('cienc')) {
      return {
        container: 'bg-teal-50/80 border-2 border-teal-300 text-teal-950 hover:border-teal-400 shadow-sm',
        badge: 'bg-teal-800 text-white border border-teal-700 font-bold',
        iconColor: 'text-teal-800'
      };
    }
    return {
      container: 'bg-blue-50/70 border-2 border-blue-300 text-blue-950 hover:border-blue-400 shadow-sm',
      badge: 'bg-blue-800 text-white border border-blue-700 font-bold',
      iconColor: 'text-blue-800'
    };
  };

  // Formatted date and time strings for the digital clock (Brasília Timezone)
  const formattedTime = currentTime.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // No linked students state
  if (activeStudentList.length === 0 && !studentObj) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans text-left">
        <Users className="w-12 h-12 text-slate-400 mx-auto" />
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-slate-800">Nenhum Estudante Vinculado</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Não há nenhum estudante vinculado à sua conta familiar no momento. Acesse o menu "Alunos & Vinculação" para solicitar o vínculo com a secretaria escolar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* 1. HERO HEADER WITH STUDENT SELECTOR & STATUS (ACCESSIBLE LIGHT THEME) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-6">
          
          {/* LEFT: TITLE & STUDENT INFO */}
          <div className="space-y-4 flex-1">
            
            {/* Top Badges Bar with WCAG AA Contrast */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-100 text-amber-950 border border-amber-300 font-sans text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" /> GRADE OFICIAL DA TURMA
              </span>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-600" /> SOMENTE LEITURA (FAMÍLIA)
              </span>
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Horário de Aula
              </h2>
              <p className="text-sm text-slate-600 font-normal leading-relaxed max-w-3xl">
                Acompanhe a grade semanal de disciplinas, docentes, salas e horários do estudante. Atualização automática sincronizada com o painel do gestor escolar.
              </p>
            </div>

            {/* SELETOR DE ESTUDANTE (STUDENT SWITCHER - REAIS) */}
            {activeStudentList.length > 1 && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-700" /> Selecionar Dependente:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  {activeStudentList.map((st: any) => {
                    const isSelected = selectedStudentId === st.id;
                    const photoSrc = st.photoUrl || st.photo || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150';
                    return (
                      <button
                        key={st.id}
                        onClick={() => {
                          if (st.id !== selectedStudentId) {
                            setSelectedStudentId(st.id);
                            selectFamilyStudent(st.id);
                          }
                        }}
                        className={`min-h-[40px] px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 border cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-blue-900 text-white border-blue-950 shadow-md scale-[1.02]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <img 
                          src={photoSrc} 
                          alt={st.name || st.full_name} 
                          className="w-6 h-6 rounded-full object-cover border border-white/60 shrink-0" 
                        />
                        <span>{st.name || st.full_name}</span>
                        <span className={`text-xs font-mono ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          ({st.grade || '7º Ano'})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUMMARY PILLS ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Turma</span>
                <strong className="text-base text-slate-900 font-semibold">{gradeName}</strong>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Turno</span>
                <strong className="text-base text-emerald-800 font-semibold">
                  {shiftsInfo.name.includes('1º') || shiftsInfo.name.includes('Matutino') ? 'Matutino (Manhã)' : shiftsInfo.name}
                </strong>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Sala Principal</span>
                <strong className="text-base text-slate-900 font-semibold">{targetRoomName}</strong>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Unidade Escolar</span>
                <strong className="text-sm text-slate-800 font-semibold truncate block" title={schoolContact.name}>
                  {schoolContact.name.length > 22 ? schoolContact.name.substring(0, 22) + '...' : schoolContact.name}
                </strong>
              </div>
            </div>

          </div>

          {/* RIGHT: OFFICIAL CLOCK & SCHEDULE WINDOW */}
          <div className="w-full lg:w-72 shrink-0 bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm text-slate-900">
            <div className="text-center space-y-1.5 border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-700 animate-spin" style={{ animationDuration: '8s' }} /> HORÁRIO OFICIAL
              </span>
              <div className="font-mono text-3xl font-black text-slate-900 tracking-tight">
                {formattedTime}
              </div>
              <p className="text-xs text-slate-600 capitalize font-medium">{formattedDate}</p>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-xs font-medium">Início das Aulas:</span>
                <strong className="text-emerald-700 font-mono text-sm">{shiftsInfo.startTime}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-xs font-medium">Recreio / Intervalo:</span>
                <strong className="text-amber-800 font-mono text-sm">{shiftsInfo.intervalStart} às {shiftsInfo.intervalEnd}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-xs font-medium">Término do Turno:</span>
                <strong className="text-rose-700 font-mono text-sm">{shiftsInfo.endTime}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-center">
              <span className="text-xs font-medium text-slate-500">
                Horário Oficial de Brasília (America/Sao_Paulo)
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. SCHEDULE STATES: LOADING, ERROR, EMPTY, SUCCESS */}

      {/* STATE 1: LOADING */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-800 font-semibold text-sm">Carregando grade horária oficial...</p>
          <p className="text-slate-500 text-xs">Consultando registros escolares autorizados</p>
        </div>
      )}

      {/* STATE 2: ERROR */}
      {!loading && fetchError && (
        <div className="p-8 text-center bg-rose-50 rounded-3xl border-2 border-rose-300 shadow-sm space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-950 text-base">Falha na Consulta de Horários</h4>
            <p className="text-rose-800 text-sm max-w-md mx-auto">{fetchError}</p>
          </div>
          <button
            onClick={() => loadScheduleData()}
            className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
          </button>
        </div>
      )}

      {/* STATE 3: EMPTY (CONFIRMED ZERO PUBLISHED SCHEDULES) */}
      {!loading && !fetchError && schedules.length === 0 && (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-800 text-lg">A coordenação pedagógica ainda não publicou os horários para esta turma</h4>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              A grade semanal do estudante <strong>{studentObj?.name || studentObj?.full_name}</strong> está sendo elaborada pela equipe escolar. Qualquer alteração ou publicação pelo gestor atualizará esta tela instantaneamente em tempo real.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => loadScheduleData()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-300 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar Consulta
            </button>
          </div>
        </div>
      )}

      {/* STATE 4: SUCCESS (GRADE VIGENTE CARREGADA) */}
      {!loading && !fetchError && schedules.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-slate-900">
          
          {/* Table Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="space-y-0.5">
              <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-900" />
                Grade Semanal Vigente — {studentObj?.name || studentObj?.full_name} ({gradeName})
              </h3>
              <p className="text-sm text-slate-600">
                Horários de aulas alocadas no Smart Horários. Mudanças feitas pela coordenação refletem automaticamente aqui.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-blue-900" />
              <span className="font-semibold">Segunda a Sexta-Feira</span>
            </div>
          </div>

          {/* SCHEDULE TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-sm text-slate-700">
                  <th className="p-3.5 w-32 border-r border-slate-200 uppercase tracking-wider font-bold text-center">HORÁRIO</th>
                  
                  {daysOfWeek.map(day => {
                    const isToday = day === todayDayName;
                    return (
                      <th 
                        key={day} 
                        className={`p-3.5 text-center border-r border-slate-200 font-bold uppercase tracking-wider ${
                          isToday ? 'bg-amber-100/70 text-amber-950 border-b-2 border-b-amber-600' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{day.toUpperCase()}</span>
                          {isToday && (
                            <span className="text-xs bg-emerald-700 text-white font-sans font-bold px-2 py-0.5 rounded-full shadow-sm">
                              HOJE
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-sm">
                {timeSlots.map((slot) => {
                  if (slot.isInterval) {
                    return (
                      <tr key={slot.id} className="bg-amber-50 border-y-2 border-amber-300">
                        <td className="p-3 text-center font-mono font-bold text-amber-950 border-r border-slate-200">
                          {slot.start} - {slot.end}
                        </td>
                        <td 
                          colSpan={5} 
                          className="p-3 text-center font-serif text-sm font-bold text-amber-950 uppercase tracking-wider bg-amber-100/60"
                        >
                          ☕ INTERVALO ESCOLAR / RECREIO ({slot.start} ÀS {slot.end})
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={slot.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Time Column */}
                      <td className="p-3 text-center border-r border-slate-200 bg-slate-50/80">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {slot.start} - {slot.end}
                        </div>
                        <span className="text-xs text-slate-600 uppercase font-semibold block mt-0.5">
                          {slot.label}
                        </span>
                      </td>

                      {/* Days Columns */}
                      {daysOfWeek.map(day => {
                        const alloc = getAllocationForCell(day, slot.start, slot.periodNumber);
                        const isToday = day === todayDayName;

                        if (!alloc) {
                          return (
                            <td key={day} className={`p-2.5 border-r border-slate-200 text-center ${isToday ? 'bg-amber-50/40' : ''}`}>
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs italic">
                                Sem aula alocada
                              </div>
                            </td>
                          );
                        }

                        const styles = getSubjectCardStyles(alloc.discipline_name);

                        return (
                          <td key={day} className={`p-2.5 border-r border-slate-200 ${isToday ? 'bg-amber-50/40' : ''}`}>
                            <div className={`p-3.5 rounded-2xl transition-all shadow-sm relative group hover:shadow-md ${styles.container}`}>
                              
                              {/* Subject & Slot Label Badge */}
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="font-bold text-sm truncate">
                                  {alloc.discipline_name}
                                </span>
                                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${styles.badge}`}>
                                  {slot.label}
                                </span>
                              </div>

                              {/* Teacher info */}
                              <div className="flex items-center gap-1.5 text-xs text-slate-700 mt-1">
                                <GraduationCap className={`w-4 h-4 shrink-0 ${styles.iconColor}`} />
                                <span className="font-medium truncate">{alloc.teacher_name}</span>
                              </div>

                              {/* Room info */}
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span className="font-mono">{alloc.room || targetRoomName}</span>
                              </div>

                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FOOTER NOTICE */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2.5 text-sm text-slate-700">
            <Info className="w-5 h-5 text-blue-900 shrink-0" />
            <span>Qualquer alteração na equipe de professores ou salas efetuada pelo gestor será atualizada aqui em tempo real.</span>
          </div>

        </div>
      )}

      {/* 3. EQUIPE DIRETORA & CORPO GESTOR */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-900" />
              Equipe Diretora & Corpo Gestor
            </h3>
            <p className="text-sm text-slate-600 mt-0.5">
              Profissionais responsáveis pela gestão pedagógica, administrativa e institucional da unidade escolar.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-300 shrink-0 self-start sm:self-auto">
            {managementTeam.length} Integrantes
          </span>
        </div>

        {managementTeam.length === 0 ? (
          <div className="p-6 border border-dashed border-slate-300 rounded-2xl text-center text-slate-500 text-sm italic">
            Nenhum integrante da equipe gestora registrado no momento para esta unidade escolar.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            {managementTeam.map((member, idx) => (
              <div 
                key={member.id || idx} 
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-sm"
              >
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 inline-block">
                    {member.role === 'Outro' ? (member.custom_role_title || 'Corpo Gestor') : member.role}
                  </span>
                  <strong className="text-sm font-bold text-slate-900 block leading-snug">
                    {member.name}
                  </strong>
                </div>

                <div className="space-y-1.5 pt-2.5 border-t border-slate-200 text-xs text-slate-700">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="truncate font-mono text-xs" title={member.email || 'Não informado'}>
                      {member.email || 'Não informado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="font-mono text-xs">
                      {member.phone || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. ENDEREÇO DA UNIDADE & CANAIS DE CONTATO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* CARD A: ENDEREÇO & UNIDADE */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors shadow-sm text-left">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-100 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Endereço & Unidade
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">Logradouro / Endereço</span>
                <p className="text-sm font-semibold text-slate-900 leading-snug mt-0.5">
                  {schoolContact.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">Cidade / UF</span>
                  <p className="text-sm text-slate-800 mt-0.5">
                    {schoolContact.city} - {schoolContact.state}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">CEP</span>
                  <p className="font-mono text-sm text-slate-800 mt-0.5">
                    {schoolContact.postal_code}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Cadastro Escolar:</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Integrado
            </span>
          </div>
        </div>

        {/* CARD B: CANAIS DE CONTATO */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors shadow-sm text-left">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900 bg-purple-100 px-3 py-1 rounded-full border border-purple-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Canais de Contato
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">Email Institucional</span>
                <div className="flex items-center gap-2 mt-0.5 truncate text-slate-800">
                  <Mail className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="truncate font-mono text-xs" title={schoolContact.email}>{schoolContact.email}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">Telefone Fixo</span>
                <div className="flex items-center gap-2 mt-0.5 text-slate-800">
                  <Phone className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="font-mono text-xs">{schoolContact.phone_fixed}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider block">Celular / WhatsApp</span>
                <div className="flex items-center gap-2 mt-0.5 text-slate-800">
                  <Smartphone className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="font-mono text-xs">{schoolContact.phone_mobile}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Atendimento:</span>
            <span className="text-emerald-700 font-semibold">Disponível</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default StudentClassScheduleTab;
