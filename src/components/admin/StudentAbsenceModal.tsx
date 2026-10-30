import React, { useState } from 'react';
import { 
  X, Calendar, AlertCircle, CheckCircle2, FileText, 
  Clock, ShieldAlert, ArrowRight, UserCheck, CalendarDays,
  FileCheck
} from 'lucide-react';
import { attendanceFrequencyService, RecordAbsencePayload } from '../../services/attendanceFrequencyService';

interface StudentAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id?: string;
    student_id?: string;
    name?: string;
    full_name?: string;
    registration_code?: string;
    code?: string;
    class_name?: string;
    classes?: any[];
  } | null;
  onSuccess: () => void;
  academicYear?: number;
}

export function StudentAbsenceModal({
  isOpen,
  onClose,
  student,
  onSuccess,
  academicYear = 2026
}: StudentAbsenceModalProps) {
  if (!isOpen || !student) return null;

  const studentId = student.id || student.student_id || '';
  const studentName = student.full_name || student.name || 'Estudante';
  const registrationCode = student.registration_code || student.code || 'RA-2026';
  const className = student.class_name || (student.classes?.[0]?.name) || 'Turma 522';

  const [mode, setMode] = useState<'single' | 'weekly'>('single');
  const [singleDate, setSingleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Weekly selection: start date of week, and select specific weekdays (Mon-Fri)
  const [weekStartDate, setWeekStartDate] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  
  const [selectedWeekdays, setSelectedWeekdays] = useState<Record<number, boolean>>({
    1: true, // Monday
    2: true, // Tuesday
    3: true, // Wednesday
    4: true, // Thursday
    5: true  // Friday
  });

  const [status, setStatus] = useState<'ABSENT' | 'JUSTIFIED' | 'PRESENT' | 'LATE'>('ABSENT');
  const [justification, setJustification] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [hasMedicalDocument, setHasMedicalDocument] = useState<boolean>(false);
  const [documentProtocol, setDocumentProtocol] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'summary'>('form');

  // Calculate concrete dates for weekly mode
  const getWeeklyDates = (): string[] => {
    const dates: string[] = [];
    const base = new Date(weekStartDate + 'T12:00:00');
    for (let i = 0; i < 5; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dayOfWeek = d.getDay(); // 1=Mon, ..., 5=Fri
      if (selectedWeekdays[dayOfWeek]) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const datesToRecord = mode === 'single' ? [singleDate] : getWeeklyDates();

  const handleToggleWeekday = (day: number) => {
    setSelectedWeekdays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const handleProceedToSummary = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (datesToRecord.length === 0) {
      setErrorMsg('Selecione pelo menos uma data letiva para lançamento.');
      return;
    }

    if (status === 'JUSTIFIED' && !justification.trim()) {
      setErrorMsg('Para falta justificada, é necessário descrever o motivo ou embasamento.');
      return;
    }

    setStep('summary');
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: RecordAbsencePayload = {
        student_id: studentId,
        dates: datesToRecord,
        status: status,
        observations: observations.trim() || undefined,
        justification: justification.trim() || (status === 'JUSTIFIED' ? 'Justificativa apresentada' : undefined),
        attachment_url: hasMedicalDocument && documentProtocol ? `protocol:${documentProtocol}` : undefined
      };

      await attendanceFrequencyService.recordStudentAbsence(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save absence error:', err);
      setErrorMsg(err.message || 'Erro ao persistir frequência no Supabase.');
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-white shadow-2xl relative max-h-[92vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Lançamento de Frequência Escolar
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Ano {academicYear}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {studentName} • {registrationCode} • {className}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/50 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handleProceedToSummary} className="space-y-4 mt-5">
            {/* TIPO DE LANÇAMENTO (INDIVIDUAL OU SEMANAL) */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Modalidade de Lançamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    mode === 'single'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Data Específica
                </button>
                <button
                  type="button"
                  onClick={() => setMode('weekly')}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    mode === 'weekly'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  Semanal em Lote (Dias Úteis)
                </button>
              </div>
            </div>

            {/* SELEÇÃO DE DATA / SEMANA */}
            {mode === 'single' ? (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Data da Ocorrência / Chamada
                </label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2 bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Segunda-feira de Referência
                  </label>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Selecione os dias letivos da semana com ausência:
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                    {[
                      { day: 1, label: 'Seg' },
                      { day: 2, label: 'Ter' },
                      { day: 3, label: 'Qua' },
                      { day: 4, label: 'Qui' },
                      { day: 5, label: 'Sex' }
                    ].map(({ day, label }) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleWeekday(day)}
                        className={`p-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                          selectedWeekdays[day]
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STATUS DA FREQUÊNCIA */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Situação Registrada
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'ABSENT', label: 'Falta', color: 'bg-rose-500/20 border-rose-500/50 text-rose-300' },
                  { value: 'JUSTIFIED', label: 'Justificada', color: 'bg-sky-500/20 border-sky-500/50 text-sky-300' },
                  { value: 'LATE', label: 'Atraso', color: 'bg-amber-500/20 border-amber-500/50 text-amber-300' },
                  { value: 'PRESENT', label: 'Presença', color: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      status === opt.value
                        ? `${opt.color} shadow-md`
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* JUSTIFICATIVA & MOTIVO */}
            {status === 'JUSTIFIED' && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Motivo da Justificativa <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Ex: Atestado médico, consulta odontológica, luto familiar..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            )}

            {/* DOCUMENTO / PROTOCOLO */}
            <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-2xl space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={hasMedicalDocument}
                  onChange={(e) => setHasMedicalDocument(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Houve entrega de comprovação física/atestado protocolado</span>
              </label>

              {hasMedicalDocument && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={documentProtocol}
                    onChange={(e) => setDocumentProtocol(e.target.value)}
                    placeholder="Número do Protocolo da Secretaria (Ex: SEC-2026-9041)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Conforme normas de privacidade, detalhes clínicos não são expostos a terceiros.
                  </p>
                </div>
              )}
            </div>

            {/* OBSERVAÇÕES INTERNAS */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Observações Institucionais (Opcional)
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
                placeholder="Observações administrativas ou encaminhamento à coordenação pedagógica..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {/* BOTÕES */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <span>Revisar Resumo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* RESUMO ANTES DE CONFIRMAR */
          <div className="space-y-4 mt-5">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-amber-400" />
                Resumo do Lançamento Oficial
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Estudante</span>
                  <span className="font-bold text-white">{studentName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Turma</span>
                  <span className="font-bold text-white">{className}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Situação</span>
                  <span className="font-bold text-amber-300">
                    {status === 'ABSENT' ? 'Falta Não Justificada' :
                     status === 'JUSTIFIED' ? 'Falta Justificada' :
                     status === 'LATE' ? 'Atraso' : 'Presença'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Dias Selecionados</span>
                  <span className="font-bold text-white">{datesToRecord.length} dia(s) letivo(s)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-500 block text-[10px] mb-1">Datas que serão persistidas:</span>
                <div className="flex flex-wrap gap-1">
                  {datesToRecord.map(d => (
                    <span key={d} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[11px]">
                      {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  ))}
                </div>
              </div>

              {justification && (
                <div className="pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-500 block text-[10px]">Motivo:</span>
                  <p className="text-slate-300 italic">{justification}</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-2xl text-[11px] text-amber-300/80">
              ℹ️ Os registros serão gravados de forma auditável no Supabase e refletidos imediatamente no Portal Família e no Radar Pedagógico.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Voltar e Editar
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Persistindo...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar e Salvar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
