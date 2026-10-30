import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Send,
  Activity, AlertCircle, Volume2, VolumeX,
  Check, X, ShieldAlert, ShieldCheck,
  AlertOctagon, Loader2, Calendar, Scale,
  BookOpen, ArrowRight, Info
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import { supabase } from '../../lib/supabase';
import { 
  playInfractionSound, 
  playNotificationChime, 
  isAudioMuted, 
  setAudioMuted 
} from '../../utils/audioNotification';
import { conductRoutineRadarService } from '../../services/conductRoutineRadarService';
import { FamilyAttendanceFrequencyPanel } from './FamilyAttendanceFrequencyPanel';

export type InfractionLevel = 'leve' | 'media' | 'gravissima';

export interface ConductRecord {
  id: string;
  student_id: string;
  recorded_by_name?: string;
  record_type: InfractionLevel;
  title: string;
  description: string;
  recorded_at: string;
  signed_by_parent?: boolean;
  parent_notes?: string;
  signature_date?: string;
  points_deducted: number;
}

export interface MilestoneNotification {
  id: string;
  milestone: number;
  title: string;
  message: string;
  level: 'atencao' | 'alerta' | 'critico';
  created_at: string;
}

export interface QuarterlyScore {
  base_points: number;
  points_lost: number;
  current_balance: number;
  milestone_10: boolean;
  milestone_15: boolean;
  milestone_20: boolean;
  notifications: MilestoneNotification[];
}

export function RoutineRadarTab() {
  const { student, students, activeStudentId, currentUser, familyStudents } = usePlatform();

  const [soundEnabled, setSoundEnabled] = useState<boolean>(!isAudioMuted());
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [filterLevel, setFilterLevel] = useState<'all' | InfractionLevel>('all');
  const [filterSignature, setFilterSignature] = useState<'all' | 'pending' | 'signed'>('all');

  // Selected Student
  const currentStudent = familyStudents?.find(s => s.id === activeStudentId) || students?.find(s => s.id === activeStudentId) || student || familyStudents?.[0] || {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Roberth Henrique Alves',
    grade: '7º Ano A',
    matricula: '2026-7A-042',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'
  };

  const selectedStudentId = currentStudent?.id || '00000000-0000-0000-0000-000000000001';

  // Quarterly Points State (starting base 20.0, loss 0.0)
  const [quarterlyScore, setQuarterlyScore] = useState<QuarterlyScore>({
    base_points: 20.0,
    points_lost: 0.0,
    current_balance: 20.0,
    milestone_10: false,
    milestone_15: false,
    milestone_20: false,
    notifications: []
  });

  // Diário de Bordo Conduct Records State
  const [conductList, setConductList] = useState<ConductRecord[]>([]);

  // Modals & Interaction
  const [activeConductModal, setActiveConductModal] = useState<ConductRecord | null>(null);
  const [parentNotesInput, setParentNotesInput] = useState<string>('');
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState<boolean>(false);

  // Sound toggle handler
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setAudioMuted(!nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      playInfractionSound('leve');
    }
  };

  // Helper to normalize infraction level
  const normalizeInfractionLevel = (raw: string | undefined): InfractionLevel => {
    const str = (raw || '').toLowerCase().trim();
    if (str.includes('grav') || str.includes('red') || str === 'high') return 'gravissima';
    if (str.includes('leve') || str.includes('green') || str.includes('elogio') || str === 'low') return 'leve';
    return 'media';
  };

  // Helper to get deduction points based on infraction level:
  // Leve: 0,5 ponto | Média: 1,0 ponto | Gravíssima: 2,0 pontos
  const getDeductionPoints = (level: InfractionLevel): number => {
    switch (level) {
      case 'gravissima': return 2.0;
      case 'media': return 1.0;
      case 'leve': return 0.5;
      default: return 0.5;
    }
  };

  // Request ID ref to protect against out-of-order responses when switching students rapidly
  const currentRequestIdRef = useRef<number>(0);

  // 1. Fetch Conduct and Points from API / Database
  const fetchConductData = useCallback(async () => {
    if (!selectedStudentId) return;

    const requestId = ++currentRequestIdRef.current;

    try {
      setLoading(true);

      // Use unified conductRoutineRadarService with fallback
      const { score, occurrences } = await conductRoutineRadarService.fetchStudentConductData(
        selectedStudentId,
        selectedQuarter,
        selectedYear
      );

      // Discard response if a newer student request was triggered
      if (requestId !== currentRequestIdRef.current) {
        return;
      }

      if (occurrences && occurrences.length > 0) {
        setConductList(occurrences.map(o => ({
          id: o.id,
          student_id: o.studentId,
          recorded_by_name: o.recordedByName,
          record_type: normalizeInfractionLevel(o.recordType),
          title: o.title,
          description: o.description,
          recorded_at: o.occurrenceDate || o.createdAt,
          signed_by_parent: o.guardianAcknowledged,
          signature_date: o.guardianAcknowledgedAt ? new Date(o.guardianAcknowledgedAt).toLocaleString('pt-BR') : undefined,
          parent_notes: o.guardianNotes,
          points_deducted: o.pointsDeducted
        })));
      } else {
        setConductList([]);
      }

      setQuarterlyScore({
        base_points: score.basePoints,
        points_lost: score.pointsLost,
        current_balance: score.currentBalance,
        milestone_10: score.milestone10,
        milestone_15: score.milestone15,
        milestone_20: score.milestone20,
        notifications: []
      });
    } catch (err) {
      console.warn('Erro ao carregar dados do Diário de Bordo:', err);
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedStudentId, selectedQuarter, selectedYear]);

  // Reset state and fetch when selected student changes
  useEffect(() => {
    setConductList([]);
    setQuarterlyScore({
      base_points: 20.0,
      points_lost: 0.0,
      current_balance: 20.0,
      milestone_10: false,
      milestone_15: false,
      milestone_20: false,
      notifications: []
    });
    fetchConductData();
  }, [selectedStudentId, fetchConductData]);

  // 2. Realtime WebSocket Subscription with Differentiated Audio Alerts
  useEffect(() => {
    if (!selectedStudentId) return;

    const channel = supabase
      .channel(`family_routine_conduct_realtime_${selectedStudentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'occurrences',
          filter: `student_id=eq.${selectedStudentId}`
        },
        (payload) => {
          // Security hardening: Only process events for homologated/shared occurrences
          const recordStatus = (payload.new as any)?.status || (payload.old as any)?.status;
          const isAllowedStatus = ['Homologada', 'Compartilhada', 'Publicada'].includes(recordStatus);

          if (!isAllowedStatus) {
            // Ignore unhomologated or draft events to prevent information leakage
            return;
          }

          fetchConductData();

          // Differentiated Audio Alerts per infraction level on new insert/update
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRecord = payload.new as any;
            const level = normalizeInfractionLevel(newRecord.occurrence_type || newRecord.severity || newRecord.type);
            playInfractionSound(level);
          } else {
            playNotificationChime('info');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_conduct_quarterly_scores',
          filter: `student_id=eq.${selectedStudentId}`
        },
        () => {
          fetchConductData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_conduct_movements',
          filter: `student_id=eq.${selectedStudentId}`
        },
        () => {
          fetchConductData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_conduct_milestone_notifications',
          filter: `student_id=eq.${selectedStudentId}`
        },
        () => {
          fetchConductData();
          playNotificationChime('urgency');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStudentId, fetchConductData]);

  // 3. Consolidated Counters
  const gravissimaCount = useMemo(() => conductList.filter(c => c.record_type === 'gravissima').length, [conductList]);
  const mediaCount = useMemo(() => conductList.filter(c => c.record_type === 'media').length, [conductList]);
  const leveCount = useMemo(() => conductList.filter(c => c.record_type === 'leve').length, [conductList]);

  // 4. Filtered Conduct List
  const filteredList = useMemo(() => {
    return conductList.filter(c => {
      const matchLevel = filterLevel === 'all' || c.record_type === filterLevel;
      const matchSig = filterSignature === 'all' 
        ? true 
        : filterSignature === 'signed' 
        ? Boolean(c.signed_by_parent) 
        : !c.signed_by_parent;
      return matchLevel && matchSig;
    });
  }, [conductList, filterLevel, filterSignature]);

  // 5. Digital Signature Handler
  const handleSignConduct = async () => {
    if (!agreeTerms) {
      alert('É necessário assinalar a declaração de ciência antes de assinar.');
      return;
    }

    if (!activeConductModal) return;

    setIsSubmittingSignature(true);
    const nowBR = new Date().toLocaleString('pt-BR');

    try {
      // Direct Atomic RPC execution via conductRoutineRadarService
      const success = await conductRoutineRadarService.acknowledgeConductRecord(
        activeConductModal.id,
        parentNotesInput || undefined,
        currentUser?.name || 'Responsável Legal'
      );

      if (!success) {
        alert('Acesso negado ou erro ao registrar assinatura. Verifique suas permissões.');
        return;
      }

      // Local update after RPC confirmation
      setConductList(prev => prev.map(item => item.id === activeConductModal.id ? {
        ...item,
        signed_by_parent: true,
        signature_date: nowBR,
        parent_notes: parentNotesInput
      } : item));

      playNotificationChime('signature');
      setActiveConductModal(null);
      setParentNotesInput('');
      setAgreeTerms(false);
      alert('Ciência e parecer do responsável confirmados com sucesso!');
    } catch (err) {
      console.error('Erro ao assinar ocorrência:', err);
      alert('Acesso negado ou erro na assinatura digital.');
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  // Dynamic calculation of points lost from conductList
  const totalLostFromRecords = useMemo(() => {
    return conductList.reduce((acc, c) => acc + (typeof c.points_deducted === 'number' ? c.points_deducted : getDeductionPoints(c.record_type)), 0);
  }, [conductList]);

  // Combined score taking into account live records
  const effectivePointsLost = useMemo(() => {
    return Math.max(quarterlyScore.points_lost, totalLostFromRecords);
  }, [quarterlyScore.points_lost, totalLostFromRecords]);

  const effectiveCurrentBalance = useMemo(() => {
    return Math.max(0, 20.0 - effectivePointsLost);
  }, [effectivePointsLost]);

  // Milestone Progress calculations (out of 20 points)
  const pointsLostClamped = Math.min(20, Math.max(0, effectivePointsLost));
  const lostPercentage = (pointsLostClamped / 20) * 100;

  // Milestone status banner configuration
  const currentMilestoneStatus = useMemo(() => {
    if (pointsLostClamped >= 20) {
      return {
        level: 'critico',
        badge: 'AVISO CRÍTICO — LIMITE DE 20 PONTOS ATINGIDO',
        badgeColor: 'bg-red-600 text-white font-bold animate-pulse',
        border: 'border-red-500/80',
        bg: 'bg-gradient-to-r from-red-950 via-slate-900 to-red-950',
        textTitle: `Limite Total de 20 Pontos de Conduta Esgotado no ${selectedQuarter}º Trimestre`,
        description: 'O estudante atingiu o teto máximo de penalidades disciplinares permitidas pelo regimento escolar. Caso encaminhado imediatamente para reunião extraordinária com a Direção e Conselho Escolar.'
      };
    } else if (pointsLostClamped >= 15) {
      return {
        level: 'alerta',
        badge: 'ALERTA PEDAGÓGICO — 15 PONTOS DE INFRAÇÃO',
        badgeColor: 'bg-amber-500 text-slate-950 font-bold',
        border: 'border-amber-500/80',
        bg: 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900',
        textTitle: `Convocação Pedagógica: Marco de 15 Pontos Atingido no ${selectedQuarter}º Trimestre`,
        description: 'Estudante acumulou 15 pontos em infrações disciplinares. Há risco iminente de suspensão e aplicação de medidas socioeducativas. É obrigatório o comparecimento da família para alinhamento presencial.'
      };
    } else if (pointsLostClamped >= 10) {
      return {
        level: 'atencao',
        badge: 'ATENÇÃO — 10 PONTOS PERDIDOS NO TRIMESTRE',
        badgeColor: 'bg-amber-400 text-slate-950 font-bold',
        border: 'border-amber-400/60',
        bg: 'bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900',
        textTitle: `Marco Preventivo: 10 Pontos Perdidos no ${selectedQuarter}º Trimestre`,
        description: 'Recomenda-se alinhamento preventivo dos responsáveis com a equipe pedagógica para reversão do padrão de infrações e retomada do bom desempenho comportamental.'
      };
    }
    return null;
  }, [pointsLostClamped, selectedQuarter]);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* CABEÇALHO DO MÓDULO — RADAR DE ROTINA & DIÁRIO DE BORDO */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>CLASSIUMRADAR • DIÁRIO DE BORDO EM TEMPO REAL</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-white flex items-center gap-2">
            Radar de Rotina & Diário de Bordo
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Acompanhamento automatizado da rotina do estudante na escola: comportamento em sala de aula e dentro da unidade escolar, em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title={soundEnabled ? 'Notificações sonoras ativas (Leve, Média e Gravíssima diferenciadas)' : 'Notificações sonoras desativadas'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Som Ativo' : 'Som Mudo'}</span>
          </button>
        </div>
      </div>

      {/* BANNER DE NOTIFICAÇÃO DE MARCO DE PONTOS (10, 15 ou 20 PONTOS) */}
      {currentMilestoneStatus && (
        <div className={`${currentMilestoneStatus.bg} border-2 ${currentMilestoneStatus.border} rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden transition-all duration-500`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                currentMilestoneStatus.level === 'critico'
                  ? 'bg-red-600/30 border-red-500/50 text-red-400'
                  : 'bg-amber-600/30 border-amber-500/50 text-amber-400'
              }`}>
                {currentMilestoneStatus.level === 'critico' ? (
                  <ShieldAlert className="w-7 h-7" />
                ) : (
                  <AlertTriangle className="w-7 h-7" />
                )}
              </div>
              <div className="space-y-1">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider ${currentMilestoneStatus.badgeColor}`}>
                  {currentMilestoneStatus.badge}
                </span>
                <h3 className="text-lg font-serif font-bold text-white">
                  {currentMilestoneStatus.textTitle}
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed max-w-3xl">
                  {currentMilestoneStatus.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert(`Direcionando para o agendamento de atendimento presencial para ${currentStudent.name}...`)}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar com Coordenação</span>
            </button>
          </div>
        </div>
      )}

      {/* PAINEL CANÔNICO: FREQUÊNCIA ESCOLAR — FALTAS E AUSÊNCIAS (200 DIAS & MARCOS 16, 32, 48, 54) */}
      <FamilyAttendanceFrequencyPanel
        studentId={selectedStudentId}
        studentName={currentStudent.name}
        academicYear={selectedYear}
      />

      {/* CARD DEDICADO: GESTÃO TRIMESTRAL DE PONTOS DA CONDUTA (REGRA DOS 20 PONTOS & MARCOS 10, 15, 20) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Gestão Trimestral de Pontos da Conduta
              </h3>
              <p className="text-xs text-slate-500">
                Pontuação base de 20.0 pontos por trimestre, com deduções por gravidade e notificações nos marcos de 10, 15 e 20 pontos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="quarter-select" className="sr-only">Trimestre</label>
            <select
              id="quarter-select"
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(Number(e.target.value))}
              className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value={1}>1º Trimestre 2026</option>
              <option value={2}>2º Trimestre 2026</option>
              <option value={3}>3º Trimestre 2026</option>
            </select>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SALDO ATUAL */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block">
              SALDO ATUAL
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black font-mono tracking-tight ${
                effectiveCurrentBalance >= 15 
                  ? 'text-emerald-400' 
                  : effectiveCurrentBalance >= 10 
                  ? 'text-amber-400' 
                  : 'text-red-400'
              }`}>
                {effectiveCurrentBalance.toFixed(1).replace('.', ',')}
              </span>
              <span className="text-xs font-mono text-slate-400">/ 20,0 pontos</span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              Estudante: <strong className="text-white">{currentStudent.name}</strong>
            </p>
          </div>

          {/* TOTAL DE PONTOS PERDIDOS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block">
              PONTOS PERDIDOS
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black font-mono tracking-tight ${
                pointsLostClamped >= 15 ? 'text-red-600' : pointsLostClamped >= 10 ? 'text-amber-600' : 'text-slate-800'
              }`}>
                {pointsLostClamped.toFixed(1).replace('.', ',')}
              </span>
              <span className="text-xs font-mono text-slate-500">pontos acumulados</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              {pointsLostClamped === 0 ? 'Nenhuma penalidade registrada no trimestre.' : `Deduções acumuladas no ${selectedQuarter}º Trimestre.`}
            </p>
          </div>

          {/* TABELA DE REGRAS DE DEDUÇÃO */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-1">
              PESOS POR NÍVEL DE ADVERTÊNCIA
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Leve:
                </span>
                <strong className="font-mono text-emerald-700 font-bold">-0,5 ponto</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Média:
                </span>
                <strong className="font-mono text-amber-800 font-bold">-1,0 ponto</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Gravíssima:
                </span>
                <strong className="font-mono text-red-700 font-bold">-2,0 pontos</strong>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE PROGRESSO COM OS 3 MARCOS (10, 15, 20 PONTOS) */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              Escala de Marcos de Notificação por Perda de Pontos
            </span>
            <span className="text-xs font-mono text-slate-400">
              {pointsLostClamped.toFixed(1)} / 20.0 pontos perdidos ({Math.round(lostPercentage)}%)
            </span>
          </div>

          {/* PROGRESS TRACK */}
          <div className="relative pt-6 pb-2">
            {/* Visual Milestones Markers */}
            <div className="absolute -top-1 left-0 text-[10px] font-mono text-slate-400">0 pts</div>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                pointsLostClamped >= 10 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                Marco 10 pts
              </span>
            </div>
            <div className="absolute -top-1 left-3/4 -translate-x-1/2 flex flex-col items-center">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                pointsLostClamped >= 15 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                Marco 15 pts
              </span>
            </div>
            <div className="absolute -top-1 right-0 text-right">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                pointsLostClamped >= 20 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                20 pts (Limite)
              </span>
            </div>

            {/* TRACK BAR */}
            <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700 relative">
              {/* Divider lines at 50% (10pts) and 75% (15pts) */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-600 z-10"></div>
              <div className="absolute top-0 bottom-0 left-3/4 w-0.5 bg-slate-600 z-10"></div>

              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  pointsLostClamped >= 20 
                    ? 'bg-red-600' 
                    : pointsLostClamped >= 15 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600' 
                    : pointsLostClamped >= 10 
                    ? 'bg-gradient-to-r from-emerald-500 to-amber-500' 
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(3, lostPercentage)}%` }}
              ></div>
            </div>
          </div>

          {/* DESCRITIVO DOS 3 MARCOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
            <div className={`p-3 rounded-xl border ${
              pointsLostClamped >= 10 
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' 
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}>
              <div className="font-bold font-mono text-[11px] mb-1 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${pointsLostClamped >= 10 ? 'bg-amber-400' : 'bg-slate-600'}`}></span>
                Marco 10 Pontos • Atenção
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Notificação automática de atenção com recomendação de alinhamento com a equipe pedagógica.
              </p>
            </div>

            <div className={`p-3 rounded-xl border ${
              pointsLostClamped >= 15 
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-200' 
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}>
              <div className="font-bold font-mono text-[11px] mb-1 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${pointsLostClamped >= 15 ? 'bg-amber-500' : 'bg-slate-600'}`}></span>
                Marco 15 Pontos • Alerta
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Alerta pedagógico e convocação dos responsáveis para reunião presencial com a coordenação.
              </p>
            </div>

            <div className={`p-3 rounded-xl border ${
              pointsLostClamped >= 20 
                ? 'bg-red-950/60 border-red-500/60 text-red-200' 
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}>
              <div className="font-bold font-mono text-[11px] mb-1 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${pointsLostClamped >= 20 ? 'bg-red-500' : 'bg-slate-600'}`}></span>
                Marco 20 Pontos • Aviso Crítico
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Perda total dos pontos trimestrais com encaminhamento imediato para a direção e medidas regimentais.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: DIÁRIO DE BORDO (3 NÍVEIS DE INFRAÇÃO COM CORES & BADGES) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        
        {/* HEADER DO DIÁRIO DE BORDO COM CONTADORES CONSOLIDADOS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Diário de Bordo
              </h3>
              <p className="text-xs text-slate-500">
                Registros pedagógicos, infrações disciplinares e acompanhamento de rotina integrados ao diário docente.
              </p>
            </div>
          </div>

          {/* CONTADORES CONSOLIDADOS NO TOPO DO CARD (3 NÍVEIS OFICIAIS) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-red-50 text-red-700 font-bold text-xs px-3.5 py-1 rounded-full border border-red-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              {gravissimaCount} Gravíssimas
            </span>
            <span className="bg-amber-50 text-amber-800 font-bold text-xs px-3.5 py-1 rounded-full border border-amber-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {mediaCount} Médias
            </span>
            <span className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {leveCount} Leves
            </span>
          </div>
        </div>

        {/* FILTROS DE VISUALIZAÇÃO */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">Filtrar Gravidade:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterLevel('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterLevel === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todas ({conductList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterLevel('gravissima')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterLevel === 'gravissima' ? 'bg-red-600 text-white' : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
                }`}
              >
                Gravíssimas ({gravissimaCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterLevel('media')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterLevel === 'media' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                Médias ({mediaCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterLevel('leve')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterLevel === 'leve' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Leves ({leveCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">Ciência do Responsável:</span>
            <select
              value={filterSignature}
              onChange={(e) => setFilterSignature(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Todos os Registros</option>
              <option value="pending">Pendentes de Ciência</option>
              <option value="signed">Assinados Digitalmente</option>
            </select>
          </div>
        </div>

        {/* LISTA DE REGISTROS DO DIÁRIO DE BORDO */}
        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-serif text-base font-bold text-slate-800">Nenhum registro encontrado</h4>
            <p className="text-xs text-slate-500">Não constam lançamentos no Diário de Bordo para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((record) => {
              const isGravissima = record.record_type === 'gravissima';
              const isMedia = record.record_type === 'media';
              const isLeve = record.record_type === 'leve';
              const isSigned = record.signed_by_parent;

              const formattedDate = record.recorded_at 
                ? new Date(record.recorded_at).toLocaleDateString('pt-BR') 
                : '22/07/2026';

              return (
                <div
                  key={record.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 relative overflow-hidden bg-white shadow-sm ${
                    isGravissima
                      ? 'border-red-300 hover:border-red-400'
                      : isMedia
                      ? 'border-amber-300 hover:border-amber-400'
                      : 'border-emerald-300 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b pb-2 border-slate-100">
                    <div>
                      {/* 3 NÍVEIS COM CORES E BADGES ESPECIFICADAS */}
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md inline-flex items-center gap-1 ${
                          isGravissima
                            ? 'bg-red-50 text-red-700 border border-red-300'
                            : isMedia
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        }`}
                      >
                        {isGravissima ? '🔴 INFRAÇÃO GRAVÍSSIMA' : isMedia ? '🟡 INFRAÇÃO MÉDIA' : '🟢 INFRAÇÃO LEVE'}
                        <span className="font-mono text-[10px] ml-1 font-bold">
                          (-{record.points_deducted.toFixed(1)} pt{record.points_deducted > 1 ? 's' : ''})
                        </span>
                      </span>

                      <h4 className="font-bold text-sm font-serif mt-1.5 text-slate-900">
                        {record.title || 'Registro Disciplinar'}
                      </h4>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {formattedDate}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {record.description}
                  </p>

                  <div className="text-[11px] text-slate-500 font-medium pt-1">
                    Registrado por: <strong>{record.recorded_by_name || 'Diário de Bordo do Docente'}</strong>
                  </div>

                  {/* SEÇÃO DE ASSINATURA DIGITAL DO RESPONSÁVEL */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    {isSigned ? (
                      <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-xs text-emerald-900 w-full space-y-0.5">
                        <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> 
                          Assinado Digitalmente em {record.signature_date || '22/07/2026 18:30'}
                        </span>
                        {record.parent_notes && (
                          <p className="text-[11px] italic text-emerald-900 bg-white/80 p-2 rounded-lg border border-emerald-200 mt-1">
                            "Parecer da Família: {record.parent_notes}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Ciência do Responsável Pendente
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveConductModal(record);
                            setParentNotesInput('');
                            setAgreeTerms(false);
                          }}
                          className="bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
                        >
                          Assinar Leitura
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE ASSINATURA DIGITAL DE CIÊNCIA PELO RESPONSÁVEL */}
      {activeConductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-serif text-lg font-bold flex items-center gap-2 text-white">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Assinatura Digital de Ciência — Diário de Bordo
              </h3>
              <button
                type="button"
                onClick={() => setActiveConductModal(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  activeConductModal.record_type === 'gravissima'
                    ? 'bg-red-600 text-white'
                    : activeConductModal.record_type === 'media'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {activeConductModal.record_type === 'gravissima' ? '🔴 INFRAÇÃO GRAVÍSSIMA' : activeConductModal.record_type === 'media' ? '🟡 INFRAÇÃO MÉDIA' : '🟢 INFRAÇÃO LEVE'}
                </span>
                <span className="font-mono text-red-400 font-bold">
                  -{activeConductModal.points_deducted.toFixed(1)} pts
                </span>
              </div>
              <div>
                <strong className="text-sm font-serif text-white">{activeConductModal.title}</strong>
              </div>
              <p className="text-slate-300 leading-relaxed">{activeConductModal.description}</p>
              <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-900">
                Lançado por: {activeConductModal.recorded_by_name || 'Coordenação Pedagógica'} em {new Date(activeConductModal.recorded_at).toLocaleDateString('pt-BR')}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-mono text-slate-300 font-semibold block">
                Parecer / Considerações dos Pais ou Responsáveis (Opcional):
              </label>
              <textarea
                value={parentNotesInput}
                onChange={(e) => setParentNotesInput(e.target.value)}
                rows={3}
                placeholder="Insira aqui as observações ou medidas adotadas em família..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all resize-none"
              ></textarea>

              <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span>
                  Declaro ter tomado conhecimento do registro disciplinar no Diário de Bordo e concordo em orientar o estudante conforme as normas do regimento escolar.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveConductModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingSignature}
                onClick={handleSignConduct}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingSignature ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Confirmar Assinatura</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
