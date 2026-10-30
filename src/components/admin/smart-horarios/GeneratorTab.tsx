import React, { useState, useEffect } from 'react';
import { SmartClass, SmartTeacher, SmartSubject, SmartRoom, TimePeriod, GridAllocation, SmartAlert } from './types';
import { Sparkles, Play, RefreshCw, CheckCircle2, Sliders, ChevronDown, Trash2, Edit3, Eye, Calendar, User, BookOpen, AlertTriangle, CheckSquare, Layers, Copy, Zap, Info, ShieldCheck, Activity, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GeneratorTabProps {
  classes: SmartClass[];
  teachers: SmartTeacher[];
  subjects: SmartSubject[];
  rooms: SmartRoom[];
  hours: TimePeriod[];
  allocations: GridAllocation[];
  setAllocations: React.Dispatch<React.SetStateAction<GridAllocation[]>>;
  alerts: SmartAlert[];
  setAlerts: React.Dispatch<React.SetStateAction<SmartAlert[]>>;
}

export function GeneratorTab({
  classes,
  teachers,
  subjects,
  rooms,
  hours,
  allocations,
  setAllocations,
  alerts,
  setAlerts,
}: GeneratorTabProps) {
  // AI generation simulation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState('');
  const [generationCompleted, setGenerationCompleted] = useState(false);

  // Sincronização geral simulation state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  // Validar Tudo simulation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success: boolean; msg: string; rulesChecked: string[] } | null>(null);

  // Visualization filter mode: class, teacher, room, OR all (Horário Geral)
  const [visualMode, setVisualMode] = useState<'class' | 'teacher' | 'room' | 'all'>('all');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('c-5a'); // Default to 5º Ano A if single view

  // Cell interaction / move state
  const [selectedCell, setSelectedCell] = useState<{ day: string; timeSlot: string; alloc: GridAllocation } | null>(null);
  const [targetSlot, setTargetSlot] = useState<{ day: string; timeSlot: string; classId?: string } | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Cell Details / Actions Modal
  const [activeCellDetails, setActiveCellDetails] = useState<GridAllocation | null>(null);
  
  // Inline editing of selected cell
  const [isEditingCell, setIsEditingCell] = useState(false);
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editRoomId, setEditRoomId] = useState('');

  const daysList = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  // AI progress messages
  useEffect(() => {
    let timer: any;
    if (isGenerating) {
      timer = setInterval(() => {
        setGenProgress(prev => {
          const next = prev + 1;
          if (next >= 100) {
            clearInterval(timer);
            setIsGenerating(false);
            setGenerationCompleted(true);
            setAlerts([]); // Clear active conflicts on success
            return 100;
          }
          if (next < 20) setGenStep('Lendo professores e disponibilidades...');
          else if (next < 40) setGenStep('Calculando carga horária das turmas...');
          else if (next < 60) setGenStep('Distribuindo disciplinas nas salas...');
          else if (next < 80) setGenStep('Verificando e resolvendo conflitos...');
          else setGenStep('Otimizando a grade para reduzir janelas...');
          return next;
        });
      }, 35);
    }
    return () => clearInterval(timer);
  }, [isGenerating, setAlerts]);

  const handleStartAIGeneration = () => {
    setIsGenerating(true);
    setGenProgress(0);
    setGenStep('Iniciando orquestrador inteligente...');
    setGenerationCompleted(false);
  };

  const getSubjectColorClasses = (subjectId: string) => {
    const s = subjects.find(sub => sub.id === subjectId);
    if (!s) return 'bg-slate-900 border-slate-800 text-slate-400';
    switch (s.color) {
      case 'blue': return 'bg-blue-600/20 border-blue-500/45 text-blue-300';
      case 'darkblue': return 'bg-indigo-600/20 border-indigo-500/45 text-indigo-300';
      case 'lightblue': return 'bg-cyan-600/20 border-cyan-500/45 text-cyan-300';
      case 'teal': return 'bg-teal-600/20 border-teal-500/45 text-teal-300';
      case 'green': return 'bg-green-600/20 border-green-500/45 text-green-300';
      case 'darkgreen': return 'bg-emerald-600/20 border-emerald-500/45 text-emerald-300';
      case 'lime': return 'bg-lime-600/20 border-lime-500/45 text-lime-300';
      case 'yellow': return 'bg-yellow-600/20 border-yellow-500/45 text-yellow-300';
      case 'orange': return 'bg-orange-600/20 border-orange-500/45 text-orange-300';
      case 'red': return 'bg-red-600/20 border-red-500/45 text-red-300';
      case 'bordeau': return 'bg-rose-950/40 border-rose-800/50 text-rose-300';
      case 'purple': return 'bg-purple-600/20 border-purple-500/45 text-purple-300';
      case 'lilas': return 'bg-fuchsia-600/20 border-fuchsia-500/45 text-fuchsia-300';
      case 'gray': return 'bg-slate-600/20 border-slate-500/45 text-slate-300';
      case 'brown': return 'bg-amber-950/20 border-amber-900/40 text-amber-200';
      case 'pink': return 'bg-pink-600/20 border-pink-500/45 text-pink-300';
      case 'black': return 'bg-slate-950 border border-slate-800 text-slate-400';
      case 'white': return 'bg-slate-100/10 border-slate-200/30 text-white';
      case 'cyan': return 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200';
      case 'gold': return 'bg-yellow-500/10 border-yellow-400/40 text-yellow-200';
      default: return 'bg-slate-800/20 border-slate-700/45 text-slate-300';
    }
  };

  // Convert "5º Ano A" to standard compact code "521" or "631" etc.
  const getTurmaCode = (name: string) => {
    if (name.includes('5º')) return '521';
    if (name.includes('6º')) return '631';
    if (name.includes('7º')) return '732';
    if (name.includes('8º')) return '841';
    if (name.includes('9º')) return '942';
    return name.replace(/\D/g, '') || '501';
  };

  // Filter allocations depending on visualMode
  const getFilteredAllocations = () => {
    if (visualMode === 'class') {
      return allocations.filter(a => a.classId === selectedTargetId);
    } else if (visualMode === 'teacher') {
      return allocations.filter(a => a.teacherId === selectedTargetId);
    } else if (visualMode === 'room') {
      return allocations.filter(a => a.roomId === selectedTargetId);
    } else {
      return allocations; // Return all for Horário Geral
    }
  };

  const activeAllocations = getFilteredAllocations();
  const activePeriods = hours.filter(h => !h.isInterval);

  const handleCellClick = (day: string, timeSlot: string, alloc: GridAllocation | undefined, classId?: string) => {
    if (alloc) {
      if (selectedCell) {
        // If we already selected a source, clicking another cell with an allocation swaps/permutates them
        setTargetSlot({ day, timeSlot, classId });
        setShowConflictModal(true);
      } else {
        setActiveCellDetails(alloc);
        setEditSubjectId(alloc.subjectId);
        setEditTeacherId(alloc.teacherId);
        setEditRoomId(alloc.roomId);
        setIsEditingCell(false);
      }
    } else {
      if (selectedCell) {
        // Moving cell to an empty slot
        const targetClassId = classId || selectedCell.alloc.classId;
        const updated = allocations.map(a => 
          a.id === selectedCell.alloc.id ? { ...a, day, timeSlot, classId: targetClassId } : a
        );
        setAllocations(updated);
        setSelectedCell(null);
      } else {
        // No source selected and clicked empty, we can choose to register a quick allocation here
        if (classId) {
          const quickAlloc: GridAllocation = {
            id: `alloc-${Date.now()}`,
            classId,
            subjectId: subjects[0]?.id || '',
            teacherId: teachers[0]?.id || '',
            roomId: rooms[0]?.id || '',
            day,
            timeSlot
          };
          setAllocations(prev => [...prev, quickAlloc]);
        }
      }
    }
  };

  const startMovingCell = (alloc: GridAllocation, day: string, timeSlot: string) => {
    setSelectedCell({ day, timeSlot, alloc });
    setActiveCellDetails(null);
  };

  const handleResolveConflict = (reorganizeWithAI: boolean) => {
    if (!selectedCell || !targetSlot) return;
    
    if (reorganizeWithAI) {
      setIsGenerating(true);
      setGenProgress(75);
      setGenStep('Resolvendo conflito e realocando diários automaticamente...');
      setTimeout(() => {
        setIsGenerating(false);
        const updated = allocations.map(a => {
          if (a.id === selectedCell.alloc.id) {
            return { 
              ...a, 
              day: targetSlot.day, 
              timeSlot: targetSlot.timeSlot,
              classId: targetSlot.classId || a.classId
            };
          }
          if (a.day === targetSlot.day && a.timeSlot === targetSlot.timeSlot && (!targetSlot.classId || a.classId === targetSlot.classId)) {
            return { 
              ...a, 
              day: selectedCell.day, 
              timeSlot: selectedCell.timeSlot,
              classId: selectedCell.alloc.classId
            };
          }
          return a;
        });
        setAllocations(updated);
        setSelectedCell(null);
        setTargetSlot(null);
        setShowConflictModal(false);
      }, 800);
    } else {
      const updated = allocations.map(a => {
        if (a.id === selectedCell.alloc.id) {
          return { 
            ...a, 
            day: targetSlot.day, 
            timeSlot: targetSlot.timeSlot,
            classId: targetSlot.classId || a.classId
          };
        }
        if (a.day === targetSlot.day && a.timeSlot === targetSlot.timeSlot && (!targetSlot.classId || a.classId === targetSlot.classId)) {
          return { 
            ...a, 
            day: selectedCell.day, 
            timeSlot: selectedCell.timeSlot,
            classId: selectedCell.alloc.classId
          };
        }
        return a;
      });
      setAllocations(updated);
      setSelectedCell(null);
      setTargetSlot(null);
      setShowConflictModal(false);
    }
  };

  const deleteAllocation = (id: string) => {
    setAllocations(prev => prev.filter(a => a.id !== id));
    setActiveCellDetails(null);
  };

  const duplicateAllocation = (alloc: GridAllocation) => {
    // Find next free day or slot to duplicate
    const currentDayIdx = daysList.indexOf(alloc.day);
    const nextDay = daysList[(currentDayIdx + 1) % daysList.length];
    
    const duplicated: GridAllocation = {
      ...alloc,
      id: `alloc-dup-${Date.now()}`,
      day: nextDay
    };
    
    setAllocations(prev => [...prev, duplicated]);
    setActiveCellDetails(null);
  };

  const saveCellEdits = () => {
    if (!activeCellDetails) return;
    setAllocations(prev => prev.map(a => a.id === activeCellDetails.id ? {
      ...a,
      subjectId: editSubjectId,
      teacherId: editTeacherId,
      roomId: editRoomId
    } : a));
    setIsEditingCell(false);
    setActiveCellDetails(null);
  };

  // Validar Tudo simulator
  const handleValidateAllRules = () => {
    setIsValidating(true);
    setValidationResult(null);
    setTimeout(() => {
      setIsValidating(false);
      setValidationResult({
        success: true,
        msg: 'Validação Concluída! Todas as regras pedagógicas e de infraestrutura foram cumpridas com sucesso.',
        rulesChecked: [
          'Inexistência de choque de horários para professores (Zero duplicidades)',
          'Inexistência de choque de reservas para salas físicas',
          'Respeito absoluto às janelas e restrições de cada docente',
          'Atendimento à carga horária semanal contratada de cada turma',
          'Agrupamento ideal de aulas geminadas por disciplina'
        ]
      });
    }, 1200);
  };

  // Dynamic automatic synchronization simulation
  const handleTriggerGlobalSync = () => {
    setIsSyncing(true);
    setSyncDone(false);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 4500);
    }, 1000);
  };

  return (
    <div className="space-y-6 text-white text-left">
      
      {/* Dynamic Sincronização bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-950 flex items-center justify-center text-blue-400">
            <Zap className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block">Orquestração Ativa</span>
            <p className="text-xs font-semibold text-slate-200">
              Sincronização Geral Automática Ativa (Alterações propagam-se em tempo real)
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerGlobalSync}
          disabled={isSyncing}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-blue-200" />
          )}
          {isSyncing ? 'Sincronizando...' : 'Atualizar Tudo Automaticamente'}
        </button>
      </div>

      <AnimatePresence>
        {syncDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-green-950/20 border border-green-500/30 rounded-3xl text-xs space-y-2"
          >
            <div className="flex items-center gap-2 text-green-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Sincronização Efetuada com Sucesso! (Sem necessidade de republicar)
            </div>
            <p className="text-slate-400 text-[10px]">
              Os dados foram atualizados no Horário da Turma, Horário do Professor, Horário da Sala, Painel Classium Professor, Diário de Classe, Frequência e no Painel Classium Família instantaneamente.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPPER BLOCK FOR ALGORITHM & IA */}
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1 max-w-xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-widest block">Inteligência Heurística</span>
          <h3 className="font-serif text-sm font-bold text-white">Algoritmo Evolutivo Avançado</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Configure todas as restrições e clique no botão abaixo. Nosso orquestrador processará milhares de combinações para entregar uma grade sem conflitos e com o menor número possível de janelas docentes.
          </p>
        </div>

        <button
          onClick={handleStartAIGeneration}
          disabled={isGenerating}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] disabled:opacity-50 shrink-0 self-start md:self-center"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current text-white" />
          )}
          {isGenerating ? 'Otimizando Grade...' : 'GERAR HORÁRIO INTELIGENTE'}
        </button>
      </div>

      {/* Generation progress animations */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 bg-indigo-950/20 border border-indigo-900/40 rounded-3xl text-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-400 flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-4 h-4" />
                {genStep}
              </span>
              <span className="font-mono text-slate-400">{genProgress}%</span>
            </div>
            
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full"
                animate={{ width: `${genProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results banner post-gen */}
      {generationCompleted && !isGenerating && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-slate-300">
              <h4 className="font-bold text-white">Grade Gerada com Sucesso pela IA!</h4>
              <p>Otimização concluída com score de confiabilidade máximo de <strong>98%</strong> e zero conflitos.</p>
            </div>
          </div>

          <div className="flex gap-4 font-mono text-[10px] bg-slate-950 px-4 py-2 rounded-2xl border border-slate-850">
            <div>
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Conflitos</span>
              <span className="text-green-400 font-bold">0</span>
            </div>
            <div className="border-l border-slate-850 pl-4">
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Janelas</span>
              <span className="text-yellow-400 font-bold">2</span>
            </div>
            <div className="border-l border-slate-850 pl-4">
              <span className="text-slate-500 block text-[8px] uppercase font-bold">Carga Atendida</span>
              <span className="text-white font-bold">100%</span>
            </div>
          </div>
        </div>
      )}

      {/* INDICADORES INTELIGENTES (Above grid) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl text-left space-y-1">
          <span className="text-[8px] uppercase text-slate-500 font-mono font-bold block">Conflitos</span>
          <p className="text-sm font-serif font-bold text-green-400 flex items-center gap-1">
            <span>0</span>
            <span className="text-[9px] bg-green-950 text-green-400 font-bold px-1.5 rounded">OK</span>
          </p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl text-left space-y-1">
          <span className="text-[8px] uppercase text-slate-500 font-mono font-bold block">Carga Horária</span>
          <p className="text-sm font-serif font-bold text-blue-400">100%</p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl text-left space-y-1">
          <span className="text-[8px] uppercase text-slate-500 font-mono font-bold block">Salas Livres</span>
          <p className="text-sm font-serif font-bold text-yellow-500">3 salas</p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl text-left space-y-1">
          <span className="text-[8px] uppercase text-slate-500 font-mono font-bold block">Professores Livres</span>
          <p className="text-sm font-serif font-bold text-purple-400">5 profrs</p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-2xl text-left space-y-1">
          <span className="text-[8px] uppercase text-slate-500 font-mono font-bold block">Turmas sem Aula</span>
          <p className="text-sm font-serif font-bold text-emerald-400">0 turmas</p>
        </div>
        <div className="p-3 bg-slate-900/40 border border-[#D4AF37]/35 rounded-2xl text-left space-y-1 relative overflow-hidden bg-slate-950/20">
          <div className="absolute right-1.5 top-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-spin" />
          </div>
          <span className="text-[8px] uppercase text-slate-400 font-mono font-bold block">Otimização</span>
          <p className="text-sm font-serif font-bold text-[#D4AF37]">99%</p>
        </div>
      </div>

      {/* GRADE VISUAL TIMETABLE TOOLBAR */}
      <div className="space-y-4">
        
        {/* Visualizer Filters & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/20 border border-slate-850 p-3 rounded-2xl text-xs">
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono mr-1.5">Visualização</span>
            
            <button
              onClick={() => setVisualMode('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${visualMode === 'all' ? 'bg-[#D4AF37] text-slate-950 shadow-md' : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white'}`}
            >
              Horário Geral (aSc Mode)
            </button>

            <button
              onClick={() => {
                setVisualMode('class');
                setSelectedTargetId(classes[0]?.id || 'c-5a');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${visualMode === 'class' ? 'bg-blue-600 text-white' : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white'}`}
            >
              Por Turma
            </button>

            <button
              onClick={() => {
                setVisualMode('teacher');
                setSelectedTargetId(teachers[0]?.id || 't-carlos');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${visualMode === 'teacher' ? 'bg-blue-600 text-white' : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white'}`}
            >
              Por Professor
            </button>

            <button
              onClick={() => {
                setVisualMode('room');
                setSelectedTargetId(rooms[0]?.id || 'r-08');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${visualMode === 'room' ? 'bg-blue-600 text-white' : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white'}`}
            >
              Por Sala
            </button>
          </div>

          <div className="flex items-center gap-2">
            {visualMode !== 'all' && (
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-850">
                <ChevronDown className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="bg-transparent border-none text-white outline-none font-semibold cursor-pointer py-0 pr-6 text-xs"
                >
                  {visualMode === 'class' && classes.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-950 text-slate-200">{c.name} ({c.shift})</option>
                  ))}
                  {visualMode === 'teacher' && teachers.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-950 text-slate-200">{t.name} ({t.subject})</option>
                  ))}
                  {visualMode === 'room' && rooms.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-950 text-slate-200">{r.name} ({r.type})</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleValidateAllRules}
              disabled={isValidating}
              className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[#D4AF37] font-bold rounded-xl flex items-center gap-1.5 transition-all shrink-0 font-mono text-[10px]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {isValidating ? 'Validando...' : 'VALIDAR TUDO'}
            </button>
          </div>

        </div>

        {/* Selected cell movement prompts */}
        {selectedCell && (
          <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-2xl flex items-center justify-between text-xs text-amber-400 animate-pulse">
            <span>
              Mover aula selecionada de <strong>{subjects.find(s => s.id === selectedCell.alloc.subjectId)?.name}</strong>. Escolha qualquer slot para posicionar ou trocar.
            </span>
            <button
              onClick={() => setSelectedCell(null)}
              className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white font-mono font-bold text-[10px]"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* 1. HORÁRIO GERAL (aSc TimeTables Mode) */}
        {visualMode === 'all' && (
          <div className="overflow-x-auto border border-slate-850 rounded-2xl bg-slate-950/40">
            <table className="w-full border-collapse text-left text-[10px] min-w-[1000px]">
              <thead>
                {/* Header Row 1: Weekdays */}
                <tr className="bg-slate-950 border-b border-slate-850">
                  <th className="p-2 border-r border-slate-850 w-24 font-mono font-bold text-[9px] uppercase tracking-wider text-slate-400">Turmas (aSc)</th>
                  {daysList.map(day => (
                    <th 
                      key={day} 
                      colSpan={activePeriods.length} 
                      className="p-2 text-center font-bold font-serif text-[11px] uppercase tracking-widest text-[#D4AF37] border-r border-slate-900 bg-slate-900/35"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
                {/* Header Row 2: Subdivisions */}
                <tr className="bg-slate-950/80 border-b border-slate-850 font-mono text-[8.5px] text-slate-500 uppercase tracking-wider">
                  <th className="p-1.5 border-r border-slate-850">Cód | Nome</th>
                  {daysList.map(day => 
                    activePeriods.map((p, idx) => (
                      <th key={day + p.id} className="p-1 text-center border-r border-slate-900/80">
                        {idx + 1}ª Aula
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 font-medium">
                {classes.map(c => {
                  const code = getTurmaCode(c.name);
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/20 text-slate-300">
                      {/* Lateral Header */}
                      <td className="p-2 border-r border-slate-850 font-mono text-left bg-slate-950/40">
                        <div className="font-serif font-bold text-white text-[11px]">{code}</div>
                        <div className="text-[8px] text-slate-500 truncate max-w-[80px]">{c.name}</div>
                      </td>

                      {/* Cells per Day and Period */}
                      {daysList.map(day => 
                        activePeriods.map(p => {
                          const slotRange = `${p.start} - ${p.end}`;
                          const cellAlloc = allocations.find(a => a.classId === c.id && a.day === day && a.timeSlot === slotRange);
                          
                          const subj = cellAlloc ? subjects.find(s => s.id === cellAlloc.subjectId) : null;
                          const teacher = cellAlloc ? teachers.find(t => t.id === cellAlloc.teacherId) : null;
                          const room = cellAlloc ? rooms.find(r => r.id === cellAlloc.roomId) : null;

                          const isSelectedSource = selectedCell?.day === day && selectedCell?.timeSlot === slotRange && selectedCell?.alloc.classId === c.id;

                          return (
                            <td
                              key={day + p.id}
                              onClick={() => handleCellClick(day, slotRange, cellAlloc, c.id)}
                              className={`p-1 border-r border-slate-900 h-14 w-[60px] text-center relative transition-all cursor-pointer ${
                                isSelectedSource 
                                  ? 'bg-amber-950/50 border-2 border-amber-500' 
                                  : 'hover:bg-slate-900/35'
                              }`}
                            >
                              {cellAlloc && subj ? (
                                <div 
                                  className={`p-1 rounded-lg h-full border flex flex-col justify-between text-left transition-all hover:scale-[1.02] ${getSubjectColorClasses(subj.id)}`}
                                >
                                  <div className="flex justify-between items-center text-[9px] font-extrabold leading-none">
                                    <span className="truncate">{(subj?.name || 'AULA').substring(0, 4).toUpperCase()}</span>
                                    <span className="text-[7px] text-slate-400 font-mono font-medium">{(room?.name || 'Sala').replace('Sala ', 'S')}</span>
                                  </div>
                                  <div className="text-[7.5px] opacity-80 leading-none truncate font-semibold">
                                    {teacher?.name ? teacher.name.split(' ')[0] : 'Docente'}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full rounded-lg border border-dashed border-slate-850/30 flex items-center justify-center text-[7.5px] text-slate-700 italic hover:border-slate-800 transition-colors">
                                  -
                                </div>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. STANDARD VISUALIZATION MODES (Turma, Professor, Sala Single Schedules) */}
        {visualMode !== 'all' && (
          <div className="overflow-x-auto border border-slate-850 rounded-2xl bg-slate-950/20">
            <table className="w-full border-collapse text-left text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-mono text-[9px] uppercase tracking-wider border-b border-slate-850">
                  <th className="p-3 w-28 border-r border-slate-850">Horário</th>
                  {daysList.map(day => (
                    <th key={day} className="p-3 text-center">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {hours.map(h => {
                  if (h.isInterval) {
                    return (
                      <tr key={h.id} className="bg-slate-950/50 text-slate-500 font-mono text-[10px]">
                        <td className="p-2.5 font-bold border-r border-slate-850 text-left pl-3">
                          {h.start} - {h.end}
                        </td>
                        <td colSpan={5} className="p-2.5 text-center tracking-widest font-bold uppercase">
                          ☕ Intervalo Escolar / Recreio
                        </td>
                      </tr>
                    );
                  }

                  const slotRange = `${h.start} - ${h.end}`;

                  return (
                    <tr key={h.id} className="text-slate-300">
                      {/* Time Column */}
                      <td className="p-3 font-mono font-bold text-slate-400 bg-slate-950/40 border-r border-slate-850 text-left">
                        {slotRange}
                      </td>

                      {/* Weekday Slots */}
                      {daysList.map(day => {
                        const slotAlloc = activeAllocations.find(a => a.day === day && a.timeSlot === slotRange);
                        const subj = slotAlloc ? subjects.find(s => s.id === slotAlloc.subjectId) : null;
                        const teacher = slotAlloc ? teachers.find(t => t.id === slotAlloc.teacherId) : null;
                        const room = slotAlloc ? rooms.find(r => r.id === slotAlloc.roomId) : null;
                        const cls = slotAlloc ? classes.find(c => c.id === slotAlloc.classId) : null;

                        const isSelectedSource = selectedCell?.day === day && selectedCell?.timeSlot === slotRange && (!selectedCell.alloc.classId || selectedCell.alloc.classId === selectedTargetId);

                        return (
                          <td 
                            key={day}
                            onClick={() => handleCellClick(day, slotRange, slotAlloc)}
                            className={`p-1.5 h-16 w-1/5 transition-all relative select-none group border-r border-slate-900 ${
                              isSelectedSource ? 'bg-amber-950/40 border-2 border-amber-500' : 'hover:bg-slate-900/30'
                            }`}
                          >
                            {slotAlloc && subj ? (
                              <div 
                                className={`p-2 rounded-xl h-full border text-left flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] ${getSubjectColorClasses(subj.id)}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[11px] truncate">{subj?.name || 'Disciplina'}</span>
                                  <span className="text-[7.5px] uppercase font-mono tracking-wider font-bold bg-slate-950/40 px-1 py-0.5 rounded">
                                    {visualMode === 'room' ? (cls?.name || 'Turma') : (room?.name || 'Sala')}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[9px] opacity-80">
                                  <span className="truncate max-w-[80px]">
                                    {teacher?.name ? `${teacher.name.split(' ')[0]} ${teacher.name.split(' ')[1] || ''}` : 'Docente'}
                                  </span>
                                  {visualMode !== 'class' && (
                                    <span className="font-serif font-bold text-white text-[9.5px]">{cls?.name || 'Turma'}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="h-full rounded-xl border border-dashed border-slate-850/50 flex items-center justify-center text-[9px] text-slate-600 italic hover:border-slate-800 transition-colors cursor-pointer">
                                Vazio
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
        )}

      </div>

      {/* CELL DETAILS & CORE ACTIONS DIALOG */}
      {activeCellDetails && (() => {
        const subj = subjects.find(s => s.id === activeCellDetails.subjectId);
        const teacher = teachers.find(t => t.id === activeCellDetails.teacherId);
        const room = rooms.find(r => r.id === activeCellDetails.roomId);
        const cls = classes.find(c => c.id === activeCellDetails.classId);

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-sm p-6 text-left space-y-4 shadow-2xl animate-fade-in text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 font-mono">Ações da Aula</span>
                <span className="text-[10px] text-blue-400 font-bold bg-blue-950/20 px-2 py-0.5 rounded-lg border border-blue-900/30 font-mono">
                  {activeCellDetails.day} • {activeCellDetails.timeSlot}
                </span>
              </div>

              {!isEditingCell ? (
                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-blue-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-mono">Disciplina</span>
                      <p className="font-bold text-white text-sm">{subj?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-[#D4AF37]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-mono">Docente</span>
                      <p className="font-bold text-white text-sm">{teacher?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-green-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-mono">Turma</span>
                      <p className="font-bold text-white text-sm">{cls?.name} ({cls?.shift})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-purple-400">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 uppercase block font-mono">Sala Física</span>
                      <p className="font-bold text-white text-sm">{room?.name} ({room?.type})</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono text-slate-500">Disciplina</label>
                    <select
                      value={editSubjectId}
                      onChange={(e) => setEditSubjectId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono text-slate-500">Professor</label>
                    <select
                      value={editTeacherId}
                      onChange={(e) => setEditTeacherId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none"
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-mono text-slate-500">Sala Reservada</label>
                    <select
                      value={editRoomId}
                      onChange={(e) => setEditRoomId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl p-2.5 text-white outline-none"
                    >
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Operations Footer */}
              <div className="flex flex-col gap-2 pt-3 border-t border-slate-850 text-xs">
                {!isEditingCell ? (
                  <>
                    <button
                      onClick={() => startMovingCell(activeCellDetails, activeCellDetails.day, activeCellDetails.timeSlot)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <Sliders className="w-3.5 h-3.5" /> Mover Horário / Swap
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIsEditingCell(true)}
                        className="py-2 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" /> Editar
                      </button>

                      <button
                        onClick={() => duplicateAllocation(activeCellDetails)}
                        className="py-2 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-400" /> Duplicar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => deleteAllocation(activeCellDetails.id)}
                        className="py-2 bg-rose-950 border border-rose-900/50 hover:bg-rose-900 text-rose-400 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remover
                      </button>
                      <button
                        onClick={() => setActiveCellDetails(null)}
                        className="py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-semibold rounded-xl"
                      >
                        Fechar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={saveCellEdits}
                      className="py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl"
                    >
                      Salvar Alterações
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingCell(false)}
                      className="py-2 bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* CONFLICT / SWAP RESOLUTION MODAL */}
      {showConflictModal && selectedCell && targetSlot && (() => {
        const sourceSubj = subjects.find(s => s.id === selectedCell.alloc.subjectId);
        const sourceTeacher = teachers.find(t => t.id === selectedCell.alloc.teacherId);
        
        // Find existing allocation in target slot (if any)
        const targetAlloc = allocations.find(a => a.day === targetSlot.day && a.timeSlot === targetSlot.timeSlot && (!targetSlot.classId || a.classId === targetSlot.classId));
        const targetSubj = targetAlloc ? subjects.find(s => s.id === targetAlloc.subjectId) : null;
        const targetTeacher = targetAlloc ? teachers.find(t => t.id === targetAlloc.teacherId) : null;

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-left space-y-5 shadow-2xl animate-fade-in text-white">
              <div className="flex items-center gap-2 text-yellow-500 pb-2 border-b border-slate-850">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-serif text-sm font-bold text-white">Alerta de Permutação Escolar</h3>
              </div>

              <div className="space-y-3.5 text-xs text-slate-300">
                <p>
                  Você está tentando arrastar a aula de <strong>{sourceSubj?.name || 'Disciplina'}</strong> ({sourceTeacher?.name ? sourceTeacher.name.split(' ')[0] : 'Docente'}) para o slot de <strong>{targetSlot.day} às {targetSlot.timeSlot}</strong>, que já possui a aula de <strong>{targetSubj?.name || 'Disciplina'}</strong> ({targetTeacher?.name ? targetTeacher.name.split(' ')[0] : 'Docente'}) alocada.
                </p>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 text-[10px] space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Origem</span>
                    <span>{selectedCell.day} • {selectedCell.timeSlot}</span>
                  </div>
                  <div className="flex items-center justify-between text-white font-bold">
                    <span>{sourceSubj?.name}</span>
                    <span>{sourceTeacher?.name}</span>
                  </div>
                  <div className="border-t border-slate-800 my-1"></div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Destino</span>
                    <span>{targetSlot.day} • {targetSlot.timeSlot}</span>
                  </div>
                  <div className="flex items-center justify-between text-yellow-500 font-bold">
                    <span>{targetSubj?.name}</span>
                    <span>{targetTeacher?.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 text-xs">
                <button
                  onClick={() => handleResolveConflict(true)}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10"
                >
                  <Sparkles className="w-4 h-4 text-purple-200" /> SIM, Otimizar e reorganizar com IA
                </button>
                <button
                  onClick={() => handleResolveConflict(false)}
                  className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-semibold rounded-xl"
                >
                  Apenas permutar posições manualmente
                </button>
                <button
                  onClick={() => {
                    setSelectedCell(null);
                    setTargetSlot(null);
                    setShowConflictModal(false);
                  }}
                  className="w-full py-2 bg-transparent text-slate-500 hover:text-slate-400 font-semibold"
                >
                  Cancelar alteração
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* VALIDAR TUDO RESULTS DIALOG */}
      <AnimatePresence>
        {validationResult && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-left space-y-4 shadow-2xl text-white"
            >
              <div className="flex items-center gap-2 text-green-400 pb-2 border-b border-slate-850">
                <ShieldCheck className="w-6 h-6 shrink-0" />
                <h3 className="font-serif text-sm font-bold text-white">Relatório de Conformidade Pedagógica</h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <p className="text-slate-300 font-medium">{validationResult.msg}</p>
                
                <div className="space-y-2 p-3.5 bg-slate-900/60 rounded-2xl border border-slate-850">
                  <span className="text-[9px] uppercase font-bold text-slate-500 font-mono block">Regras Verificadas:</span>
                  <div className="space-y-2">
                    {validationResult.rulesChecked.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-300 text-[10.5px]">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setValidationResult(null)}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  Entendido, Ótimo!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
