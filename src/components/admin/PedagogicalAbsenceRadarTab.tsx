import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CalendarDays, Search, Filter, AlertTriangle, CheckCircle2, 
  FileText, Phone, RefreshCw, Users, ShieldAlert,
  ArrowRight, ShieldCheck, Eye, Clock, Download, ChevronRight,
  Info, X, RotateCcw
} from 'lucide-react';
import { 
  attendanceFrequencyService, 
  AttendanceRadarItem, 
  AttendanceCaseStatus,
  calculateAttendanceMilestone
} from '../../services/attendanceFrequencyService';
import { RealtimeService } from '../../services/RealtimeService';
import { PedagogicalCaseActionModal } from './PedagogicalCaseActionModal';
import { PedagogicalAttendanceReportModal } from './PedagogicalAttendanceReportModal';

export type MilestoneFilterType = 'all' | '16' | '32' | '48' | '54' | 'regular';

export interface PedagogicalAbsenceRadarTabProps {
  organizationId?: string;
  academicYear?: number;
}

/**
 * Normaliza strings para busca case-insensitive e acento-insensível.
 */
export function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface RadarFilterCriteria {
  search?: string;
  shift?: string;
  className?: string;
  milestoneFilter?: MilestoneFilterType;
  caseStatus?: string;
}

/**
 * Filtra estudantes no radar com regras canônicas cumulativas e busca normalizada
 */
export function filterRadarItems(
  items: AttendanceRadarItem[],
  criteria: RadarFilterCriteria
): AttendanceRadarItem[] {
  const q = normalizeSearchText(criteria.search || '');
  const selectedShift = criteria.shift || 'Todos';
  const selectedClass = criteria.className || 'Todas';
  const milestoneFilter = criteria.milestoneFilter || 'all';
  const selectedCaseStatus = criteria.caseStatus || 'Todos';

  return items.filter(item => {
    // 1. Busca por nome ou RA (insensível a maiúsculas e acentos)
    if (q) {
      const nameNorm = normalizeSearchText(item.studentName);
      const raNorm = normalizeSearchText(item.ra);
      if (!nameNorm.includes(q) && !raNorm.includes(q)) {
        return false;
      }
    }

    // 2. Filtro de Turno
    if (selectedShift !== 'Todos' && item.shift !== selectedShift) {
      return false;
    }

    // 3. Filtro de Turma
    if (selectedClass !== 'Todas' && item.className !== selectedClass) {
      return false;
    }

    // 4. Filtro Cumulativo de Marcos de Assiduidade
    if (milestoneFilter === '16' && item.totalAbsences < 16) {
      return false;
    }
    if (milestoneFilter === '32' && item.totalAbsences < 32) {
      return false;
    }
    if (milestoneFilter === '48' && item.totalAbsences < 48) {
      return false;
    }
    if (milestoneFilter === '54' && item.totalAbsences < 54) {
      return false;
    }
    if (milestoneFilter === 'regular' && item.totalAbsences >= 16) {
      return false;
    }

    // 5. Filtro de Situação do Caso Pedagógico
    if (selectedCaseStatus !== 'Todos' && item.caseStatus !== selectedCaseStatus) {
      return false;
    }

    return true;
  });
}

export function PedagogicalAbsenceRadarTab({
  organizationId,
  academicYear = 2026
}: PedagogicalAbsenceRadarTabProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [radarItems, setRadarItems] = useState<AttendanceRadarItem[]>([]);
  
  // Filtros interativos
  const [search, setSearch] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('Todos');
  const [selectedClass, setSelectedClass] = useState<string>('Todas');
  const [activeMilestoneFilter, setActiveMilestoneFilter] = useState<MilestoneFilterType>('all');
  const [selectedCaseStatus, setSelectedCaseStatus] = useState<string>('Todos');

  // Estados dos Modais de Acompanhamento
  const [selectedItemForAction, setSelectedItemForAction] = useState<AttendanceRadarItem | null>(null);
  const [selectedItemForReport, setSelectedItemForReport] = useState<AttendanceRadarItem | null>(null);

  const loadRadarData = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    setErrorMessage('');
    try {
      const data = await attendanceFrequencyService.getSchoolAttendanceRadar(organizationId, academicYear);
      setRadarItems(data);
    } catch (e: any) {
      console.warn('[PedagogicalAbsenceRadarTab] Erro ao carregar dados do radar pedagógico:', e);
      setHasError(true);
      setErrorMessage(e?.message || 'Falha na comunicação com o banco de dados oficial.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, academicYear]);

  // Carga inicial e subscrição Realtime
  useEffect(() => {
    loadRadarData();

    // Sincronização em tempo real com eventos de assiduidade
    const unsubscribe = RealtimeService.getInstance().subscribe(
      'pedagogical_attendance_radar',
      { table: 'attendance' },
      () => {
        loadRadarData();
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [loadRadarData]);

  // Lista de turmas dinâmicas derivadas dos dados
  const classesList = useMemo(() => {
    const set = new Set<string>();
    radarItems.forEach(i => {
      if (i.className) set.add(i.className);
    });
    return Array.from(set).sort();
  }, [radarItems]);

  // KPIs calculados com regra cumulativa canônica (>= marco)
  const kpis = useMemo(() => {
    const totalStudents = radarItems.length;
    const m16Count = radarItems.filter(i => i.totalAbsences >= 16).length;
    const m32Count = radarItems.filter(i => i.totalAbsences >= 32).length;
    const m48Count = radarItems.filter(i => i.totalAbsences >= 48).length;
    const m54Count = radarItems.filter(i => i.totalAbsences >= 54).length;

    return {
      totalStudents,
      m16Count,
      m32Count,
      m48Count,
      m54Count
    };
  }, [radarItems]);

  // Alternar ou desselecionar botão de marco interativo
  const handleToggleMilestone = (milestone: MilestoneFilterType) => {
    if (activeMilestoneFilter === milestone) {
      // Desseleciona voltando a todos os marcos sem limpar os outros filtros
      setActiveMilestoneFilter('all');
    } else {
      setActiveMilestoneFilter(milestone);
    }
  };

  // Resetar todos os filtros para a visão completa
  const handleResetFilters = () => {
    setSearch('');
    setSelectedShift('Todos');
    setSelectedClass('Todas');
    setActiveMilestoneFilter('all');
    setSelectedCaseStatus('Todos');
  };

  const hasActiveFilters = useMemo(() => {
    return (
      search.trim().length > 0 ||
      selectedShift !== 'Todos' ||
      selectedClass !== 'Todas' ||
      activeMilestoneFilter !== 'all' ||
      selectedCaseStatus !== 'Todos'
    );
  }, [search, selectedShift, selectedClass, activeMilestoneFilter, selectedCaseStatus]);

  // Lista de estudantes filtrada combinando marco cumulativo, busca e dropdowns
  const filteredItems = useMemo(() => {
    return filterRadarItems(radarItems, {
      search,
      shift: selectedShift,
      className: selectedClass,
      milestoneFilter: activeMilestoneFilter,
      caseStatus: selectedCaseStatus
    });
  }, [radarItems, search, selectedShift, selectedClass, activeMilestoneFilter, selectedCaseStatus]);

  return (
    <div className="space-y-6">
      
      {/* ========================================================= */}
      {/* 1. HEADER BANNER PEDAGÓGICO                                */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
              <span>Coordenação Pedagógica • Monitoramento de Assiduidade</span>
            </div>
            <h2 className="text-xl md:text-2xl font-serif font-black text-white tracking-tight">
              Radar de Faltas e Ausências
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Painel de busca e acompanhamento pedagógico da frequência. Use os marcos para localizar estudantes que precisam de atenção e registrar as ações realizadas pela escola.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadRadarData}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 outline-none"
              aria-label="Atualizar dados do radar pedagógico"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Atualizar Radar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. NOTA INFORMATIVA ACESSÍVEL                             */}
      {/* ========================================================= */}
      <div 
        role="region" 
        aria-label="Orientações sobre marcos pedagógicos"
        className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs"
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-700">
          <p className="font-semibold text-amber-950">
            Acompanhamento Técnico de Frequência Escolar:
          </p>
          <p className="leading-relaxed">
            Os marcos indicam níveis de acompanhamento. Eles não representam, por si só, uma decisão automática de retenção nem confirmam o envio de uma notificação.
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BOTÕES INTERATIVOS DOS MARCOS (INDICADORES SUPERIORES)  */}
      {/* ========================================================= */}
      <div 
        role="toolbar" 
        aria-label="Filtrar estudantes por marco de faltas acumuladas"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        
        {/* BOTÃO 1: TOTAL NO RADAR */}
        <button
          type="button"
          role="button"
          aria-pressed={activeMilestoneFilter === 'all'}
          aria-label={`Total no Radar: ${hasError ? 'erro' : kpis.totalStudents} estudantes. Clique para ver todos.`}
          onClick={() => handleToggleMilestone('all')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleMilestone('all');
            }
          }}
          className={`min-h-[84px] text-left rounded-2xl p-4 transition-all border cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 flex flex-col justify-between ${
            activeMilestoneFilter === 'all'
              ? 'bg-indigo-50/80 border-indigo-400 shadow-md ring-2 ring-indigo-500/30'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">
              Total no Radar
            </span>
            {activeMilestoneFilter === 'all' && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                Ativo
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-black font-mono text-slate-900">
              {hasError ? '—' : kpis.totalStudents}
            </span>
            <span className="text-xs text-slate-400 font-medium">estudantes</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            Base de 200 dias
          </span>
        </button>

        {/* BOTÃO 2: MARCO 16 • ATENÇÃO */}
        <button
          type="button"
          role="button"
          aria-pressed={activeMilestoneFilter === '16'}
          aria-label={`Marco 16 Atenção: ${hasError ? 'erro' : kpis.m16Count} casos com 16 ou mais faltas. Clique para filtrar.`}
          onClick={() => handleToggleMilestone('16')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleMilestone('16');
            }
          }}
          className={`min-h-[84px] text-left rounded-2xl p-4 transition-all border cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 flex flex-col justify-between ${
            activeMilestoneFilter === '16'
              ? 'bg-amber-50/90 border-amber-400 shadow-md ring-2 ring-amber-500/30'
              : 'bg-white border-amber-200 hover:border-amber-300 hover:bg-amber-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-amber-800 uppercase font-mono font-bold tracking-wider">
              Marco 16 • Atenção
            </span>
            {activeMilestoneFilter === '16' && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-900">
                Ativo
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-black font-mono text-amber-600">
              {hasError ? '—' : kpis.m16Count}
            </span>
            <span className="text-xs text-amber-700 font-medium">casos</span>
          </div>
          <span className="text-[10px] text-amber-800 block">
            Acompanhamento inicial
          </span>
        </button>

        {/* BOTÃO 3: MARCO 32 • ALERTA */}
        <button
          type="button"
          role="button"
          aria-pressed={activeMilestoneFilter === '32'}
          aria-label={`Marco 32 Alerta: ${hasError ? 'erro' : kpis.m32Count} casos com 32 ou mais faltas. Clique para filtrar.`}
          onClick={() => handleToggleMilestone('32')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleMilestone('32');
            }
          }}
          className={`min-h-[84px] text-left rounded-2xl p-4 transition-all border cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 flex flex-col justify-between ${
            activeMilestoneFilter === '32'
              ? 'bg-orange-50/90 border-orange-400 shadow-md ring-2 ring-orange-500/30'
              : 'bg-white border-orange-200 hover:border-orange-300 hover:bg-orange-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-orange-800 uppercase font-mono font-bold tracking-wider">
              Marco 32 • Alerta
            </span>
            {activeMilestoneFilter === '32' && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-orange-200 text-orange-900">
                Ativo
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-black font-mono text-orange-600">
              {hasError ? '—' : kpis.m32Count}
            </span>
            <span className="text-xs text-orange-700 font-medium">casos</span>
          </div>
          <span className="text-[10px] text-orange-800 block">
            Alerta pedagógico
          </span>
        </button>

        {/* BOTÃO 4: MARCO 48 • CRÍTICO */}
        <button
          type="button"
          role="button"
          aria-pressed={activeMilestoneFilter === '48'}
          aria-label={`Marco 48 Crítico: ${hasError ? 'erro' : kpis.m48Count} casos com 48 ou mais faltas. Clique para filtrar.`}
          onClick={() => handleToggleMilestone('48')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleMilestone('48');
            }
          }}
          className={`min-h-[84px] text-left rounded-2xl p-4 transition-all border cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 flex flex-col justify-between ${
            activeMilestoneFilter === '48'
              ? 'bg-rose-50/90 border-rose-400 shadow-md ring-2 ring-rose-500/30'
              : 'bg-white border-rose-200 hover:border-rose-300 hover:bg-rose-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-rose-800 uppercase font-mono font-bold tracking-wider">
              Marco 48 • Crítico
            </span>
            {activeMilestoneFilter === '48' && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-rose-200 text-rose-900">
                Ativo
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-black font-mono text-rose-600">
              {hasError ? '—' : kpis.m48Count}
            </span>
            <span className="text-xs text-rose-700 font-medium">casos</span>
          </div>
          <span className="text-[10px] text-rose-800 block">
            Acompanhamento intensivo
          </span>
        </button>

        {/* BOTÃO 5: MARCO 54 • DELIBERAÇÃO */}
        <button
          type="button"
          role="button"
          aria-pressed={activeMilestoneFilter === '54'}
          aria-label={`Marco 54 Deliberação: ${hasError ? 'erro' : kpis.m54Count} casos com 54 ou mais faltas. Clique para filtrar.`}
          onClick={() => handleToggleMilestone('54')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleMilestone('54');
            }
          }}
          className={`min-h-[84px] text-left rounded-2xl p-4 transition-all border cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 col-span-2 sm:col-span-1 flex flex-col justify-between ${
            activeMilestoneFilter === '54'
              ? 'bg-purple-50/90 border-purple-400 shadow-md ring-2 ring-purple-500/30'
              : 'bg-white border-purple-200 hover:border-purple-300 hover:bg-purple-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-purple-800 uppercase font-mono font-bold tracking-wider">
              Marco 54 • Deliberação
            </span>
            {activeMilestoneFilter === '54' && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-purple-200 text-purple-900">
                Ativo
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-2xl font-black font-mono text-purple-700">
              {hasError ? '—' : kpis.m54Count}
            </span>
            <span className="text-xs text-purple-700 font-medium">casos</span>
          </div>
          <span className="text-[10px] text-purple-800 block">
            Avaliação pedagógica
          </span>
        </button>

      </div>

      {/* ========================================================= */}
      {/* 4. AVISO VISUAL DISCRETO QUANDO FILTRO CUMULATIVO ATIVO   */}
      {/* ========================================================= */}
      {activeMilestoneFilter !== 'all' && (
        <div 
          role="status"
          aria-live="polite"
          className="bg-indigo-50/80 border border-indigo-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-indigo-950 transition-all animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              {activeMilestoneFilter === 'regular' ? (
                <>Exibindo estudantes com <strong>Frequência Regular</strong> (menos de 16 faltas).</>
              ) : (
                <>
                  <strong className="font-bold">Filtro Marco {activeMilestoneFilter} ativo:</strong> Este filtro inclui todos os estudantes que atingiram ou ultrapassaram o marco ({activeMilestoneFilter}+ faltas).
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveMilestoneFilter('all')}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer ml-3 shrink-0"
          >
            Ver todos os estudantes
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. BARRA DE FILTROS & BUSCA INTEGRADA                     */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        
        {/* BUSCA POR NOME OU RA */}
        <div className="w-full lg:w-72 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou RA..."
            className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
            aria-label="Buscar estudante por nome ou RA"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Limpar termo de busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* FILTROS DROPDOWNS */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto text-xs">
          
          {/* TURMA */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-indigo-400 cursor-pointer font-medium"
            aria-label="Filtrar por Turma"
          >
            <option value="Todas">Todas as Turmas</option>
            {classesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* TURNO */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-indigo-400 cursor-pointer font-medium"
            aria-label="Filtrar por Turno"
          >
            <option value="Todos">Todos os Turnos</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Integral">Integral</option>
            <option value="Noturno">Noturno</option>
          </select>

          {/* MARCO DE ASSIDUIDADE (SINCRONIZADO COM OS BOTÕES SUPERIORES) */}
          <select
            value={activeMilestoneFilter}
            onChange={(e) => setActiveMilestoneFilter(e.target.value as MilestoneFilterType)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-indigo-400 cursor-pointer font-medium"
            aria-label="Filtrar por Nível ou Marco de Faltas"
          >
            <option value="all">Todos os Marcos</option>
            <option value="16">Marco 16+ (Atenção — ≥ 16 faltas)</option>
            <option value="32">Marco 32+ (Alerta — ≥ 32 faltas)</option>
            <option value="48">Marco 48+ (Crítico — ≥ 48 faltas)</option>
            <option value="54">Marco 54+ (Deliberação — ≥ 54 faltas)</option>
            <option value="regular">Frequência Regular (0 a 15 faltas)</option>
          </select>

          {/* SITUAÇÃO DO CASO PEDAGÓGICO */}
          <select
            value={selectedCaseStatus}
            onChange={(e) => setSelectedCaseStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-indigo-400 cursor-pointer font-medium"
            aria-label="Filtrar por Situação do Caso Pedagógico"
          >
            <option value="Todos">Todas as Situações</option>
            <option value="aberto">Caso Aberto</option>
            <option value="em_acompanhamento">Em Acompanhamento</option>
            <option value="relatorio_elaboracao">Relatório em Elaboração</option>
            <option value="relatorio_revisado">Relatório Revisado</option>
            <option value="encaminhamento_registrado">Encaminhamento Registrado</option>
            <option value="concluido">Concluído</option>
          </select>

          {/* BOTÃO LIMPAR FILTROS */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto lg:ml-0"
              title="Restaurar visualização completa"
              aria-label="Limpar todos os filtros"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Limpar Filtros</span>
            </button>
          )}

        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. TABELA DO RADAR COM ESTADOS PEDAGÓGICOS                */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                <th scope="col" className="p-4">Estudante / RA</th>
                <th scope="col" className="p-4">Turma & Turno</th>
                <th scope="col" className="p-4 text-center">Total Faltas</th>
                <th scope="col" className="p-4 text-center">Justificadas</th>
                <th scope="col" className="p-4 text-center">Não Justificadas</th>
                <th scope="col" className="p-4">Marco de Assiduidade</th>
                <th scope="col" className="p-4">Acompanhamento</th>
                <th scope="col" className="p-4 text-center">Ações Pedagógicas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              
              {/* ESTADO 1: CARREGANDO */}
              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      <span className="font-medium">Consolidando dados do radar pedagógico...</span>
                      <span className="text-[11px] text-slate-400">Verificando diário escolar e registros de presença</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* ESTADO 2: ERRO DE CONSULTA */}
              {!loading && hasError && (
                <tr>
                  <td colSpan={8} className="py-10 px-6 text-center text-slate-700 text-xs">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">Falha na sincronização do radar</h4>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        {errorMessage || 'Não foi possível carregar os registros de assiduidade escolar. Os dados salvos não foram alterados.'}
                      </p>
                      <button
                        type="button"
                        onClick={loadRadarData}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Tentar Novamente</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* ESTADO 3: NENHUM RESULTADO */}
              {!loading && !hasError && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 px-6 text-center text-slate-500 text-xs">
                    <div className="max-w-md mx-auto space-y-2">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="font-bold text-slate-800 text-sm">
                        {activeMilestoneFilter !== 'all' 
                          ? `Nenhum estudante atingiu o marco selecionado (≥ ${activeMilestoneFilter} faltas)`
                          : 'Nenhum estudante localizado para os filtros selecionados'}
                      </h4>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Tente ajustar os critérios de busca, turma ou marco de acompanhamento para visualizar mais registros.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Limpar Filtros</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* ESTADO 4: LINHAS DE ESTUDANTES */}
              {!loading && !hasError && filteredItems.map(item => (
                <tr key={item.studentId} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* ESTUDANTE */}
                  <td className="p-4">
                    <div>
                      <strong className="text-slate-900 block font-bold">{item.studentName}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">RA: {item.ra}</span>
                    </div>
                  </td>

                  {/* TURMA & TURNO */}
                  <td className="p-4">
                    <div>
                      <span className="font-semibold text-slate-800 block">{item.className}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.shift}</span>
                    </div>
                  </td>

                  {/* TOTAL DE FALTAS */}
                  <td className="p-4 text-center">
                    <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-xl ${
                      item.totalAbsences >= 54 ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                      item.totalAbsences >= 48 ? 'bg-rose-100 text-rose-900 border border-rose-200' :
                      item.totalAbsences >= 32 ? 'bg-orange-100 text-orange-900 border border-orange-200' :
                      item.totalAbsences >= 16 ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {item.totalAbsences}
                    </span>
                  </td>

                  {/* JUSTIFICADAS */}
                  <td className="p-4 text-center font-mono font-bold text-sky-700">
                    {item.justifiedCount}
                  </td>

                  {/* NÃO JUSTIFICADAS */}
                  <td className="p-4 text-center font-mono font-bold text-amber-700">
                    {item.unjustifiedCount}
                  </td>

                  {/* MARCO DE ASSIDUIDADE */}
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.milestone === 'adicional' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                      item.milestone === 'critico' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                      item.milestone === 'alerta' ? 'bg-orange-100 text-orange-900 border border-orange-300' :
                      item.milestone === 'atencao' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.milestone === 'critico' || item.milestone === 'adicional' ? 'bg-rose-500 animate-pulse' :
                        item.milestone === 'alerta' ? 'bg-orange-500' :
                        item.milestone === 'atencao' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      <span>{item.milestoneLabel}</span>
                    </span>
                  </td>

                  {/* SITUAÇÃO DO CASO PEDAGÓGICO */}
                  <td className="p-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 capitalize block">
                        {item.caseStatus.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.responsibleStaff}
                      </span>
                    </div>
                  </td>

                  {/* AÇÕES PEDAGÓGICAS */}
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedItemForAction(item)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 outline-none"
                        title="Registrar ação de busca ativa, contato ou parecer"
                        aria-label={`Registrar acompanhamento para ${item.studentName}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Acompanhar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedItemForReport(item)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 outline-none"
                        title="Emitir Parecer Técnico de Frequência"
                        aria-label={`Emitir parecer técnico para ${item.studentName}`}
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 7. MODAIS DE AÇÃO E PARECER                                */}
      {/* ========================================================= */}
      {selectedItemForAction && (
        <PedagogicalCaseActionModal
          isOpen={Boolean(selectedItemForAction)}
          item={selectedItemForAction}
          onClose={() => setSelectedItemForAction(null)}
          onSuccess={async () => {
            await loadRadarData();
          }}
        />
      )}

      {selectedItemForReport && (
        <PedagogicalAttendanceReportModal
          isOpen={Boolean(selectedItemForReport)}
          item={selectedItemForReport}
          academicYear={academicYear}
          onClose={() => setSelectedItemForReport(null)}
        />
      )}

    </div>
  );
}
