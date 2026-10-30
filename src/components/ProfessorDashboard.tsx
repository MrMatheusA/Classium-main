import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { DashboardTab } from './DashboardTab';
import { ClassesTab } from './ClassesTab';
import { LogbookTab } from './LogbookTab';
import { EducaSharedCalendar } from './common/EducaSharedCalendar';
import { RelatoriosTab } from './RelatoriosTab';
import { ErrorBoundary } from './common/ErrorBoundary';
import { EducaStudio } from './EducaStudio';
import { EducaCarreiraEBeneficios } from './carreira/EducaCarreiraEBeneficios';
import { StudentDossierModal } from './professor/StudentDossierModal';
import { ClassroomStudentActionModal } from './professor/ClassroomStudentActionModal';
import { TeacherSettingsTab } from './professor/TeacherSettingsTab';
import { Alert, Avatar, Badge, BrandHero, Button, Card, CardHeader, EmptyState, Field, Modal, Page, PageSkeleton, Toggle, inputCls, EASE, cx } from './ui/kit';
import {
  AlertCircle,
  BookOpen,
  DoorOpen,
  FileText,
  GraduationCap,
  Layers,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

interface ClassroomStudent {
  id: string;
  student_id?: string;
  name: string;
  full_name?: string;
  ra?: string;
  registrationNumber?: string;
  photoUrl: string;
  attendance: 'P' | 'F' | 'A';
  points: number;
  attendanceRate?: string;
  status?: string;
}

interface ClassInfo {
  id: string;
  class_id: string;
  name: string;
  class_name: string;
  grade: string;
  room: string;
  shift: string;
  subject: string;
  subject_name: string;
  studentsCount: number;
  students_count: number;
  is_main: boolean;
  isMain: boolean;
  isReference: boolean;
  students: ClassroomStudent[];
}

interface ShiftClass {
  id: string;
  name: string;
  room: string;
  shift: 'Matutino' | 'Vespertino';
  mainTeacher: string;
  subject: string;
}

type Substitution = { classId: string; className: string; room: string; shift: string } | null;

const SEATS = 36; // 6 fileiras de 6 carteiras
const MAX_CONDUCT = 20;

const OCC_TYPES: { value: string; label: string; points: number }[] = [
  { value: 'pedagogica', label: 'Anotação pedagógica', points: 0 },
  { value: 'elogio', label: 'Elogio', points: 0 },
  { value: 'saude', label: 'Atendimento de saúde', points: 0 },
  { value: 'leve', label: 'Falta leve (−0,5)', points: 0.5 },
  { value: 'media', label: 'Falta média (−1,0)', points: 1 },
  { value: 'gravissima', label: 'Falta gravíssima (−2,0)', points: 2 },
];

/** "7º A" → "7º A · Fundamental II" (só quando dá para saber a série) */
function classLabel(raw: string) {
  if (/fundamental|médio|medio|infantil/i.test(raw)) return raw;
  const m = raw.match(/([1-9])\s*º?/);
  if (!m) return raw;
  return `${raw} · ${parseInt(m[1], 10) <= 5 ? 'Fundamental I' : 'Fundamental II'}`;
}

function shiftLabel(shift?: string) {
  const s = (shift || '').toLowerCase();
  if (s.includes('mat')) return 'Manhã';
  if (s.includes('vesp')) return 'Tarde';
  if (s.includes('not')) return 'Noite';
  return shift || '';
}

/* ------------------------------------------------------------------ */
/* Painel                                                              */
/* ------------------------------------------------------------------ */

export function ProfessorDashboard() {
  const { activeProfessorTab: activeTab, setActiveProfessorTab: setActiveTab } = usePlatform();
  const { profile, logout } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [teacherRecord, setTeacherRecord] = useState<Record<string, any> | null>(null);
  const [classesInfo, setClassesInfo] = useState<Record<string, ClassInfo>>({});
  const [classStudentsMap, setClassStudentsMap] = useState<Record<string, ClassroomStudent[]>>({});
  const [classSeatingMaps, setClassSeatingMaps] = useState<Record<string, Record<number, string>>>({});
  const [classSupervisedMaps, setClassSupervisedMaps] = useState<Record<string, Record<number, boolean>>>({});
  const [counts, setCounts] = useState({ lessons: 0, students: 0, diarios: 0, events: 0, announcements: 0, unreadNotifications: 0 });

  const [selectedClass, setSelectedClass] = useState('');
  const [substitutionMode, setSubstitutionMode] = useState<Substitution>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [activeShiftFilter, setActiveShiftFilter] = useState<'Matutino' | 'Vespertino'>('Matutino');
  // a lista de turmas do turno para substituição vem da coordenação (ainda não há fonte de dados)
  const [shiftClasses] = useState<ShiftClass[]>([]);

  const handleLogout = useCallback(() => {
    if (typeof logout === 'function') logout();
    else supabase.auth.signOut();
  }, [logout]);

  /* ---------------- carregamento das turmas e alunos ---------------- */
  const fetchTeacherData = useCallback(async () => {
    try {
      const orgId: string = profile?.organization_id || profile?.school_id || '';
      const userId: string = profile?.user_id || profile?.id || '';
      const userEmail: string = profile?.email || '';

      // 1. registro do professor
      let teacher: Record<string, any> | null = null;
      if (profile) {
        const filters = [`profile_id.eq.${profile.id}`, userId && `user_id.eq.${userId}`, userEmail && `email.eq.${userEmail}`].filter(Boolean).join(',');
        const { data } = await supabase.from('teachers').select('*').or(filters).maybeSingle();
        teacher = data ?? null;
        setTeacherRecord(teacher);
      }

      // 2. turmas ligadas ao professor
      let teacherClassIds: string[] = [];
      if (teacher?.id) {
        const { data } = await supabase.from('class_teachers').select('class_id').eq('teacher_id', teacher.id);
        teacherClassIds = (data ?? []).map((r: { class_id: string }) => r.class_id).filter(Boolean);
      }

      let classQuery = supabase.from('classes').select('*');
      if (orgId) classQuery = classQuery.eq('organization_id', orgId);
      const { data: dbClasses } = await classQuery;

      const isAdmin = profile?.role === 'admin' || profile?.role === 'admin_master';
      const myClasses = (dbClasses ?? []).filter((c: Record<string, any>) =>
        teacher?.id ? teacherClassIds.includes(c.id) || c.teacher_id === teacher.id : isAdmin,
      );

      // 3. alunos, vínculos de turma, carteiras e conduta
      let studentsQuery = supabase
        .from('students')
        .select('id, name, full_name, ra, registration_code, registration_number, photo_url, avatar_url, class_id, conduct_points, attendance_rate, status, organization_id')
        .order('name', { ascending: true });
      if (orgId) studentsQuery = studentsQuery.eq('organization_id', orgId);

      const [{ data: dbStudents }, { data: classLinks }, { data: seatRows }, { data: scoreRows }] = await Promise.all([
        studentsQuery,
        supabase.from('class_students').select('class_id, student_id, seat_number, status'),
        supabase.from('seat_assignments').select('*'),
        supabase.from('student_conduct_quarterly_scores').select('student_id, current_balance').eq('year', new Date().getFullYear()),
      ]);

      const scores: Record<string, number> = {};
      (scoreRows ?? []).forEach((r: { student_id: string; current_balance: number }) => {
        if (r.student_id && typeof r.current_balance === 'number') scores[r.student_id] = r.current_balance;
      });

      const nextClasses: Record<string, ClassInfo> = {};
      const nextStudents: Record<string, ClassroomStudent[]> = {};
      const nextSeats: Record<string, Record<number, string>> = {};
      const nextSupervised: Record<string, Record<number, boolean>> = {};
      let totalStudents = 0;

      myClasses.forEach((c: Record<string, any>, index: number) => {
        const classId: string = c.id;
        const inClass = (dbStudents ?? []).filter(
          (s: Record<string, any>) => s.class_id === classId || (classLinks ?? []).some((l: Record<string, any>) => l.class_id === classId && l.student_id === s.id),
        );

        const roster: ClassroomStudent[] = inClass.map((s: Record<string, any>) => {
          const id: string = s.id;
          const ra: string = s.ra || s.registration_code || s.registration_number || '';
          const seat = (classLinks ?? []).find((l: Record<string, any>) => l.class_id === classId && l.student_id === id);
          if (seat?.seat_number) {
            nextSeats[classId] = { ...(nextSeats[classId] || {}), [seat.seat_number]: id };
          }
          return {
            id,
            student_id: id,
            name: s.full_name || s.name || 'Aluno',
            full_name: s.full_name || s.name || 'Aluno',
            ra,
            registrationNumber: ra,
            photoUrl: s.photo_url || s.avatar_url || '',
            attendance: 'P',
            points: scores[id] ?? (typeof s.conduct_points === 'number' ? s.conduct_points : MAX_CONDUCT),
            attendanceRate: s.attendance_rate != null ? `${s.attendance_rate}%` : undefined,
            status: s.status || 'ativo',
          };
        });

        (seatRows ?? [])
          .filter((r: Record<string, any>) => r.class_id === classId)
          .forEach((r: Record<string, any>) => {
            if (r.student_id) nextSeats[classId] = { ...(nextSeats[classId] || {}), [r.seat_number]: r.student_id };
            if (r.is_supervised) nextSupervised[classId] = { ...(nextSupervised[classId] || {}), [r.seat_number]: true };
          });

        const name: string = c.name || (c.grade ? `Turma ${c.grade}` : `Turma ${index + 1}`);
        const subject: string = c.subject || teacher?.subject || '';
        totalStudents += roster.length;
        nextStudents[classId] = roster;
        nextClasses[classId] = {
          id: classId,
          class_id: classId,
          name,
          class_name: name,
          grade: c.grade || name,
          room: c.room || '',
          shift: c.shift || '',
          subject,
          subject_name: subject,
          studentsCount: roster.length,
          students_count: roster.length,
          is_main: index === 0,
          isMain: index === 0,
          isReference: index === 0,
          students: roster,
        };
      });

      setClassesInfo(nextClasses);
      setClassStudentsMap(nextStudents);
      setClassSeatingMaps(nextSeats);
      setClassSupervisedMaps(nextSupervised);
      setSelectedClass((prev) => (prev && nextClasses[prev] ? prev : Object.keys(nextClasses)[0] || ''));
      setCounts((prev) => ({ ...prev, students: totalStudents, diarios: Object.keys(nextClasses).length }));
    } catch (err) {
      console.error('[ProfessorDashboard]', err);
    } finally {
      setLoadingData(false);
    }
  }, [profile]);

  useEffect(() => {
    setLoadingData(true);
    fetchTeacherData();
    // atualiza sozinho quando turmas, alunos ou carteiras mudam
    const channel = supabase.channel('portal-docente');
    ['classes', 'class_teachers', 'class_students', 'students', 'seat_assignments', 'occurrences'].forEach((table) =>
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchTeacherData()),
    );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const currentTeacher = {
    id: (teacherRecord?.id as string) || profile?.id || '',
    name: (teacherRecord?.name as string) || (teacherRecord?.full_name as string) || profile?.name || 'Professor',
    subject: (teacherRecord?.subject as string) || '',
  };

  /* ---------------- turma ativa ---------------- */
  const activeClassId = substitutionMode ? substitutionMode.classId : selectedClass;
  const activeClass = classesInfo[activeClassId];
  const studentsList = useMemo(() => classStudentsMap[activeClassId] ?? [], [activeClassId, classStudentsMap]);
  const seatingMap = classSeatingMaps[activeClassId] || {};
  const supervisedMap = classSupervisedMaps[activeClassId] || {};

  const setStudentsList = (fn: (prev: ClassroomStudent[]) => ClassroomStudent[]) =>
    setClassStudentsMap((prev) => ({ ...prev, [activeClassId]: fn(prev[activeClassId] || []) }));
  const setSeatingMap = (fn: (prev: Record<number, string>) => Record<number, string>) =>
    setClassSeatingMaps((prev) => ({ ...prev, [activeClassId]: fn(prev[activeClassId] || {}) }));

  const classesList = useMemo(
    () =>
      Object.values(classesInfo).map((c) => ({
        id: c.id,
        name: c.name,
        room: c.room,
        shift: c.shift,
        subject: c.subject_name,
        studentsCount: c.students_count,
        isReference: c.isReference,
        inProgress: c.id === selectedClass,
      })),
    [classesInfo, selectedClass],
  );

  const pickClass = (id: string) => {
    setSubstitutionMode(null);
    setSelectedStudentForSeat(null);
    setActiveProfileStudentId(null);
    setSelectedClass(id);
  };

  /* ---------------- indicadores da sala ---------------- */
  const [classroomMetrics, setClassroomMetrics] = useState<{ occurrencesToday: number; classAverage: number | null }>({ occurrencesToday: 0, classAverage: null });

  useEffect(() => {
    if (!activeClassId) return;
    let alive = true;
    fetch(`/api/teacher/classes/${activeClassId}/metrics/classroom`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (alive && json?.metrics) {
          setClassroomMetrics({
            occurrencesToday: Number(json.metrics.occurrencesToday) || 0,
            classAverage: typeof json.metrics.classAverage === 'number' ? json.metrics.classAverage : null,
          });
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [activeClassId]);

  /* ---------------- carteiras ---------------- */
  const [selectedStudentForSeat, setSelectedStudentForSeat] = useState<string | null>(null);
  const [draggingStudentId, setDraggingStudentId] = useState<string | null>(null);
  const [activeProfileStudentId, setActiveProfileStudentId] = useState<string | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const activeDetailStudent = useMemo(
    () => studentsList.find((s) => s.id === activeProfileStudentId) ?? studentsList[0] ?? null,
    [activeProfileStudentId, studentsList],
  );

  const filteredStudents = useMemo(() => {
    const term = studentSearchTerm.trim().toLowerCase();
    if (!term) return studentsList;
    return studentsList.filter((s) => (s.name || '').toLowerCase().includes(term) || (s.ra || '').toLowerCase().includes(term));
  }, [studentsList, studentSearchTerm]);

  const seatOf = (studentId: string) => Object.keys(seatingMap).find((k) => seatingMap[Number(k)] === studentId);

  const handleSeatPlacement = async (desk: number, studentId?: string) => {
    const target = studentId || selectedStudentForSeat;
    if (!target) return;
    setSeatingMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[Number(k)] === target) delete next[Number(k)];
      });
      next[desk] = target;
      return next;
    });
    setSelectedStudentForSeat(null);
    setDraggingStudentId(null);
    setActiveProfileStudentId(target);

    const { error } = await supabase.rpc('assign_or_move_student_seat', {
      p_class_id: activeClassId,
      p_student_id: target,
      p_seat_number: desk,
      p_is_supervised: Boolean(supervisedMap[desk]),
    });
    if (error) {
      await supabase.from('seat_assignments').upsert(
        {
          class_id: activeClassId,
          student_id: target,
          seat_number: desk,
          row_index: Math.floor((desk - 1) / 6) + 1,
          col_index: ((desk - 1) % 6) + 1,
          is_supervised: Boolean(supervisedMap[desk]),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'class_id,seat_number' },
      );
    }
  };

  const handleClearSeat = async (desk: number) => {
    setSeatingMap((prev) => {
      const next = { ...prev };
      delete next[desk];
      return next;
    });
    setClassSupervisedMaps((prev) => {
      const next = { ...(prev[activeClassId] || {}) };
      delete next[desk];
      return { ...prev, [activeClassId]: next };
    });
    const { error } = await supabase.rpc('clear_seat_assignment', { p_class_id: activeClassId, p_seat_number: desk });
    if (error) {
      await supabase
        .from('seat_assignments')
        .update({ student_id: null, is_supervised: false, updated_at: new Date().toISOString() })
        .eq('class_id', activeClassId)
        .eq('seat_number', desk);
    }
  };

  const handleToggleSupervision = async (desk: number) => {
    const next = !supervisedMap[desk];
    setClassSupervisedMaps((prev) => ({ ...prev, [activeClassId]: { ...(prev[activeClassId] || {}), [desk]: next } }));
    const { error } = await supabase.rpc('toggle_seat_supervision', { p_class_id: activeClassId, p_seat_number: desk });
    if (error) {
      await supabase
        .from('seat_assignments')
        .update({ is_supervised: next, updated_at: new Date().toISOString() })
        .eq('class_id', activeClassId)
        .eq('seat_number', desk);
    }
  };

  const handleAutoAssignSeats = async () => {
    const map: Record<number, string> = {};
    studentsList.slice(0, SEATS).forEach((s, i) => {
      map[i + 1] = s.id;
    });
    setSeatingMap(() => map);
    await Promise.all(
      Object.entries(map).map(([desk, id]) =>
        supabase.rpc('assign_or_move_student_seat', {
          p_class_id: activeClassId,
          p_student_id: id,
          p_seat_number: Number(desk),
          p_is_supervised: Boolean(supervisedMap[Number(desk)]),
        }),
      ),
    );
  };

  const handleClearAllSeats = async () => {
    setSeatingMap(() => ({}));
    setClassSupervisedMaps((prev) => ({ ...prev, [activeClassId]: {} }));
    await supabase
      .from('seat_assignments')
      .update({ student_id: null, is_supervised: false, updated_at: new Date().toISOString() })
      .eq('class_id', activeClassId);
  };

  /* ---------------- modais ---------------- */
  const [dossierStudent, setDossierStudent] = useState<ClassroomStudent | null>(null);
  const [roomAction, setRoomAction] = useState<{ student: ClassroomStudent; seat: number | null } | null>(null);

  const [occStudent, setOccStudent] = useState<ClassroomStudent | null>(null);
  const [occType, setOccType] = useState('pedagogica');
  const [occDesc, setOccDesc] = useState('');
  const [occPoints, setOccPoints] = useState(0);
  const [occNotify, setOccNotify] = useState(true);
  const [occSaving, setOccSaving] = useState(false);
  const [occMessage, setOccMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const openOccurrence = (s: ClassroomStudent) => {
    setOccStudent(s);
    setOccType('pedagogica');
    setOccDesc('');
    setOccPoints(0);
    setOccNotify(true);
    setOccMessage(null);
  };

  const saveOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occStudent) return;
    if (!occDesc.trim()) return setOccMessage({ tone: 'danger', text: 'Descreva o que aconteceu.' });

    setOccSaving(true);
    const { error } = await supabase.from('occurrences').insert({
      student_id: occStudent.id,
      class_id: activeClassId,
      teacher_id: currentTeacher.id,
      occurrence_type: occType,
      description: occDesc.trim(),
      points_deducted: occPoints,
      is_positive: occType === 'elogio',
      responsible_notified: occNotify,
      occurrence_date: new Date().toISOString().split('T')[0],
      status: 'resolved',
    });
    setOccSaving(false);

    if (error) {
      setOccMessage({ tone: 'danger', text: 'Não foi possível registrar agora. Tente novamente.' });
      return;
    }

    setStudentsList((prev) =>
      prev.map((s) =>
        s.id === occStudent.id
          ? { ...s, points: Number(Math.min(MAX_CONDUCT, Math.max(0, s.points - occPoints + (occType === 'elogio' ? 0.5 : 0))).toFixed(1)) }
          : s,
      ),
    );
    setOccMessage({ tone: 'success', text: occNotify ? 'Ocorrência registrada e família avisada.' : 'Ocorrência registrada.' });
    setTimeout(() => setOccStudent(null), 1200);
  };

  /* ---------------- tela ---------------- */
  if (loadingData) return <PageSkeleton />;

  const hasClasses = Object.keys(classesInfo).length > 0;
  const localTabs = ['alunos', 'seating', 'classes'];
  const showTeacherHero = localTabs.includes(activeTab as string);

  return (
    <Page>
      {showTeacherHero && (
        <BrandHero>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-medium" style={{ color: 'var(--sidebar-muted)' }}>
                {currentTeacher.subject ? `Professor(a) · ${currentTeacher.subject}` : 'Professor(a)'}
              </p>
              <h1 className="mt-1 truncate font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] sm:text-[34px]">{currentTeacher.name}</h1>
              {activeClass && (
                <p className="mt-2 text-[14px]" style={{ color: 'var(--sidebar-muted)' }}>
                  {classLabel(activeClass.name)}
                  {activeClass.room && ` · ${activeClass.room}`}
                  {` · ${studentsList.length} alunos`}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 self-start rounded-full border px-4 text-[13px] font-semibold sm:self-auto"
              style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg-hover)', color: 'var(--sidebar-fg)' }}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </BrandHero>
      )}

      {substitutionMode && (
        <Alert
          tone="info"
          title={`Substituindo na turma ${substitutionMode.className}`}
          action={
            <Button size="sm" variant="secondary" onClick={() => setSubstitutionMode(null)}>
              Encerrar substituição
            </Button>
          }
        >
          {[shiftLabel(substitutionMode.shift), substitutionMode.room].filter(Boolean).join(' · ')}. Durante a substituição você registra o diário de bordo dos{' '}
          {studentsList.length} alunos desta turma.
        </Alert>
      )}

      {!hasClasses && (
        <Alert
          tone="warning"
          title="Nenhuma turma ligada a você ainda"
          action={
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => fetchTeacherData()}>
              Verificar de novo
            </Button>
          }
        >
          Você já pode usar o calendário, o Studio, os relatórios e as configurações. Para ter o diário das suas turmas, peça à coordenação para vincular você a elas.
        </Alert>
      )}

      {showTeacherHero && hasClasses && <ClassPicker classes={classesInfo} selected={substitutionMode ? '' : selectedClass} onPick={pickClass} />}

      <motion.div key={activeTab as string} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="min-h-[420px]">
        {activeTab === 'dashboard' && (
          <DashboardTab
            teacherName={profile?.name || currentTeacher.name}
            teacherId={currentTeacher.id}
            teacherSubject={currentTeacher.subject}
            counts={counts}
            onSelectClass={(id: string) => setSelectedClass(id)}
            classes={classesInfo}
            selectedClass={selectedClass}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'classes' && (
          <ClassesTab
            classes={Object.values(classesInfo)}
            selectedClass={selectedClass}
            onSelectClass={(id: string) => setSelectedClass(id)}
            onSelectTab={(tab: string) => setActiveTab(tab as typeof activeTab)}
          />
        )}

        {/* ===== ALUNOS ===== */}
        {activeTab === 'alunos' && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative block w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} placeholder="Buscar por nome ou matrícula" className={`${inputCls} pl-10`} />
              </label>
              <p className="text-[13px] text-[var(--text-muted)]">
                Mostrando <strong className="text-[var(--text-heading)]">{filteredStudents.length}</strong> de {studentsList.length} alunos
              </p>
            </div>

            {filteredStudents.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Users}
                  title={studentSearchTerm ? 'Nenhum aluno encontrado' : hasClasses ? 'Turma sem alunos' : 'Nenhuma turma ligada'}
                  text={
                    studentSearchTerm
                      ? `Nada encontrado para "${studentSearchTerm}".`
                      : hasClasses
                        ? 'Ainda não há alunos matriculados nesta turma.'
                        : 'Peça à coordenação para vincular suas turmas.'
                  }
                />
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredStudents.map((s, i) => {
                  const seat = seatOf(s.id);
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.03, ease: EASE }}>
                      <Card className="flex h-full flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={s.name} src={s.photoUrl} size={44} />
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-semibold text-[var(--text-heading)]">{s.name}</p>
                              {s.ra && <p className="truncate text-[12px] text-[var(--text-muted)]">Matrícula {s.ra}</p>}
                            </div>
                          </div>
                          <Badge tone={s.points >= 16 ? 'success' : s.points >= 10 ? 'warning' : 'danger'}>{s.points.toFixed(1)} pts</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl bg-[var(--bg-card-alt)] px-3.5 py-2.5 text-[13px]">
                          <span className="text-[var(--text-muted)]">Lugar na sala</span>
                          <span className="font-semibold text-[var(--text-heading)]">{seat ? `Carteira ${seat.padStart(2, '0')}` : 'Sem lugar'}</span>
                        </div>
                        <div className="mt-auto grid grid-cols-2 gap-2">
                          <Button size="sm" variant="secondary" icon={FileText} onClick={() => setDossierStudent(s)}>
                            Ficha
                          </Button>
                          <Button size="sm" variant="secondary" icon={AlertCircle} onClick={() => openOccurrence(s)}>
                            Ocorrência
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== VISÃO DA SALA ===== */}
        {activeTab === 'seating' && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-[var(--text-muted)]">Ocorrências hoje</p>
                  <p className="mt-1 font-serif text-[32px] font-semibold leading-none text-[var(--text-heading)]">{classroomMetrics.occurrencesToday}</p>
                </div>
                <Badge tone={classroomMetrics.occurrencesToday > 3 ? 'warning' : 'success'}>{classroomMetrics.occurrencesToday > 3 ? 'Atenção' : 'Tranquilo'}</Badge>
              </Card>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-[var(--text-muted)]">Média da turma</p>
                  <p className="mt-1 font-serif text-[32px] font-semibold leading-none text-[var(--text-heading)]">
                    {classroomMetrics.classAverage != null ? classroomMetrics.classAverage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
                  </p>
                </div>
                <span className="text-[13px] text-[var(--text-muted)]">de 10</span>
              </Card>
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-12">
              {/* Mapa */}
              <Card className="lg:col-span-8">
                <CardHeader
                  icon={MonitorSmartphone}
                  title="Mapa da sala"
                  subtitle="Arraste um aluno até a carteira, ou toque nele e depois na carteira."
                  action={
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" icon={Layers} onClick={handleAutoAssignSeats} disabled={!studentsList.length}>
                        Distribuir
                      </Button>
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={handleClearAllSeats}>
                        Limpar
                      </Button>
                    </div>
                  }
                />

                <div className="mb-5 space-y-3">
                  <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-card-alt)] py-2.5 text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Quadro
                  </div>
                  <div className="mx-auto flex max-w-xl items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 rounded-xl px-3 py-1.5 font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      <GraduationCap className="h-4 w-4" />
                      Mesa do professor
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-[#127A4B]">
                      <DoorOpen className="h-4 w-4" />
                      Porta
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: SEATS }).map((_, i) => {
                    const desk = i + 1;
                    const sid = seatingMap[desk];
                    const s = sid ? studentsList.find((x) => x.id === sid) : undefined;
                    const supervised = Boolean(supervisedMap[desk]);
                    const focused = s && activeDetailStudent?.id === s.id;
                    return (
                      <div
                        key={desk}
                        role="button"
                        tabIndex={0}
                        aria-label={s ? `Carteira ${desk}: ${s.name}` : `Carteira ${desk} vazia`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const id = e.dataTransfer.getData('text/plain') || draggingStudentId;
                          if (id) handleSeatPlacement(desk, id);
                        }}
                        onClick={() => {
                          if (selectedStudentForSeat) handleSeatPlacement(desk);
                          else if (s) {
                            setActiveProfileStudentId(s.id);
                            setRoomAction({ student: s, seat: desk });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            (e.currentTarget as HTMLElement).click();
                          }
                        }}
                        className={cx(
                          'group relative flex min-h-[78px] cursor-pointer flex-col justify-between rounded-2xl border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)] sm:min-h-[88px]',
                          s ? 'bg-[var(--bg-card)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-14px_rgba(16,24,40,0.4)]' : 'border-dashed bg-[var(--bg-card-alt)] hover:border-[var(--accent)]',
                        )}
                        style={{
                          borderColor: supervised ? '#E5A50A' : focused ? 'var(--accent)' : 'var(--border)',
                          boxShadow: supervised ? '0 0 0 2px #FDF0C7' : focused ? '0 0 0 2px var(--accent-soft)' : undefined,
                        }}
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[var(--text-muted)] tabular-nums">{String(desk).padStart(2, '0')}</span>
                          {supervised && <Shield className="h-3 w-3 text-[#A15C07]" aria-label="Atenção próxima" />}
                        </span>
                        {s ? (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Avatar name={s.name} src={s.photoUrl} size={22} />
                            <span className="truncate text-[11px] font-semibold text-[var(--text-heading)] sm:text-[12px]">{s.name.split(/\s+/)[0]}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[var(--text-muted)] group-hover:text-[var(--accent)]">
                            {selectedStudentForSeat ? 'Colocar aqui' : 'Vazia'}
                          </span>
                        )}
                        {s && (
                          <span className="absolute right-1.5 top-1.5 hidden gap-0.5 group-hover:flex">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSupervision(desk);
                              }}
                              className="rounded-md bg-[var(--bg-card)] p-0.5 text-[var(--text-muted)] hover:text-[#A15C07]"
                              aria-label={supervised ? 'Tirar atenção próxima' : 'Marcar atenção próxima'}
                            >
                              <Shield className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearSeat(desk);
                              }}
                              className="rounded-md bg-[var(--bg-card)] p-0.5 text-[var(--text-muted)] hover:text-[#B42318]"
                              aria-label="Liberar carteira"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap justify-center gap-5 border-t border-[var(--border)] pt-4 text-[12px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-md border border-[var(--border)] bg-[var(--bg-card)]" /> Ocupada
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-card-alt)]" /> Vazia
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-md border-2 border-[#E5A50A]" /> Atenção próxima
                  </span>
                </div>
              </Card>

              {/* Lista de alunos e ficha rápida */}
              <div className="space-y-5 lg:col-span-4">
                <Card>
                  <CardHeader icon={Users} title="Alunos da turma" subtitle="Toque para escolher ou arraste até a carteira." />
                  <label className="relative mb-3 block">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} placeholder="Buscar aluno" className={`${inputCls} pl-10`} />
                  </label>
                  <ul className="-mr-2 max-h-[340px] space-y-1.5 overflow-y-auto pr-2">
                    {filteredStudents.map((s) => {
                      const seat = seatOf(s.id);
                      const picked = selectedStudentForSeat === s.id;
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            draggable
                            onDragStart={(e) => {
                              setDraggingStudentId(s.id);
                              e.dataTransfer.setData('text/plain', s.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onClick={() => {
                              setSelectedStudentForSeat(picked ? null : s.id);
                              setActiveProfileStudentId(s.id);
                            }}
                            aria-pressed={picked}
                            className="flex w-full cursor-grab items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors active:cursor-grabbing"
                            style={picked ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : { borderColor: 'transparent' }}
                          >
                            <Avatar name={s.name} src={s.photoUrl} size={32} />
                            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--text-heading)]">{s.name}</span>
                            {seat ? <Badge tone="success">{seat.padStart(2, '0')}</Badge> : <Badge tone="warning">Sem lugar</Badge>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <AnimatePresence>
                    {selectedStudentForSeat && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 text-[13px] text-[var(--accent)]">
                        Agora toque numa carteira vazia para colocar {studentsList.find((s) => s.id === selectedStudentForSeat)?.name.split(/\s+/)[0]}.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </Card>

                {activeDetailStudent && (
                  <Card>
                    <div className="flex items-center gap-3">
                      <Avatar name={activeDetailStudent.name} src={activeDetailStudent.photoUrl} size={48} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-[var(--text-heading)]">{activeDetailStudent.name}</p>
                        <p className="text-[13px] text-[var(--text-muted)]">
                          Conduta {activeDetailStudent.points.toFixed(1)} de {MAX_CONDUCT}
                          {seatOf(activeDetailStudent.id) && ` · carteira ${seatOf(activeDetailStudent.id)?.padStart(2, '0')}`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button size="sm" variant="secondary" icon={FileText} onClick={() => setDossierStudent(activeDetailStudent)}>
                        Ficha
                      </Button>
                      <Button size="sm" variant="secondary" icon={AlertCircle} onClick={() => openOccurrence(activeDetailStudent)}>
                        Ocorrência
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'occurrences' && (
          <LogbookTab
            classId={selectedClass}
            teacherId={currentTeacher.id}
            teacherName={profile?.name || currentTeacher.name}
            teacherSubject={currentTeacher.subject}
            students={studentsList}
            disciplineName={activeClass?.subject_name || currentTeacher.subject}
            onStudentPointsUpdate={(studentId: string, points: number) => setStudentsList((prev) => prev.map((s) => (s.id === studentId ? { ...s, points } : s)))}
            onSelectClass={pickClass}
            selectedClassName={activeClass?.name}
            substitutionInfo={substitutionMode}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
            classesList={classesList}
          />
        )}

        {activeTab === 'calendar' && <EducaSharedCalendar role="professor" selectedUnit={profile?.school_id || profile?.organization_id || undefined} />}

        {activeTab === 'relatorios_ia' && (
          <ErrorBoundary fallbackTitle="Relatórios">
            <RelatoriosTab
              teacherId={currentTeacher.id}
              teacherName={profile?.name || currentTeacher.name}
              teacherSubject={currentTeacher.subject}
              selectedClass={selectedClass}
              onSelectClass={pickClass}
              classesList={classesList.length ? classesList : undefined}
              onOpenShiftModal={() => setIsShiftModalOpen(true)}
              onLogout={handleLogout}
            />
          </ErrorBoundary>
        )}

        {(activeTab === 'ia' || (activeTab as string) === 'carreira') && (
          <EducaCarreiraEBeneficios teacherName={profile?.name || currentTeacher.name} teacherSubject={currentTeacher.subject} onLogout={handleLogout} />
        )}

        {activeTab === 'studio' && (
          <EducaStudio
            teacherId={currentTeacher.id}
            teacherName={profile?.name || currentTeacher.name}
            teacherSubject={currentTeacher.subject}
            selectedClass={selectedClass}
            onSelectClass={pickClass}
            classesList={classesList}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
          />
        )}

        {activeTab === 'configuracoes' && (
          <TeacherSettingsTab
            teacherId={currentTeacher.id}
            teacherName={profile?.name || currentTeacher.name}
            selectedClass={selectedClass}
            onSelectClass={pickClass}
            classesList={classesList}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
          />
        )}
      </motion.div>

      {/* ===== Modais (valem em todas as abas) ===== */}
      <Modal
        open={!!occStudent}
        onClose={() => setOccStudent(null)}
        title={occStudent?.name ?? ''}
        subtitle={occStudent ? `Nova ocorrência · conduta atual ${occStudent.points.toFixed(1)} de ${MAX_CONDUCT}` : undefined}
        icon={occStudent ? <Avatar name={occStudent.name} src={occStudent.photoUrl} size={44} /> : undefined}
        footer={
          <>
            <Button
              variant="ghost"
              icon={BookOpen}
              onClick={() => {
                setOccStudent(null);
                setActiveTab('occurrences' as typeof activeTab);
              }}
            >
              Abrir diário completo
            </Button>
            <Button type="submit" form="occ-form" icon={Send} loading={occSaving}>
              Registrar
            </Button>
          </>
        }
      >
        <form id="occ-form" onSubmit={saveOccurrence} className="space-y-4" noValidate>
          {occMessage && <Alert tone={occMessage.tone}>{occMessage.text}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              {(id) => (
                <select
                  id={id}
                  value={occType}
                  onChange={(e) => {
                    setOccType(e.target.value);
                    setOccPoints(OCC_TYPES.find((t) => t.value === e.target.value)?.points ?? 0);
                  }}
                  className={inputCls}
                >
                  {OCC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Pontos descontados">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  step="0.5"
                  min="0"
                  max="5"
                  value={occPoints}
                  onChange={(e) => setOccPoints(Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)))}
                  className={inputCls}
                />
              )}
            </Field>
          </div>
          <Field label="O que aconteceu" required>
            {(id) => (
              <textarea id={id} rows={4} value={occDesc} onChange={(e) => setOccDesc(e.target.value)} placeholder="Descreva o fato com objetividade." className={`${inputCls} resize-none`} />
            )}
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--bg-card-alt)] px-4 py-3">
            <span className="text-[14px] text-[var(--text-heading)]">Avisar a família agora</span>
            <Toggle checked={occNotify} onChange={setOccNotify} label="Avisar a família agora" />
          </div>
        </form>
      </Modal>

      <Modal open={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} size="lg" title="Substituir um colega" subtitle="Escolha a turma do seu turno em que você vai dar a aula.">
        <div className="space-y-5">
          <Alert tone="info" title="O que fica liberado na substituição">
            Apenas o diário de bordo da turma (conteúdo e ocorrências). Notas, planejamento e histórico dos alunos continuam com o professor titular.
          </Alert>
          <div className="flex gap-2">
            {(['Matutino', 'Vespertino'] as const).map((s) => (
              <Button key={s} size="sm" variant={activeShiftFilter === s ? 'primary' : 'secondary'} onClick={() => setActiveShiftFilter(s)}>
                {shiftLabel(s)}
              </Button>
            ))}
          </div>
          {shiftClasses.filter((t) => t.shift === activeShiftFilter).length === 0 ? (
            <EmptyState compact icon={ShieldAlert} title="Nenhuma turma disponível neste turno" text="Quando a coordenação liberar uma substituição, a turma aparece aqui." />
          ) : (
            <ul className="space-y-2">
              {shiftClasses
                .filter((t) => t.shift === activeShiftFilter)
                .map((t) => (
                  <li key={t.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[15px] font-semibold text-[var(--text-heading)]">
                        {t.name} <span className="font-normal text-[var(--text-muted)]">· {t.room}</span>
                      </p>
                      <p className="text-[13px] text-[var(--text-muted)]">
                        Titular: {t.mainTeacher} ({t.subject})
                      </p>
                    </div>
                    <Button
                      size="sm"
                      icon={BookOpen}
                      onClick={() => {
                        setSubstitutionMode({ classId: t.id, className: t.name, room: t.room, shift: t.shift });
                        setIsShiftModalOpen(false);
                        setActiveTab('occurrences' as typeof activeTab);
                      }}
                    >
                      Abrir diário
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </Modal>

      <StudentDossierModal
        isOpen={!!dossierStudent}
        onClose={() => setDossierStudent(null)}
        student={dossierStudent}
        currentClass={activeClass || { id: activeClassId, name: '' }}
        teacherId={currentTeacher.id}
        teacherName={currentTeacher.name}
        onStudentUpdated={(u: ClassroomStudent) => setStudentsList((prev) => prev.map((s) => (s.id === u.id ? { ...s, ...u } : s)))}
      />

      <ClassroomStudentActionModal
        isOpen={!!roomAction}
        onClose={() => setRoomAction(null)}
        student={roomAction?.student ?? null}
        seatNumber={roomAction?.seat ?? null}
        currentClass={activeClass || { id: activeClassId, name: '' }}
        teacherId={currentTeacher.id}
        teacherName={currentTeacher.name}
        isSupervised={roomAction?.seat ? Boolean(supervisedMap[roomAction.seat]) : false}
        onToggleSupervision={(seat: number) => handleToggleSupervision(seat)}
        onUnseatStudent={(seat: number) => handleClearSeat(seat)}
        onOpenDossier={(s: ClassroomStudent) => setDossierStudent(s)}
        onStudentUpdated={(u: ClassroomStudent) => setStudentsList((prev) => prev.map((s) => (s.id === u.id ? { ...s, ...u } : s)))}
      />
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Seletor de turmas                                                   */
/* ------------------------------------------------------------------ */

function ClassPicker({ classes, selected, onPick }: { classes: Record<string, ClassInfo>; selected: string; onPick: (id: string) => void }) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex w-max gap-2 px-1">
        {Object.values(classes).map((c) => {
          const active = c.id === selected;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              aria-pressed={active}
              className="flex min-w-[210px] flex-col gap-1 rounded-2xl border p-3.5 text-left transition-all hover:-translate-y-0.5"
              style={active ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : { borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[14px] font-semibold text-[var(--text-heading)]">{classLabel(c.name)}</span>
                {c.isReference && <Badge tone="accent">Referência</Badge>}
              </span>
              <span className="text-[12px] text-[var(--text-muted)]">
                {[shiftLabel(c.shift), c.room, `${c.students_count} alunos`].filter(Boolean).join(' · ')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}