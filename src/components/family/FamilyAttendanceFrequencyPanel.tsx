import React, { useState, useEffect, useRef } from 'react';
import { 
  CalendarDays, CheckCircle2, AlertTriangle, Clock, 
  FileText, ShieldCheck, UserCheck, Calendar, Info, 
  ChevronDown, ChevronUp, AlertCircle, Sparkles
} from 'lucide-react';
import { 
  attendanceFrequencyService, 
  StudentAttendanceSummary 
} from '../../services/attendanceFrequencyService';
import { FrequencyLimitCounter } from './FrequencyLimitCounter';

interface FamilyAttendanceFrequencyPanelProps {
  studentId: string;
  studentName: string;
  academicYear?: number;
}

export function FamilyAttendanceFrequencyPanel({
  studentId,
  studentName,
  academicYear = 2026
}: FamilyAttendanceFrequencyPanelProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    // 1. Immediately reset data upon student change to prevent leakage
    setSummary(null);
    setLoading(true);

    const currentReq = ++requestIdRef.current;

    async function loadSummary() {
      try {
        const data = await attendanceFrequencyService.getStudentAttendanceSummary(studentId, academicYear);
        if (currentReq === requestIdRef.current) {
          setSummary(data);
          setLoading(false);
        }
      } catch (err) {
        if (currentReq === requestIdRef.current) {
          console.warn('[FamilyAttendance] Error loading summary:', err);
          setLoading(false);
        }
      }
    }

    if (studentId) {
      loadSummary();
    }
  }, [studentId, academicYear]);

  const absences = summary?.absencesCount || 0;
  const expectedDays = summary?.expectedDays || 200;
  const confirmedPresences = summary?.confirmedPresences || 0;
  const justifiedCount = summary?.justifiedCount || 0;
  const unjustifiedCount = summary?.unjustifiedCount || 0;

  // Percentage of absences reached against 48/54 threshold (progress bar max 54)
  const progressPercent = Math.min(100, Math.round((absences / 54) * 100));

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* HEADER DO PAINEL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
              Frequência Escolar — Faltas e Ausências
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Ano {academicYear}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento oficial de assiduidade escolar para <strong>{studentName}</strong>, com base de 200 dias letivos anuais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Fonte Oficial do Diário
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Consultando registros de frequência de {studentName}...</span>
        </div>
      ) : (
        <>
          {/* CARDS DE FREQUÊNCIA (ESTILO CANÔNICO CLASSIUM) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. DIAS LETIVOS PREVISTOS */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block">
                DIAS LETIVOS PREVISTOS
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono tracking-tight text-slate-900">
                  {expectedDays}
                </span>
                <span className="text-xs font-mono text-slate-500">dias</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                Referência anual LDB (Art. 24)
              </p>
            </div>

            {/* 2. PRESENÇAS CONFIRMADAS */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block">
                ESTIMATIVA DE FREQUÊNCIA ANUAL
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono tracking-tight text-emerald-600">
                  {confirmedPresences > 0 ? confirmedPresences : Math.max(0, expectedDays - absences)}
                </span>
                <span className="text-xs font-mono text-slate-500">dias</span>
              </div>
              <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60 leading-tight">
                Projeção baseada nos dias letivos previstos e nas faltas registradas. Não substitui o registro diário de presença.
              </p>
            </div>

            {/* 3. FALTAS REGISTRADAS */}
            <div className={`rounded-2xl p-5 space-y-1.5 border transition-all ${
              absences >= 48 ? 'bg-rose-50 border-rose-300' :
              absences >= 32 ? 'bg-orange-50 border-orange-300' :
              absences >= 16 ? 'bg-amber-50 border-amber-300' :
              'bg-slate-950 text-white border-slate-800'
            }`}>
              <span className={`text-[10px] uppercase font-mono tracking-widest block ${
                absences >= 16 ? 'text-slate-700 font-bold' : 'text-slate-400'
              }`}>
                FALTAS REGISTRADAS
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black font-mono tracking-tight ${
                  absences >= 48 ? 'text-rose-600' :
                  absences >= 32 ? 'text-orange-600' :
                  absences >= 16 ? 'text-amber-600' :
                  'text-emerald-400'
                }`}>
                  {absences}
                </span>
                <span className={`text-xs font-mono ${absences >= 16 ? 'text-slate-600' : 'text-slate-400'}`}>
                  / {expectedDays} dias
                </span>
              </div>
              <p className={`text-[11px] pt-1 border-t ${
                absences >= 16 ? 'border-slate-300/60 text-slate-700' : 'border-slate-800 text-slate-400'
              }`}>
                {absences >= 16 && <span className="font-bold block mb-1">Atenção à frequência</span>}
                Frequência sujeita à análise da escola, conforme as regras aplicáveis.
              </p>
            </div>

            {/* 4. CONTADOR DE LIMITE DE FREQUÊNCIA (VERMELHO CLARO) */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 flex flex-col items-center justify-between shadow-xs transition-all">
              <div className="w-full text-center pb-1">
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-800 block font-bold">
                  LIMITE DE RETENÇÃO
                </span>
              </div>
              <FrequencyLimitCounter 
                totalAbsences={absences} 
                limit={51} 
                subtitle="Restante para possível retenção"
                footerText="Retenção sujeita à análise da escola, conforme as regras aplicáveis."
              />
            </div>
          </div>

          {/* ROTULAGEM EXPLÍCITA DE SALDO PROJETADO CONFORME PRINCÍPIO OBRIGATÓRIO */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">
                Sobre este painel:
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Este painel ajuda a acompanhar as faltas registradas. A estimativa não substitui a chamada diária feita pela escola. Em caso de dúvida sobre uma ausência, entre em contato com a secretaria.
              </p>
            </div>
          </div>

          {/* ESCALA VISUAL DE MARCOS DE NOTIFICAÇÃO POR FALTAS ACUMULADAS */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-mono font-bold tracking-wider text-slate-300 flex items-center gap-1.5 uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Escala de Marcos de Notificação por Faltas Acumuladas
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {absences} faltas registradas ({progressPercent}% da escala de monitoramento)
              </span>
            </div>

            {/* PROGRESS BAR COM OS MARCOS: 16, 32, 48, 54 */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    absences >= 48 ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600' :
                    absences >= 32 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                    absences >= 16 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
                ></div>
              </div>

              {/* MARCADORES */}
              <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
                <span>0 faltas</span>
                <span className={absences >= 16 ? 'text-amber-400 font-bold' : ''}>Marco 16 (Atenção)</span>
                <span className={absences >= 32 ? 'text-orange-400 font-bold' : ''}>Marco 32 (Alerta)</span>
                <span className={absences >= 48 ? 'text-rose-400 font-bold' : ''}>Marco 48 (Crítico)</span>
                <span className={absences >= 54 ? 'text-purple-400 font-bold' : ''}>54 (Pedagógico)</span>
              </div>
            </div>

            {/* CARDS DESCRITIVOS DOS MARCOS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className={`p-3 rounded-xl border ${
                absences >= 16 && absences < 32 
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  16 faltas — Atenção
                </div>
                <p className="text-[10px] mt-1 text-slate-300/80 leading-relaxed">
                  A escola fará o primeiro encaminhamento para o Conselho Tutelar.
                </p>
              </div>

              <div className={`p-3 rounded-xl border ${
                absences >= 32 && absences < 48 
                  ? 'bg-orange-500/10 border-orange-500/40 text-orange-200' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-orange-300">
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                  32 faltas — Alerta
                </div>
                <p className="text-[10px] mt-1 text-slate-300/80 leading-relaxed">
                  A equipe da escola fará o segundo encaminhamento para o Conselho Tutelar conforme as regras da rede.
                </p>
              </div>

              <div className={`p-3 rounded-xl border ${
                absences >= 48 
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-200' 
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-rose-300">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  48 faltas — Crítico
                </div>
                <p className="text-[10px] mt-1 text-slate-300/80 leading-relaxed">
                  Devido ao alto índice de faltas/ausências, um terceiro encaminhamento será feito ao Conselho Tutelar.
                </p>
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE AUSÊNCIAS EXPANSÍVEL */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Histórico Detalhado de Ausências Registradas ({summary?.history?.length || 0})</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>{showHistory ? 'Ocultar' : 'Ver Histórico'}</span>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showHistory && (
              <div className="p-4 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {!summary?.history || summary.history.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">
                    Nenhum registro de falta lançado para {studentName} no ano letivo {academicYear}.
                  </p>
                ) : (
                  summary.history.map(record => (
                    <div key={record.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-[11px]">
                          {new Date(record.attendance_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {record.status === 'ABSENT' ? 'Falta Não Justificada' :
                             record.status === 'JUSTIFIED' ? 'Falta Justificada' :
                             record.status === 'LATE' ? 'Atraso' : 'Presença'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {record.observations || 'Registro no diário escolar'}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        record.status === 'JUSTIFIED' ? 'bg-sky-100 text-sky-800' :
                        record.status === 'ABSENT' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {record.status === 'JUSTIFIED' ? 'Justificada' : 'Oficial'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
