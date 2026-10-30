import React, { useState } from 'react';
import { 
  FileText, Shield, Sparkles, CheckCircle2, Search, ArrowRight,
  Printer, Download, Upload, Trash2, Check, X, FileCheck, FileSignature, 
  RefreshCw, Layers, Folder, Filter, Calendar
} from 'lucide-react';

interface RequestProtocol {
  id: string;
  student: string;
  grade: string;
  documentType: string;
  date: string;
  status: 'aberto' | 'processando' | 'pronto' | 'entregue';
  signed: boolean;
}

interface EnrollmentApproval {
  id: string;
  student: string;
  grade: string;
  responsible: string;
  cpf: string;
  status: 'pendente' | 'deferido' | 'indeferido';
  date: string;
}

interface AdminSecretariaProps {
  initialView: 'secretaria' | 'documentos';
}

export function AdminSecretaria({ initialView }: AdminSecretariaProps) {
  const [view, setView] = useState<'secretaria' | 'documentos'>(initialView);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [signingDocId, setSigningDocId] = useState<string | null>(null);

  // 1. Secretaria protocols state
  const [protocols, setProtocols] = useState<RequestProtocol[]>([
    { id: 'PRT-2026-042', student: 'João Pedro Silva', grade: '8º Ano B', documentType: 'Histórico Escolar Consolidado', date: '12/03/2026', status: 'aberto', signed: false },
    { id: 'PRT-2026-043', student: 'Bruno Santos', grade: '6º Ano C', documentType: 'Declaração de Matrícula Ativa', date: '14/03/2026', status: 'processando', signed: false },
    { id: 'PRT-2026-044', student: 'Ana Clara Souza', grade: '7º Ano A', documentType: 'Certidão de Conclusão de Curso', date: '15/03/2026', status: 'pronto', signed: true },
    { id: 'PRT-2026-045', student: 'Maria Oliveira', grade: '8º Ano B', documentType: 'Declaração de Matrícula Ativa', date: '18/03/2026', status: 'aberto', signed: false },
    { id: 'PRT-2026-041', student: 'Beatriz Costa', grade: '9º Ano A', documentType: 'Histórico Escolar Consolidado', date: '10/03/2026', status: 'entregue', signed: true }
  ]);

  // 2. Registrations state
  const [enrollments, setEnrollments] = useState<EnrollmentApproval[]>([
    { id: 'MAT-2026-551', student: 'Gustavo Henrique Alencar', grade: '1º Ano EM', responsible: 'Fernanda Alencar', cpf: '123.456.789-10', status: 'pendente', date: '14/03/2026' },
    { id: 'MAT-2026-552', student: 'Sophia Lima Duarte', grade: '6º Ano A', responsible: 'Arthur Duarte', cpf: '234.567.890-21', status: 'pendente', date: '16/03/2026' },
    { id: 'MAT-2026-550', student: 'Lucas Gabriel Vieira', grade: '8º Ano B', responsible: 'Camila Vieira', cpf: '345.678.901-32', status: 'deferido', date: '11/03/2026' }
  ]);

  // 3. Document Repository State
  const [documents, setDocuments] = useState([
    { id: 'doc-1', name: 'Projeto Político Pedagógico (PPP) 2026', version: 'v3.2', lastUpdate: '10/01/2026', size: '3.4 MB', category: 'Institucional' },
    { id: 'doc-2', name: 'Regimento Escolar Interno Homologado', version: 'v2.1', lastUpdate: '15/01/2026', size: '1.8 MB', category: 'Normativo' },
    { id: 'doc-3', name: 'Contrato Padrão de Prestação de Serviços 2026', version: 'v4.0', lastUpdate: '12/12/2025', size: '2.1 MB', category: 'Contratos' },
    { id: 'doc-4', name: 'Ata de Reunião de Planejamento Geral', version: 'v1.0', lastUpdate: '04/03/2026', size: '420 KB', category: 'Atas' },
    { id: 'doc-5', name: 'Portaria Interna de Calendário Escolar', version: 'v2.4', lastUpdate: '20/02/2026', size: '1.2 MB', category: 'Institucional' }
  ]);

  const [newDocName, setNewDocName] = useState<string>('');
  const [newDocCategory, setNewDocCategory] = useState<string>('Institucional');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Document action handlers
  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    setIsUploading(true);
    setTimeout(() => {
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: newDocName,
        version: 'v1.0',
        lastUpdate: new Date().toLocaleDateString('pt-BR'),
        size: '1.5 MB',
        category: newDocCategory
      };
      setDocuments(prev => [newDoc, ...prev]);
      setNewDocName('');
      setIsUploading(false);
    }, 1500);
  };

  const handleDeleteDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Protocols Action Handlers
  const handleProcessProtocol = (id: string) => {
    setProtocols(prev => prev.map(p => 
      p.id === id ? { ...p, status: 'processando' } : p
    ));
  };

  const handleSignDocument = (id: string) => {
    setSigningDocId(id);
    setTimeout(() => {
      setProtocols(prev => prev.map(p => 
        p.id === id ? { ...p, signed: true, status: 'pronto' } : p
      ));
      setSigningDocId(null);
    }, 2000);
  };

  const handleDeliverProtocol = (id: string) => {
    setProtocols(prev => prev.map(p => 
      p.id === id ? { ...p, status: 'entregue' } : p
    ));
  };

  // Enrollment actions
  const handleEnrollmentAction = (id: string, action: 'deferido' | 'indeferido') => {
    setEnrollments(prev => prev.map(en => 
      en.id === id ? { ...en, status: action } : en
    ));
  };

  return (
    <div className="space-y-6 text-left animate-fade-in text-slate-100">
      
      {/* HEADER SECTION */}
      <div className="bg-[#08142d] border border-gold/20 rounded-3xl p-6 shadow-2xl space-y-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/30 rounded-full text-gold text-[10px] font-black uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5 animate-pulse text-gold" />
            <span>SECRETARIA GERAL & REPOSITÓRIO DIGITAL</span>
          </div>
          <h2 className="font-serif text-xl md:text-2xl font-bold text-white">
            {view === 'secretaria' ? 'Secretaria Digital e Atendimento' : 'Repositório de Documentos Oficiais'}
          </h2>
          <p className="text-xs text-ice/70 leading-relaxed max-w-2xl">
            {view === 'secretaria' 
              ? 'Gestão de protocolos de atendimento, deferimento de matrículas e assinaturas digitais com certificação do Classium.' 
              : 'Gestão, controle de versão e catalogação de regulamentos, PPP, regimentos internos e atas escolares.'}
          </p>
        </div>

        {/* View Switcher inside header */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setView('secretaria')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              view === 'secretaria' 
                ? 'bg-[#D4AF37] text-slate-950 shadow-md font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Secretaria
          </button>
          <button
            onClick={() => setView('documentos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              view === 'documentos' 
                ? 'bg-[#D4AF37] text-slate-950 shadow-md font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Documentos
          </button>
        </div>
      </div>

      {/* VIEW 1: SECRETARIA DIGITAL */}
      {view === 'secretaria' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* PROTOCOLS LIST (SOLICITAÇÕES DE DOCUMENTOS) */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gold" /> Protocolos de Emissão Escolar
                  </h3>
                  <p className="text-[11px] text-slate-400">Transcripts, certificados e declarações solicitadas.</p>
                </div>
                
                {/* Simple Filter input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-white focus:outline-none focus:border-gold/30 w-36"
                  />
                </div>
              </div>

              {/* Protocols Vertical List */}
              <div className="space-y-3">
                {protocols
                  .filter(p => p.student.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(p => (
                    <div 
                      key={p.id}
                      className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:border-slate-700"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-gold font-bold">{p.id}</span>
                          <span className="text-xs font-bold text-white">{p.student}</span>
                          <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-semibold">{p.grade}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-semibold">{p.documentType}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                          <span>Data: {p.date}</span>
                          <span>•</span>
                          <span className={`font-bold flex items-center gap-1 ${p.signed ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {p.signed ? '✓ Assinado Digitalmente' : '⚠ Assinatura Pendente'}
                          </span>
                        </div>
                      </div>

                      {/* Action trigger based on status */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 border-t sm:border-t-0 border-slate-800/60 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                        {p.status === 'aberto' && (
                          <button
                            onClick={() => handleProcessProtocol(p.id)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider transition-colors"
                          >
                            Processar
                          </button>
                        )}

                        {p.status === 'processando' && (
                          <button
                            onClick={() => handleSignDocument(p.id)}
                            disabled={signingDocId === p.id}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                          >
                            {signingDocId === p.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Assinando...</span>
                              </>
                            ) : (
                              <>
                                <FileSignature className="w-3.5 h-3.5" />
                                <span>Assinar & Gerar</span>
                              </>
                            )}
                          </button>
                        )}

                        {p.status === 'pronto' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeliverProtocol(p.id)}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-wider transition-colors"
                            >
                              Confirmar Entrega
                            </button>
                            <button
                              onClick={() => alert('Download do Documento Gerado em formato PDF com chave hash.')}
                              className="p-1.5 bg-slate-900 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-800"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {p.status === 'entregue' && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Entregue</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

            </div>

            {/* ENROLLMENT APPROVALS (MATRÍCULAS E TRANSFERÊNCIAS) */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl lg:col-span-1 space-y-4">
              <div className="border-b border-slate-800 pb-3 space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gold" /> Matrículas e Deferimentos
                </h3>
                <p className="text-[11px] text-slate-400">Aprovação de novos contratos e transferências.</p>
              </div>

              {/* Enrollment Cards */}
              <div className="space-y-4">
                {enrollments.map(en => (
                  <div key={en.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[9px] text-slate-500 block">{en.id}</span>
                        <h4 className="text-xs font-bold text-white leading-tight">{en.student}</h4>
                        <span className="text-[10px] text-gold font-semibold">{en.grade}</span>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                        en.status === 'deferido' ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' :
                        en.status === 'indeferido' ? 'bg-rose-500/15 border-rose-500 text-rose-400' :
                        'bg-amber-500/15 border-amber-500 text-amber-400'
                      }`}>
                        {en.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-400">
                      <p>Resp: <span className="text-slate-200">{en.responsible}</span></p>
                      <p>CPF: <span className="text-slate-200">{en.cpf}</span></p>
                    </div>

                    {en.status === 'pendente' && (
                      <div className="flex gap-2 pt-1.5">
                        <button
                          onClick={() => handleEnrollmentAction(en.id, 'deferido')}
                          className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase rounded-lg transition-all text-center flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3 text-slate-950 stroke-[3]" /> Deferir
                        </button>
                        <button
                          onClick={() => handleEnrollmentAction(en.id, 'indeferido')}
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-rose-400 text-[10px] font-bold uppercase rounded-lg transition-all text-center flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3 text-rose-400" /> Indeferir
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* VIEW 2: REPOSITÓRIO DE DOCUMENTOS */}
      {view === 'documentos' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* FILE EXPLORER LIST */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Folder className="w-4 h-4 text-gold" /> Arquivos Escolares Homologados
                  </h3>
                  <p className="text-[11px] text-slate-400">Histórico de versões arquivadas eletronicamente.</p>
                </div>
                <span className="text-[10px] font-mono bg-slate-950 border border-slate-850 text-gold px-2 py-0.5 rounded">
                  Chave Geral: SHA-256
                </span>
              </div>

              {/* Documents cards list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map(d => (
                  <div 
                    key={d.id}
                    className="bg-slate-950/80 border border-slate-850 p-4.5 rounded-xl space-y-3.5 flex flex-col justify-between hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">{d.category}</span>
                        <span className="text-[9px] text-[#D4AF37] font-bold font-mono">{d.version}</span>
                      </div>
                      <h4 className="font-serif text-xs font-bold text-white leading-relaxed">{d.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Data: {d.lastUpdate} • {d.size}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                      <button
                        onClick={() => alert(`Download iniciado: ${d.name}`)}
                        className="text-[10px] font-bold text-[#D4AF37] hover:text-yellow-500 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </button>

                      <button
                        onClick={() => handleDeleteDoc(d.id)}
                        className="p-1 text-slate-600 hover:text-rose-500 transition-colors"
                        title="Deletar documento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* UPLOAD & METADATA CONFIG */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl lg:col-span-1 space-y-4">
              <div className="border-b border-slate-800 pb-3 space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-gold" /> Homologar Documento (Upload)
                </h3>
                <p className="text-[11px] text-slate-400">Insira novos regimentos e atas no repositório.</p>
              </div>

              <form onSubmit={handleUploadDoc} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Título do Documento</label>
                  <input
                    type="text"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Ex: Calendário Acadêmico 2026 Homologado"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 focus:outline-none focus:border-gold/30 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold block">Categoria</label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 focus:outline-none focus:border-gold/30"
                  >
                    <option value="Institucional">Institucional</option>
                    <option value="Normativo">Normativo</option>
                    <option value="Contratos">Contratos</option>
                    <option value="Atas">Atas</option>
                  </select>
                </div>

                {/* Simulated file selector zone */}
                <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-gold/30 transition-all cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-bounce" />
                  <p className="font-bold text-slate-300">Arrastar & Soltar arquivo</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Formatos suportados: PDF, DOCX (Máx 25MB)</p>
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-slate-950 font-black uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>PROCESSANDO UPLOAD...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>HOMOLOGAR AGORA</span>
                    </>
                  )}
                </button>
              </form>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
