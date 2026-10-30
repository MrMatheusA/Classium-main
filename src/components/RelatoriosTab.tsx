import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, Sparkles, User, Users, CheckCircle2, 
  Clock, ShieldAlert, Download, Printer, Edit3, ArrowRight,
  Brain, BookOpen, Puzzle, Search, Building2, AlertTriangle,
  FolderLock, RefreshCw, Check, Info, FileSpreadsheet,
  ChevronRight, ArrowLeft, HeartPulse, Scale, Eye, HelpCircle,
  Award, Shield, FileCheck, Layers, Share2, Save, Send, X,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic,
  Underline, Strikethrough, List, ListOrdered, MessageSquare, Star, ArrowUpRight, LogOut
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { classesService, ClassEntity } from '../services/classes/classes.service';
import { studentsService, Student } from '../services/students/students.service';
import { pedagogicalReportsService, PedagogicalReportRecord } from '../services/reports/pedagogicalReports.service';
import { sanitizeHtml } from '../utils/sanitize';

// TIPOS E MODELOS DA CENTRAL DE RELATÓRIOS
export type ReportPurpose = 
  | 'clinica' 
  | 'inclusao_aee' 
  | 'pedagogico' 
  | 'indicadores_atencao' 
  | 'indicadores_comunicacao' 
  | 'familia' 
  | 'saude' 
  | 'secretaria' 
  | 'conselho_tutelar' 
  | 'cras' 
  | 'creas' 
  | 'conselho_classe';

export type ReportStatus = 
  | 'rascunho' 
  | 'pending_review' 
  | 'em_revisao' 
  | 'approved' 
  | 'rejected' 
  | 'archived';

export interface CatalogModel {
  id: string;
  group: 'pedagogicos' | 'des_neuropsicomotor' | 'especialistas' | 'indicadores' | 'inclusao' | 'protecao';
  title: string;
  description: string;
  badge: string;
  target?: string;
  icon: any;
  purposeCode: ReportPurpose;
}

export interface RelatoriosTabProps {
  teacherId?: string;
  teacherName?: string;
  teacherSubject?: string;
  selectedClass?: string;
  onSelectClass?: (classId: string) => void;
  classesList?: {
    id: string;
    name: string;
    room?: string;
    shift?: string;
    subject?: string;
    studentsCount?: number;
    isReference?: boolean;
    inProgress?: boolean;
  }[];
  onOpenShiftModal?: () => void;
  onLogout?: () => void;
}

// Helper para formatar o nome do ciclo
const formatClassCycle = (className?: string) => {
  const safeClass = String(className || '').trim();
  if (!safeClass) return 'Turma - Fundamental II';
  if (safeClass.toLowerCase().includes('fundamental')) return safeClass;

  const numMatch = safeClass.match(/([1-9])\s*º?/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const cycle = num <= 5 ? 'Fundamental I' : 'Fundamental II';
    return `${safeClass} - ${cycle}`;
  }
  return `${safeClass} - Fundamental II`;
};

/** Sem estudantes de exemplo: a lista vem do cadastro real */
export const DEFAULT_STUDENTS: Student[] = [];

export const DEFAULT_CLASSES: { id: string; name: string; room?: string; shift?: string; studentsCount?: number; isReference?: boolean }[] = [];

export function RelatoriosTab({
  teacherId,
  teacherName = 'Professor Docente',
  teacherSubject = '',
  selectedClass = '',
  onSelectClass,
  classesList,
  onOpenShiftModal,
  onLogout
}: RelatoriosTabProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'gerador' | 'catalogo'>('gerador');
  
  // Real DB Data states
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(selectedClass || 'all');
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // History and Realtime reports
  const [historyReports, setHistoryReports] = useState<PedagogicalReportRecord[]>([]);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('todos');

  // Etapas: 1 estudante, 2 finalidade, 3 observações, 4 montagem, 5 revisão
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedPurpose, setSelectedPurpose] = useState<ReportPurpose>('clinica');
  const [specialistTarget, setSpecialistTarget] = useState<string>('Neuropediatria / Psiquiatria Infantil');
  
  // Current Generated or Loaded Report
  const [currentReport, setCurrentReport] = useState<PedagogicalReportRecord | null>(null);

  // Rich Text Editor State
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
  const [editableHtml, setEditableHtml] = useState<string>('');
  const [savingAction, setSavingAction] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // FORM OBJECTIVE DATA
  const [formData, setFormData] = useState({
    atencaoFoco: '',
    instrucoesRepeticao: '',
    organizacaoMateriais: '',
    impulsividadeMovimento: '',
    interacaoSocial: '',
    estrategiasTestadas: [] as string[],
    pontosFortes: '',
    dificuldadesObservadas: '',
    observacoesFinais: ''
  });

  // Catalog search & filter
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogGroupFilter, setCatalogGroupFilter] = useState<string>('todos');

  const printAreaRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const orgId = profile?.organization_id || '11111111-1111-1111-1111-111111111111';

  // Sincronizar selectedClass vindo das props
  useEffect(() => {
    if (selectedClass) {
      setSelectedClassId(selectedClass);
    }
  }, [selectedClass]);

  // 1. CARREGAR DADOS DO SUPABASE E API
  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Carregar Turmas
      try {
        const cls = await classesService.getClassesByOrganization(orgId);
        if (cls && cls.length > 0) {
          setClasses(cls);
          if ((!selectedClassId || selectedClassId === 'all') && cls[0]?.id) {
            setSelectedClassId(cls[0].id);
          }
        }
      } catch (clsErr) {
        console.warn('[RelatoriosTab] Erro ao carregar turmas:', clsErr);
      }

      // Carregar Estudantes
      try {
        const { items: stds } = await studentsService.getStudents(orgId);
        if (stds && stds.length > 0) {
          setStudents(stds);
          if (!selectedStudentId || selectedStudentId === 'std-001') {
            setSelectedStudentId(stds[0].id);
          }
        } else {
          setStudents(prev => prev.length > 0 ? prev : DEFAULT_STUDENTS);
        }
      } catch (stdErr) {
        console.warn('[RelatoriosTab] Erro ao carregar estudantes:', stdErr);
        setStudents(prev => prev.length > 0 ? prev : DEFAULT_STUDENTS);
      }

      // Carregar Histórico de Relatórios
      await loadReportsHistory();
    } catch (err) {
      console.warn('[RelatoriosTab] Erro geral ao inicializar:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadReportsHistory = async () => {
    try {
      const { reports } = await pedagogicalReportsService.getReports({
        organizationId: orgId
      });
      if (reports && reports.length > 0) {
        setHistoryReports(reports);
      } else {
        setHistoryReports([]);
      }
    } catch (err) {
      console.warn('[RelatoriosTab] Erro ao carregar histórico:', err);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Inscrição Realtime no canal de relatórios
    const channel = supabase
      .channel(`pedagogical_reports_teacher_${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedagogical_reports' }, () => {
        loadReportsHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  // Alunos filtrados estritamente pela turma selecionada em Minhas Turmas
  const filteredStudents = useMemo(() => {
    // 1. Verificar se há turmas do DB com alunos associados
    if (classes.length > 0 && selectedClassId && selectedClassId !== 'all') {
      const currentCls = classes.find(c => c.id === selectedClassId);
      if (currentCls && currentCls.students && currentCls.students.length > 0) {
        const studentIdsInClass = new Set(currentCls.students.map((s: any) => s.student_id || s.id));
        const inClass = students.filter(s => studentIdsInClass.has(s.id));
        if (inClass.length > 0) return inClass;
      }
    }

    if (selectedClassId && selectedClassId !== 'all') {
      const matched = students.filter(s => s.class_id === selectedClassId);
      if (matched.length > 0) return matched;
    }
    return students.length > 0 ? students : DEFAULT_STUDENTS;
  }, [students, classes, selectedClassId]);

  // Sincronizar aluno selecionado quando a turma mudar
  useEffect(() => {
    if (filteredStudents.length > 0) {
      const exists = filteredStudents.some(s => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    }
  }, [filteredStudents, selectedStudentId]);

  // Aluno Selecionado Atual (blindado contra null)
  const activeStudent = useMemo(() => {
    const found = filteredStudents.find(s => s.id === selectedStudentId);
    if (found) return found;
    if (filteredStudents.length > 0) return filteredStudents[0];
    if (students.length > 0) return students[0];
    return undefined;
  }, [filteredStudents, selectedStudentId, students]);

  // Lista consolidada de turmas vinculadas ao docente (com fallback institucional ativo)
  const displayClasses = useMemo(() => {
    if (classesList && classesList.length > 0) return classesList;
    if (classes && classes.length > 0) {
      return classes.map(c => ({
        id: c.id,
        name: c.name,
        room: (c as any).room || '',
        shift: (c as any).shift || '',
        studentsCount: c.students?.length || 0,
        isReference: false
      }));
    }
    return DEFAULT_CLASSES;
  }, [classesList, classes]);

  // Obter nome da turma atual formatado
  const activeClassName = useMemo(() => {
    const cls = displayClasses.find(c => c.id === selectedClassId) || classes.find(c => c.id === selectedClassId);
    if (cls) return formatClassCycle(cls.name);
    return displayClasses[0]?.name ? formatClassCycle(displayClasses[0].name) : 'Turma';
  }, [displayClasses, classes, selectedClassId]);

  // 2. CATÁLOGO COMPLETO DE 8 MODELOS OFICIAIS (Conforme Screenshots 2-7)
  const catalogList: CatalogModel[] = [
    {
      id: 'cat-01',
      group: 'especialistas',
      title: 'Relatório para Neuropediatra / Psiquiatria Infantil',
      description: 'Estruturado para investigação de TDAH, TEA, TOD, Altas Habilidades e Transtornos de Aprendizagem com base em evidências.',
      badge: 'MÉDICO / ESPECIALISTA',
      target: 'Clínica Especializada',
      icon: Brain,
      purposeCode: 'clinica'
    },
    {
      id: 'cat-02',
      group: 'des_neuropsicomotor',
      title: 'Relatório para Neuropsicólogo / Avaliação Neuropsicológica',
      description: 'Foco em funções executivas, atenção sustentada, flexibilidade cognitiva e velocidade de processamento.',
      badge: 'NEUROPSICOLOGIA',
      target: 'Neuropsicologia',
      icon: Brain,
      purposeCode: 'clinica'
    },
    {
      id: 'cat-03',
      group: 'especialistas',
      title: 'Relatório para Fonoaudiologia',
      description: 'Descrição de dificuldades em consciência fonológica, decodificação leitora, fala e processamento auditivo central.',
      badge: 'FONOAUDIOLOGIA',
      target: 'Fonoaudiologia',
      icon: Users,
      purposeCode: 'clinica'
    },
    {
      id: 'cat-04',
      group: 'inclusao',
      title: 'Parecer para Atendimento Educacional Especializado (AEE)',
      description: 'Identificação de barreiras de aprendizagem, recursos de acessibilidade e subsídios para elaboração do PEI.',
      badge: 'SALA DE RECURSOS / AEE',
      target: 'Inclusão & AEE',
      icon: Puzzle,
      purposeCode: 'inclusao_aee'
    },
    {
      id: 'cat-05',
      group: 'pedagogicos',
      title: 'Relatório Pedagógico Descritivo Bimestral / Trimestral',
      description: 'Avaliação processual e contínua do desenvolvimento das competências e habilidades da BNCC.',
      badge: 'CONSELHO DE CLASSE / SÉRIE',
      target: 'Conselho de Classe / Pasta',
      icon: BookOpen,
      purposeCode: 'pedagogico'
    },
    {
      id: 'cat-06',
      group: 'protecao',
      title: 'Relatório Circunstanciado para Conselho Tutelar',
      description: 'Comunicação formal de infrequência escolar grave (Lei nº 13.803/2019) e esgotamento de medidas escolares.',
      badge: 'CONSELHO TUTELAR',
      target: 'Conselho Tutelar',
      icon: Scale,
      purposeCode: 'conselho_tutelar'
    },
    {
      id: 'cat-07',
      group: 'protecao',
      title: 'Relatório de Encaminhamento ao CRAS / CREAS',
      description: 'Subsídios para atendimento psicossocial e acompanhamento de vulnerabilidades sociais com sigilo absoluto.',
      badge: 'REDE DE PROTEÇÃO SOCIAL',
      target: 'Rede de Proteção Social',
      icon: HeartPulse,
      purposeCode: 'cras'
    },
    {
      id: 'cat-08',
      group: 'indicadores',
      title: 'Mapeamento de Indicadores de Atenção & Hiperatividade',
      description: 'Levantamento descritivo de frequência e intensidade de dispersão e movimentação em ambiente de sala de aula.',
      badge: 'TRIAGEM PEDAGÓGICA INICIAL',
      target: 'Equipe Multiprofissional',
      icon: Sparkles,
      purposeCode: 'indicadores_atencao'
    }
  ];

  // FILTRAR CATÁLOGO
  const filteredCatalog = useMemo(() => {
    return catalogList.filter(item => {
      const q = (catalogSearch || '').toLowerCase();
      const matchSearch = !q || 
        String(item.title || '').toLowerCase().includes(q) || 
        String(item.description || '').toLowerCase().includes(q) ||
        String(item.badge || '').toLowerCase().includes(q);
      
      const matchGroup = catalogGroupFilter === 'todos' || item.group === catalogGroupFilter;
      return matchSearch && matchGroup;
    });
  }, [catalogSearch, catalogGroupFilter]);

  // SELEÇÃO A PARTIR DO CATÁLOGO
  const handleSelectFromCatalog = (model: CatalogModel) => {
    setSelectedPurpose(model.purposeCode);
    if (model.target) setSpecialistTarget(model.target);
    setActiveTab('gerador');
    setWizardStep(3);
    showToast(`Modelo "${model.title}" carregado com sucesso!`);
  };

  // 3. GERAÇÃO INTELIGENTE DE RELATÓRIO COM PADRÃO ENTERPRISE
  const handleGenerateReport = async () => {
    if (!activeStudent) {
      showToast('Escolha o estudante antes de montar o relatório.', 'error');
      setWizardStep(1);
      return;
    }
    setWizardStep(4);
    setIsGeneratingAI(true);

    const titleMap: Record<ReportPurpose, string> = {
      clinica: `Relatório Pedagógico Descritivo para Encaminhamento Clínico (${specialistTarget})`,
      inclusao_aee: 'Parecer Pedagógico para o Atendimento Educacional Especializado (AEE)',
      pedagogico: 'Relatório Pedagógico Descritivo Bimestral de Desenvolvimento',
      indicadores_atencao: 'Mapeamento Descritivo de Indicadores de Atenção & Hiperatividade',
      indicadores_comunicacao: 'Parecer Pedagógico de Desenvolvimento Linguístico e Interação',
      familia: 'Relatório Circunstanciado de Acompanhamento para a Família',
      saude: 'Parecer Técnico Escolar para a Rede de Atenção à Saúde',
      secretaria: 'Relatório Informativo Escolar para Secretaria de Educação',
      conselho_tutelar: 'Relatório Circunstanciado para Conselho Tutelar (Lei 13.803/2019)',
      cras: 'Relatório de Encaminhamento ao CRAS / CREAS',
      creas: 'Relatório Circunstanciado para a Rede de Proteção Especial (CREAS)',
      conselho_classe: 'Parecer Diagnóstico para o Conselho de Classe Deliberativo'
    };

    const docTitle = titleMap[selectedPurpose] || 'Relatório Pedagógico Oficial';
    const currentTeacherName = teacherName || profile?.name || 'Professor Docente';
    const pedagogueName = 'Coordenação Pedagógica';
    const directorName = 'Direção Geral';
    const studentName = activeStudent?.name || (activeStudent as any)?.full_name || 'Estudante';
    const studentReg = activeStudent?.registration_code || (activeStudent as any)?.code || (activeStudent as any)?.ra || '';
    const studentClassStr = activeClassName;

    // Gerar corpo HTML formatado do relatório
    const htmlReportContent = `
      <div class="report-section mb-4">
        <h3 class="font-bold text-xs text-[var(--text-heading)] border-b border-[var(--border)] pb-1 mb-2">1. Motivo e Finalidade do Encaminhamento</h3>
        <p class="text-xs text-[var(--text-body)] leading-relaxed text-justify">
          O presente relatório pedagógico tem por finalidade descrever de forma técnica, objetiva e processual o desempenho acadêmico, os padrões de interação, foco atencional e as respostas pedagógicas do(a) estudante <strong>${studentName}</strong>, devidamente matriculado(a) na turma <strong>${studentClassStr}</strong>, visando subsidiar a avaliação especializada de <strong>${specialistTarget}</strong> no âmbito da cooperação interdisciplinar escola-saúde.
        </p>
      </div>

      <div class="report-section mb-4">
        <h3 class="font-bold text-xs text-[var(--text-heading)] border-b border-[var(--border)] pb-1 mb-2">2. Desempenho na Aprendizagem e Mediação Pedagógica</h3>
        <p class="text-xs text-[var(--text-body)] leading-relaxed text-justify mb-2">
          Durante as situações de aprendizagem formal, observa-se que o estudante compreende instruções com o seguinte perfil: <em>"${formData.instrucoesRepeticao}"</em>. Em relação ao foco e sustentação atencional durante atividades expositivas e individuais, verifica-se comportamento caracterizado como <em>"${formData.atencaoFoco}"</em>.
        </p>
        <p class="text-xs text-[var(--text-body)] leading-relaxed text-justify">
          <strong>Organização e Gestão de Materiais:</strong> ${formData.organizacaoMateriais}.
        </p>
      </div>

      <div class="report-section mb-4">
        <h3 class="font-bold text-xs text-[var(--text-heading)] border-b border-[var(--border)] pb-1 mb-2">3. Autorregulação, Movimentação e Relações com Pares</h3>
        <p class="text-xs text-[var(--text-body)] leading-relaxed text-justify mb-2">
          <strong>Controle Inibitório e Movimentação:</strong> ${formData.impulsividadeMovimento}.
        </p>
        <p class="text-xs text-[var(--text-body)] leading-relaxed text-justify">
          <strong>Interação Social e Comunicação:</strong> ${formData.interacaoSocial}.
        </p>
      </div>

      <div class="report-section mb-4">
        <h3 class="font-bold text-xs text-[var(--text-heading)] border-b border-[var(--border)] pb-1 mb-2">4. Estratégias Pedagógicas e Intervenções já Testadas</h3>
        <p class="text-xs text-[var(--text-body)] leading-relaxed text-justify mb-2">
          A equipe docente aplicou sistematicamente as seguintes adaptações curriculares e metodológicas em sala de aula regular:
        </p>
        <ul class="list-disc pl-5 text-xs text-[var(--text-body)] space-y-1">
          ${formData.estrategiasTestadas.map(e => `<li>${e}</li>`).join('')}
        </ul>
      </div>

      <div class="report-section mb-4">
        <h3 class="font-bold text-xs text-[var(--text-heading)] border-b border-[var(--border)] pb-1 mb-2">5. Potencialidades e Dificuldades Observadas</h3>
        <p class="text-xs text-[var(--text-body)] leading-relaxed text-justify mb-2">
          <strong>Potencialidades e Talentos:</strong> ${formData.pontosFortes}.
        </p>
        <p class="text-xs text-[var(--text-body)] leading-relaxed text-justify">
          <strong>Barreiras e Desafios Pedagógicos:</strong> ${formData.dificuldadesObservadas}.
        </p>
      </div>

      <div class="report-section mb-4">
        <h3 class="font-bold text-xs text-[var(--text-heading)] border-b border-[var(--border)] pb-1 mb-2">6. Considerações da Equipe Pedagógica</h3>
        <p class="text-xs text-[var(--text-body)] leading-relaxed text-justify">
          ${formData.observacoesFinais}
        </p>
      </div>
    `;

    const reportRecord: PedagogicalReportRecord = {
      id: `rep-${Date.now()}`,
      organization_id: orgId,
      student_id: activeStudent?.id || '',
      student_name: studentName,
      student_class: studentClassStr,
      student_registration: studentReg,
      attendance_rate: (activeStudent as any)?.attendance_rate || '',
      teacher_name: currentTeacherName,
      pedagogue_name: pedagogueName,
      director_name: directorName,
      title: docTitle,
      report_type: selectedPurpose,
      purpose: selectedPurpose,
      specialist_target: specialistTarget,
      report_content: htmlReportContent,
      structured_content: formData,
      status: 'rascunho',
      version: 'v1.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Salvar no backend e banco
    try {
      const res = await pedagogicalReportsService.createReport(reportRecord);
      if (res.success && res.report) {
        setCurrentReport(res.report);
        setEditableHtml(res.report.report_content);
      } else {
        setCurrentReport(reportRecord);
        setEditableHtml(htmlReportContent);
      }
    } catch (e) {
      setCurrentReport(reportRecord);
      setEditableHtml(htmlReportContent);
    }

    setIsGeneratingAI(false);
    setWizardStep(5);
    showToast('Relatório montado com as suas respostas. Revise antes de enviar.');
  };

  // 4. AÇÕES DO EDITOR E EXPORTAÇÃO
  
  // Salvar Alterações Feitas no Editor
  const handleSaveEditorChanges = async () => {
    if (!currentReport) return;
    setSavingAction(true);
    try {
      const res = await pedagogicalReportsService.updateReport(currentReport.id, {
        report_content: editableHtml,
        structured_content: formData
      });
      if (res.success) {
        showToast('Alterações do texto salvas com sucesso!');
        setCurrentReport(prev => prev ? { ...prev, report_content: editableHtml } : null);
        setIsEditingMode(false);
        loadReportsHistory();
      } else {
        showToast('Erro ao salvar alterações.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao salvar', 'error');
    } finally {
      setSavingAction(false);
    }
  };

  // Enviar para a Pedagoga (Coordenação Pedagógica)
  const handleSubmitToPedagoga = async () => {
    if (!currentReport) return;
    setSavingAction(true);
    try {
      const res = await pedagogicalReportsService.submitToPedagoga(currentReport.id, {
        report_content: editableHtml,
        structured_content: formData
      });

      if (res.success) {
        showToast('Relatório enviado com sucesso para a Central Pedagógica!');
        setCurrentReport(prev => prev ? { ...prev, status: 'pending_review' } : null);
        loadReportsHistory();
      } else {
        showToast('Erro ao enviar para a pedagoga.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Erro ao submeter relatório', 'error');
    } finally {
      setSavingAction(false);
    }
  };

  // Exportar para Word (.doc)
  const handleExportDoc = (rep: PedagogicalReportRecord | null) => {
    const reportToExport = rep || currentReport;
    if (!reportToExport) return;

    const title = reportToExport.title || 'Relatorio_Pedagogico';
    const contentHtml = reportToExport.report_content || editableHtml || '';
    
    const blobContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #111; margin: 20mm; }
          h1 { font-size: 14pt; text-align: center; text-transform:; margin-bottom: 4px; }
          h2 { font-size: 12pt; text-align: center; color: #444; margin-top: 0; }
          h3 { font-size: 10pt; text-transform:; border-bottom: 1px solid #999; padding-bottom: 2px; margin-top: 15px; }
          p { margin-bottom: 8px; text-align: justify; }
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
          <h2>${reportToExport.title}</h2>
          <table class="info-table">
            <tr>
              <td><strong>Estudante:</strong> ${reportToExport.student_name}</td>
              <td><strong>Matrícula RA:</strong> ${reportToExport.student_registration || '2024-901-008'}</td>
            </tr>
            <tr>
              <td><strong>Turma:</strong> ${reportToExport.student_class}</td>
              <td><strong>Frequência Registrada:</strong> ${reportToExport.attendance_rate || 'não informada'}</td>
            </tr>
            <tr>
              <td><strong>Professor(a):</strong> ${reportToExport.teacher_name || teacherName}</td>
              <td><strong>Data de Emissão:</strong> ${new Date(reportToExport.created_at).toLocaleDateString('pt-BR')}</td>
            </tr>
          </table>
          <div class="content-body">
            ${contentHtml}
          </div>
          <div class="footer-signatures">
            <div class="sig-col">
              <div class="sig-line">
                <strong>${reportToExport.teacher_name || teacherName}</strong><br/>
                Docente
              </div>
            </div>
            <div class="sig-col">
              <div class="sig-line">
                <strong>${reportToExport.pedagogue_name || 'Coordenação Pedagógica'}</strong><br/>
                Pedagogo(a)
              </div>
            </div>
            <div class="sig-col">
              <div class="sig-line">
                <strong>${reportToExport.director_name || 'Direção Escolar'}</strong><br/>
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
    link.download = `${title.replace(/\s+/g, '_')}_${reportToExport.student_name.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Documento Word (.doc) exportado com sucesso!');
  };

  // Exportar CSV
  const handleExportCSV = (rep: PedagogicalReportRecord | null) => {
    const reportToExport = rep || currentReport;
    if (!reportToExport) return;
    const link = document.createElement('a');
    link.href = `/api/teacher/reports/${reportToExport.purpose || 'pedagogico'}/export/csv?reportId=${reportToExport.id}&studentName=${encodeURIComponent(reportToExport.student_name)}`;
    link.download = `Relatorio_${reportToExport.student_name.replace(/\s+/g, '_')}.csv`;
    link.click();
    showToast('Planilha CSV exportada com sucesso!');
  };

  // Exportar Excel
  const handleExportExcel = (rep: PedagogicalReportRecord | null) => {
    const reportToExport = rep || currentReport;
    if (!reportToExport) return;
    const link = document.createElement('a');
    link.href = `/api/teacher/reports/${reportToExport.purpose || 'pedagogico'}/export/xlsx?reportId=${reportToExport.id}&studentName=${encodeURIComponent(reportToExport.student_name)}`;
    link.download = `Relatorio_${reportToExport.student_name.replace(/\s+/g, '_')}.xls`;
    link.click();
    showToast('Planilha Excel exportada com sucesso!');
  };

  // Imprimir
  const handlePrint = () => {
    window.print();
  };

  // FILTRAR HISTÓRICO
  const filteredHistory = useMemo(() => {
    return historyReports.filter(rep => {
      const matchSearch = !historySearch ||
        rep.student_name?.toLowerCase().includes(historySearch.toLowerCase()) ||
        rep.title?.toLowerCase().includes(historySearch.toLowerCase()) ||
        rep.student_registration?.toLowerCase().includes(historySearch.toLowerCase());

      const matchStatus = historyFilterStatus === 'todos' || 
        (historyFilterStatus === 'pending_review' && (rep.status === 'pending_review' || rep.status === 'em_revisao')) ||
        rep.status === historyFilterStatus;

      return matchSearch && matchStatus;
    });
  }, [historyReports, historySearch, historyFilterStatus]);

  // Handler de seleção de turma unificado
  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    onSelectClass?.(classId);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in pb-16">
      
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl border shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] flex items-center gap-3 backdrop-blur-md transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 ' 
            : 'bg-rose-50 border-rose-200 '
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-700" /> : <AlertTriangle className="w-5 h-5 text-rose-700" />}
          <span className="text-xs font-bold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Topo: professor, turmas e etapas */}
      <section id="relatorios-master-panel" className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6 print:hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--accent-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--accent-soft) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 55% 90% at 100% 0%, black, transparent)',
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
              <FileText className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">Relatórios pedagógicos</h2>
              <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-[var(--text-muted)]">
                Monte relatórios a partir do que você observa em sala. O professor descreve fatos; o diagnóstico é de quem recebe o relatório.
              </p>
              {(teacherName || teacherSubject) && (
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">{[teacherName, teacherSubject].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Seções" className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-card-alt)] p-1">
              {[
                { id: 'gerador' as const, label: 'Novo relatório', icon: Sparkles },
                { id: 'catalogo' as const, label: 'Modelos', icon: BookOpen },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors ${active ? 'bg-[var(--bg-card)] text-[var(--text-heading)] shadow-[0_1px_3px_rgba(16,24,40,0.12)]' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sair"
                title="Sair"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Minhas turmas */}
        <div className="relative mt-5 border-t border-[var(--border)] pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-heading)]">
              <Users className="h-4 w-4 text-[var(--accent)]" /> Minhas turmas
            </p>
            <span className="text-[12px] text-[var(--text-muted)]">{displayClasses.length} {displayClasses.length === 1 ? 'turma' : 'turmas'}</span>
          </div>
          {displayClasses.length === 0 ? (
            <p className="rounded-2xl bg-[var(--bg-card-alt)] px-4 py-3 text-[13px] text-[var(--text-muted)]">{loadingData ? 'Carregando turmas…' : 'Nenhuma turma vinculada a você ainda.'}</p>
          ) : (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {displayClasses.map((cls) => {
                const isSelected = selectedClassId === cls.id;
                const studentsCount = cls.studentsCount ?? 0;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleSelectClass(cls.id)}
                    aria-pressed={isSelected}
                    className={`min-w-[180px] shrink-0 rounded-2xl border px-4 py-3 text-left transition-all ${isSelected ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-4 ring-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)]'}`}
                  >
                    <p className="truncate font-semibold text-[var(--text-heading)]">{formatClassCycle(cls.name)}</p>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                      {[cls.room, studentsCount ? `${studentsCount} estudantes` : ''].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Etapas */}
        {activeTab === 'gerador' && (
          <ol className="relative mt-5 grid grid-cols-5 gap-2 border-t border-[var(--border)] pt-5">
            {[
              { step: 1, label: 'Estudante' },
              { step: 2, label: 'Finalidade' },
              { step: 3, label: 'Observações' },
              { step: 4, label: 'Montagem' },
              { step: 5, label: 'Revisão' },
            ].map((st) => {
              const done = wizardStep > st.step;
              const current = wizardStep === st.step;
              return (
                <li key={st.step}>
                  <button
                    type="button"
                    disabled={!done}
                    onClick={() => done && setWizardStep(st.step as any)}
                    aria-current={current ? 'step' : undefined}
                    className="flex w-full flex-col items-center gap-1.5 text-center disabled:cursor-default"
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold"
                      style={current ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : done ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'var(--bg-card-alt)', color: 'var(--text-muted)' }}
                    >
                      {done ? <Check className="h-4 w-4" /> : st.step}
                    </span>
                    <span className={`hidden text-[12px] sm:block ${current ? 'font-semibold text-[var(--text-heading)]' : 'text-[var(--text-muted)]'}`}>{st.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ========================================================================= */}
      {/* ABA 1: GERADOR INTELIGENTE (WIZARD DE 5 ETAPAS)                           */}
      {/* ========================================================================= */}
      {activeTab === 'gerador' && (
        <div className="space-y-6">

          {/* ETAPA 1: SELECIONAR ESTUDANTE (TURMA JÁ SELECIONADA ACIMA EM MINHAS TURMAS) */}
          {wizardStep === 1 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 space-y-6">
              <div className="border-b border-[var(--border)] pb-4">
                <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <User className="w-5 h-5 text-[var(--accent)]" />
                  Selecione o Estudante para Documentação
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Os dados do estudante, frequência acumulada e histórico acadêmico serão vinculados automaticamente.
                </p>
              </div>

              {/* SELETOR ÚNICO DO ESTUDANTE SELECIONADO (SEM O CAMPO REDUNDANTE TURMA DO PROFESSOR) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-body)]">Estudante Selecionado:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-[var(--bg-card-alt)] border border-[var(--border)] text-[var(--text-body)] text-xs rounded-xl p-3.5 outline-none focus:border-[var(--accent)] cursor-pointer"
                >
                  {filteredStudents.map(st => {
                    const stName = st.name || (st as any).full_name;
                    const stRa = st.registration_code || (st as any).code || (st as any).ra || '—';
                    return (
                      <option key={st.id} value={st.id}>
                        {stName} — RA: {stRa}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* CARD DE DETALHES DO ESTUDANTE ATUAL */}
              <div className="p-4 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-[var(--text-heading)]">{activeStudent?.name || (activeStudent as any)?.full_name || 'Estudante Selecionado'}</strong>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card-alt)] text-[var(--text-body)] border border-[var(--border)] font-bold">
                      Mat.: {activeStudent?.registration_code || (activeStudent as any)?.code || (activeStudent as any)?.ra || '—'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Turma: <span className="text-[var(--accent)] font-bold">{activeClassName}</span> • Frequência Registrada: <span className="text-emerald-700 font-mono font-bold">{(activeStudent as any)?.attendance_rate || 'não informada'}</span>
                  </p>
                </div>

                <button
                  onClick={() => setWizardStep(2)}
                  className="px-6 py-2.5 bg-[var(--accent)] hover:bg-gold-light text-[var(--accent-fg)] font-semibold rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer self-stretch md:self-auto justify-center"
                >
                  <span>Avançar para Finalidade</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 2: ESCOLHER FINALIDADE E DESTINATÁRIO */}
          {wizardStep === 2 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 space-y-6">
              <div className="border-b border-[var(--border)] pb-4">
                <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[var(--accent)]" />
                  Qual é a Finalidade e o Destinatário deste Relatório?
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  O texto do relatório se adapta à finalidade e a quem vai receber.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: 'clinica', title: 'Clínico / Especialista de Saúde', desc: 'Neuropediatria, Psiquiatria Infantil, Fonoaudiologia, T.O.', icon: Brain },
                  { id: 'inclusao_aee', title: 'Atendimento Especializado (AEE)', desc: 'Sala de Recursos Multifuncionais e subsídios para PEI.', icon: Puzzle },
                  { id: 'pedagogico', title: 'Pedagógico Bimestral / Processual', desc: 'Acompanhamento do desenvolvimento e aprendizagem BNCC.', icon: BookOpen },
                  { id: 'indicadores_atencao', title: 'Indicadores de Atenção / Foco', desc: 'Mapeamento de dispersão e movimentação motora.', icon: Sparkles },
                  { id: 'conselho_tutelar', title: 'Conselho Tutelar (Proteção)', desc: 'Notificação formal de infrequência ou risco social.', icon: Scale },
                  { id: 'cras', title: 'CRAS / CREAS (Proteção Social)', desc: 'Encaminhamento social e acompanhamento de vulnerabilidades.', icon: HeartPulse }
                ].map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPurpose(item.id as any)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPurpose === item.id
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-md'
                        : 'bg-[var(--bg-card-alt)] border-[var(--border)] hover:border-[var(--border)]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <item.icon className={`w-4 h-4 ${selectedPurpose === item.id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                        <strong className="text-xs text-[var(--text-heading)]">{item.title}</strong>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedPurpose === 'clinica' && (
                <div className="p-4 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-[var(--text-body)]">Especialista / Clínica de Destino:</label>
                  <input
                    type="text"
                    value={specialistTarget}
                    onChange={(e) => setSpecialistTarget(e.target.value)}
                    placeholder="Ex: Neuropediatria / Psiquiatria Infantil / Fonoaudiologia"
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-body)] text-xs rounded-xl p-3 outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] rounded-xl text-xs font-bold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setWizardStep(3)}
                  className="px-6 py-2.5 bg-[var(--accent)] hover:bg-gold-light text-[var(--accent-fg)] font-semibold rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Preencher Eixos & Evidências</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 3: QUESTIONÁRIO OBJETIVO DE FATOS OBSERVÁVEIS */}
          {wizardStep === 3 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 space-y-6">
              <div className="border-b border-[var(--border)] pb-4">
                <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--accent)]" />
                  Registro de Evidências e Fatos Observáveis
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Responda com base no que você observa em sala. O sistema organiza as respostas no formato do relatório.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* 1. FOCO E ATENÇÃO */}
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)] space-y-2">
                  <label className="font-bold text-[var(--accent)]">1. Foco e Sustentação da Atenção:</label>
                  <select
                    value={formData.atencaoFoco}
                    onChange={(e) => setFormData({ ...formData, atencaoFoco: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-body)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="Sempre">Sempre (conclui tarefas com autonomia)</option>
                    <option value="Frequentemente">Frequentemente (dispersões normais)</option>
                    <option value="Às vezes">Às vezes (necessita de retomadas frequentes do professor)</option>
                    <option value="Raramente">Raramente (dispersão persistente em tarefas longas)</option>
                  </select>
                </div>

                {/* 2. COMPREENSÃO DE INSTRUÇÕES */}
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)] space-y-2">
                  <label className="font-bold text-[var(--accent)]">2. Compreensão de Comandos & Instruções:</label>
                  <select
                    value={formData.instrucoesRepeticao}
                    onChange={(e) => setFormData({ ...formData, instrucoesRepeticao: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-body)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="Compreende prontamente com instrução coletiva">Compreende prontamente com instrução coletiva</option>
                    <option value="Necessita de confirmação oral pontual">Necessita de confirmação oral pontual</option>
                    <option value="Sim, necessita de instrução individualizada e visual">Sim, necessita de instrução individualizada e visual</option>
                    <option value="Necessita de fragmentação passo a passo com mediação contínua">Necessita de fragmentação passo a passo</option>
                  </select>
                </div>

                {/* 3. ORGANIZAÇÃO DE MATERIAIS */}
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)] space-y-2">
                  <label className="font-bold text-[var(--accent)]">3. Organização Pessoal & Materiais:</label>
                  <select
                    value={formData.organizacaoMateriais}
                    onChange={(e) => setFormData({ ...formData, organizacaoMateriais: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-body)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="Muito organizado com seus materiais e prazos">Muito organizado com seus materiais e prazos</option>
                    <option value="Organização dentro do padrão esperado para a faixa etária">Padrão esperado para a faixa etária</option>
                    <option value="Frequentemente esquece etapas e perde cadernos de anotações">Frequentemente esquece etapas e materiais</option>
                    <option value="Dificuldade acentuada na gestão do espaço e dos materiais">Dificuldade acentuada de gestão</option>
                  </select>
                </div>

                {/* 4. MOVIMENTAÇÃO */}
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)] space-y-2">
                  <label className="font-bold text-[var(--accent)]">4. Movimentação & Controle Inibitório:</label>
                  <input
                    type="text"
                    value={formData.impulsividadeMovimento}
                    onChange={(e) => setFormData({ ...formData, impulsividadeMovimento: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-body)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* 5. INTERAÇÃO E COMUNICAÇÃO */}
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)] space-y-2 md:col-span-2">
                  <label className="font-bold text-[var(--accent)]">5. Interação Social & Comunicação com Pares:</label>
                  <textarea
                    rows={2}
                    value={formData.interacaoSocial}
                    onChange={(e) => setFormData({ ...formData, interacaoSocial: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-body)] outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>

                {/* 6. ESTRATÉGIAS PEDAGÓGICAS JÁ TESTADAS */}
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)] space-y-2 md:col-span-2">
                  <label className="font-bold text-[var(--accent)]">6. Estratégias Pedagógicas Já Testadas pela Escola:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {[
                      'Mudança para primeira fileira próxima ao professor',
                      'Fragmentação de atividades longas em etapas curtas',
                      'Tempo estendido (20 min adicionais) em avaliações escritas',
                      'Uso de esquemas visuais e mapas mentais',
                      'Uso de cronômetro visual / pausas programadas',
                      'Mediação em dupla com colega tutor'
                    ].map(est => {
                      const isChecked = formData.estrategiasTestadas.includes(est);
                      return (
                        <label 
                          key={est}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                            isChecked ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-heading)] font-bold' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, estrategiasTestadas: [...formData.estrategiasTestadas, est] });
                              } else {
                                setFormData({ ...formData, estrategiasTestadas: formData.estrategiasTestadas.filter(i => i !== est) });
                              }
                            }}
                            className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                          <span>{est}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 7. POTENCIALIDADES E PONTOS FORTES */}
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)] space-y-2 md:col-span-2">
                  <label className="font-bold text-[var(--accent)]">7. Potencialidades e Pontos Fortes do Estudante:</label>
                  <input
                    type="text"
                    value={formData.pontosFortes}
                    onChange={(e) => setFormData({ ...formData, pontosFortes: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-body)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* 8. BARREIRAS E DIFICULDADES */}
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)] space-y-2 md:col-span-2">
                  <label className="font-bold text-[var(--accent)]">8. Barreiras e Dificuldades Observadas:</label>
                  <input
                    type="text"
                    value={formData.dificuldadesObservadas}
                    onChange={(e) => setFormData({ ...formData, dificuldadesObservadas: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-body)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* 9. CONSIDERAÇÕES FINAIS */}
                <div className="bg-[var(--bg-card-alt)] p-4 rounded-2xl border border-[var(--border)] space-y-2 md:col-span-2">
                  <label className="font-bold text-[var(--accent)]">9. Considerações Finais da Equipe Docente:</label>
                  <textarea
                    rows={2}
                    value={formData.observacoesFinais}
                    onChange={(e) => setFormData({ ...formData, observacoesFinais: e.target.value })}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-body)] outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] rounded-xl text-xs font-bold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="px-6 py-2.5 bg-[var(--accent)] hover:bg-gold-light text-[var(--accent-fg)] font-semibold rounded-2xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Montar relatório</span>
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 4: PROCESSAMENTO IA */}
          {wizardStep === 4 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--accent)] animate-spin">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[var(--text-heading)]">Montando o relatório…</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                  Organizando as suas respostas no modelo escolhido.
                </p>
              </div>
            </div>
          )}

          {/* ETAPA 5: DOCUMENTO OFICIAL A4 & EDITOR DE TEXTO RICO */}
          {wizardStep === 5 && currentReport && (
            <div className="space-y-6">
              {/* BARRA DE FERRAMENTAS SUPERIOR */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="px-3 py-1.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Ajustar Respostas</span>
                  </button>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                    currentReport.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                    currentReport.status === 'pending_review' ? 'bg-amber-50 border-amber-200' :
                    'bg-[var(--bg-card-alt)] text-[var(--text-body)] border-[var(--border)]'
                  }`}>
                    {currentReport.status === 'approved' ? ' Aprovado' :
                     currentReport.status === 'pending_review' ? ' Aguardando Revisão Pedagógica' :
                     ' Rascunho do Professor'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsEditingMode(!isEditingMode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isEditingMode ? 'bg-amber-500 text-white' : 'bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)]'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingMode ? 'Modo Visualização' : 'Editar Texto'}</span>
                  </button>

                  <button
                    onClick={() => handleExportDoc(currentReport)}
                    className="px-3 py-1.5 bg-[var(--bg-card-alt)] hover:bg-[var(--accent-soft)] border border-[var(--border)] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Baixar em formato Word .doc"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Word (.doc)</span>
                  </button>

                  <button
                    onClick={() => handleExportCSV(currentReport)}
                    className="px-3 py-1.5 bg-[var(--bg-card-alt)] hover:bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Exportar CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={() => handleExportExcel(currentReport)}
                    className="px-3 py-1.5 bg-[var(--bg-card-alt)] hover:bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Exportar Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] border border-[var(--border)] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>

                  {isEditingMode && (
                    <button
                      onClick={handleSaveEditorChanges}
                      disabled={savingAction}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Edição</span>
                    </button>
                  )}

                  {currentReport.status === 'rascunho' && (
                    <button
                      onClick={handleSubmitToPedagoga}
                      disabled={savingAction}
                      className="px-4 py-1.5 bg-[var(--accent)] hover:bg-gold-light text-[var(--accent-fg)] font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar p/ Pedagoga</span>
                    </button>
                  )}
                </div>
              </div>

              {/* DOCUMENTO OFICIAL A4 FORMATADO */}
              <div 
                ref={printAreaRef}
                className="bg-[var(--bg-card)] text-[var(--text-heading)] rounded-3xl p-8 md:p-12 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] max-w-4xl mx-auto border border-[var(--border)] font-sans"
              >
                {/* CABEÇALHO OFICIAL DO DOCUMENTO */}
                <div className="border-b-2 border-[var(--border)] pb-4 mb-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] text-[var(--text-heading)] font-serif font-bold text-base flex items-center justify-center">
                      C
                    </div>
                    <h1 className="font-serif font-semibold text-base md:text-lg text-[var(--text-heading)]">
                      COLÉGIO MODELO DE EDUCAÇÃO INTEGRAL
                    </h1>
                  </div>
                  <p className="text-[11px] text-[var(--text-body)] font-bold">
                    COORDENAÇÃO PEDAGÓGICA • DOCUMENTAÇÃO OFICIAL CLASSIUM
                  </p>
                </div>

                {/* TÍTULO DO RELATÓRIO */}
                <div className="text-center mb-6">
                  <h2 className="text-sm md:text-base font-semibold text-[var(--text-heading)] tracking-tight">
                    {currentReport.title}
                  </h2>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    Emitido em {new Date(currentReport.created_at).toLocaleDateString('pt-BR')} • Protocolo: {currentReport.id}
                  </span>
                </div>

                {/* TABELA DE IDENTIFICAÇÃO DO ALUNO */}
                <table className="w-full border-collapse border border-[var(--border)] text-xs mb-6">
                  <tbody>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-card-alt)]">
                      <td className="p-2 border-r border-[var(--border)] font-bold text-[var(--text-body)] w-1/4">Estudante:</td>
                      <td className="p-2 border-r border-[var(--border)] font-semibold text-[var(--text-heading)] w-2/4">{currentReport.student_name}</td>
                      <td className="p-2 border-r border-[var(--border)] font-bold text-[var(--text-body)] w-1/8">Matrícula:</td>
                      <td className="p-2 font-mono text-[var(--text-heading)]">{currentReport.student_registration || '2024-901-008'}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="p-2 border-r border-[var(--border)] font-bold text-[var(--text-body)]">Turma / Turno:</td>
                      <td className="p-2 border-r border-[var(--border)] text-[var(--text-heading)]">{currentReport.student_class}</td>
                      <td className="p-2 border-r border-[var(--border)] font-bold text-[var(--text-body)]">Frequência:</td>
                      <td className="p-2 font-mono text-emerald-700 font-bold">{currentReport.attendance_rate || 'não informada'}</td>
                    </tr>
                    <tr className="bg-[var(--bg-card-alt)]">
                      <td className="p-2 border-r border-[var(--border)] font-bold text-[var(--text-body)]">Docente Titular:</td>
                      <td className="p-2 border-r border-[var(--border)] text-[var(--text-heading)]">{currentReport.teacher_name || teacherName}</td>
                      <td className="p-2 border-r border-[var(--border)] font-bold text-[var(--text-body)]">Finalidade:</td>
                      <td className="p-2 text-[var(--text-heading)] capitalize">{currentReport.specialist_target || currentReport.purpose}</td>
                    </tr>
                  </tbody>
                </table>

                {/* CORPO DO RELATÓRIO EDITÁVEL OU VISUALIZAÇÃO */}
                {isEditingMode ? (
                  <div className="space-y-2 mb-8">
                    <label className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" />
                      Editor de Texto do Relatório:
                    </label>
                    <textarea
                      rows={18}
                      value={editableHtml}
                      onChange={(e) => setEditableHtml(e.target.value)}
                      className="w-full border border-[var(--border)] rounded-xl p-4 text-xs font-sans leading-relaxed text-[var(--text-heading)] outline-none focus:border-[var(--accent)] bg-[var(--bg-card-alt)]"
                    />
                  </div>
                ) : (
                  <div 
                    className="report-content-body text-xs text-[var(--text-heading)] leading-relaxed mb-8"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(editableHtml || currentReport.report_content) }}
                  />
                )}

                {/* ASSINATURAS INSTITUCIONAIS */}
                <div className="border-t border-[var(--border)] pt-8 mt-8 grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <div className="border-t border-[var(--border)] pt-1 w-4/5 mx-auto font-bold text-[var(--text-heading)]">
                      {currentReport.teacher_name || teacherName}
                    </div>
                    <span className="text-[10px] text-[var(--text-body)] block">Professor(a) Titular</span>
                  </div>
                  <div>
                    <div className="border-t border-[var(--border)] pt-1 w-4/5 mx-auto font-bold text-[var(--text-heading)]">
                      {currentReport.pedagogue_name || 'Coordenação Pedagógica'}
                    </div>
                    <span className="text-[10px] text-[var(--text-body)] block">Coordenação Pedagógica</span>
                  </div>
                  <div>
                    <div className="border-t border-[var(--border)] pt-1 w-4/5 mx-auto font-bold text-[var(--text-heading)]">
                      {currentReport.director_name || 'Direção Geral'}
                    </div>
                    <span className="text-[10px] text-[var(--text-body)] block">Direção Escolar</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CATÁLOGO DE MODELOS (08+) (Conforme Screenshots 2-7)               */}
      {/* ========================================================================= */}
      {activeTab === 'catalogo' && (
        <div className="space-y-6">

          {/* BARRA DE BUSCA E FILTROS DE CATEGORIA (Conforme Screenshots 2-7) */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-4 md:p-6 space-y-4">
            
            {/* BUSCA POR TEXTO */}
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-3.5" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Buscar entre os modelos (08+)..."
                className="w-full bg-[var(--bg-card-alt)] border border-[var(--border)] text-[var(--text-body)] text-xs rounded-2xl pl-11 pr-4 py-3 outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            {/* CHIPS DE CATEGORIAS (Conforme Screenshots 2, 3, 4, 5, 6, 7) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { id: 'todos', label: 'Todos os Modelos' },
                { id: 'pedagogicos', label: ' Pedagógicos' },
                { id: 'des_neuropsicomotor', label: ' Des. Neuropsicomotor' },
                { id: 'especialistas', label: ' Especialistas' },
                { id: 'indicadores', label: ' Indicadores' },
                { id: 'inclusao', label: ' Inclusão & AEE' },
                { id: 'protecao', label: ' Rede de Proteção' }
              ].map(cat => {
                const isSelected = catalogGroupFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCatalogGroupFilter(cat.id)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold shadow-md '
                        : 'bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] border border-[var(--border)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* GRID DE CARDS DO CATÁLOGO (Conforme Screenshots 2-7) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map(model => {
              const Icon = model.icon;
              return (
                <div
                  key={model.id}
                  className="bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border)] rounded-3xl p-6 flex flex-col justify-between transition-all group shadow-lg text-left"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5 text-[var(--accent)]" />
                      </div>
                      <span className="text-[9px] font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-card-alt)] text-[var(--accent)] border border-[var(--border)]">
                        {model.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-heading)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                        {model.title}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed line-clamp-3">
                        {model.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      Destino: <strong className="text-[var(--text-body)]">{model.target || 'Geral'}</strong>
                    </span>

                    <button
                      onClick={() => handleSelectFromCatalog(model)}
                      className="px-3.5 py-1.5 bg-[var(--accent-soft)] hover:bg-[var(--accent)] text-[var(--accent)] hover:text-[var(--accent-fg)] font-bold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>Usar modelo</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCatalog.length === 0 && (
            <div className="bg-[var(--bg-card)] p-12 rounded-3xl border border-[var(--border)] text-center text-[var(--text-muted)] text-xs">
              Nenhum modelo encontrado para o filtro selecionado.
            </div>
          )}

        </div>
      )}

    </div>
  );
}