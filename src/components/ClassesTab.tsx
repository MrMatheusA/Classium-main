import React from 'react';
import { 
  Users, CheckCircle2, AlertTriangle, BookOpen, ChevronRight, 
  ArrowUpRight
} from 'lucide-react';

export interface TeacherClassData {
  id: string;
  class_id?: string;
  name?: string;
  class_name?: string;
  subject?: string;
  subject_name?: string;
  studentsCount?: number;
  students_count?: number;
  attendanceRate?: number;
  averageGrade?: number;
  alerts?: string[];
  room?: string;
  shift?: string;
  is_main?: boolean;
  isMain?: boolean;
  isReference?: boolean;
  students?: any[];
}

interface ClassesTabProps {
  classes?: TeacherClassData[];
  onSelectClass: (classId: string) => void;
  onSelectTab: (tabId: string) => void;
  selectedClass: string;
  substitutionInfo?: { className: string; shift: string; room: string } | null;
}

export function ClassesTab({ classes = [], onSelectClass, onSelectTab, selectedClass, substitutionInfo }: ClassesTabProps) {
  const classesList = (classes || []).filter(Boolean).map(c => ({
    id: c?.class_id || c?.id || 'cls-1',
    name: c?.class_name || c?.name || 'Turma',
    subject: c?.subject_name || c?.subject || 'Disciplina',
    studentsCount: typeof c?.students_count === 'number' ? c.students_count : (typeof c?.studentsCount === 'number' ? c.studentsCount : 0),
    attendanceRate: c?.attendanceRate || 100.0,
    averageGrade: c?.averageGrade || 20.0,
    alerts: c?.alerts || ["Nenhum alerta crítico registrado"],
    room: c?.room || 'Sala 12',
    shift: c?.shift || 'Matutino',
    is_main: Boolean(c?.is_main || c?.isMain || c?.isReference)
  }));

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {substitutionInfo && (
        <div className="p-5 bg-gradient-to-r from-purple-950/90 via-indigo-950 to-slate-900 border-2 border-purple-500/60 rounded-3xl space-y-2 text-left shadow-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-purple-900 text-purple-200 border border-purple-400/40 rounded-lg text-xs font-mono font-extrabold uppercase shadow-md">
              🔄 Turmas do Turno Substituição | Turma: {substitutionInfo.className}
            </span>
            <span className="text-xs text-purple-300 font-bold">({substitutionInfo.shift} • {substitutionInfo.room})</span>
          </div>
          <p className="text-xs text-gray-300 font-light">
            Você está atuando no modo de substituição de turno para a <strong className="text-gold">{substitutionInfo.className}</strong>. Todos os registros de frequência e diário de bordo serão salvos e sincronizados com a coordenação e o docente titular.
          </p>
        </div>
      )}

      <div className="bg-[#0e2149] p-6 rounded-3xl border border-gold/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-gold flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" /> Diretório de Minhas Turmas
          </h3>
          <p className="text-xs text-gray-300 mt-1 max-w-2xl font-light">
            Visualize as estatísticas de desempenho, controle de presença e indicadores consolidados para as salas sob sua responsabilidade docente.
          </p>
        </div>
      </div>

      {classesList.length === 0 ? (
        <div className="bg-[#0e2149] border border-gold/15 rounded-3xl p-12 text-center text-gray-300 space-y-2">
          <Users className="w-12 h-12 text-gold/40 mx-auto" />
          <h4 className="text-base font-serif font-bold text-white">Nenhuma Turma Encontrada</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto font-light">
            Não há turmas ou disciplinas vinculadas ao seu perfil docente no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {classesList.map((cls) => {
            const isSelected = selectedClass === cls.id;
            return (
              <div 
                key={cls.id} 
                className={`bg-[#0e2149] border rounded-3xl p-6 transition-all shadow-xl relative overflow-hidden ${
                  isSelected ? 'border-gold ring-1 ring-gold/25' : 'border-gold/10 hover:border-gold/30'
                }`}
              >
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  
                  {/* Left block info */}
                  <div className="space-y-3 lg:w-1/3">
                    <div className="flex items-center gap-3">
                      <span className="p-2 bg-gold/10 rounded-xl text-gold border border-gold/20">
                        <BookOpen className="w-5 h-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-lg font-serif font-extrabold text-white leading-tight">{cls.name}</h4>
                          {cls.is_main && (
                            <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-[9px] font-extrabold flex items-center gap-1 shrink-0">
                              👨‍🏫⭐ Prof. Referência
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gold/90 font-medium mt-0.5">{cls.subject} • {cls.room}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[9px] bg-white/5 border border-white/5 font-mono text-gray-300 font-semibold px-2 py-0.5 rounded capitalize">
                        Turno: {cls.shift}
                      </span>
                      <span className="text-[9px] bg-[#08142d] border border-gold/10 text-gold font-mono px-2 py-0.5 rounded">
                        Ref: {cls.id}
                      </span>
                    </div>
                  </div>

                  {/* Quantitative statistics panel */}
                  <div className="grid grid-cols-3 gap-3 flex-1">
                    <div className="bg-[#08142d] p-3.5 rounded-2xl border border-white/5 text-center flex flex-col justify-between">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Quantidade</span>
                      <span className="text-sm md:text-base font-extrabold text-white mt-1">{cls.studentsCount} Alunos</span>
                      <span className="text-[8px] text-gray-500 mt-0.5 block font-mono">Matrícula Ativa</span>
                    </div>
                    <div className="bg-[#08142d] p-3.5 rounded-2xl border border-white/5 text-center flex flex-col justify-between">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Frequência</span>
                      <span className="text-sm md:text-base font-extrabold text-emerald-400 mt-1">{cls.attendanceRate.toFixed(1)}%</span>
                      <span className="text-[8px] text-emerald-500/80 mt-0.5 block font-mono">Média Mensal</span>
                    </div>
                    <div className="bg-[#08142d] p-3.5 rounded-2xl border border-white/5 text-center flex flex-col justify-between">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Média Acadêmica</span>
                      <span className="text-sm md:text-base font-extrabold text-gold mt-1">{cls.averageGrade.toFixed(1)} / 20.0</span>
                      <span className="text-[8px] text-gold/80 mt-0.5 block font-mono">Média Geral</span>
                    </div>
                  </div>

                  {/* Alerts lists & Action suite */}
                  <div className="lg:w-1/3 flex flex-col justify-between gap-4">
                    <div className="space-y-2 text-left">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">🚨 Alertas Acadêmicos</span>
                      <div className="space-y-1.5">
                        {cls.alerts.map((al, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[10px] text-gray-300 leading-tight">
                            {al.includes("Nenhum") ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                            )}
                            <span>{al}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onSelectClass(cls.id);
                          onSelectTab('seating');
                        }}
                        className="flex-1 py-2 bg-white/5 hover:bg-gold/10 border border-white/5 hover:border-gold/30 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:text-gold text-center transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Mapeamento</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          onSelectClass(cls.id);
                          onSelectTab('occurrences');
                        }}
                        className="flex-1 py-2 bg-bordeaux hover:bg-bordeaux/90 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Diário</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
