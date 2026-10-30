import React, { useState } from 'react';
import { 
  X, CheckCircle2, AlertCircle, Phone, Home, 
  FileText, Users, Send, ShieldAlert, Clock
} from 'lucide-react';
import { 
  attendanceFrequencyService, 
  AttendanceRadarItem, 
  AttendanceCaseStatus, 
  AttendanceCaseActionPayload 
} from '../../services/attendanceFrequencyService';

interface PedagogicalCaseActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AttendanceRadarItem | null;
  onSuccess: () => void;
}

export function PedagogicalCaseActionModal({
  isOpen,
  onClose,
  item,
  onSuccess
}: PedagogicalCaseActionModalProps) {
  if (!isOpen || !item) return null;

  const [actionType, setActionType] = useState<'busca_ativa' | 'contato_familia' | 'parecer_tecnico' | 'reuniao' | 'encaminhamento'>('contato_familia');
  const [newStatus, setNewStatus] = useState<AttendanceCaseStatus>(item.caseStatus || 'em_acompanhamento');
  const [notes, setNotes] = useState<string>('');
  const [responsibleName, setResponsibleName] = useState<string>('Coordenação Pedagógica');
  const [protocolNumber, setProtocolNumber] = useState<string>('');
  const [destinationEntity, setDestinationEntity] = useState<string>('Conselho Tutelar');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!notes.trim()) {
      setErrorMsg('Descreva as providências adotadas ou o teor do registro.');
      return;
    }

    if (actionType === 'encaminhamento' && !protocolNumber.trim()) {
      setErrorMsg('Para registrar encaminhamento institucional, informe o número de protocolo ou comprovante oficial.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: AttendanceCaseActionPayload = {
        studentId: item.studentId,
        actionType,
        status: newStatus,
        notes: notes.trim(),
        responsibleName: responsibleName.trim(),
        protocolNumber: protocolNumber.trim() || undefined,
        destinationEntity: actionType === 'encaminhamento' ? destinationEntity : undefined
      };

      await attendanceFrequencyService.recordCaseAction(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Case action error:', err);
      setErrorMsg(err.message || 'Erro ao registrar ação pedagógica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative max-h-[92vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Acompanhamento Pedagógico & Busca Ativa
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Estudante: <strong className="text-white">{item.studentName}</strong> • {item.ra} ({item.className})
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          {/* TIPO DE AÇÃO */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Tipo de Ação Pedagógica
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'contato_familia', label: 'Contato Familiar', icon: Phone },
                { id: 'busca_ativa', label: 'Busca Ativa', icon: Home },
                { id: 'reuniao', label: 'Reunião Presencial', icon: Users },
                { id: 'parecer_tecnico', label: 'Parecer Técnico', icon: FileText },
                { id: 'encaminhamento', label: 'Encaminhamento Oficial', icon: Send }
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setActionType(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center ${
                      actionType === opt.id
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* NOVO STATUS DO CASO */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Situação do Caso no Radar
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="aberto">Caso Aberto (Identificado no Marco)</option>
              <option value="em_acompanhamento">Em Acompanhamento Ativo</option>
              <option value="relatorio_elaboracao">Relatório Técnico em Elaboração</option>
              <option value="relatorio_revisado">Relatório Revisado pela Equipe</option>
              <option value="encaminhamento_registrado">Encaminhamento Registrado com Protocolo</option>
              <option value="concluido">Concluído / Assiduidade Regularizada</option>
            </select>
          </div>

          {/* RESPONSÁVEL PELO REGISTRO */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Profissional Responsável
            </label>
            <input
              type="text"
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          {/* CAMPOS ESPECÍFICOS DE ENCAMINHAMENTO */}
          {actionType === 'encaminhamento' && (
            <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Exigência de Protocolo Real (Anti-Falso Positivo)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                O Classium não automatiza o envio a órgãos externos. Registre apenas após a efetiva expedição do ofício pelo órgão de direção.
              </p>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Número de Protocolo / Comprovante Oficial <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={protocolNumber}
                  onChange={(e) => setProtocolNumber(e.target.value)}
                  placeholder="Ex: OF-2026/089-CT-LESTE"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Órgão Destinatário
                </label>
                <input
                  type="text"
                  value={destinationEntity}
                  onChange={(e) => setDestinationEntity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>
          )}

          {/* DESCRIÇÃO E DETALHAMENTO DA AÇÃO */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Relato Técnico da Ação / Justificativa Pedagógica
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Descreva as tentativas de contato, resposta da família, compromissos pactuados ou encaminhamentos tomados..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
              required
            />
          </div>

          {/* BOTÕES */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Gravando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Registro de Caso</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
