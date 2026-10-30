import React, { useRef } from 'react';
import { 
  X, Printer, Download, FileText, CheckCircle2, 
  AlertTriangle, ShieldCheck, Calendar, User, Info
} from 'lucide-react';
import { AttendanceRadarItem } from '../../services/attendanceFrequencyService';

interface PedagogicalAttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AttendanceRadarItem | null;
  academicYear?: number;
}

export function PedagogicalAttendanceReportModal({
  isOpen,
  onClose,
  item,
  academicYear = 2026
}: PedagogicalAttendanceReportModalProps) {
  if (!isOpen || !item) return null;

  const reportDate = new Date().toLocaleDateString('pt-BR');
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 text-slate-900 shadow-2xl relative max-h-[94vh] flex flex-col">
        
        {/* MODAL CONTROLS */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Parecer Técnico Institucional de Frequência Escolar</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE REPORT CONTENT */}
        <div ref={printAreaRef} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          
          {/* CABEÇALHO OFICIAL */}
          <div className="text-center border-b border-slate-200 pb-5 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
              SISTEMA INTEGRADO DE GESTÃO EDUCACIONAL • CLASSIUM
            </span>
            <h2 className="text-base font-serif font-black text-slate-900 tracking-tight">
              PARECER TÉCNICO PEDAGÓGICO DE ACOMPANHAMENTO DA FREQUÊNCIA
            </h2>
            <p className="text-[11px] text-slate-500">
              Ano Letivo: {academicYear} • Base de Cálculo: 200 Dias Letivos • Emissão: {reportDate}
            </p>
          </div>

          {/* DADOS DE IDENTIFICAÇÃO DO ESTUDANTE */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Estudante</span>
              <strong className="text-slate-900 text-xs">{item.studentName}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Código de Matrícula (RA)</span>
              <strong className="text-slate-900 text-xs font-mono">{item.ra}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Turma & Turno</span>
              <strong className="text-slate-900 text-xs">{item.className} ({item.shift})</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Situação de Matrícula</span>
              <span className="text-emerald-700 font-bold">Matriculado / Ativo</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Responsável pelo Registro</span>
              <span className="text-slate-800">{item.responsibleStaff}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Situação do Processo</span>
              <span className="font-mono font-bold uppercase text-indigo-700">{item.caseStatus.replace('_', ' ')}</span>
            </div>
          </div>

          {/* INDICADORES CONSOLIDADOS */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Quadro Quantitativo de Frequência Escolar
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase block">Dias Previstos</span>
                <span className="text-lg font-black font-mono text-slate-900">200</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl">
                <span className="text-[10px] text-rose-700 uppercase block font-bold">Total de Faltas</span>
                <span className="text-lg font-black font-mono text-rose-700">{item.totalAbsences}</span>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl">
                <span className="text-[10px] text-sky-700 uppercase block">Justificadas</span>
                <span className="text-lg font-black font-mono text-sky-700">{item.justifiedCount}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <span className="text-[10px] text-amber-700 uppercase block font-bold">Não Justificadas</span>
                <span className="text-lg font-black font-mono text-amber-700">{item.unjustifiedCount}</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
              * Nota Metodológica: "Dias previstos menos faltas registradas — não representa presenças realizadas". A apuração respeita os lançamentos diários auditáveis realizados pelo corpo docente.
            </div>
          </div>

          {/* MARCO ATINGIDO & ENQUADRAMENTO */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Enquadramento na Escala de Marcos de Assiduidade
            </h4>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <p className="font-bold">{item.milestoneLabel}</p>
              <p className="text-[11px] mt-1 text-amber-800 leading-relaxed">
                {item.totalAbsences >= 54 
                  ? 'Volume extremo de ausências verificado. O caso encontra-se submetido à deliberação colegiada do Conselho Pedagógico.' :
                 item.totalAbsences >= 48 
                  ? 'Atingido o Marco de 48 faltas. Intensificação imediata dos mecanismos de busca ativa escolar e proteção ao direito educacional.' :
                 item.totalAbsences >= 32 
                  ? 'Atingido o Marco de 32 faltas. Alerta pedagógico elevado e pactuação de frequência com os responsáveis legais.' :
                 item.totalAbsences >= 16 
                  ? 'Atingido o Marco de 16 faltas. Procedimento preventivo de acompanhamento pedagógico iniciado.' :
                  'Estudante com frequência escolar regular dentro dos limites pactuados.'}
              </p>
            </div>
          </div>

          {/* HISTÓRICO DE BUSCA ATIVA E CONTATOS */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Medidas Adotadas pela Unidade Escolar
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              {item.activeSearchNotes || 'A equipe pedagógica e de orientação escolar realizou contatos preventivos e reuniões de alinhamento com os responsáveis legais visando diagnosticar as causas da infrequência e restabelecer a rotina regular de estudos.'}
            </p>
            {item.lastContactDate && (
              <p className="text-[11px] text-slate-500 font-mono">
                Último registro de contato / busca ativa: {new Date(item.lastContactDate).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          {/* AVISO LEGAL E PRIVACIDADE */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-500">
            <p className="font-bold text-slate-700">Normas de Privacidade e Garantia de Direitos:</p>
            <p>
              Este documento técnico contém informações pedagógicas confidenciais e protegidas pela LGPD (Lei nº 13.709/2018) e pelo Estatuto da Criança e do Adolescente (ECA). A emissão deste parecer tem finalidade exclusivamente técnico-pedagógica de proteção ao direito fundamental à educação. Gerar ou imprimir este relatório não constitui envio automático ao Conselho Tutelar.
            </p>
          </div>

          {/* ASSINATURAS */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-slate-300 pt-2">
              <strong className="block text-slate-900">{item.responsibleStaff}</strong>
              <span className="text-slate-500 text-[10px]">Especialista / Coordenação Pedagógica</span>
            </div>
            <div className="border-t border-slate-300 pt-2">
              <strong className="block text-slate-900">Direção da Unidade Escolar</strong>
              <span className="text-slate-500 text-[10px]">Gestão Escolar Classium</span>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="pt-4 border-t border-slate-200 shrink-0 flex items-center justify-between text-xs text-slate-500">
          <span>Parecer formatado para impressão e arquivo do prontuário escolar</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
