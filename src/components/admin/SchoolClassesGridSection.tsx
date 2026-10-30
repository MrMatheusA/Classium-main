import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Plus, 
  DoorClosed, 
  Users, 
  Calendar, 
  Clock, 
  Layers, 
  CheckCircle2, 
  Pencil, 
  Trash2, 
  X, 
  RotateCcw, 
  Sparkles, 
  BookOpen, 
  UserCheck, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { SimpleClassEntity } from '../../services/schedule/classScheduleService';
import { ClassStudentsModal } from './ClassStudentsModal';

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

// Ordenação lógica natural (Turno -> Ano/Série -> Nome -> Sala -> Código)
function naturalClassSort(a: SimpleClassEntity, b: SimpleClassEntity): number {
  // 1. Turno: Matutino/1º antes de Vespertino/2º
  const shiftWeight = (s?: string) => {
    if (!s) return 99;
    if (s.includes('1º') || s.toLowerCase().includes('matutino') || s.toLowerCase().includes('manhã') || s.toLowerCase().includes('manha')) return 1;
    if (s.includes('2º') || s.toLowerCase().includes('vespertino') || s.toLowerCase().includes('tarde')) return 2;
    return 3;
  };
  const diffShift = shiftWeight(a.shift) - shiftWeight(b.shift);
  if (diffShift !== 0) return diffShift;

  // 2. Extração numérica de série/ano (ex: "5º Ano", "521", "8º Ano")
  const extractNum = (str?: string) => {
    if (!str) return 9999;
    const m = str.match(/\d+/);
    return m ? parseInt(m[0], 10) : 9999;
  };
  const numGradeA = extractNum(a.grade || a.name);
  const numGradeB = extractNum(b.grade || b.name);
  if (numGradeA !== numGradeB) return numGradeA - numGradeB;

  // 3. Nome com natural collation
  const nameComp = (a.name || '').localeCompare(b.name || '', 'pt-BR', { numeric: true, sensitivity: 'base' });
  if (nameComp !== 0) return nameComp;

  // 4. Sala
  const roomA = a.room || '';
  const roomB = b.room || '';
  return roomA.localeCompare(roomB, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export const SchoolClassesGridSection: React.FC<SchoolClassesGridSectionProps> = ({
  classes,
  selectedClassId,
  selectedShiftKey,
  academicYear,
  syncStatus,
  loading,
  error,
  onSelectClass,
  onAddClass,
  onEditClass,
  onDeleteClass,
  onRetry,
  onShiftChange
}) => {
  // Estados de Filtro e Busca
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [managingStudentsClass, setManagingStudentsClass] = useState<SimpleClassEntity | null>(null); // 'ALL' | 'matutino' | 'vespertino'
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterRoom, setFilterRoom] = useState<string>('ALL');

  // Opções dinâmicas de Séries extraídas das turmas reais no banco
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      if (c.grade && c.grade.trim()) {
        set.add(c.grade.trim());
      } else if (c.name) {
        // Tenta inferir se for padrão "8º Ano A"
        const m = c.name.match(/^(\d+º\s*Ano|[A-Za-zÀ-ÿ]+\s*Ano)/i);
        if (m) set.add(m[1].trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [classes]);

  // Opções dinâmicas de Salas extraídas das turmas reais no banco
  const availableRooms = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      if (c.room && c.room.trim()) {
        set.add(c.room.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [classes]);

  // Limpeza de todos os filtros
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterShift('ALL');
    setFilterGrade('ALL');
    setFilterRoom('ALL');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || filterShift !== 'ALL' || filterGrade !== 'ALL' || filterRoom !== 'ALL';

  // Filtragem e Ordenação
  const filteredAndSortedClasses = useMemo(() => {
    let result = [...classes];

    // Exclusão estrita de qualquer item relacionado a 3º Noite na interface (Regra 29 & 34)
    result = result.filter(c => {
      if (!c.shift) return true;
      const sLower = c.shift.toLowerCase();
      return !sLower.includes('noite') && !sLower.includes('noturno') && !c.shift.includes('3º');
    });

    // 1. Filtro de Turno
    if (filterShift !== 'ALL') {
      result = result.filter(c => {
        if (!c.shift) return false;
        const sLower = c.shift.toLowerCase();
        if (filterShift === 'matutino') {
          return sLower.includes('matutino') || sLower.includes('1º') || sLower.includes('manha') || sLower.includes('manhã');
        }
        if (filterShift === 'vespertino') {
          return sLower.includes('vespertino') || sLower.includes('2º') || sLower.includes('tarde');
        }
        return true;
      });
    }

    // 2. Filtro de Série
    if (filterGrade !== 'ALL') {
      result = result.filter(c => {
        return (c.grade && c.grade.trim() === filterGrade) || (c.name && c.name.includes(filterGrade));
      });
    }

    // 3. Filtro de Sala
    if (filterRoom !== 'ALL') {
      result = result.filter(c => c.room && c.room.trim() === filterRoom);
    }

    // 4. Busca Textual (Nome, Código, Série, Sala, Turno, Professores)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const nameMatch = c.name?.toLowerCase().includes(q);
        const codeMatch = c.code?.toLowerCase().includes(q);
        const gradeMatch = c.grade?.toLowerCase().includes(q);
        const roomMatch = c.room?.toLowerCase().includes(q);
        const shiftMatch = c.shift?.toLowerCase().includes(q);
        const teacherMatch = c.teachers?.some(t => t.toLowerCase().includes(q));
        return nameMatch || codeMatch || gradeMatch || roomMatch || shiftMatch || teacherMatch;
      });
    }

    // 5. Ordenação Natural
    return result.sort(naturalClassSort);
  }, [classes, filterShift, filterGrade, filterRoom, searchQuery]);

  // Turno ativo label amigável
  const activeShiftLabel = useMemo(() => {
    if (selectedShiftKey.includes('Matutino') || selectedShiftKey.includes('1º')) return '1º Manhã';
    if (selectedShiftKey.includes('Vespertino') || selectedShiftKey.includes('2º')) return '2º Tarde';
    return selectedShiftKey;
  }, [selectedShiftKey]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 transition-all">
      {/* ========================================================================= */}
      {/* CABEÇALHO DA SEÇÃO: Título, Metadados e Botão Adicionar Turma            */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-900 tracking-tight flex items-center gap-2">
                Turmas da escola
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Selecione uma turma para visualizar e editar a grade semanal oficial de horários.
              </p>
            </div>
          </div>

          {/* Badges de Metadados: Ano Letivo, Turno Ativo, Contadores e Status */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Ano Letivo: <strong className="text-slate-900 font-bold">{academicYear}</strong>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Turno Ativo: <strong className="font-bold">{activeShiftLabel}</strong>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              Total: <strong className="text-slate-900 font-bold">{classes.length}</strong> turmas
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-semibold border border-indigo-200">
              Exibindo: <strong className="font-bold">{filteredAndSortedClasses.length}</strong>
            </span>

            {/* Status Realtime Badge */}
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Conectado
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-spin" />
                Sincronizando
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Offline
              </span>
            )}
          </div>
        </div>

        {/* Botão Adicionar Turma em Posição Clara */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onAddClass}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px]"
            title="Cadastrar nova turma no sistema"
            aria-label="Cadastrar nova turma"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Turma</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE FERRAMENTAS RESPONSIVA: Busca, Filtros e Limpar                  */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* 1. Campo de Busca com Debounce / Clear */}
          <div className="md:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por turma, série ou sala..."
              aria-label="Buscar turma por nome, série ou sala"
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 2. Filtro de Turno (Somente turnos válidos reais: Matutino / Vespertino; SEM 3º Noite) */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                aria-label="Filtrar por turno"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none transition-all cursor-pointer"
              >
                <option value="ALL">Todos os Turnos</option>
                <option value="matutino">1º Turno (Matutino / Manhã)</option>
                <option value="vespertino">2º Turno (Vespertino / Tarde)</option>
              </select>
            </div>
          </div>

          {/* 3. Filtro de Série / Etapa Real */}
          <div className="md:col-span-2">
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              aria-label="Filtrar por série"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none transition-all cursor-pointer"
            >
              <option value="ALL">Todas as Séries</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* 4. Filtro de Sala */}
          <div className="md:col-span-2">
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              aria-label="Filtrar por sala"
              className="w-full px-3 py-2.5 bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none transition-all cursor-pointer"
            >
              <option value="ALL">Todas as Salas</option>
              {availableRooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 5. Botão Limpar Filtros */}
          <div className="md:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className={`w-full py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 min-h-[42px] ${
                hasActiveFilters
                  ? 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50 shadow-xs cursor-pointer'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
              }`}
              title="Limpar todos os filtros de busca"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          </div>
        </div>

        {/* Feedback visual de filtros ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/80 text-xs">
            <span className="text-slate-500 font-medium">Filtros aplicados:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 font-semibold">
                Busca: "{searchQuery}"
                <button type="button" onClick={() => setSearchQuery('')} className="hover:text-blue-950"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterShift !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 font-semibold">
                Turno: {filterShift === 'matutino' ? '1º Manhã' : '2º Tarde'}
                <button type="button" onClick={() => setFilterShift('ALL')} className="hover:text-blue-950"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterGrade !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 font-semibold">
                Série: {filterGrade}
                <button type="button" onClick={() => setFilterGrade('ALL')} className="hover:text-blue-950"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterRoom !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 font-semibold">
                Sala: {filterRoom}
                <button type="button" onClick={() => setFilterRoom('ALL')} className="hover:text-blue-950"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ESTADOS DA INTERFACE: Carregando, Erro, Lista Vazia & Grade de Cards       */}
      {/* ========================================================================= */}

      {/* 1. Estado de Carregamento (Skeleton Cards em Grade) */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
            Carregando turmas...
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-slate-200 rounded-lg w-20" />
                  <div className="h-5 bg-slate-200 rounded-md w-16" />
                </div>
                <div className="h-4 bg-slate-200 rounded w-28" />
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <div className="h-3.5 bg-slate-200 rounded w-24" />
                  <div className="h-3.5 bg-slate-200 rounded w-32" />
                </div>
                <div className="h-9 bg-slate-200 rounded-xl w-full pt-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Estado de Erro */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600 mb-1">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-rose-900">Não foi possível carregar as turmas.</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {/* 3. Estado de Busca Sem Resultados */}
      {!loading && !error && classes.length > 0 && filteredAndSortedClasses.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-500 mb-1">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhuma turma corresponde à sua busca.</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não encontramos turmas para os termos ou filtros aplicados. Tente buscar por outro nome, sala ou limpe os filtros.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {/* 4. Estado de Nenhuma Turma Cadastrada no Sistema */}
      {!loading && !error && classes.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-blue-100 text-blue-600 mb-1">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhuma turma cadastrada para os filtros selecionados.</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cadastre a primeira turma da escola para gerenciar horários de aulas e alocar professores.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onAddClass}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Turma</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. GRADE DE CARDS RESPONSIVA (DESKTOP: 4/3, TABLET: 2, CELULAR: 1)       */}
      {/* ========================================================================= */}
      {!loading && !error && filteredAndSortedClasses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedClasses.map(c => {
            const isSelected = c.id === selectedClassId;
            const isMorning = !c.shift || c.shift.toLowerCase().includes('matutino') || c.shift.includes('1º');
            const shiftLabel = isMorning ? '1º Manhã' : '2º Tarde';
            const studentsCount = c.students_count ?? 0;
            const hasTeachers = c.teachers && c.teachers.length > 0;

            return (
              <div
                key={c.id}
                id={`card-turma-${c.id}`}
                onClick={() => onSelectClass(c)}
                className={`group relative rounded-2xl p-4.5 border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-500/20 shadow-md transform -translate-y-0.5'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Linha Superior: Nome da Turma + Badge de Turno + Ações Rápidas */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-bold font-serif text-slate-900 group-hover:text-blue-700 transition-colors">
                          {c.name}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black tracking-wide uppercase shadow-xs">
                            <CheckCircle2 className="w-3 h-3" /> Ativa
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        {c.grade || 'Ensino Fundamental'}
                      </span>
                    </div>

                    {/* Botões de Ação: Editar e Excluir */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClass(c, e);
                        }}
                        title="Editar turma"
                        aria-label={`Editar turma ${c.name}`}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClass(c, e);
                        }}
                        title="Arquivar ou excluir turma"
                        aria-label={`Excluir turma ${c.name}`}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Informações da Turma: Turno, Sala, Alunos, Ano */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" /> Turno:
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                        isMorning
                          ? 'bg-blue-100/70 text-blue-800'
                          : 'bg-amber-100/70 text-amber-900'
                      }`}>
                        {shiftLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <DoorClosed className="w-3.5 h-3.5 text-slate-400" /> Sala:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {c.room || 'Sala não definida'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Estudantes:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {studentsCount} {studentsCount === 1 ? 'aluno' : 'alunos'}
                      </span>
                    </div>

                    {/* Professor / Status de Grade */}
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Docentes:
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[130px]" title={c.teachers?.join(', ')}>
                        {hasTeachers ? `${c.teachers!.length} alocado(s)` : 'Sem grade'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha Inferior: Ações Rápidas (Enturmação e Horário) */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManagingStudentsClass(c);
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl text-xs font-bold border border-blue-200/90 bg-blue-50/70 hover:bg-blue-100 text-blue-800 transition-all flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
                    title="Gerenciar estudantes e enturmação desta turma"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Alunos ({studentsCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClass(c);
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'
                    }`}
                  >
                    <span>{isSelected ? 'Grade Ativa' : 'Horário'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Modal de Enturmação e Gerenciamento de Alunos */}
      <ClassStudentsModal
        isOpen={!!managingStudentsClass}
        onClose={() => setManagingStudentsClass(null)}
        classItem={managingStudentsClass}
        organizationId={managingStudentsClass?.organization_id || (classes && classes[0]?.organization_id) || ''}
        onRosterUpdated={() => {
          if (onRetry) onRetry();
        }}
      />
    </div>
  );
};
