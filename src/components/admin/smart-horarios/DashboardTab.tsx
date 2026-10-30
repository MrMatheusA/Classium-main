import React from 'react';
import { SmartClass, SmartTeacher, SmartSubject, SmartRoom } from './types';
import { Users, GraduationCap, BookOpen, Warehouse, Percent, Shield, AlertTriangle, CheckCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface DashboardTabProps {
  classes: SmartClass[];
  teachers: SmartTeacher[];
  subjects: SmartSubject[];
  rooms: SmartRoom[];
  status: 'Não iniciado' | 'Em configuração' | 'Gerando' | 'Publicado';
  setStatus: (s: any) => void;
  onNavigateToStep: (step: string) => void;
  selectedTurno: string;
}

export function DashboardTab({
  classes,
  teachers,
  subjects,
  rooms,
  status,
  setStatus,
  onNavigateToStep,
  selectedTurno,
}: DashboardTabProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Não iniciado': return 'text-slate-500 bg-slate-950 border-slate-800';
      case 'Em configuração': return 'text-blue-400 bg-blue-950/20 border-blue-900/45 animate-pulse';
      case 'Gerando': return 'text-purple-400 bg-purple-950/20 border-purple-900/45 animate-pulse';
      case 'Publicado': return 'text-green-400 bg-green-950/20 border-green-900/45';
      default: return 'text-slate-400 bg-slate-950 border-slate-800';
    }
  };

  const statusList = ['Não iniciado', 'Em configuração', 'Gerando', 'Publicado'] as const;

  const isTodos = selectedTurno === 'Todos';
  const totalTeachers = isTodos ? 42 : teachers.length;
  const totalClasses = isTodos ? 31 : classes.length;
  const totalSubjects = isTodos ? 15 : subjects.length;
  const totalRooms = isTodos ? 28 : rooms.length;

  return (
    <div className="space-y-6">
      {/* Upper overview status & setup steps info */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Module Status Card */}
        <div className="md:col-span-6 bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Status Atual do Processo</span>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
                <span className="w-2 h-2 rounded-full bg-current"></span>
                {status}
              </span>
              <span className="text-xs text-slate-400">Ano Letivo: 2026</span>
            </div>
            <p className="text-xs text-slate-400 pt-1 leading-relaxed">
              O módulo <strong>Smart Horários</strong> orquestra de forma automática toda a logística semanal de professores, disciplinas, salas e restrições operacionais usando IA avançada.
            </p>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-slate-800/40">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Simular Status do Processo:</span>
            <div className="flex flex-wrap gap-1.5">
              {statusList.map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase transition-all ${
                    status === s
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Setup Progression Checklist */}
        <div className="md:col-span-6 bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h4 className="font-serif text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#D4AF37]" /> Progresso em 5 Etapas
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button 
              onClick={() => onNavigateToStep('configuracao')} 
              className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 rounded-2xl text-left flex items-center justify-between group transition-all"
            >
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 uppercase font-mono font-bold block">Etapa 1</span>
                <span className="text-white font-semibold group-hover:text-[#D4AF37] transition-colors">1. Configuração</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigateToStep('turmas')} 
              className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 rounded-2xl text-left flex items-center justify-between group transition-all"
            >
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 uppercase font-mono font-bold block">Etapa 2</span>
                <span className="text-white font-semibold group-hover:text-[#D4AF37] transition-colors">2. Cadastro</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigateToStep('restricoes')} 
              className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 rounded-2xl text-left flex items-center justify-between group transition-all"
            >
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 uppercase font-mono font-bold block">Etapa 3</span>
                <span className="text-white font-semibold group-hover:text-[#D4AF37] transition-colors">3. Restrições</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigateToStep('gerador-ia')} 
              className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 rounded-2xl text-left flex items-center justify-between group transition-all"
            >
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 uppercase font-mono font-bold block">Etapa 4</span>
                <span className="text-white font-semibold group-hover:text-[#D4AF37] transition-colors">4. Gerar Horário IA</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigateToStep('publicacao')} 
              className="p-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-850 rounded-2xl text-left flex items-center justify-between group transition-all sm:col-span-2"
            >
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 uppercase font-mono font-bold block">Etapa 5</span>
                <span className="text-white font-semibold group-hover:text-[#D4AF37] transition-colors">5. Publicar Grade</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      </div>

      {/* Highlights metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 p-4.5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Professores</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-serif font-semibold text-white">{totalTeachers}</p>
          <span className="text-[9px] text-slate-500 block">{isTodos ? 'Corpo docente ativo' : `Ativos no ${selectedTurno}`}</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4.5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Turmas</span>
            <GraduationCap className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-2xl font-serif font-semibold text-white">{totalClasses}</p>
          <span className="text-[9px] text-slate-500 block">{isTodos ? 'Turmas cadastradas' : `Turmas do ${selectedTurno}`}</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4.5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Disciplinas</span>
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-2xl font-serif font-semibold text-white">{totalSubjects}</p>
          <span className="text-[9px] text-slate-500 block">{isTodos ? 'Grade curricular ativa' : `Disciplinas do ${selectedTurno}`}</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4.5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Salas Físicas</span>
            <Warehouse className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-serif font-semibold text-white">{totalRooms}</p>
          <span className="text-[9px] text-slate-500 block">{isTodos ? 'Espaços disponíveis' : `Salas do ${selectedTurno}`}</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4.5 rounded-2xl space-y-1 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Carga Horária</span>
            <Percent className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl font-serif font-semibold text-white">100%</p>
          <span className="text-[9px] text-slate-500 block">Aulas distribuídas</span>
        </div>
      </div>

      {/* Integration highlight banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 border border-blue-900/20 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl text-xs">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-blue-400" />
            Integração Omnichannel com o Ecossistema ERP Classium
          </h4>
          <p className="text-slate-400">
            A publicação de um novo horário notifica instantaneamente os professores em seus painéis, os pais/estudantes via aplicativo da família, e sincroniza os diários de classe digitais sem retrabalho.
          </p>
        </div>
        <button 
          onClick={() => onNavigateToStep('publicacao')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-800 shrink-0 transition-all"
        >
          Visualizar Painel Integrado
        </button>
      </div>
    </div>
  );
}
