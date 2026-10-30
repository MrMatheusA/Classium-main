import React, { useState, useEffect } from 'react';
import { 
  X, CalendarDays, AlertTriangle, CheckCircle2, 
  ShieldCheck, RefreshCw, AlertCircle
} from 'lucide-react';
import { 
  attendanceFrequencyService, 
  StudentAttendanceSummary 
} from '../../services/attendanceFrequencyService';

interface StudentAbsenceHistoryModalProps {
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
  } | null;
  academicYear?: number;
  onSuccess?: () => void;
}

export function StudentAbsenceHistoryModal({
  isOpen,
  onClose,
  student,
  academicYear = 2026,
  onSuccess
}: StudentAbsenceHistoryModalProps) {
  if (!isOpen || !student) return null;

  const studentId = student.id || student.student_id || '';
  const studentName = student.full_name || student.name || 'Estudante';
  const registrationCode = student.registration_code || student.code || 'RA-2026';

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);

  // Editable fields for consolidated frequency adjustment
  const [justifiedInput, setJustifiedInput] = useState<number>(0);
  const [unjustifiedInput, setUnjustifiedInput] = useState<number>(0);
  const [auditReason, setAuditReason] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  const loadData = async () => {
    if (!studentId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await attendanceFrequencyService.getStudentAttendanceSummary(studentId, academicYear);
      setSummary(data);
      setJustifiedInput(data.justifiedCount || 0);
      setUnjustifiedInput(data.unjustifiedCount || 0);
      setAuditReason('');
    } catch (e: any) {
      console.warn('Error loading student attendance history:', e);
      setErrorMessage('Falha ao carregar dados consolidados de frequência.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setShowDiscardConfirm(false);
    setSuccessMessage(null);
  }, [studentId, academicYear]);

  // Calculated dynamic total
  const computedTotal = Math.max(0, justifiedInput + unjustifiedInput);
  const originalJustified = summary?.justifiedCount ?? 0;
  const originalUnjustified = summary?.unjustifiedCount ?? 0;
  const originalTotal = originalJustified + originalUnjustified;

  const isDirty = summary !== null && (
    justifiedInput !== originalJustified || 
    unjustifiedInput !== originalUnjustified
  );

  // Close attempt handler with dirty-state safety guard
  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    if (summary) {
      setJustifiedInput(summary.justifiedCount || 0);
      setUnjustifiedInput(summary.unjustifiedCount || 0);
    }
    setAuditReason('');
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleSave = async () => {
    if (!studentId) return;
    if (!isDirty) return;

    if (!auditReason.trim()) {
      setErrorMessage('A justificativa/motivo do ajuste é obrigatória para registrar a alteração no histórico de auditoria.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await attendanceFrequencyService.adjustStudentTotals({
        studentId,
        year: academicYear,
        justifiedCount: justifiedInput,
        unjustifiedCount: unjustifiedInput,
        reason: auditReason.trim(),
        authorName: 'Gestão Escolar / Secretaria'
      });

      setSuccessMessage(res.message || 'Totais de frequência e auditoria atualizados com sucesso!');
      setAuditReason('');
      
      // Reload summary from server to sync state
      await loadData();

      // Trigger parent callback to update student list KPI and table badge
      if (onSuccess) {
        onSuccess();
      }

      // Auto dismiss success feedback after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error saving attendance adjustment:', err);
      setErrorMessage(err.message || 'Erro ao persistir ajuste de frequência.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl relative max-h-[92vh] flex flex-col">
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Histórico de Frequência & Ausências
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Ano Letivo {academicYear}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {studentName} • {registrationCode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading || saving}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button 
              onClick={handleRequestClose}
              disabled={saving}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK MESSAGES */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 shrink-0 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 shrink-0 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* DISCARD CONFIRMATION WARNING */}
        {showDiscardConfirm && (
          <div className="mt-3 p-3.5 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs shrink-0 animate-fade-in space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Alterações não salvas detectadas</span>
            </div>
            <p className="text-[11px] text-amber-200/90">
              Você alterou os totais de faltas. Se fechar agora, as alterações serão descartadas. Deseja realmente sair?
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Continuar Editando
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Descartar e Fechar
              </button>
            </div>
          </div>
        )}

        {/* 4 CARDS GRID: DIAS PREVISTOS, FALTAS NO ANO, JUSTIFICADAS, NÃO JUSTIFICADAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 shrink-0">
          
          {/* 1. DIAS PREVISTOS (READ-ONLY) */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Dias Previstos</span>
            <span className="text-xl font-black font-mono text-white mt-1">200</span>
          </div>

          {/* 2. FALTAS NO ANO (DYNAMIC CALCULATED SUM) */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Faltas no Ano</span>
              <span className="text-[9px] text-slate-500 font-mono">Calculado</span>
            </div>
            <span className={`text-xl font-black font-mono mt-1 ${
              computedTotal >= 48 ? 'text-rose-400' :
              computedTotal >= 32 ? 'text-orange-400' :
              computedTotal >= 16 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {computedTotal}
            </span>
          </div>

          {/* 3. JUSTIFICADAS (EDITABLE) */}
          <div className="bg-slate-950 border border-sky-500/30 p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sky-400 uppercase font-mono font-bold block">Justificadas</span>
              <span className="text-[9px] text-sky-400/80 font-mono">Editável</span>
            </div>
            <div className="mt-1">
              <input
                type="number"
                min={0}
                step={1}
                value={justifiedInput}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setJustifiedInput(val);
                }}
                disabled={loading || saving}
                className="w-full bg-slate-900 border border-slate-700 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 rounded-xl px-2.5 py-1 text-lg font-black font-mono text-sky-400 outline-none transition-all disabled:opacity-50"
                aria-label="Faltas justificadas no ano"
              />
            </div>
          </div>

          {/* 4. NÃO JUSTIFICADAS (EDITABLE) */}
          <div className="bg-slate-950 border border-amber-500/30 p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-400 uppercase font-mono font-bold block">Não Justificadas</span>
              <span className="text-[9px] text-amber-400/80 font-mono">Editável</span>
            </div>
            <div className="mt-1">
              <input
                type="number"
                min={0}
                step={1}
                value={unjustifiedInput}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setUnjustifiedInput(val);
                }}
                disabled={loading || saving}
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-2.5 py-1 text-lg font-black font-mono text-amber-400 outline-none transition-all disabled:opacity-50"
                aria-label="Faltas não justificadas no ano"
              />
            </div>
          </div>

        </div>

        {/* AUDIT REASON BOX (MANDATORY WHEN NUMBERS CHANGE) */}
        {isDirty && (
          <div className="p-3.5 bg-slate-950/90 border border-gold/40 rounded-2xl mb-4 shrink-0 space-y-2 animate-fade-in shadow-lg shadow-gold/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-[11px] font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-gold shrink-0" />
                <span>Justificativa / Motivo do Ajuste (Obrigatório para Auditoria)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Anterior: {originalTotal} ({originalJustified} J + {originalUnjustified} NJ) → Novo: {computedTotal}
              </span>
            </div>
            <input
              type="text"
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
              placeholder="Ex.: Retificação de atestado médico apresentado pela família / Consolidação bimestral"
              disabled={saving}
              className="w-full bg-slate-900 border border-slate-700 focus:border-gold rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
              required
            />
          </div>
        )}

        {/* MARCO STATUS BANNER */}
        {computedTotal >= 16 && (
          <div className={`p-3 rounded-2xl border mb-4 shrink-0 flex items-center gap-3 text-xs ${
            computedTotal >= 54 ? 'bg-purple-950/40 border-purple-500/40 text-purple-200' :
            computedTotal >= 48 ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' :
            computedTotal >= 32 ? 'bg-orange-950/40 border-orange-500/40 text-orange-200' :
            'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}>
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">
                {computedTotal >= 54 ? 'Marco 54 — Avaliação Pedagógica Necessária' :
                 computedTotal >= 48 ? 'Marco 48 Faltas — Nível Crítico' :
                 computedTotal >= 32 ? 'Marco 32 Faltas — Alerta Elevado' :
                 'Marco 16 Faltas — Monitoramento Ativo'}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {computedTotal >= 54 ? 'Volume extremo de faltas no ano letivo. Requer avaliação do Conselho Pedagógico.' :
                 computedTotal >= 48 ? 'Nível crítico atingido. Notificação formal urgente e busca ativa intensificada.' :
                 computedTotal >= 32 ? 'Alerta elevado. Convocação de responsáveis para alinhamento pedagógico.' :
                 'Primeiro marco de monitoramento preventivo com a família.'}
              </p>
            </div>
          </div>
        )}

        {/* RECORDS LIST */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px]">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">
            Ocorrências Registradas ({summary?.history?.length || 0})
          </h4>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Carregando histórico do estudante...</span>
            </div>
          ) : !summary || summary.history.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs bg-slate-950/40 border border-slate-800/80 rounded-2xl">
              Nenhuma falta ou ocorrência de ausência registrada para este estudante em {academicYear}.
            </div>
          ) : (
            summary.history.map(record => (
              <div 
                key={record.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl font-mono text-xs font-bold ${
                    record.status === 'ABSENT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    record.status === 'JUSTIFIED' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                    record.status === 'LATE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {new Date(record.attendance_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      {record.status === 'ABSENT' ? 'Falta Não Justificada' :
                       record.status === 'JUSTIFIED' ? 'Falta Justificada' :
                       record.status === 'LATE' ? 'Atraso Registrado' : 'Presença'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {record.observations || 'Registro no diário escolar'}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(record.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="pt-4 border-t border-slate-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p className="text-[10px] text-slate-500">
            * Referência de 200 dias letivos conforme LDB. Atualizado em tempo real.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={saving}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {isDirty ? 'Cancelar' : 'Fechar'}
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !auditReason.trim()}
                className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c5a030] text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-gold/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={!auditReason.trim() ? "Preencha a justificativa do ajuste para salvar" : "Salvar alterações nos totais"}
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
