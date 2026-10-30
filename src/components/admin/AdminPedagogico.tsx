import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { PedagogaReportsCenter } from './PedagogaReportsCenter';
import { pedagogicalReportsService } from '../../services/reports/pedagogicalReports.service';
import { conductRoutineRadarService } from '../../services/conductRoutineRadarService';
import { activitiesService, ActivityRecord } from '../../services/activities/activities.service';
import { exportToWord, exportToPDF } from '../studio/ExportManager';
import { RealtimeService } from '../../services/RealtimeService';
import { TeacherSubstitutionsTab, SubstitutionBoard } from './TeacherSubstitutionsTab';
import { teacherSubstitutionsService } from '../../services/schedule/teacherSubstitutionsService';
import { 
  BookOpen, RefreshCw, Sparkles, BadgeCheck, X, 
  CheckCircle2, Clock, AlertTriangle, FileText, 
  UserCheck, Activity, School, PlusCircle, ShieldAlert,
  ChevronRight, Users, Info, Sparkle, Search, Download,
  Eye, FileDown, Layers, Filter, Check, ShieldCheck,
  CalendarDays
} from 'lucide-react';
import { ModuleHeader } from '../common/ModuleHeader';
import { ModulePills, ModuleTabItem } from '../common/ModulePills';
import { CategoryCard } from '../common/CategoryCard';
import { SyncStatusBar } from '../common/SyncStatusBar';
import { PedagogicalAbsenceRadarTab } from './PedagogicalAbsenceRadarTab';

export interface DisciplinaryStudent {
  id: string;
  name: string;
  grade: string;
  occurrencesCount: number;
  level: 'verde' | 'amarelo' | 'laranja' | 'vermelho' | 'roxo';
  colorHex: string;
  levelLabel: string;
  registrationCode?: string;
  monthlyEvolution?: { jan: number; fev: number; mar: number; abr: number; mai: number };
  actionsLog?: Array<{ date: string; title: string; type: string }>;
}

export interface ClassRadar {
  id?: string;
  grade: string;
  studentsCount: number;
  occurrencesCount: number;
  occurrencesPerStudent: number;
  trendPercentage: number;
  level: 'verde' | 'amarelo' | 'laranja' | 'vermelho' | 'roxo';
  colorHex?: string;
}

export interface AdminPedagogicoProps {
  organizationId?: string;
  schoolInfo?: any;
  currentUser?: any;
  profile?: any;
}

// Volume Color Rule:
// 1 a 5 advertências -> Verde (#22C55E) [Ativação no radar a partir da 5ª advertência]
// 6 a 10 advertências -> Amarelo (#EAB308)
// 11 a 15 advertências -> Laranja (#F97316)
// 16 a 20 advertências -> Vermelho (#DC2626)
// Acima de 20 advertências -> Roxo (#7C3AED) [Atenção Máxima]
export const getVolumeColorInfo = (count: number) => {
  if (count <= 5) {
    return {
      name: 'verde' as const,
      hex: '#22C55E',
      label: 'Atenção Inicial (5 adv)',
      textClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      badgeClass: 'bg-emerald-50 border-emerald-200',
      dotClass: 'bg-emerald-500'
    };
  }
  if (count <= 10) {
    return {
      name: 'amarelo' as const,
      hex: '#EAB308',
      label: 'Atenção Moderada (6-10 adv)',
      textClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-[var(--accent)]'
    };
  }
  if (count <= 15) {
    return {
      name: 'laranja' as const,
      hex: '#F97316',
      label: 'Alerta Disciplinar (11-15 adv)',
      textClass: 'text-orange-700',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
      badgeClass: 'bg-orange-50 border-orange-200',
      dotClass: 'bg-orange-500'
    };
  }
  if (count <= 20) {
    return {
      name: 'vermelho' as const,
      hex: '#DC2626',
      label: 'Crítico / Urgente (16-20 adv)',
      textClass: 'text-rose-700',
      bgClass: 'bg-rose-50',
      borderClass: 'border-rose-200',
      badgeClass: 'bg-rose-50 border-rose-200',
      dotClass: 'bg-rose-500'
    };
  }
  return {
    name: 'roxo' as const,
    hex: '#7C3AED',
    label: 'Atenção Máxima (>20 adv)',
    textClass: 'text-purple-700',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    badgeClass: 'bg-purple-50 border-purple-200',
    dotClass: 'bg-purple-500'
  };
};

export function AdminPedagogico({ organizationId, schoolInfo, currentUser, profile }: AdminPedagogicoProps = {}) {
  // 1. Resolve active organization ID with strict multi-tenant isolation
  const [activeOrgId, setActiveOrgId] = useState<string>(
    organizationId || schoolInfo?.id || currentUser?.organization_id || currentUser?.organizationId || profile?.organization_id || '11111111-1111-1111-1111-111111111111'
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sub-aba ativa no Painel Pedagógico: Home, Radar Disciplinar, Radar Faltas, Relatórios, Atividades e Substituições
  const [activeTab, setActiveTab] = useState<'home' | 'radar' | 'radar-frequencia' | 'relatorios' | 'atividades' | 'substituicoes'>('home');
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(0);
  const [totalReportsCount, setTotalReportsCount] = useState<number>(4);
  const [teachersCount, setTeachersCount] = useState<number>(0);
  const [studentsTotalCount, setStudentsTotalCount] = useState<number>(0);
  const [substitutionsSummary, setSubstitutionsSummary] = useState<{ total: number; confirmed: number; pending: number }>({
    total: 0,
    confirmed: 0,
    pending: 0
  });

  // DADOS DE ATIVIDADES PEDAGÓGICAS (CLASSIUM STUDIO)
  const [activitiesList, setActivitiesList] = useState<ActivityRecord[]>([]);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(false);
  const [activityFilter, setActivityFilter] = useState({ search: '', status: 'all', subject: 'all' });
  const [selectedActivityPreview, setSelectedActivityPreview] = useState<ActivityRecord | null>(null);
  const [previewAnswerKey, setPreviewAnswerKey] = useState<boolean>(true);

  // Relógio do Sistema em Tempo Real
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Modal de Ação do Radar Pedagógico
  const [radarActionModal, setRadarActionModal] = useState<{
    type: 'conversa' | 'reuniao' | 'intervencao';
    student: DisciplinaryStudent;
  } | null>(null);

  // Modal de Intervenção Coletiva de Turma (Radar)
  const [collectiveInterventionModal, setCollectiveInterventionModal] = useState<ClassRadar | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [projectGoal, setProjectGoal] = useState<string>('');
  const [projectStrategy, setProjectStrategy] = useState<string>('');

  // Modal de Lançamento de Ocorrência Rápida / Teste da Ponte Tripla
  const [quickOccurrenceModal, setQuickOccurrenceModal] = useState<boolean>(false);
  const [quickStudentId, setQuickStudentId] = useState<string>('');
  const [quickSeverity, setQuickSeverity] = useState<'leve' | 'media' | 'grave' | 'gravissima'>('leve');
  const [quickDescription, setQuickDescription] = useState<string>('Conduta desatenta e desrespeito às regras em sala de aula.');
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  // DADOS DO RADAR PEDAGÓGICO
  const [disciplinaryList, setDisciplinaryList] = useState<DisciplinaryStudent[]>([]);

  // RADAR DAS TURMAS
  const [classRadarList, setClassRadarList] = useState<ClassRadar[]>([]);

  // Atualizador do Relógio em Tempo Real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Formata data e hora para cabeçalho dinâmico (America/Sao_Paulo)
  const formattedClockDate = currentTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const formattedClockTime = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bom dia, Gestor(a) Pedagógico(a)';
    if (hour < 18) return 'Boa tarde, Gestor(a) Pedagógico(a)';
    return 'Boa noite, Gestor(a) Pedagógico(a)';
  };

  // Carregar dados pedagógicos persistentes e isolados
  const loadPedagogicoData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {
        'x-organization-id': activeOrgId || ''
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const orgParam = activeOrgId ? `?organization_id=${encodeURIComponent(activeOrgId)}` : '';
      const res = await fetch(`/api/pedagogico/data${orgParam}`, {
        headers
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          if (Array.isArray(d.disciplinaryList)) setDisciplinaryList(d.disciplinaryList);
          if (Array.isArray(d.classRadarList)) setClassRadarList(d.classRadarList);
        }
      }

      // Direct fallback to Supabase for real-time consistency with strict tenant isolation
      try {
        let studentsQuery = supabase.from('students').select('*');
        let classesQuery = supabase.from('classes').select('*');
        let occurrencesQuery = supabase.from('occurrences').select('*').order('created_at', { ascending: false });

        if (activeOrgId) {
          studentsQuery = studentsQuery.eq('organization_id', activeOrgId);
          classesQuery = classesQuery.eq('organization_id', activeOrgId);
          occurrencesQuery = occurrencesQuery.eq('organization_id', activeOrgId);
        }

        const [stRes, clRes, occRes] = await Promise.all([
          studentsQuery.limit(300),
          classesQuery.limit(100),
          occurrencesQuery.limit(1000)
        ]);

        const dbStudents = stRes.data || [];
        const dbClasses = clRes.data || [];
        const dbOccurrences = occRes.data || [];

        setAvailableStudents(dbStudents);
        setStudentsTotalCount(dbStudents.length);

        if (!quickStudentId && dbStudents.length > 0) {
          setQuickStudentId(dbStudents[0].id);
        }

        // Recalculate local radar list to guarantee immediate reactive UI
        const occMap: Record<string, any[]> = {};
        dbOccurrences.forEach(occ => {
          if (occ.student_id) {
            if (!occMap[occ.student_id]) occMap[occ.student_id] = [];
            occMap[occ.student_id].push(occ);
          }
        });

        const localDisciplinary: DisciplinaryStudent[] = [];
        dbStudents.forEach(st => {
          const count = (occMap[st.id] || []).length;
          // Activation rule: only if count >= 5
          if (count >= 5) {
            const colorInfo = getVolumeColorInfo(count);
            const targetClass = dbClasses.find(c => c.id === st.class_id);
            localDisciplinary.push({
              id: st.id,
              name: st.full_name || st.name || 'Estudante',
              grade: targetClass?.name || st.grade || 'Turma Cadastrada',
              occurrencesCount: count,
              level: colorInfo.name,
              colorHex: colorInfo.hex,
              levelLabel: colorInfo.label,
              registrationCode: st.registration_code || ''
            });
          }
        });

        localDisciplinary.sort((a, b) => b.occurrencesCount - a.occurrencesCount);
        setDisciplinaryList(localDisciplinary);

        // Recalculate class radar
        const targetClasses = dbClasses.length > 0 ? dbClasses : [];

        const localClassRadar: ClassRadar[] = targetClasses.map(c => {
          const classStudents = dbStudents.filter(s => s.class_id === c.id || s.grade === c.name || s.grade === c.grade);
          const classStudentIds = new Set(classStudents.map(s => s.id));
          const classOccs = dbOccurrences.filter(o => o.class_id === c.id || (o.student_id && classStudentIds.has(o.student_id)));
          const totalOccs = classOccs.length;
          const totalSts = Math.max(1, classStudents.length || 1);
          const colorInfo = getVolumeColorInfo(totalOccs);

          return {
            id: c.id,
            grade: c.name || c.grade || 'Turma',
            studentsCount: totalSts,
            occurrencesCount: totalOccs,
            occurrencesPerStudent: Number((totalOccs / totalSts).toFixed(2)),
            trendPercentage: totalOccs > 0 ? (totalOccs > 5 ? 12 : -5) : 0,
            level: colorInfo.name,
            colorHex: colorInfo.hex
          };
        });

        localClassRadar.sort((a, b) => b.occurrencesCount - a.occurrencesCount);
        setClassRadarList(localClassRadar);
      } catch (err) {
        console.warn('[Pedagogico] Supabase direct query note:', err);
      }

      // Fetch pending reports count for Central de Relatórios badge
      try {
        const { reports } = await pedagogicalReportsService.getReports({
          organizationId: activeOrgId,
          status: 'all'
        });
        const reportsList = reports || [];
        const pending = reportsList.filter(r => r.status === 'pending_review' || r.status === 'em_revisao').length;
        setPendingReportsCount(pending);
        setTotalReportsCount(reportsList.length);
      } catch (err) {
        console.warn('[Pedagogico] Error loading reports count:', err);
      }

      // Load teachers count
      try {
        let teacherQuery = supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'teacher');
        
        if (activeOrgId) {
          teacherQuery = teacherQuery.eq('organization_id', activeOrgId);
        }

        const { count } = await teacherQuery;
        if (typeof count === 'number') {
          setTeachersCount(count);
        }
      } catch (tErr) {
        console.warn('[Pedagogico] Error loading teachers count:', tErr);
      }

      // Load Activities from Supabase / Express
      try {
        setLoadingActivities(true);
        const res = await activitiesService.getActivities(activeOrgId);
        if (res.success && res.activities) {
          setActivitiesList(res.activities);
        }
      } catch (actErr) {
        console.warn('[Pedagogico] Error loading activities:', actErr);
      } finally {
        setLoadingActivities(false);
      }

      // Load Substitutions count from teacherSubstitutionsService and local boards
      try {
        let total = 0;
        let confirmed = 0;
        let pending = 0;

        try {
          const saved = localStorage.getItem(`classium_sub_boards_${activeOrgId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              total = parsed.length;
              confirmed = parsed.filter((b: any) => b.status === 'confirmada' || b.status === 'realizada').length;
              pending = parsed.filter((b: any) => b.status === 'rascunho').length;
            }
          }
        } catch (_) {}

        const subs = await teacherSubstitutionsService.getSubstitutions(activeOrgId).catch(() => []);
        if (subs && subs.length > 0) {
          const sConfirmed = subs.filter(s => s.status === 'aceita' || s.status === 'concluida').length;
          const sPending = subs.filter(s => s.status === 'pendente').length;
          total = Math.max(total, subs.length);
          confirmed = Math.max(confirmed, sConfirmed);
          pending = Math.max(pending, sPending);
        }

        setSubstitutionsSummary({ total, confirmed, pending });
      } catch (subErr) {
        console.warn('[Pedagogico] Error loading substitutions summary:', subErr);
      }

      setErrorMessage(null);
    } catch (e: any) {
      console.warn('[Pedagogico] Error loading backend data:', e);
      setErrorMessage(e?.message || 'Erro ao carregar dados pedagógicos.');
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, quickStudentId]);

  // Lifecycle Effect with Centralized Realtime & Event Subscriptions
  useEffect(() => {
    loadPedagogicoData();

    const realtimeService = RealtimeService.getInstance();
    const filter = activeOrgId ? `organization_id=eq.${activeOrgId}` : undefined;

    const unsubOccurrences = realtimeService.subscribe(
      `pedagogico_occurrences_${activeOrgId || 'global'}`,
      { table: 'occurrences', filter },
      () => loadPedagogicoData()
    );

    const unsubReports = realtimeService.subscribe(
      `pedagogico_reports_${activeOrgId || 'global'}`,
      { table: 'pedagogical_reports', filter },
      () => loadPedagogicoData()
    );

    const unsubStudents = realtimeService.subscribe(
      `pedagogico_students_${activeOrgId || 'global'}`,
      { table: 'students', filter },
      () => loadPedagogicoData()
    );

    const unsubClasses = realtimeService.subscribe(
      `pedagogico_classes_${activeOrgId || 'global'}`,
      { table: 'classes', filter },
      () => loadPedagogicoData()
    );

    const unsubActivities = realtimeService.subscribe(
      `pedagogico_activities_${activeOrgId || 'global'}`,
      { table: 'activities', filter },
      () => loadPedagogicoData()
    );

    const handleLocalSync = () => {
      loadPedagogicoData();
    };

    window.addEventListener('classium_pedagogico_updated', handleLocalSync);
    window.addEventListener('classium_occurrences_updated', handleLocalSync);
    window.addEventListener('classium_reports_updated', handleLocalSync);
    window.addEventListener('classium_activities_updated', handleLocalSync);
    window.addEventListener('classium_substitutions_updated', handleLocalSync);

    return () => {
      unsubOccurrences();
      unsubReports();
      unsubStudents();
      unsubClasses();
      unsubActivities();
      window.removeEventListener('classium_pedagogico_updated', handleLocalSync);
      window.removeEventListener('classium_occurrences_updated', handleLocalSync);
      window.removeEventListener('classium_reports_updated', handleLocalSync);
      window.removeEventListener('classium_activities_updated', handleLocalSync);
      window.removeEventListener('classium_substitutions_updated', handleLocalSync);
    };
  }, [activeOrgId, loadPedagogicoData]);

  // Backend action for Radar Student Action
  const handleConfirmRadarAction = async (studentId: string, actionType: string, title?: string) => {
    try {
      // 1. Service direct insert / RPC
      await conductRoutineRadarService.saveStudentPedagogicalAction(
        studentId,
        (actionType === 'reuniao' ? 'reuniao' : actionType === 'intervencao' ? 'intervencao' : 'conversa'),
        title || 'Ação de intervenção pedagógica registrada pela coordenação'
      );

      // 2. REST API endpoint
      try {
        await fetch('/api/pedagogico/radar/action', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-organization-id': activeOrgId || ''
          },
          body: JSON.stringify({ studentId, actionType, title, organization_id: activeOrgId })
        });
      } catch (apiErr) {
        console.warn('API action note:', apiErr);
      }

      setSuccessMessage('Intervenção pedagógica salva com sucesso no dossiê do estudante!');
      setTimeout(() => setSuccessMessage(null), 4000);
      loadPedagogicoData();
    } catch (e) {
      console.error(e);
      setErrorMessage('Erro ao salvar intervenção.');
    }
    setRadarActionModal(null);
  };

  // Backend action for Collective Intervention Project
  const handleSaveCollectiveProject = async (grade: string) => {
    if (!projectTitle.trim()) return;
    try {
      const targetClass = classRadarList.find(c => c.grade === grade);

      // 1. Service direct insert
      if (targetClass?.id) {
        await conductRoutineRadarService.saveClassInterventionProject(
          targetClass.id,
          projectTitle,
          projectGoal,
          projectStrategy
        );
      }

      // 2. REST API endpoint
      try {
        await fetch('/api/pedagogico/radar/collective', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-organization-id': activeOrgId || ''
          },
          body: JSON.stringify({ grade, projectTitle, projectGoal, projectStrategy, organization_id: activeOrgId })
        });
      } catch (apiErr) {
        console.warn('API collective note:', apiErr);
      }

      setSuccessMessage(`Projeto de convivência para a turma ${grade} ativado com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadPedagogicoData();
    } catch (e) {
      console.error(e);
      setErrorMessage('Erro ao ativar projeto de convivência.');
    }
    setCollectiveInterventionModal(null);
    setProjectTitle('');
    setProjectGoal('');
    setProjectStrategy('');
  };

  // Lançar Ocorrência Direta para Teste do Radar & Ponte Tripla
  const handleLaunchQuickOccurrence = async () => {
    if (!quickStudentId) {
      setErrorMessage('Selecione um estudante para registrar a ocorrência.');
      return;
    }

    try {
      setLoading(true);
      const targetStudent = availableStudents.find(s => s.id === quickStudentId);
      const idempotencyKey = `quick_occ_${quickStudentId}_${Date.now()}`;
      const recordType = quickSeverity === 'gravissima' ? 'gravissima' : quickSeverity === 'media' ? 'media' : 'leve';

      // 1. Atomic RPC execution via conductRoutineRadarService
      await conductRoutineRadarService.recordOccurrence({
        studentId: quickStudentId,
        classId: targetStudent?.class_id,
        recordType: recordType as any,
        title: `Registro Disciplinar (${quickSeverity.toUpperCase()})`,
        description: quickDescription,
        actionsTaken: 'Lançamento efetuado via Painel Gestor Pedagógico',
        occurrenceDate: new Date().toISOString().split('T')[0],
        quarter: 1,
        year: 2026,
        recordedByName: 'Gestor(a) Pedagógico(a)',
        idempotencyKey
      });

      // 2. Call REST API endpoint
      try {
        await fetch('/api/pedagogical/radar/occurrences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-organization-id': activeOrgId },
          body: JSON.stringify({
            student_id: quickStudentId,
            reporter_name: 'Gestor Pedagógico',
            title: `Advertência Disciplinar - ${targetStudent?.full_name || 'Estudante'}`,
            description: quickDescription,
            gravity: quickSeverity,
            date: new Date().toISOString().split('T')[0],
            status: 'registrada'
          })
        });
      } catch (apiErr) {
        console.warn('API quick occ note:', apiErr);
      }

      setSuccessMessage(`Ocorrência registrada com sucesso para ${targetStudent?.full_name || 'o estudante'}! Notificação enviada à Família e Radar atualizado.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setQuickOccurrenceModal(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('classium_occurrences_updated', { detail: { studentId: quickStudentId } }));
        window.dispatchEvent(new CustomEvent('classium_pedagogico_updated'));
      }

      loadPedagogicoData();
    } catch (err: any) {
      console.error('Erro ao lançar ocorrência:', err);
      setErrorMessage(err.message || 'Erro ao registrar ocorrência.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Calculated Metrics for Main Dashboard
  const radarCriticalCount = useMemo(() => {
    return disciplinaryList.length;
  }, [disciplinaryList]);

  return (
    <div className="space-y-6 text-left animate-fade-in pb-12 font-sans">
      
      {/* CABEÇALHO UNIFICADO COM SAUDAÇÃO E STATUS MULTI-TENANT */}
      <ModuleHeader
        icon={BookOpen}
        moduleTag="CENTRAL DA GESTÃO PEDAGÓGICA • CLASSIUM"
        title={getGreeting()}
        description="Convivência, faltas, relatórios, atividades e substituições de professores em um só lugar."
        variant="gestor"
        actionButtons={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickOccurrenceModal(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)] transition-all hover:-translate-y-px"
              style={{ background: 'var(--sidebar-active-bg)', color: 'var(--sidebar-active-fg)' }}
              title="Registrar uma ocorrência"
            >
              <PlusCircle className="w-4 h-4 " />
              <span className="hidden sm:inline">Nova ocorrência</span>
            </button>

            <button
              onClick={() => loadPedagogicoData()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border transition-all hover:brightness-110"
              style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg-hover)', color: 'var(--sidebar-fg)' }}
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* FEEDBACK MESSAGES */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* NAVEGAÇÃO DE SUB-ABAS PEDAGÓGICAS (PILLS) */}
      <ModulePills
        tabs={[
          { id: 'home', label: 'Painel Geral', icon: Sparkles },
          { 
            id: 'radar', 
            label: 'Radar Disciplinar', 
            icon: Activity, 
            badge: radarCriticalCount > 0 ? `${radarCriticalCount} no Radar` : null, 
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' 
          },
          {
            id: 'radar-frequencia',
            label: 'Radar de Faltas e Ausências',
            icon: CalendarDays,
            badge: 'Assiduidade',
            badgeColor: 'bg-[var(--accent-soft)] text-[var(--text-heading)] border-[var(--border)]'
          },
          { 
            id: 'relatorios', 
            label: 'Central de Relatórios', 
            icon: FileText, 
            badge: pendingReportsCount > 0 ? `${pendingReportsCount} Pendentes` : `${totalReportsCount} Registrados`, 
            badgeColor: pendingReportsCount > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-[var(--bg-card-alt)] text-[var(--text-body)] border-[var(--border)]' 
          },
          {
            id: 'atividades',
            label: 'Atividades e Provas',
            icon: BookOpen,
            badge: activitiesList.length > 0 ? `${activitiesList.length} Cadastradas` : null,
            badgeColor: 'bg-[var(--accent-soft)] text-[var(--text-heading)] border-[var(--border)]'
          },
          {
            id: 'substituicoes',
            label: 'Substituição de Professores',
            icon: Users,
            badge: substitutionsSummary.total > 0 ? `${substitutionsSummary.total} ${substitutionsSummary.total === 1 ? 'Quadro' : 'Quadros'}` : 'Cobertura',
            badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300'
          }
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* ========================================================= */}
      {/* ABA 1:  PAINEL GERAL (CARDS DE RESUMO E ACESSO RÁPIDO)   */}
      {/* ========================================================= */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          
          {/* CARDS DE DESTAQUE PEDAGÓGICO (5 ÁREAS PRINCIPAIS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <CategoryCard
              title="Radar Disciplinar"
              description="Classificação por volume de advertências (5+), escala gradual de cores e índice integrado por turma."
              tag="MÓDULO ATIVO"
              icon={Activity}
              categoryColor="amber"
              metricLabel="Estudantes no Radar"
              statusBadge={`${disciplinaryList.length} Estudantes`}
              onClick={() => setActiveTab('radar')}
              showChevron
            />

            <CategoryCard
              title="Radar de Faltas e Ausências"
              description="Monitoramento preventivo de assiduidade nos marcos de 16, 32, 48 e 54 faltas com busca ativa."
              tag="ASSIDUIDADE ESCOLAR"
              icon={CalendarDays}
              categoryColor="blue"
              metricLabel="Acompanhamento Ativo"
              statusBadge="Marcos 16 • 32 • 48 • 54"
              onClick={() => setActiveTab('radar-frequencia')}
              showChevron
            />

            <CategoryCard
              title="Central de Relatórios"
              description="Documentos oficiais com acompanhamento e fluxo completo de 'Revisar & Homologar' tripartite."
              tag="HOMOLOGAÇÃO OFICIAL"
              icon={FileText}
              categoryColor="emerald"
              metricLabel="Status de Homologação"
              statusBadge={`${pendingReportsCount} Pendentes • ${Math.max(0, totalReportsCount - pendingReportsCount)} Homologados`}
              onClick={() => setActiveTab('relatorios')}
              showChevron
            />

            <CategoryCard
              title="Atividades e Provas"
              description="Repositório institucional de atividades geradas no Classium Studio com alinhamento BNCC e exportação."
              tag="CLASSIUM STUDIO"
              icon={BookOpen}
              categoryColor="indigo"
              metricLabel="Atividades no Supabase"
              statusBadge={`${activitiesList.filter(a => a.status === 'published').length} Publicadas • ${activitiesList.filter(a => a.status === 'draft').length} Rascunhos`}
              onClick={() => setActiveTab('atividades')}
              showChevron
            />

            <CategoryCard
              title="Substituição de Professores"
              description="Gestão unificada de disponibilidade docente, projetos, aulas residuais e quadros de substituição."
              tag="COBERTURA DE AULAS"
              icon={Users}
              categoryColor="cyan"
              metricLabel="Quadros de Substituição"
              statusBadge={
                substitutionsSummary.total > 0
                  ? `${substitutionsSummary.confirmed} Confirmados • ${substitutionsSummary.pending} Pendentes`
                  : 'Nenhum Quadro Ativo'
              }
              onClick={() => setActiveTab('substituicoes')}
              showChevron
            />
          </div>

          {/* PAINEL DE VISÃO GERAL DAS ESCALAS DO RADAR */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-heading)] mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-[var(--text-heading)]" />
              Escala Oficial de Cores por Volume Acumulado de Advertências (Radar do Gestor)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="font-mono font-semibold text-emerald-800 text-sm">1 a 5</div>
                <div className="text-[11px] text-emerald-900 font-bold mt-0.5">Verde (#16A34A)</div>
                <div className="text-[10px] text-[var(--text-body)] mt-1">Ativa no Radar na 5ª advertência</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="font-mono font-semibold text-amber-800 text-sm">6 a 10</div>
                <div className="text-[11px] text-amber-900 font-bold mt-0.5">Amarelo (#D97706)</div>
                <div className="text-[10px] text-[var(--text-body)] mt-1">Atenção Moderada</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200">
                <div className="font-mono font-semibold text-orange-800 text-sm">11 a 15</div>
                <div className="text-[11px] text-orange-900 font-bold mt-0.5">Laranja (#EA580C)</div>
                <div className="text-[10px] text-[var(--text-body)] mt-1">Alerta Disciplinar</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                <div className="font-mono font-semibold text-rose-800 text-sm">16 a 20</div>
                <div className="text-[11px] text-rose-900 font-bold mt-0.5">Vermelho (#DC2626)</div>
                <div className="text-[10px] text-[var(--text-body)] mt-1">Crítico / Urgente</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
                <div className="font-mono font-semibold text-purple-800 text-sm">&gt; 20</div>
                <div className="text-[11px] text-purple-900 font-bold mt-0.5">Roxo (#7C3AED)</div>
                <div className="text-[10px] text-[var(--text-body)] mt-1">Atenção Máxima</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 5:  SUBSTITUIÇÕES DE PROFESSORES                      */}
      {/* ========================================================= */}
      {activeTab === 'substituicoes' && (
        <TeacherSubstitutionsTab organizationId={activeOrgId} />
      )}

      {/* ========================================================= */}
      {/* ABA 2:  RADAR PEDAGÓGICO & CONVIVÊNCIA                   */}
      {/* ========================================================= */}
      {activeTab === 'radar' && (
        <div className="space-y-6">
          
          {/* HEADER INFORMATIVO DO RADAR */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-2xl md:rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-xl text-[var(--text-heading)] flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" />
                Radar Disciplinar por Volume & Convivência das Turmas
              </h3>
              <p className="text-xs text-[var(--text-body)] max-w-3xl">
                Monitoramento proativo do Diário de Bordo. Os estudantes só são ativados no radar a partir da 5ª advertência acumulada no trimestre, com classificação automática de cor por volume acumulado.
              </p>
            </div>

            <button
              onClick={() => setQuickOccurrenceModal(true)}
              className="px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4 " />
              <span>Simular Lançamento Docente</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* BLOCO 1: ESTUDANTES NO RADAR DISCIPLINAR (VOLUME >= 5) */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-heading)] flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>Estudantes no Radar Disciplinar</span>
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">Regra de ativação: a partir de 5 advertências</span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${disciplinaryList.length > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-[var(--bg-card-alt)] text-[var(--text-body)] border-[var(--border)]'}`}>
                  {disciplinaryList.length} Ativo{disciplinaryList.length === 1 ? '' : 's'}
                </span>
              </div>

              {disciplinaryList.length === 0 ? (
                <div className="p-8 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-xs text-[var(--text-heading)] block">Nenhum estudante atingiu o limiar de atenção</strong>
                    <p className="text-[11px] text-[var(--text-body)] max-w-sm mx-auto">
                      Ativação no radar ocorre a partir da 5ª advertência acumulada no trimestre.
                    </p>
                  </div>
                  <button
                    onClick={() => setQuickOccurrenceModal(true)}
                    className="mt-2 px-3.5 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] text-[var(--text-heading)] text-[11px] font-bold rounded-xl border border-[var(--border)] shadow-sm cursor-pointer"
                  >
                    + Lançar Advertência para Teste
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {disciplinaryList.map((s) => {
                    const colorInfo = getVolumeColorInfo(s.occurrencesCount);
                    return (
                      <div 
                        key={s.id} 
                        className={`p-4 rounded-2xl border transition-all ${colorInfo.bgClass} ${colorInfo.borderClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorInfo.dotClass} animate-pulse`} />
                            <strong className="text-sm text-[var(--text-heading)]">{s.name}</strong>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-body)]">
                            <span className="font-bold text-[var(--text-heading)]">Turma: {s.grade}</span>
                            {s.registrationCode && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] text-[var(--text-muted)]">{s.registrationCode}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`px-3 py-1 rounded-xl font-mono text-xs font-bold border ${colorInfo.badgeClass}`}>
                            {s.occurrencesCount} Advertências
                          </div>
                          <button
                            onClick={() => setRadarActionModal({ type: 'intervencao', student: s })}
                            className="px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
                          >
                            Intervenção
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BLOCO 2: ÍNDICE DE CONVIVÊNCIA DAS TURMAS */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl md:rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-heading)] flex items-center gap-2">
                    <School className="w-4 h-4 text-[var(--text-heading)]" />
                    <span>Índice de Convivência das Turmas</span>
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">Agregação em tempo real por turma</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-[var(--bg-card-alt)] text-[var(--text-body)] border border-[var(--border)]">
                  {classRadarList.length} Turmas
                </span>
              </div>

              {classRadarList.length === 0 ? (
                <div className="p-8 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-2xl text-center space-y-2">
                  <School className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                  <p className="text-xs text-[var(--text-muted)]">Nenhum registro de turmas no sistema.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classRadarList.map((cr, idx) => {
                    const colorInfo = getVolumeColorInfo(cr.occurrencesCount);
                    return (
                      <div 
                        key={cr.id || idx} 
                        className="p-4 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--border)] transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[var(--text-heading)] bg-[var(--bg-card)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                              #{idx + 1}
                            </span>
                            <strong className="text-sm text-[var(--text-heading)]">{cr.grade}</strong>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-body)] font-mono">
                            <span>{cr.studentsCount} Estudantes</span>
                            <span>•</span>
                            <span>Média: <strong>{cr.occurrencesPerStudent}</strong> adv/estudante</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${colorInfo.badgeClass}`}>
                            {cr.occurrencesCount} {cr.occurrencesCount === 1 ? 'Advertência' : 'Advertências'}
                          </span>
                          <button
                            onClick={() => setCollectiveInterventionModal(cr)}
                            className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold cursor-pointer transition-all"
                          >
                            Projeto Coletivo
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* ABA:  RADAR DE FALTAS E AUSÊNCIAS (FREQUÊNCIA ESCOLAR)   */}
      {/* ========================================================= */}
      {activeTab === 'radar-frequencia' && (
        <PedagogicalAbsenceRadarTab 
          organizationId={activeOrgId} 
          academicYear={2026}
        />
      )}

      {/* ========================================================= */}
      {/* ABA 3:  CENTRAL DE RELATÓRIOS & PARECERES PEDAGÓGICOS   */}
      {/* ========================================================= */}
      {activeTab === 'relatorios' && (
        <PedagogaReportsCenter
          organizationId={activeOrgId}
          currentUser={currentUser}
          profile={profile}
        />
      )}

      {/* ========================================================= */}
      {/* ABA 4:  BANCO DE ATIVIDADES & PROVAS (CLASSIUM STUDIO)  */}
      {/* ========================================================= */}
      {activeTab === 'atividades' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          {/* CARDS DE RESUMO DE ATIVIDADES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm flex items-center gap-3">
              <div className="p-3 bg-[var(--accent-soft)] text-[var(--accent)] rounded-xl border border-[var(--border)]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Total de Atividades</span>
                <span className="text-xl font-bold font-mono text-[var(--text-heading)]">{activitiesList.length}</span>
              </div>
            </div>

            <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Publicadas & Ativas</span>
                <span className="text-xl font-bold font-mono text-emerald-800">
                  {activitiesList.filter(a => a.status === 'published').length}
                </span>
              </div>
            </div>

            <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Rascunhos em Edição</span>
                <span className="text-xl font-bold font-mono text-amber-800">
                  {activitiesList.filter(a => a.status === 'draft').length}
                </span>
              </div>
            </div>

            <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm flex items-center gap-3">
              <div className="p-3 bg-[var(--accent-soft)] text-[var(--accent)] rounded-xl border border-[var(--border)]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Disciplinas Cobertas</span>
                <span className="text-xl font-bold font-mono text-[var(--text-heading)]">
                  {new Set(activitiesList.map(a => a.subject).filter(Boolean)).size}
                </span>
              </div>
            </div>
          </div>

          {/* BARRA DE BUSCA E FILTROS */}
          <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por título, tema, disciplina ou código BNCC..."
                value={activityFilter.search}
                onChange={(e) => setActivityFilter(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-heading)] placeholder-slate-400 outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-card)]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Status:</span>
              {(['all', 'published', 'draft'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setActivityFilter(prev => ({ ...prev, status: st }))}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    activityFilter.status === st
                      ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
                      : 'bg-[var(--bg-card-alt)] text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]'
                  }`}
                >
                  {st === 'all' ? 'Todas' : st === 'published' ? 'Publicadas' : 'Rascunhos'}
                </button>
              ))}

              <button
                type="button"
                onClick={() => loadPedagogicoData()}
                className="p-1.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ml-2"
                title="Atualizar lista do Supabase em tempo real"
              >
                <RefreshCw className={`w-4 h-4 ${loadingActivities ? 'animate-spin text-[var(--accent)]' : ''}`} />
              </button>
            </div>
          </div>

          {/* GRID DE ATIVIDADES CADASTRADAS */}
          {loadingActivities ? (
            <div className="py-16 text-center text-[var(--text-muted)] space-y-2 bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] shadow-sm">
              <RefreshCw className="w-7 h-7 animate-spin text-[var(--accent)] mx-auto" />
              <p className="text-xs font-medium">Carregando repositório de atividades pedagógicas do Supabase...</p>
            </div>
          ) : activitiesList.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-muted)] space-y-3 bg-[var(--bg-card)] rounded-3xl border border-[var(--border)] shadow-sm p-6">
              <BookOpen className="w-12 h-12 text-[var(--text-body)] mx-auto" />
              <h4 className="text-sm font-bold text-[var(--text-heading)]">Nenhuma atividade pedagógica localizada</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                As atividades geradas pelos docentes no Portal Docente (Classium Studio) serão sincronizadas automaticamente com o Supabase e exibidas aqui para acompanhamento pedagógico institucional.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activitiesList
                .filter(act => {
                  const matchSearch = !activityFilter.search ||
                    act.title.toLowerCase().includes(activityFilter.search.toLowerCase()) ||
                    act.subject.toLowerCase().includes(activityFilter.search.toLowerCase()) ||
                    act.topic.toLowerCase().includes(activityFilter.search.toLowerCase()) ||
                    (act.bncc_code && act.bncc_code.toLowerCase().includes(activityFilter.search.toLowerCase()));
                  const matchStatus = activityFilter.status === 'all' || act.status === activityFilter.status;
                  return matchSearch && matchStatus;
                })
                .map(act => (
                  <div
                    key={act.id}
                    className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 text-left"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                          act.status === 'published'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {act.status === 'published' ? ' Publicada' : ' Rascunho'}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                          {act.subject}
                        </span>
                        <span className="text-[10px] text-[var(--text-body)] bg-[var(--bg-card-alt)] px-2 py-0.5 rounded-md">
                          {act.grade}
                        </span>
                      </div>

                      <h4 className="text-sm font-serif font-bold text-[var(--text-heading)] leading-snug">
                        {act.title}
                      </h4>

                      {act.topic && (
                        <p className="text-xs text-[var(--text-body)] line-clamp-2 leading-relaxed">
                          <strong>Tema:</strong> {act.topic}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                        {act.bncc_code && (
                          <span className="font-mono bg-[var(--bg-card-alt)] text-[var(--text-body)] px-1.5 py-0.5 rounded font-bold">
                            {act.bncc_code}
                          </span>
                        )}
                        <span>•</span>
                        <span>{act.question_count || 4} Questões</span>
                        <span>•</span>
                        <span>{act.difficulty || 'Médio'}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                      <span className="text-[9px] text-[var(--text-muted)]">
                        {new Date(act.updated_at).toLocaleDateString('pt-BR')}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (act.document_payload) {
                              exportToWord(act.document_payload, true);
                            } else {
                              alert('Payload estruturado indisponível para exportação direta.');
                            }
                          }}
                          className="p-1.5 text-[var(--text-body)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-colors cursor-pointer"
                          title="Exportar documento Word (.docx)"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedActivityPreview(act)}
                          className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspecionar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* MODAL DE INSPEÇÃO & VISUALIZAÇÃO DETALHADA DA ATIVIDADE */}
          {selectedActivityPreview && (
            <div className="fixed inset-0 z-50 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in no-print">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] overflow-hidden text-left">
                {/* Modal Header */}
                <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-card-alt)] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                        selectedActivityPreview.status === 'published'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {selectedActivityPreview.status === 'published' ? ' Publicada' : ' Rascunho'}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-heading)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md">
                        {selectedActivityPreview.subject} • {selectedActivityPreview.grade}
                      </span>
                      {selectedActivityPreview.bncc_code && (
                        <span className="text-[10px] font-mono bg-[var(--bg-card-alt)] text-[var(--text-heading)] px-2 py-0.5 rounded font-bold">
                          BNCC: {selectedActivityPreview.bncc_code}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[var(--text-heading)] leading-snug">
                      {selectedActivityPreview.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedActivityPreview(null)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--bg-card-alt)] rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub-header Controls */}
                <div className="p-3.5 bg-[var(--bg-card-alt)] border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase text-[var(--text-body)]">Visualização:</span>
                    <button
                      type="button"
                      onClick={() => setPreviewAnswerKey(true)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        previewAnswerKey
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
                          : 'bg-[var(--bg-card)] text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]'
                      }`}
                    >
                      Modo Gestor / Docente (com Gabarito)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewAnswerKey(false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !previewAnswerKey
                          ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
                          : 'bg-[var(--bg-card)] text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]'
                      }`}
                    >
                      Modo Aluno (Gabarito Oculto)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedActivityPreview.document_payload) {
                          exportToWord(selectedActivityPreview.document_payload, previewAnswerKey);
                        } else {
                          alert('Payload não estruturado.');
                        }
                      }}
                      className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-card-alt)] text-[var(--text-heading)] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Baixar Word (.docx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Imprimir / PDF</span>
                    </button>
                  </div>
                </div>

                {/* Document Body Inspector */}
                <div className="p-6 overflow-y-auto max-h-[65vh] space-y-6 custom-scrollbar bg-[var(--bg-card-alt)]">
                  {/* Institutional Header Mockup */}
                  <div className="p-4 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                      <div className="font-bold uppercase tracking-wider text-[var(--text-heading)]">
                        {selectedActivityPreview.header_data?.schoolName || "Colégio Modelo de Educação Integral"}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-body)]">
                        Data: {new Date(selectedActivityPreview.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-[var(--text-heading)]">
                      <div><strong>Disciplina:</strong> {selectedActivityPreview.subject}</div>
                      <div><strong>Ano/Turma:</strong> {selectedActivityPreview.grade}</div>
                      <div><strong>Dificuldade:</strong> {selectedActivityPreview.difficulty}</div>
                      <div><strong>Tempo Estimado:</strong> {selectedActivityPreview.estimated_time_minutes || 45} min</div>
                    </div>
                  </div>

                  {/* Instructions */}
                  {selectedActivityPreview.instructions && (
                    <div className="p-3 bg-[var(--accent-soft)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-heading)] font-medium">
                      <strong>Instruções Pedagógicas:</strong> {selectedActivityPreview.instructions}
                    </div>
                  )}

                  {/* Questions List */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-body)]">
                      Questões & Itens Avaliativos ({selectedActivityPreview.question_count || selectedActivityPreview.document_payload?.questions?.length || 4} itens)
                    </h4>

                    {selectedActivityPreview.document_payload?.questions ? (
                      selectedActivityPreview.document_payload.questions.map((q, idx) => (
                        <div key={idx} className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[var(--text-heading)]">
                              Questão {idx + 1} • <span className="font-normal text-[var(--text-body)]">{q.type}</span>
                            </span>
                            <span className="text-[10px] bg-[var(--bg-card-alt)] text-[var(--text-body)] px-2 py-0.5 rounded font-mono">
                              Nível: {q.difficulty || selectedActivityPreview.difficulty}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--text-heading)] font-medium leading-relaxed">
                            {q.text}
                          </p>

                          {q.imageUrl && (
                            <div className="my-2 p-2 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl max-w-sm">
                              <img src={q.imageUrl} alt="Ilustração" className="rounded-lg max-h-40 w-auto mx-auto object-cover" />
                              {q.imageCaption && (
                                <p className="text-[10px] text-[var(--text-muted)] text-center italic mt-1">{q.imageCaption}</p>
                              )}
                            </div>
                          )}

                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 gap-1.5 pl-2 my-2 text-xs">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-2 text-[var(--text-body)]">
                                  <span className="w-5 h-5 rounded-full border border-[var(--border)] bg-[var(--bg-card-alt)] text-[10px] font-bold flex items-center justify-center shrink-0 font-mono">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {previewAnswerKey && q.answer && (
                            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] font-mono mt-2">
                              <strong className="block text-emerald-950 uppercase text-[9px]">Gabarito de Referência / Critério Avaliativo:</strong>
                              {q.answer}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] text-xs text-[var(--text-body)]">
                        {selectedActivityPreview.context || "Questões estruturadas na base de dados."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-[var(--bg-card-alt)] border-t border-[var(--border)] flex justify-between items-center text-xs text-[var(--text-body)]">
                  <span className="text-[11px]">ID da Atividade: <code className="font-mono text-[var(--text-heading)]">{selectedActivityPreview.id}</code></span>
                  <button
                    type="button"
                    onClick={() => setSelectedActivityPreview(null)}
                    className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] text-[var(--text-heading)] font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                  >
                    Fechar Visualização
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: LANÇAMENTO RÁPIDO DE OCORRÊNCIA (TESTE TRIPLO)      */}
      {/* ========================================================= */}
      {quickOccurrenceModal && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 space-y-4 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-serif font-bold text-[var(--text-heading)] text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Simular Lançamento no Diário de Bordo</span>
              </h3>
              <button onClick={() => setQuickOccurrenceModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-body)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-body)]">
              Teste da Ponte Tripla Docente ↔ Gestor ↔ Família: ao registrar, a ocorrência entrará no Supabase e acionará o Realtime para o Portal Família e para o Radar Disciplinar do Gestor.
            </p>

            <div className="space-y-3 text-xs text-[var(--text-body)]">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-body)] mb-1">Selecione o Estudante</label>
                <select
                  value={quickStudentId}
                  onChange={(e) => setQuickStudentId(e.target.value)}
                  className="w-full p-2.5 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
                >
                  {availableStudents.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.full_name || st.name} ({st.grade || 'Turma Cadastrada'}) - {st.registration_code || 'RA'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-body)] mb-1">Gravidade da Ocorrência (Radar da Família)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'leve', label: 'Leve (-0.5 pts)' },
                    { id: 'media', label: 'Média (-1.0 pts)' },
                    { id: 'grave', label: 'Grave (-1.5 pts)' },
                    { id: 'gravissima', label: 'Gravíssima (-2.0 pts)' }
                  ].map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setQuickSeverity(g.id as any)}
                      className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all cursor-pointer ${
                        quickSeverity === g.id
                          ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)] font-extrabold shadow-sm'
                          : 'bg-[var(--bg-card-alt)] border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--bg-card-alt)]'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-body)] mb-1">Relato Descritivo da Conduta</label>
                <textarea 
                  value={quickDescription} 
                  onChange={(e) => setQuickDescription(e.target.value)} 
                  placeholder="Descreva detalhadamente a ocorrência..."
                  className="w-full p-2.5 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl text-[var(--text-heading)] outline-none h-20 placeholder:text-[var(--text-muted)] text-xs focus:border-[var(--accent)]" 
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button onClick={() => setQuickOccurrenceModal(false)} className="px-4 py-2 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] rounded-xl text-xs font-semibold cursor-pointer">
                Cancelar
              </button>
              <button 
                onClick={handleLaunchQuickOccurrence}
                disabled={loading}
                className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-extrabold rounded-xl text-xs cursor-pointer transition-all shadow-sm flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 " />}
                <span>Registrar no Diário & Supabase</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AÇÃO DO RADAR PEDAGÓGICO                           */}
      {/* ========================================================= */}
      {radarActionModal && radarActionModal.student && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 space-y-4 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-serif font-bold text-[var(--text-heading)] text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" />
                Registrar Intervenção Pedagógica
              </h3>
              <button onClick={() => setRadarActionModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-body)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--text-body)]">
              <p><strong>Estudante:</strong> {radarActionModal.student?.name || 'Estudante'} ({radarActionModal.student?.grade || ''})</p>
              <p><strong>Volume Acumulado:</strong> <strong className="text-amber-800">{radarActionModal.student?.occurrencesCount || 0} advertências</strong></p>
              
              <div className="p-3 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl space-y-2">
                <label className="block text-[10px] font-bold uppercase text-[var(--text-body)]">Observações pedagógicas / Encaminhamento</label>
                <textarea 
                  placeholder="Descreva os encaminhamentos definidos para o estudante..." 
                  className="w-full p-2 bg-[var(--bg-card)] border border-[var(--border)] rounded text-xs text-[var(--text-heading)] outline-none h-20 focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button onClick={() => setRadarActionModal(null)} className="px-4 py-2 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] rounded-xl text-xs font-semibold cursor-pointer">Cancelar</button>
              <button 
                onClick={() => handleConfirmRadarAction(radarActionModal.student.id, radarActionModal.type)} 
                className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-extrabold rounded-xl text-xs cursor-pointer shadow-sm"
              >
                Salvar Intervenção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PROJETO DE CONVIVÊNCIA DA TURMA                    */}
      {/* ========================================================= */}
      {collectiveInterventionModal && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-card-alt)] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 space-y-4 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-serif font-bold text-[var(--text-heading)] text-base flex items-center gap-2">
                <School className="w-5 h-5 text-[var(--text-heading)]" />
                Criar Projeto de Convivência ({collectiveInterventionModal.grade})
              </h3>
              <button onClick={() => setCollectiveInterventionModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-body)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--text-body)]">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-body)] mb-1">Título do Projeto</label>
                <input 
                  type="text" 
                  value={projectTitle} 
                  onChange={(e) => setProjectTitle(e.target.value)} 
                  placeholder="ex: Projeto Convivência & Respeito Mútuo" 
                  className="w-full p-2.5 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl text-[var(--text-heading)] outline-none focus:border-[var(--accent)]" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-body)] mb-1">Objetivo Geral</label>
                <textarea 
                  value={projectGoal} 
                  onChange={(e) => setProjectGoal(e.target.value)} 
                  placeholder="Descreva o objetivo da intervenção pedagógica coletiva..." 
                  className="w-full p-2.5 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl text-[var(--text-heading)] outline-none h-16 focus:border-[var(--accent)]" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--text-body)] mb-1">Estratégias Pedagógicas</label>
                <textarea 
                  value={projectStrategy} 
                  onChange={(e) => setProjectStrategy(e.target.value)} 
                  placeholder="Roda de conversa, atividades em grupo, presença psicopedagógica..." 
                  className="w-full p-2.5 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl text-[var(--text-heading)] outline-none h-16 focus:border-[var(--accent)]" 
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button onClick={() => setCollectiveInterventionModal(null)} className="px-4 py-2 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] rounded-xl text-xs font-semibold cursor-pointer">Cancelar</button>
              <button 
                onClick={() => handleSaveCollectiveProject(collectiveInterventionModal.grade)} 
                className="px-5 py-2 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--accent-fg)] font-extrabold rounded-xl text-xs cursor-pointer shadow-sm"
              >
                Ativar Projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER INFORMATIVO MULTI-TENANT */}
      <SyncStatusBar
        text="Sincronização em Tempo Real Ativa com a Nuvem Segura e Diário Oficial. Isolamento de Tenant Ativo."
        badgeText=" Sincronizado ao Supabase"
        onRefresh={() => loadPedagogicoData()}
        isLoading={loading}
      />

    </div>
  );
}