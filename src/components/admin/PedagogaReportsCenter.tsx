import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, Clock, Search, Filter,
  Eye, Edit3, Download, Printer, RefreshCw, X, ArrowRight,
  MessageSquare, User, Users, Check, AlertCircle, ShieldAlert,
  Send, Sparkles, FolderLock, Award, Shield, FileCheck, Layers,
  ChevronRight, ArrowLeft, HeartPulse, Scale, Info, BookOpen
} from 'lucide-react';
import { pedagogicalReportsService, PedagogicalReportRecord } from '../../services/reports/pedagogicalReports.service';
import { supabase } from '../../lib/supabase';
import { sanitizeHtml } from '../../utils/sanitize';

interface PedagogaReportsCenterProps {
  organizationId?: string;
  currentUser?: any;
  profile?: any;
}

export function PedagogaReportsCenter({
  organizationId = '11111111-1111-1111-1111-111111111111',
  currentUser,
  profile
}: PedagogaReportsCenterProps) {
  const [reports, setReports] = useState<PedagogicalReportRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Selected Report for Modal Review
  const [selectedReport, setSelectedReport] = useState<PedagogicalReportRecord | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editableContent, setEditableContent] = useState<any>({});
  const [editableHtml, setEditableHtml] = useState<string>('');
  
  // Reject / Revision Modal
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectComments, setRejectComments] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Success / Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const documentRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const { reports: data } = await pedagogicalReportsService.getReports({
        organizationId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined
      });
      setReports(data || []);
    } catch (err) {
      console.error('Error loading pedagogical reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();

    // Centralized Supabase Realtime Subscription
    const unsubscribe = pedagogicalReportsService.subscribeToReports(organizationId, () => {
      loadReports();
    });

    const handleLocalUpdate = () => {
      loadReports();
    };

    window.addEventListener('classium_reports_updated', handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('classium_reports_updated', handleLocalUpdate);
    };
  }, [organizationId, statusFilter]);

  // Handle opening review
  const handleOpenReview = (rep: PedagogicalReportRecord) => {
    setSelectedReport(rep);
    setIsEditing(false);
    setEditableContent(rep.structured_content || {});
    setEditableHtml(rep.report_content || '');
  };

  // Handle Approve
  const handleApprove = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const res = await pedagogicalReportsService.reviewReport(selectedReport.id, {
        status: 'approved',
        pedagogueName: profile?.name || currentUser?.name || 'Coordenação Pedagógica'
      });

      if (res.success) {
        showToast('Relatório aprovado e homologado institucionalmente com sucesso!');
        setSelectedReport(prev => prev ? { ...prev, status: 'approved' } : null);
        loadReports();
      } else {
        showToast('Erro ao aprovar relatório. Tente novamente.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao processar aprovação', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject / Request Adjustments
  const handleReject = async () => {
    if (!selectedReport) return;
    if (!rejectComments.trim()) {
      showToast('Por favor, informe as orientações/comentários para o professor.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await pedagogicalReportsService.reviewReport(selectedReport.id, {
        status: 'rejected',
        comments: rejectComments,
        pedagogueName: profile?.name || currentUser?.name || 'Coordenação Pedagógica'
      });

      if (res.success) {
        showToast('Relatório devolvido ao professor com as orientações pedagógicas.');
        setShowRejectModal(false);
        setRejectComments('');
        setSelectedReport(prev => prev ? { ...prev, status: 'rejected', comments: rejectComments } : null);
        loadReports();
      } else {
        showToast('Erro ao devolver relatório.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao devolver relatório', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Save changes made by Pedagoga in Rich Editor
  const handleSaveEdits = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const res = await pedagogicalReportsService.updateReport(selectedReport.id, {
        report_content: editableHtml,
        structured_content: editableContent
      });
      if (res.success) {
        showToast('Alterações salvas com sucesso no relatório!');
        setIsEditing(false);
        loadReports();
      } else {
        showToast('Erro ao salvar alterações.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao salvar', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Export to Word (.doc)
  const handleExportDoc = (rep: PedagogicalReportRecord) => {
    const title = rep.title || 'Relatorio_Pedagogico';
    const contentHtml = rep.report_content || '';
    const blobContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #111; margin: 20mm; }
          h1 { font-size: 14pt; text-align: center; text-transform: uppercase; margin-bottom: 4px; }
          h2 { font-size: 12pt; text-align: center; color: #444; margin-top: 0; }
          h3 { font-size: 11pt; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-top: 15px; }
          p { margin-bottom: 8px; }
          .header-box { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; text-align: center; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .info-table td { border: 1px solid #ddd; padding: 6px; font-size: 10pt; }
          .footer-signatures { margin-top: 40px; display: table; width: 100%; }
          .sig-col { display: table-cell; width: 33%; text-align: center; padding: 0 10px; font-size: 9pt; }
          .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <h1>Colégio Modelo de Educação Integral</h1>
          <h2>Central da Coordenação Pedagógica • Classium</h2>
        </div>
        <div>
          <h2>${rep.title}</h2>
          <table class="info-table">
            <tr>
              <td><strong>Estudante:</strong> ${rep.student_name}</td>
              <td><strong>Matrícula RA:</strong> ${rep.student_registration || '2026-RA'}</td>
            </tr>
            <tr>
              <td><strong>Turma:</strong> ${rep.student_class}</td>
              <td><strong>Frequência Registrada:</strong> ${rep.attendance_rate || '95.0%'}</td>
            </tr>
            <tr>
              <td><strong>Professor(a):</strong> ${rep.teacher_name || 'Professor(a) Responsável'}</td>
              <td><strong>Data de Emissão:</strong> ${new Date(rep.created_at).toLocaleDateString('pt-BR')}</td>
            </tr>
          </table>
          <div class="content-body">
            ${contentHtml}
          </div>
          <div class="footer-signatures">
            <div class="sig-col">
              <div class="sig-line">
                <strong>${rep.teacher_name || 'Professor(a) Responsável'}</strong><br/>
                Docente
              </div>
            </div>
            <div class="sig-col">
              <div class="sig-line">
                <strong>${rep.pedagogue_name || 'Coordenação Pedagógica'}</strong><br/>
                Pedagogo(a)
              </div>
            </div>
            <div class="sig-col">
              <div class="sig-line">
                <strong>${rep.director_name || 'Direção Escolar'}</strong><br/>
                Direção Geral
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', blobContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${rep.student_name.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Documento Word (.doc) exportado com sucesso!');
  };

  // Direct Print
  const handlePrint = () => {
    window.print();
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending_review' || r.status === 'em_revisao').length;
    const approved = reports.filter(r => r.status === 'approved').length;
    const rejected = reports.filter(r => r.status === 'rejected').length;
    const archived = reports.filter(r => r.status === 'archived').length;
    return { total, pending, approved, rejected, archived };
  }, [reports]);

  // Filtered List
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchSearch = !searchTerm || 
        r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.student_class?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || 
        (statusFilter === 'pending' && (r.status === 'pending_review' || r.status === 'em_revisao')) ||
        r.status === statusFilter;

      const matchClass = selectedClassFilter === 'all' || r.student_class === selectedClassFilter;

      return matchSearch && matchStatus && matchClass;
    });
  }, [reports, searchTerm, statusFilter, selectedClassFilter]);

  // Unique classes for filter
  const classesList = useMemo(() => {
    const list = Array.from(new Set(reports.map(r => r.student_class).filter(Boolean)));
    return list;
  }, [reports]);

  return (
    <div className="space-y-6 text-left animate-fade-in pb-12">
      
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all animate-bounce ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
          <span className="text-sm font-bold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CABEÇALHO DO MÓDULO PEDAGÓGICO */}
      <div className="bg-slate-900/90 border border-gold/30 rounded-3xl p-6 md:p-8 backdrop-blur shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-700 to-amber-900 border border-gold/40 flex items-center justify-center text-gold shadow-lg shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold/90 font-mono block">
                  Central de Documentação & Pareceres • Classium Pedagógico
                </span>
                <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Central de Relatórios & Homologação</span>
                </h1>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Revisão técnica, validação institucional, pareceres pedagógicos e controle de encaminhamentos externos (Clínica, AEE, Conselho Tutelar, CRAS/CREAS) com assinatura tripartite oficial.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadReports}
              className="p-3 bg-slate-800/80 hover:bg-slate-700 text-gold border border-gold/30 rounded-2xl transition-all shadow-md cursor-pointer flex items-center gap-2 text-xs font-bold"
              title="Atualizar Relatórios"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Total Registrado</span>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">{stats.total}</div>
            <span className="text-[10px] text-slate-500">Documentos emitidos</span>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-mono text-amber-300 font-bold block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Aguardando Revisão
            </span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{stats.pending}</div>
            <span className="text-[10px] text-amber-300/70">Ação da pedagoga necessária</span>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-mono text-emerald-300 font-bold block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Homologados / Aprovados
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{stats.approved}</div>
            <span className="text-[10px] text-emerald-300/70">Prontos para emissão</span>
          </div>

          <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-4">
            <span className="text-[10px] uppercase font-mono text-rose-300 font-bold block flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Devolvidos p/ Ajustes
            </span>
            <div className="text-2xl font-extrabold text-rose-400 font-mono mt-1">{stats.rejected}</div>
            <span className="text-[10px] text-rose-300/70">Com orientações ao docente</span>
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* STATUS PILLS */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: 'Todos os Relatórios', count: stats.total },
            { id: 'pending', label: 'Aguardando Revisão', count: stats.pending, highlight: stats.pending > 0 },
            { id: 'approved', label: 'Aprovados', count: stats.approved },
            { id: 'rejected', label: 'Devolvidos', count: stats.rejected }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-gold text-slate-950 font-extrabold shadow-md'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                statusFilter === tab.id 
                  ? 'bg-slate-950/30 text-slate-950 font-bold' 
                  : tab.highlight ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* SEARCH & CLASS SELECT */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {classesList.length > 0 && (
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-gold"
            >
              <option value="all">Todas as Turmas</option>
              {classesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar aluno, professor, título..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-gold placeholder:text-slate-600"
            />
          </div>
        </div>

      </div>

      {/* LISTAGEM DE RELATÓRIOS */}
      {loading ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-gold animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-mono">Carregando relatórios pedagógicos em tempo real...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Nenhum relatório encontrado</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Não há relatórios submetidos no momento correspondentes aos filtros selecionados.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReports.map((rep) => {
            const isPending = rep.status === 'pending_review' || rep.status === 'em_revisao';
            const isApproved = rep.status === 'approved';
            const isRejected = rep.status === 'rejected';

            return (
              <div
                key={rep.id}
                className={`bg-slate-900/90 border rounded-3xl p-5 md:p-6 transition-all hover:shadow-xl relative overflow-hidden ${
                  isPending
                    ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/20 via-slate-900/90 to-slate-900/90'
                    : isApproved
                    ? 'border-emerald-500/40'
                    : isRejected
                    ? 'border-rose-500/40'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* ESTUDANTE & DADOS */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${
                        isPending
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                          : isApproved
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                          : isRejected
                          ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {isPending ? '🟡 Aguardando Revisão Pedagógica' : isApproved ? '🟢 Homologado / Aprovado' : isRejected ? '🔴 Devolvido c/ Ajustes' : '🔒 Arquivado'}
                      </span>

                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                        {rep.version || 'v1.0'}
                      </span>

                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                        {new Date(rep.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                        <span>{rep.title}</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-200 font-bold">
                          <User className="w-3.5 h-3.5 text-gold" />
                          {rep.student_name}
                        </span>
                        <span>•</span>
                        <span>Turma: <strong>{rep.student_class}</strong></span>
                        <span>•</span>
                        <span>RA: <strong className="font-mono">{rep.student_registration || '2026-RA'}</strong></span>
                        <span>•</span>
                        <span>Professor(a): <strong className="text-blue-300">{rep.teacher_name || 'Docente Responsável'}</strong></span>
                      </div>
                    </div>

                    {/* COMMENTS SE HOUVER DEVOLUÇÃO */}
                    {rep.comments && isRejected && (
                      <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-xs text-rose-200 flex items-start gap-2 mt-2">
                        <MessageSquare className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-rose-300 font-mono uppercase text-[10px]">Orientações de Ajuste Registradas:</strong>
                          <span>{rep.comments}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AÇÕES DA PEDAGOGA */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <button
                      onClick={() => handleOpenReview(rep)}
                      className="px-4 py-2.5 bg-gold hover:bg-gold-light text-slate-950 font-extrabold rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Revisar & Avaliar</span>
                    </button>

                    <button
                      onClick={() => handleExportDoc(rep)}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all cursor-pointer"
                      title="Salvar no PC (.doc)"
                    >
                      <Download className="w-4 h-4 text-blue-400" />
                    </button>

                    <button
                      onClick={() => {
                        handleOpenReview(rep);
                        setTimeout(() => window.print(), 300);
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all cursor-pointer"
                      title="Imprimir Documento"
                    >
                      <Printer className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE REVISÃO E AVALIAÇÃO DO RELATÓRIO */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-gold/40 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            
            {/* MODAL TOP BAR */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{selectedReport.title}</h2>
                  <p className="text-xs text-slate-400">
                    Estudante: <strong className="text-slate-200">{selectedReport.student_name}</strong> • Turma: {selectedReport.student_class} • Prof: {selectedReport.teacher_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isEditing 
                      ? 'bg-amber-500 text-slate-950' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Visualizar Formato A4' : 'Editar Texto'}</span>
                </button>

                <button
                  onClick={() => handleExportDoc(selectedReport)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Salvar no PC (.doc)</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>

                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MODAL BODY (A4 DOCUMENT OU RICH TEXT EDITOR) */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-950/50 space-y-6">
              
              {isEditing ? (
                /* EDITOR DE TEXTO RICO (RTE) */
                <div className="space-y-4">
                  
                  {/* BARRA DE FERRAMENTAS DO RTE */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[10px] uppercase font-mono text-gold font-bold mr-2">Ferramentas de Edição:</span>
                    
                    <button 
                      onClick={() => document.execCommand('bold', false)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold"
                      title="Negrito"
                    >
                      B
                    </button>
                    <button 
                      onClick={() => document.execCommand('italic', false)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded italic"
                      title="Itálico"
                    >
                      I
                    </button>
                    <button 
                      onClick={() => document.execCommand('underline', false)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded underline"
                      title="Sublinhado"
                    >
                      U
                    </button>
                    <button 
                      onClick={() => document.execCommand('strikeThrough', false)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded line-through"
                      title="Tachado"
                    >
                      S
                    </button>

                    <div className="w-px h-5 bg-slate-700 mx-1"></div>

                    <button 
                      onClick={() => document.execCommand('justifyLeft', false)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded"
                      title="Alinhar à Esquerda"
                    >
                      Esquerda
                    </button>
                    <button 
                      onClick={() => document.execCommand('justifyCenter', false)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded"
                      title="Centralizar"
                    >
                      Centro
                    </button>
                    <button 
                      onClick={() => document.execCommand('justifyFull', false)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded"
                      title="Justificar"
                    >
                      Justificar
                    </button>

                    <div className="w-px h-5 bg-slate-700 mx-1"></div>

                    <button 
                      onClick={() => document.execCommand('insertUnorderedList', false)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded"
                      title="Lista com Marcadores"
                    >
                      • Lista
                    </button>
                    <button 
                      onClick={() => document.execCommand('insertOrderedList', false)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded"
                      title="Lista Numerada"
                    >
                      1. Lista
                    </button>

                    <div className="ml-auto">
                      <button
                        onClick={handleSaveEdits}
                        disabled={actionLoading}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar Alterações</span>
                      </button>
                    </div>
                  </div>

                  {/* ÁREA CONTENT EDITABLE */}
                  <div
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(editableHtml) }}
                    onBlur={(e) => setEditableHtml(e.currentTarget.innerHTML)}
                    className="w-full min-h-[450px] p-6 bg-slate-900 border border-slate-700 rounded-2xl text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-gold"
                  />
                </div>
              ) : (
                /* VISUALIZADOR OFICIAL A4 */
                <div 
                  ref={documentRef}
                  className="bg-white text-slate-950 p-8 md:p-12 rounded-2xl shadow-2xl max-w-3xl mx-auto space-y-6 text-left font-sans text-xs md:text-sm leading-relaxed border border-slate-300"
                >
                  
                  {/* CABEÇALHO OFICIAL */}
                  <div className="text-center border-b-2 border-slate-950 pb-4 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 block">
                      Colégio Modelo de Educação Integral • Sistema de Gestão Escolar
                    </span>
                    <h2 className="text-lg font-serif font-extrabold text-slate-950 uppercase tracking-tight">
                      Colégio Modelo de Educação Integral
                    </h2>
                    <p className="text-[11px] text-slate-600">
                      Unidade Central de Ensino Fundamental & Médio • INEP: 3512359-00
                    </p>
                  </div>

                  {/* TÍTULO DO DOCUMENTO */}
                  <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-center space-y-1">
                    <h3 className="text-sm md:text-base font-serif font-bold text-slate-900 uppercase">
                      {selectedReport.title}
                    </h3>
                    <p className="text-[10px] text-slate-600 font-mono">
                      Finalidade: {selectedReport.purpose} • Destinatário: {selectedReport.specialist_target || 'Coordenação Pedagógica / Institucional'}
                    </p>
                  </div>

                  {/* QUADRO DE IDENTIFICAÇÃO DO ALUNO */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px]">
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">Estudante:</span>
                      <strong className="text-slate-900">{selectedReport.student_name}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">Matrícula / RA:</span>
                      <strong className="font-mono text-slate-900">{selectedReport.student_registration || '2026-RA'}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">Turma / Turno:</span>
                      <strong className="text-slate-900">{selectedReport.student_class}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">Assiduidade Registrada:</span>
                      <strong className="text-emerald-700 font-bold">{selectedReport.attendance_rate || '95.0%'}</strong>
                    </div>
                  </div>

                  {/* CORPO DO RELATÓRIO */}
                  <div 
                    className="space-y-4 text-slate-800 leading-relaxed report-html-content"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedReport.report_content) }}
                  />

                  {/* ADVERTÊNCIA LEGAL LGPD / ATO MÉDICO */}
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[10px] text-amber-900 space-y-1">
                    <strong className="flex items-center gap-1 text-amber-950 font-bold">
                      <Shield className="w-3.5 h-3.5 text-amber-700" />
                      ADVERTÊNCIA LEGAL & RESPONSABILIDADE INSTITUCIONAL:
                    </strong>
                    <p>
                      IMPORTANTE: Este documento possui finalidade estritamente educacional e descritiva com base em observações sistemáticas no contexto escolar. Não constitui diagnóstico clínico, avaliação psicológica ou laudo médico privativo de profissionais de saúde regulamentados (Lei Federal nº 12.842/2013 e Resoluções MEC/CNE). Todas as informações estão protegidas nos termos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                    </p>
                  </div>

                  {/* 3 LINHAS DE ASSINATURA */}
                  <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-700">
                    <div className="space-y-1">
                      <div className="border-t border-slate-950 pt-2 font-bold text-slate-950">
                        {selectedReport.teacher_name || 'Professor(a) Responsável'}
                      </div>
                      <span>Docente Responsável</span>
                    </div>

                    <div className="space-y-1">
                      <div className="border-t border-slate-950 pt-2 font-bold text-slate-950">
                        {selectedReport.pedagogue_name || profile?.name || 'Coordenação Pedagógica'}
                      </div>
                      <span>Pedagogo(a) / Coordenação</span>
                    </div>

                    <div className="space-y-1">
                      <div className="border-t border-slate-950 pt-2 font-bold text-slate-950">
                        {selectedReport.director_name || 'Direção Escolar'}
                      </div>
                      <span>Direção Pedagógica Geral</span>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* MODAL BOTTOM BAR (DECISÃO DA PEDAGOGA) */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status atual:</span>
                <span className="text-xs font-mono font-bold text-gold uppercase px-2 py-0.5 bg-slate-900 rounded border border-slate-800">
                  {selectedReport.status}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-500/50 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Devolver p/ Ajustes</span>
                </button>

                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprovar & Homologar Relatório</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE DEVOLUÇÃO / COMENTÁRIOS */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Devolver Relatório para o Professor</h3>
                <p className="text-xs text-slate-400">Insira as orientações pedagógicas para revisão pelo docente.</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Orientações & Ajustes Necessários (Obrigatório):</label>
              <textarea
                value={rejectComments}
                onChange={(e) => setRejectComments(e.target.value)}
                placeholder="Ex: Favor detalhar melhor as estratégias inclusivas aplicadas no 2º bimestre e ajustar o parágrafo sobre atenção..."
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirmar Devolução</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
