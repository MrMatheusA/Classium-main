import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Users, Sparkles, Clock, LayoutTemplate, FileText, Plus, Search, Star, Edit3, 
  Copy, MoreHorizontal, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, List, ListOrdered, Table, Image, PenTool, CheckSquare, CheckCircle, 
  Send, Check, AlertCircle, X, Download, ShieldCheck, FileDown, Settings, 
  HelpCircle, ChevronDown, ChevronRight, FileSignature, Trash2, Calendar, 
  ArrowRight, Landmark, Heart, Shield, RefreshCw, Paperclip,
  Award, Printer, QrCode, Coins, Strikethrough, Palette, Type, Scissors, Percent, DollarSign, Brush,
  ZoomIn, Eye, Maximize2, FolderArchive, Grid, Layers, ShieldAlert, MessageSquare,
  AlertTriangle, Info
} from 'lucide-react';
import { initialSchoolTemplates, SchoolTemplate } from '../../data/comunicacaoTemplates';
import { usePlatform } from '../../context/PlatformContext';
import { documentTemplateService, GeneratedDocumentRecord } from '../../services/documentTemplateService';
import { generateRifaPages } from '../../utils/generateRifaPages';
import { usePrintRifas } from '../../hooks/usePrintRifas';
import { PrintableRifasBatch } from './PrintableRifasBatch';
import '../../styles/print-rifas.css';

interface RouteDetails {
  categoryName: string;
  destination: string;
  colorName: string;
  colorClass: string;
  textColor: string;
  iconName: string;
  defaultActions: {
    apenasLeitura: boolean;
    confirmarLeitura: boolean;
    assinaturaDigital: boolean;
    autorizar: boolean;
    recusar: boolean;
    confirmarPresenca: boolean;
    responderComunicado: boolean;
  };
}

export function getAutoRouteDetails(category: string, title: string, templateType: string): RouteDetails {
  const catLower = category.toLowerCase();
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('advertência') || titleLower.includes('suspensão') || catLower.includes('disciplina')) {
    return {
      categoryName: 'Advertência / Ocorrência',
      destination: 'Assinatura Digital (Portal Família)',
      colorName: 'Vermelho ',
      colorClass: 'border-red-500 bg-red-50 text-red-700',
      textColor: 'text-red-700',
      iconName: 'ShieldAlert',
      defaultActions: {
        apenasLeitura: false,
        confirmarLeitura: false,
        assinaturaDigital: true,
        autorizar: false,
        recusar: false,
        confirmarPresenca: false,
        responderComunicado: false,
      }
    };
  }
  
  if (titleLower.includes('passeio') || titleLower.includes('excursão') || titleLower.includes('autorização') || titleLower.includes('saída') || catLower.includes('passeios')) {
    return {
      categoryName: 'Passeio / Saída',
      destination: 'Assinatura Digital (Portal Família)',
      colorName: 'Verde ',
      colorClass: 'border-emerald-500 bg-emerald-50 text-emerald-700',
      textColor: 'text-emerald-700',
      iconName: 'MapPin',
      defaultActions: {
        apenasLeitura: false,
        confirmarLeitura: true,
        assinaturaDigital: true,
        autorizar: true,
        recusar: true,
        confirmarPresenca: false,
        responderComunicado: false,
      }
    };
  }

  if (catLower.includes('financeiro')) {
    return {
      categoryName: 'Financeiro',
      destination: 'Financeiro (Aviso de Mensalidade)',
      colorName: 'Azul ',
      colorClass: 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]',
      textColor: 'text-[var(--accent)]',
      iconName: 'CreditCard',
      defaultActions: {
        apenasLeitura: false,
        confirmarLeitura: true,
        assinaturaDigital: false,
        autorizar: false,
        recusar: false,
        confirmarPresenca: false,
        responderComunicado: false,
      }
    };
  }

  if (titleLower.includes('declaração') || titleLower.includes('histórico') || catLower.includes('secretaria')) {
    return {
      categoryName: 'Documento',
      destination: 'Documentos (Portal Família)',
      colorName: 'Branco ',
      colorClass: 'border-[var(--border)] bg-[var(--bg-card-alt)] text-[var(--text-body)]',
      textColor: 'text-[var(--text-body)]',
      iconName: 'FileText',
      defaultActions: {
        apenasLeitura: true,
        confirmarLeitura: false,
        assinaturaDigital: false,
        autorizar: false,
        recusar: false,
        confirmarPresenca: false,
        responderComunicado: false,
      }
    };
  }

  if (templateType === 'Reunião' || titleLower.includes('convocação') || titleLower.includes('reunião')) {
    return {
      categoryName: 'Convocação',
      destination: 'Recados Urgentes (Portal Família)',
      colorName: 'Amarelo ',
      colorClass: 'border-amber-500 bg-amber-50 text-amber-700',
      textColor: 'text-amber-700',
      iconName: 'Calendar',
      defaultActions: {
        apenasLeitura: false,
        confirmarLeitura: true,
        assinaturaDigital: false,
        autorizar: false,
        recusar: false,
        confirmarPresenca: true,
        responderComunicado: false,
      }
    };
  }

  // Fallback: Documento Informativo (Verde) -> Recados Urgentes
  return {
    categoryName: 'Documento Informativo',
    destination: 'Recados Urgentes (Portal Família)',
    colorName: 'Verde ',
    colorClass: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    textColor: 'text-emerald-700',
    iconName: 'Info',
    defaultActions: {
      apenasLeitura: false,
      confirmarLeitura: true,
      assinaturaDigital: false,
      autorizar: false,
      recusar: false,
      confirmarPresenca: false,
      responderComunicado: false,
    }
  };
}

interface SearchStudent {
  id: string;
  name: string;
  grade: string;
  classId: string;
  responsibleName: string;
  responsibleRelationship: string;
  phone: string;
}

import { AdminComunicacao } from './AdminComunicacao';
import { ComunicadoUrgenteTab } from './communication/ComunicadoUrgenteTab';
import { AssinaturasTab } from './communication/AssinaturasTab';
import { ConvocacoesTab } from './communication/ConvocacoesTab';
import { InformativosTab } from './communication/InformativosTab';
import { Ticket } from 'lucide-react';
import { 
  fetchCommunicationAudience, 
  publishOrganizationAnnouncement, 
  CommunicationAudienceData, 
  AudienceClass, 
  AudienceStudent, 
  AudienceGuardian 
} from '../../services/communicationRpcService';

export function CommunicationEditor() {
  const { addAnnouncement, addAuthorization } = usePlatform();
  const [activeTab, setActiveTab] = useState<'urgente' | 'assinaturas' | 'convocacoes' | 'informativos' | 'midia' | 'reais'>('urgente');
  const [editorSubTab, setEditorSubTab] = useState<'modelos' | 'variaveis' | 'ia_comunicacao' | 'historico' | 'config'>('modelos');

  // Specific parameters for the 5 official tabs
  const [urgentSeverity, setUrgentSeverity] = useState<'EMERGÊNCIA' | 'ALTA PRIORIDADE' | 'ATENÇÃO'>('EMERGÊNCIA');
  const [urgentSender, setUrgentSender] = useState<string>('Enfermagem e Apoio ao Aluno');
  const [signatureDueDate, setSignatureDueDate] = useState<string>('2026-09-15');
  const [signatureCost, setSignatureCost] = useState<string>('Gratuito');
  const [convocationDate, setConvocationDate] = useState<string>('2026-08-25');
  const [convocationTime, setConvocationTime] = useState<string>('14:30');
  const [convocationLocation, setConvocationLocation] = useState<string>('Sala de Reuniões Pedagógicas - Bloco B');
  const [informativeRequiresAck, setInformativeRequiresAck] = useState<boolean>(true);
  const [mediaExternalUrl, setMediaExternalUrl] = useState<string>('');
  const [mediaExternalTitle, setMediaExternalTitle] = useState<string>('');

  const [templates, setTemplates] = useState<SchoolTemplate[]>(initialSchoolTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<SchoolTemplate>(initialSchoolTemplates[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    'Gestão Escolar': true,
    'Pedagógico': false,
    'Disciplina': false,
    'Recesso e Calendário': false,
    'Passeios e Eventos': false,
  });

  // Editor states mapped from selectedTemplate
  const [docState, setDocState] = useState({
    subject: selectedTemplate.subject,
    greeting: selectedTemplate.greeting,
    intro: selectedTemplate.intro,
    development: selectedTemplate.development,
    guidelines: selectedTemplate.guidelines,
    observations: selectedTemplate.observations,
    closing: selectedTemplate.closing,
    signatureRole: selectedTemplate.signatureRole,
    signatureName: selectedTemplate.signatureName,
  });

  // Cabeçalho Premium Config
  const [headerConfig, setHeaderConfig] = useState({
    logo: 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&q=80&w=150',
    brasao: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=100',
    schoolName: 'ESCOLA MUNICIPAL PROFESSORA MARIA APARECIDA',
    secretariat: 'SECRETARIA MUNICIPAL DE EDUCAÇÃO',
    municipality: 'PREFEITURA MUNICIPAL DE CLASSIUM',
    address: 'Av. das Flores, 450 - Bairro das Américas',
    phone: '(11) 4567-8900',
    email: 'secretaria@maria-aparecida.edu.br',
    site: 'www.em-maria-aparecida.edu.br',
    logoVisible: true,
    brasaoVisible: true,
    schoolNameVisible: true,
    secretariatVisible: true,
    municipalityVisible: true,
    addressVisible: true,
    phoneVisible: true,
    emailVisible: true,
    siteVisible: true,
  });

  // Rodapé Config
  const [footerConfig, setFooterConfig] = useState({
    text: 'Documento emitido eletronicamente pela Plataforma Classium • Autenticidade verificável via QR Code.',
    showDate: true,
    showPageNumber: true,
    showCredit: true,
  });

  // Integração Classium Família
  const [familyIntegrations, setFamilyIntegrations] = useState({
    apenasLeitura: false,
    confirmarLeitura: true,
    assinaturaDigital: false,
    autorizar: false,
    recusar: false,
    confirmarPresenca: false,
    responderComunicado: false,
  });

  // AI Assistant states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [focusedSection, setFocusedSection] = useState<'subject' | 'greeting' | 'intro' | 'development' | 'guidelines' | 'observations' | 'closing' | 'signatureRole' | 'signatureName'>('intro');
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');
  
  // Font and color styles state for rich editing
  const [textColor, setTextColor] = useState('#1e293b');
  const [highlightColor, setHighlightColor] = useState('transparent');
  const [isDigitalSignatureActive, setIsDigitalSignatureActive] = useState(false);

  // Dynamic Fields & Variables Auto-fill State
  const [dynamicFieldValues, setDynamicFieldValues] = useState<Record<string, string>>({});
  
  // Generated Documents History State
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedDocumentRecord[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<'all' | 'emitido' | 'assinado' | 'pendente_assinatura'>('all');
  const [isSimulatingSignature, setIsSimulatingSignature] = useState(false);

  // Rifa state
  const [rifaState, setRifaState] = useState({
    title: 'Ação entre Amigos: Formatura dos Estudantes do 9º ano',
    text: 'A nossa escola está organizando esta ação beneficente com o objetivo de arrecadar fundos para transformar um dia incrível para os estudantes do 9º ano, trazer esse momento em especial e único na vida desses estudantes.',
    rules: 'Sorteio realizado pela Loteria Federal do dia estipulado. Se todos os bilhetes não forem vendidos, o sorteio será prorrogado. Bilhetes reservados devem ser pagos em até 48 horas.',
    goal: 'Arrecadar fundos para a Formatura dos Alunos do 9º Ano.',
    value: 2.00,
    prize: 'Uma airfry',
    date: '18 de Dezembro de 2026, às 18:00h',
    color: '#E57182',
    pixKey: 'pix-arrecadacao@escola.edu.br',
    sponsors: 'Farmácia Popular • Mercado São José',
    quantity: 1000,
    logoUrl: 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&q=80&w=200',
    selectedArtTemplate: 'Solidário',
    sales: {} as { [num: string]: { name: string; phone: string; seller: string; sold: boolean } },
    auditId: 'EDU-RIFA-2026-X9A7',
    auditHash: '0x8f9a2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    createdAt: '29/07/2026',
    responsibleUser: 'Direção Escolar'
  });

  const formatTicketNumber = (num: number, totalQuantity: number): string => {
    const digits = Math.max(3, String(totalQuantity).length);
    return String(num).padStart(digits, '0');
  };

  const [rifaActiveNumber, setRifaActiveNumber] = useState('0001');
  const [rifaSubTab, setRifaSubTab] = useState<'bilhete' | 'impressao'>('bilhete');
  const [rifaSalesSearchTerm, setRifaSalesSearchTerm] = useState('');
  const [rifaImagePrompt, setRifaImagePrompt] = useState('Uma arte elegante e moderna com fundo escolar Branco para arrecadação');
  const [rifaImageFormat, setRifaImageFormat] = useState('whatsapp');
  const [rifaGeneratedArtUrl, setRifaGeneratedArtUrl] = useState('');
  const [isRifaAiLoading, setIsRifaAiLoading] = useState(false);
  const [isRifaImageLoading, setIsRifaImageLoading] = useState(false);
  const [showRifaSaleModal, setShowRifaSaleModal] = useState(false);

  // IA Image Generation & Position states
  const [rifaPendingGeneratedImage, setRifaPendingGeneratedImage] = useState<string | null>(null);
  const [rifaImagePosition, setRifaImagePosition] = useState<'header' | 'right' | 'above_description'>('right');
  const [showImageZoomModal, setShowImageZoomModal] = useState(false);

  // Batch Print Config States
  const [rifaBatchStartNum, setRifaBatchStartNum] = useState<number>(1);
  const [rifaBatchEndNum, setRifaBatchEndNum] = useState<number>(1000);
  const [rifasPorFolha, setRifasPorFolha] = useState<number>(5);
  const [rifaPaperFormat, setRifaPaperFormat] = useState<'a4' | 'a4_landscape' | 'carta' | 'oficio' | 'a5' | 'custom'>('a4');
  const [rifaBatchCurrentPage, setRifaBatchCurrentPage] = useState<number>(1);
  const [rifaShowCropLines, setRifaShowCropLines] = useState<boolean>(true);
  const [rifaShowFoldMarks, setRifaShowFoldMarks] = useState<boolean>(true);
  const [rifaBatchPrintMode, setRifaBatchPrintMode] = useState<'portrait' | 'landscape'>('portrait');

  // Print hook & Batch Pages calculation
  const { isPreparingPrint, printProgress, handlePrintBatch } = usePrintRifas();

  const effectiveBatchStart = Math.max(1, rifaBatchStartNum);
  const effectiveBatchEnd = Math.min(rifaState.quantity, Math.max(effectiveBatchStart, rifaBatchEndNum || rifaState.quantity));
  const effectiveBatchTotalCount = Math.max(1, effectiveBatchEnd - effectiveBatchStart + 1);

  const batchPages = useMemo(() => {
    return generateRifaPages(
      effectiveBatchStart,
      effectiveBatchEnd,
      rifasPorFolha,
      rifaState.quantity
    );
  }, [effectiveBatchStart, effectiveBatchEnd, rifasPorFolha, rifaState.quantity]);
  
  // Sales state temporary variables
  const [tempBuyerName, setTempBuyerName] = useState('');
  const [tempBuyerPhone, setTempBuyerPhone] = useState('');
  const [tempSellerName, setTempSellerName] = useState('');

  // IA Comunicação states
  const [iaDocType, setIaDocType] = useState('Comunicado');
  const [iaDocDescription, setIaDocDescription] = useState('Convocação para reunião geral de pais e responsáveis para entrega de boletins do 3º bimestre e discussão sobre novas atividades extracurriculares.');
  const [isIaDocGenerating, setIsIaDocGenerating] = useState(false);

  // Delivery / Sending states (Supabase Real Audience)
  const [isSending, setIsSending] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showConfirmSendModal, setShowConfirmSendModal] = useState(false);
  const [scheduling, setScheduling] = useState('agora');

  // Supabase Audience States
  const [audienceData, setAudienceData] = useState<CommunicationAudienceData | null>(null);
  const [audienceLoading, setAudienceLoading] = useState<boolean>(false);
  const [audienceError, setAudienceError] = useState<string | null>(null);

  // Mode selection for RPC ('all' | 'family' | 'classes' | 'students' | 'guardians')
  const [sendMode, setSendMode] = useState<'all' | 'family' | 'classes' | 'students' | 'guardians'>('classes');

  // Selected IDs from real audience
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedGuardianIds, setSelectedGuardianIds] = useState<string[]>([]);

  // Filter search terms
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [guardianSearchTerm, setGuardianSearchTerm] = useState('');

  // Dispatch result feedback
  const [lastDispatchResult, setLastDispatchResult] = useState<{
    recipients_count?: number;
    notified_count?: number;
    skipped_no_profile_count?: number;
    announcement_id?: string;
    message?: string;
  } | null>(null);

  const loadAudience = async () => {
    setAudienceLoading(true);
    setAudienceError(null);
    const res = await fetchCommunicationAudience();
    setAudienceLoading(false);

    if (res.error) {
      setAudienceError(res.error);
      if (res.data) setAudienceData(res.data);
    } else if (res.data) {
      setAudienceData(res.data);
      if (res.data.classes && res.data.classes.length > 0) {
        setSelectedClassIds(res.data.classes.map(c => c.id));
      }
    }
  };

  useEffect(() => {
    loadAudience();
  }, []);

  useEffect(() => {
    if (activeTab === 'config' || editorSubTab === 'config') {
      loadAudience();
    }
  }, [activeTab, editorSubTab]);

  // Real data arrays from Supabase audience
  const realClasses: AudienceClass[] = audienceData?.classes || [];
  const realStudents: AudienceStudent[] = audienceData?.students || [];
  const realGuardians: AudienceGuardian[] = audienceData?.guardians || [];

  // Calculations for reached students & guardians
  const getReachedStudents = (): AudienceStudent[] => {
    if (sendMode === 'all' || sendMode === 'family') {
      return realStudents;
    }
    if (sendMode === 'classes') {
      return realStudents.filter(s => s.class_id && selectedClassIds.includes(s.class_id));
    }
    if (sendMode === 'students') {
      return realStudents.filter(s => selectedStudentIds.includes(s.id));
    }
    if (sendMode === 'guardians') {
      return realStudents.filter(s => 
        s.guardians && s.guardians.some(g => selectedGuardianIds.includes(g.id))
      );
    }
    return [];
  };

  const getReachedGuardians = (): AudienceGuardian[] => {
    if (sendMode === 'all' || sendMode === 'family') {
      return realGuardians;
    }
    if (sendMode === 'classes') {
      const classStudents = realStudents.filter(s => s.class_id && selectedClassIds.includes(s.class_id));
      const gSet = new Set<string>();
      classStudents.forEach(s => {
        s.guardians?.forEach(g => gSet.add(g.id));
      });
      return realGuardians.filter(g => gSet.has(g.id));
    }
    if (sendMode === 'students') {
      const selectedStudentsObj = realStudents.filter(s => selectedStudentIds.includes(s.id));
      const gSet = new Set<string>();
      selectedStudentsObj.forEach(s => {
        s.guardians?.forEach(g => gSet.add(g.id));
      });
      return realGuardians.filter(g => gSet.has(g.id));
    }
    if (sendMode === 'guardians') {
      return realGuardians.filter(g => selectedGuardianIds.includes(g.id));
    }
    return [];
  };

  const reachedStudentsList = getReachedStudents();
  const reachedGuardiansList = getReachedGuardians();

  const totalReachedStudents = reachedStudentsList.length;
  const totalReachedGuardians = reachedGuardiansList.length;
  const appEnabledGuardiansCount = reachedGuardiansList.filter(g => g.can_receive_app === true || g.profile_id != null).length;
  const skippedNoProfileGuardiansCount = reachedGuardiansList.filter(g => g.can_receive_app === false || g.profile_id == null).length;

  const totalDestinatarios = totalReachedGuardians || totalReachedStudents;

  const filteredStudents = studentSearchTerm.trim() === ''
    ? []
    : realStudents.filter(student =>
        student.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );

  const insertImage = () => {
    const url = prompt('Digite a URL da imagem (ou deixe em branco para usar uma imagem de modelo do Classium):');
    const imageUrl = url || 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=350';
    const imgHtml = `<img src="${imageUrl}" alt="Imagem do Comunicado" class="max-w-xs mx-auto rounded-xl my-4 border border-[var(--border)] shadow-sm" style="display: block; margin: 16px auto;" />`;
    executeCommand('insertHTML', imgHtml);
  };

  const insertAttachment = () => {
    const name = prompt('Digite o nome do anexo (ex: calendario_atividades.pdf):') || 'anexo_escolar_oficial.pdf';
    const size = '1.2 MB';
    const attachHtml = `
      <div class="my-4 p-3 bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl flex items-center justify-between max-w-sm select-none" contenteditable="false">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div>
            <p class="font-bold font-sans text-[10px] text-[var(--text-heading)] leading-none">${name}</p>
            <p class="text-[8px] font-sans text-[var(--text-muted)] leading-none pt-0.5">PDF Document • ${size}</p>
          </div>
        </div>
        <span class="text-[9px] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-body)] px-2.5 py-1 rounded-lg font-bold font-sans hover:bg-[var(--bg-card-alt)] cursor-pointer">Baixar</span>
      </div>
    `;
    executeCommand('insertHTML', attachHtml);
  };

  const handleDuplicate = () => {
    const newTemplate: SchoolTemplate = {
      ...selectedTemplate,
      id: `dup-${Date.now()}`,
      title: `${selectedTemplate.title} (Cópia)`,
      subject: docState.subject,
      greeting: docState.greeting,
      intro: docState.intro,
      development: docState.development,
      guidelines: docState.guidelines,
      observations: docState.observations,
      closing: docState.closing,
      signatureName: docState.signatureName,
      signatureRole: docState.signatureRole,
    };
    setTemplates(prev => [newTemplate, ...prev]);
    setSelectedTemplate(newTemplate);
    setAiSuccessMessage('Documento duplicado com sucesso! Cópia adicionada à Central de Modelos.');
    setTimeout(() => setAiSuccessMessage(''), 4000);
  };

  const handleSave = () => {
    setTemplates(prev => prev.map(t => {
      if (t.id === selectedTemplate.id) {
        return {
          ...t,
          subject: docState.subject,
          greeting: docState.greeting,
          intro: docState.intro,
          development: docState.development,
          guidelines: docState.guidelines,
          observations: docState.observations,
          closing: docState.closing,
          signatureName: docState.signatureName,
          signatureRole: docState.signatureRole,
        };
      }
      return t;
    }));
    setAiSuccessMessage('Alterações salvas com sucesso no modelo ativo! ');
    setTimeout(() => setAiSuccessMessage(''), 4000);
  };

  const handlePdfExport = () => {
    const originalTitle = document.title;
    document.title = `EducaMais_Comunicado_${docState.subject.replace(/\s+/g, '_')}`;
    window.print();
    document.title = originalTitle;
  };

  const handleWordExport = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${docState.subject}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
          h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; color: #1a202c; }
          h2 { text-align: center; font-size: 14pt; margin-bottom: 10px; }
          p { font-size: 11pt; text-align: justify; margin-bottom: 12px; }
          .footer { font-size: 9pt; color: #718096; border-top: 1px solid #e2e8f0; margin-top: 50px; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 40px;">
          <p style="font-weight: bold; font-size: 12pt; margin: 0;">${headerConfig.municipality}</p>
          <p style="font-weight: bold; font-size: 10pt; margin: 0;">${headerConfig.secretariat}</p>
          <p style="font-weight: bold; font-size: 12pt; margin: 0; color: #2d3748;">${headerConfig.schoolName}</p>
        </div>
        
        <h1>${docState.subject}</h1>
        <p style="font-weight: bold;">${docState.greeting}</p>
        <div>${docState.intro}</div>
        <div>${docState.development}</div>
        <div>${docState.guidelines}</div>
        <div>${docState.observations}</div>
        <p>${docState.closing}</p>
        
        <div style="text-align: center; margin-top: 80px;">
          <p style="font-weight: bold; margin: 0;">${docState.signatureName}</p>
          <p style="margin: 0; color: #4a5568;">${docState.signatureRole}</p>
        </div>
        
        <div class="footer">
          <p>${footerConfig.text}</p>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EducaMais_Comunicado_${docState.subject.replace(/\s+/g, '_') || 'documento'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const categories = [
    'Convites para Eventos',
    'Bilhetes e Comunicados',
    'Disciplina e Notificações',
    'Gestão Escolar',
    'Recesso e Calendário',
    'Pedagógico',
    'Saúde',
    'Transporte',
    'Alimentação',
    'Financeiro',
    'Secretaria'
  ];

  // Helper: Carregar histórico gerado do backend/local
  const loadGeneratedHistory = async () => {
    try {
      const docs = await documentTemplateService.getGeneratedDocuments();
      setGeneratedHistory(docs);
    } catch (e) {
      console.warn('Erro ao carregar histórico de documentos:', e);
    }
  };

  useEffect(() => {
    loadGeneratedHistory();
  }, []);

  // Sincronizar campos dinâmicos ao trocar de modelo
  useEffect(() => {
    const initialVals: Record<string, string> = {};
    if (selectedTemplate.dynamicFields) {
      selectedTemplate.dynamicFields.forEach(f => {
        initialVals[f.key] = f.defaultValue || '';
      });
    }
    setDynamicFieldValues(initialVals);
  }, [selectedTemplate]);

  // Atualização em tempo real de variáveis dinâmicas
  const handleDynamicFieldChange = (key: string, value: string) => {
    setDynamicFieldValues(prev => {
      const next = { ...prev, [key]: value };
      applyDynamicFields(next);
      return next;
    });
  };

  const applyDynamicFields = (fieldVals: Record<string, string>) => {
    let sub = selectedTemplate.subject;
    let grt = selectedTemplate.greeting;
    let intr = selectedTemplate.intro;
    let dev = selectedTemplate.development;
    let gui = selectedTemplate.guidelines;
    let obs = selectedTemplate.observations;
    let cls = selectedTemplate.closing;

    Object.entries(fieldVals).forEach(([k, v]) => {
      const placeholder = `[${k}]`;
      const regex = new RegExp(`\\[${k}\\]`, 'g');
      sub = sub.replace(regex, v || placeholder);
      grt = grt.replace(regex, v || placeholder);
      intr = intr.replace(regex, v || placeholder);
      dev = dev.replace(regex, v || placeholder);
      gui = gui.replace(regex, v || placeholder);
      obs = obs.replace(regex, v || placeholder);
      cls = cls.replace(regex, v || placeholder);
    });

    setDocState(prev => ({
      ...prev,
      subject: sub,
      greeting: grt,
      intro: intr,
      development: dev,
      guidelines: gui,
      observations: obs,
      closing: cls,
    }));
  };

  // Carrega modelo selecionado no editor
  const handleSelectTemplate = (template: SchoolTemplate) => {
    setSelectedTemplate(template);
    const updatedState = {
      subject: template.subject,
      greeting: template.greeting,
      intro: template.intro,
      development: template.development,
      guidelines: template.guidelines,
      observations: template.observations,
      closing: template.closing,
      signatureRole: template.signatureRole,
      signatureName: template.signatureName,
    };
    setDocState(updatedState);

    // Inicializar valores dinâmicos
    const initialVals: Record<string, string> = {};
    if (template.dynamicFields) {
      template.dynamicFields.forEach(f => {
        initialVals[f.key] = f.defaultValue || '';
      });
    }
    setDynamicFieldValues(initialVals);

    const requiresSig = !!template.requiresSignature;
    setIsDigitalSignatureActive(requiresSig);

    // Configurar integrações: documentos interativos com assinatura vs estáticos limpos
    if (requiresSig) {
      setFamilyIntegrations({
        apenasLeitura: false,
        confirmarLeitura: true,
        assinaturaDigital: true,
        autorizar: false,
        recusar: false,
        confirmarPresenca: false,
        responderComunicado: false,
      });
    } else {
      setFamilyIntegrations({
        apenasLeitura: true,
        confirmarLeitura: false,
        assinaturaDigital: false,
        autorizar: false,
        recusar: false,
        confirmarPresenca: false,
        responderComunicado: false,
      });
    }

    // Configurar cabeçalho institucional
    const isCritical = template.category === 'Disciplina e Notificações' || template.category === 'Disciplina' || template.subject.toLowerCase().includes('advertência') || template.type === 'Convocação';
    setHeaderConfig(prev => ({
      ...prev,
      brasaoVisible: true,
      logoVisible: true,
      schoolNameVisible: true,
      secretariatVisible: isCritical,
      municipalityVisible: isCritical,
    }));

    // Configurar rodapé: limpo por padrão para documentos estáticos
    setFooterConfig(prev => ({
      ...prev,
      showDate: false,
      showPageNumber: false,
      showCredit: false,
      text: '',
    }));
  };

  const handleUpdateDocField = (field: string, value: string) => {
    setDocState(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateHeaderField = (field: string, value: any) => {
    setHeaderConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateFooterField = (field: string, value: any) => {
    setFooterConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Standard rich text formatting natively operating on current window selection
  const executeCommand = (command: string, value: string = '') => {
    try {
      document.execCommand(command, false, value);
    } catch (err) {
      console.warn('[Editor] Error executing command:', command, err);
    }
  };

  const insertTable = () => {
    const tableHtml = `
      <table class="w-full my-4 border-collapse border border-[var(--border)] text-[11px]">
        <thead>
          <tr class="bg-[var(--bg-card-alt)]">
            <th class="border border-[var(--border)] p-2 text-left font-bold text-[var(--text-body)]">Item / Atividade</th>
            <th class="border border-[var(--border)] p-2 text-left font-bold text-[var(--text-body)]">Responsável</th>
            <th class="border border-[var(--border)] p-2 text-left font-bold text-[var(--text-body)]">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-[var(--border)] p-2 text-[var(--text-body)]">Reunião Geral</td>
            <td class="border border-[var(--border)] p-2 text-[var(--text-body)]">Coordenação</td>
            <td class="border border-[var(--border)] p-2 text-emerald-600 font-bold">Confirmado</td>
          </tr>
          <tr>
            <td class="border border-[var(--border)] p-2 text-[var(--text-body)]">Entrega de Projetos</td>
            <td class="border border-[var(--border)] p-2 text-[var(--text-body)]">Professores</td>
            <td class="border border-[var(--border)] p-2 text-amber-600 font-bold">Pendente</td>
          </tr>
        </tbody>
      </table>
    `;
    executeCommand('insertHTML', tableHtml);
  };

  const insertSignatureLine = () => {
    const sigHtml = `
      <div class="my-6 flex flex-col items-center justify-center text-center">
        <div class="w-64 border-b border-[var(--border)] my-1"></div>
        <p class="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Assinatura do Responsável Legal</p>
      </div>
    `;
    executeCommand('insertHTML', sigHtml);
  };

  const insertHorizontalRule = () => {
    executeCommand('insertHorizontalRule');
  };

  // Create empty/blank document with no template
  const handleCreateBlankDocument = () => {
    const blankTemplate: SchoolTemplate = {
      id: `blank-${Date.now()}`,
      title: 'Novo Documento em Branco',
      subject: 'ASSUNTO DO COMUNICADO',
      category: 'Gestão Escolar',
      type: 'Comunicado',
      description: 'Documento em branco criado a partir do editor livre.',
      greeting: 'Prezados Pais e Responsáveis,',
      intro: 'Inicie digitando sua introdução aqui...',
      development: 'Digite o corpo do documento aqui...',
      guidelines: 'Digite as orientações importantes aqui...',
      observations: 'Insira observações complementares aqui se desejar...',
      closing: 'Atenciosamente,',
      signatureName: 'Direção Escolar',
      signatureRole: 'Escola Municipal Maria Aparecida',
      actions: [],
    };
    setSelectedTemplate(blankTemplate);
    setDocState({
      subject: blankTemplate.subject,
      greeting: blankTemplate.greeting,
      intro: blankTemplate.intro,
      development: blankTemplate.development,
      guidelines: blankTemplate.guidelines,
      observations: blankTemplate.observations,
      closing: blankTemplate.closing,
      signatureName: blankTemplate.signatureName,
      signatureRole: blankTemplate.signatureRole,
    });
    setAiSuccessMessage('Novo documento em branco criado com sucesso! ');
    setTimeout(() => setAiSuccessMessage(''), 3000);
  };

  // Helper inserts
  const insertQrCode = () => {
    const qrUrl = prompt('Digite a URL do QR Code:', 'https://educamais.com/comunicado');
    if (qrUrl) {
      const qrHtml = `
        <div class="my-4 text-center" contenteditable="false" style="display: block; margin: 16px auto; text-align: center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl)}" alt="QR Code" class="mx-auto w-24 h-24 border p-1 bg-[var(--bg-card)] shadow-sm inline-block" />
          <p class="text-[9px] text-[var(--text-muted)] mt-1">${qrUrl}</p>
        </div>
      `;
      executeCommand('insertHTML', qrHtml);
    }
  };

  const insertSchoolSeal = () => {
    const sealHtml = `
      <div class="my-3 text-center" contenteditable="false" style="display: block; margin: 12px auto; text-align: center;">
        <img src="https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=120" alt="Selo Oficial" class="mx-auto w-16 h-16 object-contain inline-block" />
        <p class="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">SELO OFICIAL DE REGULARIDADE</p>
      </div>
    `;
    executeCommand('insertHTML', sealHtml);
  };

  const insertSchoolLogo = () => {
    const logoHtml = `
      <div class="my-3 text-center" contenteditable="false" style="display: block; margin: 12px auto; text-align: center;">
        <img src="https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&q=80&w=120" alt="Logotipo" class="mx-auto w-20 h-20 object-contain inline-block" />
      </div>
    `;
    executeCommand('insertHTML', logoHtml);
  };

  const insertDocHeader = () => {
    const headerHtml = `
      <div class="text-center border-b-2 border-[var(--border)] pb-2 mb-4 font-sans tracking-wide" contenteditable="false" style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 16px;">
        <h4 class="text-[10px] font-semibold text-[var(--text-body)] uppercase tracking-widest leading-none" style="margin: 0; padding: 0;">PREFEITURA MUNICIPAL DE SÃO PAULO</h4>
        <h5 class="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-none" style="margin: 4px 0 0 0; padding: 0;">SECRETARIA DE EDUCAÇÃO E CULTURA</h5>
        <h3 class="text-[12px] font-semibold text-[var(--text-heading)] uppercase mt-1" style="margin: 6px 0 0 0; padding: 0;">CLASSIUM BRASIL - UNIDADE PEDAGÓGICA</h3>
      </div>
    `;
    executeCommand('insertHTML', headerHtml);
  };

  const insertDocFooter = () => {
    const footerHtml = `
      <div class="text-center text-[9px] text-[var(--text-muted)] mt-8 pt-2 border-t border-[var(--border)]" contenteditable="false" style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 32px; color: #94a3b8; font-size: 9px;">
        <p style="margin: 0;">Este documento é confidencial, registrado digitalmente e em conformidade com as diretrizes da Lei Geral de Proteção de Dados (LGPD).</p>
        <p class="font-bold text-[8px]" style="margin: 4px 0 0 0; font-weight: bold; font-size: 8px;">ID ÚNICO DE REGISTRO: REG-${Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
      </div>
    `;
    executeCommand('insertHTML', footerHtml);
  };

  const insertDigitalSignature = () => {
    const hash = Math.random().toString(36).substr(2, 9).toUpperCase();
    const digiHtml = `
      <div class="my-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-left max-w-md mx-auto" contenteditable="false" style="margin: 16px auto; padding: 12px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; text-align: left; max-w: 400px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 9999px; background-color: #d1fae5; display: flex; align-items: center; justify-content: center; color: #059669; font-weight: bold; font-size: 12px;"></div>
          <div>
            <p style="font-size: 10px; font-weight: bold; color: #1e293b; margin: 0;">ASSINADO DIGITALMENTE</p>
            <p style="font-size: 8px; color: #94a3b8; margin: 0;">Certificado ICP-Brasil • Token: ${hash}</p>
          </div>
        </div>
        <span style="font-size: 8px; font-weight: bold; color: #059669; bg-color: #ecfdf5; padding: 2px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">VALIDADO</span>
      </div>
    `;
    executeCommand('insertHTML', digiHtml);
  };

  const insertField = (field: string) => {
    executeCommand('insertHTML', ` <strong>{{${field}}}</strong> `);
  };

  // AI-powered dynamic document generator
  const handleGenerateIaDoc = async () => {
    if (!iaDocDescription.trim()) {
      alert('Por favor, descreva qual documento você deseja que a IA gere.');
      return;
    }

    setIsIaDocGenerating(true);
    setAiSuccessMessage('');

    try {
      const response = await fetch('/api/comunicacao/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: iaDocType,
          description: iaDocDescription
        })
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor.');
      }

      const generatedDoc = await response.json();
      
      // Update states
      setDocState({
        subject: generatedDoc.subject || 'ASSUNTO DO COMUNICADO',
        greeting: generatedDoc.greeting || 'Prezados Pais e Responsáveis,',
        intro: generatedDoc.intro || '',
        development: generatedDoc.development || '',
        guidelines: generatedDoc.guidelines || '',
        observations: generatedDoc.observations || '',
        closing: generatedDoc.closing || 'Atenciosamente,',
        signatureName: generatedDoc.signatureName || 'Direção Escolar',
        signatureRole: generatedDoc.signatureRole || 'Escola Municipal Maria Aparecida',
      });

      setAiSuccessMessage(`Documento do tipo "${iaDocType}" gerado com sucesso! `);
      setTimeout(() => setAiSuccessMessage(''), 4000);
      setActiveTab('modelos'); // return to central editor view
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao gerar documento com IA: ${error.message}`);
    } finally {
      setIsIaDocGenerating(false);
    }
  };

  // AI-powered Rifa campaign generator
  const handleGenerateRifaWithIa = async () => {
    const desc = prompt('Descreva o objetivo da rifa (ex: Quero uma rifa para arrecadar recursos para pintura da escola e comprar livros didáticos):', 'Arrecadar recursos para a pintura e jardinagem da escola');
    if (!desc) return;

    setIsRifaAiLoading(true);
    setAiSuccessMessage('');

    try {
      const response = await fetch('/api/rifas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc })
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor.');
      }

      const g = await response.json();
      
      // Update rifa state
      setRifaState(prev => ({
        ...prev,
        title: g.title || prev.title,
        text: g.text || prev.text,
        rules: g.rules || prev.rules,
        goal: g.goal || prev.goal,
        value: Number(g.value) || prev.value,
        prize: g.prize || prev.prize,
        date: g.date || prev.date,
        color: g.color || prev.color,
        pixKey: g.pixKey || prev.pixKey,
      }));

      setAiSuccessMessage('Rifa e Campanha geradas pela IA com sucesso! ');
      setTimeout(() => setAiSuccessMessage(''), 4000);
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao gerar Rifa com IA: ${error.message}`);
    } finally {
      setIsRifaAiLoading(false);
    }
  };

  // Quantity change handler with limits (10 to 100,000)
  const handleQuantityChange = (newQty: number) => {
    const clamped = Math.max(10, Math.min(100000, newQty));
    setRifaState(prev => ({ ...prev, quantity: clamped }));
    setRifaBatchEndNum(clamped);
    const numVal = parseInt(rifaActiveNumber, 10) || 1;
    if (numVal > clamped) {
      setRifaActiveNumber(formatTicketNumber(clamped, clamped));
    } else {
      setRifaActiveNumber(formatTicketNumber(numVal, clamped));
    }
  };

  // Image generator handler - generates pending thumbnail option
  const handleGenerateRifaImage = () => {
    setIsRifaImageLoading(true);
    setTimeout(() => {
      const samplePics = [
        'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=600'
      ];
      const selectedPic = samplePics[Math.floor(Math.random() * samplePics.length)];
      setRifaPendingGeneratedImage(selectedPic);
      setIsRifaImageLoading(false);
      setAiSuccessMessage('Nova opção de arte gerada pela IA Classium! Escolha se deseja utilizar. ');
      setTimeout(() => setAiSuccessMessage(''), 4000);
    }, 1200);
  };

  const handleApplyRifaImage = () => {
    if (rifaPendingGeneratedImage) {
      setRifaState(prev => ({ ...prev, logoUrl: rifaPendingGeneratedImage }));
      setRifaPendingGeneratedImage(null);
      setAiSuccessMessage('Arte inserida automaticamente na rifa! ');
      setTimeout(() => setAiSuccessMessage(''), 3000);
    }
  };

  const handleRejectAndRegenerateRifaImage = () => {
    setRifaPendingGeneratedImage(null);
    handleGenerateRifaImage();
  };

  // Export handlers
  const handleExportPDF = () => {
    handlePrintBatch(batchPages.length);
  };

  const handleExportPNG = () => {
    const link = document.createElement('a');
    link.download = `rifa_educa_solidario_bilhete_${rifaActiveNumber}.png`;
    link.href = rifaState.logoUrl || 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&q=80&w=600';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAiSuccessMessage('Exportação em PNG iniciada! ');
    setTimeout(() => setAiSuccessMessage(''), 3000);
  };

  const handleExportJPEG = () => {
    const link = document.createElement('a');
    link.download = `rifa_educa_solidario_bilhete_${rifaActiveNumber}.jpg`;
    link.href = rifaState.logoUrl || 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&q=80&w=600';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAiSuccessMessage('Exportação em JPEG iniciada! ');
    setTimeout(() => setAiSuccessMessage(''), 3000);
  };

  const handleExportZIP = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rifaState, null, 2));
    const link = document.createElement('a');
    link.download = `lote_rifas_${formatTicketNumber(rifaBatchStartNum, rifaState.quantity)}_a_${formatTicketNumber(rifaBatchEndNum, rifaState.quantity)}.zip`;
    link.href = dataStr;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAiSuccessMessage('Pacote de impressão ZIP do lote gerado! ');
    setTimeout(() => setAiSuccessMessage(''), 3000);
  };

  // Sell/Book ticket number
  const handleSellTicket = (num: string) => {
    setRifaState(prev => {
      const sales = { ...prev.sales };
      sales[num] = {
        name: tempBuyerName,
        phone: tempBuyerPhone,
        seller: tempSellerName || 'Secretaria Escolar',
        sold: true
      };
      return { ...prev, sales };
    });
    setTempBuyerName('');
    setTempBuyerPhone('');
    setTempSellerName('');
    setShowRifaSaleModal(false);
  };

  // Cancel sale
  const handleCancelTicketSale = (num: string) => {
    if (confirm(`Deseja realmente cancelar a venda do número ${num}?`)) {
      setRifaState(prev => {
        const sales = { ...prev.sales };
        delete sales[num];
        return { ...prev, sales };
      });
    }
  };

  // AI Assistant trigger
  const handleAiImprove = async (command: string) => {
    setIsAiLoading(true);
    setShowAiDropdown(false);
    setAiSuccessMessage('');

    const targetText = docState[focusedSection] || '';
    if (!targetText.trim()) {
      setIsAiLoading(false);
      alert('Selecione uma seção com texto para que a IA possa melhorar!');
      return;
    }

    try {
      const response = await fetch('/api/comunicacao/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: targetText,
          command: command
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha no processamento da IA.');
      }

      const data = await response.json();
      if (data.text) {
        handleUpdateDocField(focusedSection, data.text);
        setAiSuccessMessage(`Seção "${focusedSection}" aprimorada com sucesso `);
        setTimeout(() => setAiSuccessMessage(''), 4000);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao chamar a inteligência artificial: ${error.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Trigger Send Document Flow via Sincronização Ativa
  const handleSendDocument = async () => {
    setIsSending(true);
    
    // Assemble content
    const fullContent = `${docState.greeting}\n\n${docState.intro}\n\n${docState.development}\n\n${docState.guidelines}\n\n${docState.observations}\n\n${docState.closing}`;
    const cleanContent = fullContent.replace(/<[^>]*>/g, '').trim();
    const title = docState.subject?.trim() || selectedTemplate.title || 'Informativo Classium';

    if (sendMode === 'classes' && selectedClassIds.length === 0) {
      alert('Selecione ao menos uma turma para o disparo.');
      setIsSending(false);
      return;
    }
    if (sendMode === 'students' && selectedStudentIds.length === 0) {
      alert('Selecione ao menos um estudante para o disparo.');
      setIsSending(false);
      return;
    }
    if (sendMode === 'guardians' && selectedGuardianIds.length === 0) {
      alert('Selecione ao menos um responsável para o disparo.');
      setIsSending(false);
      return;
    }

    try {
      const currentTypeCode = 
        activeTab === 'urgente' ? 'urgent' :
        activeTab === 'assinaturas' ? 'signature' :
        activeTab === 'convocacoes' ? 'convocation' :
        activeTab === 'informativos' ? 'info' :
        activeTab === 'midia' ? 'media' :
        (selectedTemplate.requiresSignature || familyIntegrations.assinaturaDigital) ? 'signature' : 'info';

      const currentSeverity = 
        activeTab === 'urgente' ? urgentSeverity : 
        (currentTypeCode === 'urgent' ? 'EMERGÊNCIA' : 'INFORMATIVO');

      const firstStudent = realStudents.find(s => selectedStudentIds.includes(s.id));
      const targetStudentName = firstStudent ? firstStudent.name : dynamicFieldValues['NOME_ALUNO'] || undefined;

      const res = await publishOrganizationAnnouncement({
        p_title: title,
        p_body: cleanContent,
        p_mode: sendMode,
        p_class_ids: sendMode === 'classes' ? selectedClassIds : null,
        p_student_ids: sendMode === 'students' ? selectedStudentIds : null,
        p_guardian_ids: sendMode === 'guardians' ? selectedGuardianIds : null,
        p_publish_now: true,
        p_expires_at: null,
        p_create_family_feed: true,
        p_type_code: currentTypeCode,
        p_severity: currentSeverity,
        p_location: activeTab === 'convocacoes' ? convocationLocation : undefined,
        p_scheduled_date: activeTab === 'convocacoes' ? convocationDate : undefined,
        p_scheduled_time: activeTab === 'convocacoes' ? convocationTime : undefined,
        p_due_date: activeTab === 'assinaturas' ? signatureDueDate : undefined,
        p_cost: activeTab === 'assinaturas' ? signatureCost : undefined,
        p_target_student_id: sendMode === 'students' && selectedStudentIds.length > 0 ? selectedStudentIds[0] : undefined,
        p_target_student_name: targetStudentName,
        p_target_student_label: targetStudentName ? `Para: ${targetStudentName.split(' ')[0]}` : undefined,
        p_requires_signature: currentTypeCode === 'signature',
        p_requires_acknowledgment: currentTypeCode === 'urgent' || currentTypeCode === 'info' || informativeRequiresAck,
        p_category: 
          activeTab === 'urgente' ? 'Urgente / Saúde' :
          activeTab === 'assinaturas' ? 'Assinaturas & Termos' :
          activeTab === 'convocacoes' ? 'Convocações Pedagógicas' :
          activeTab === 'informativos' ? 'Informativos Gerais' :
          selectedTemplate.category || 'Geral'
      });

      if (res.error) {
        alert(`Erro no disparo: ${res.error}`);
      } else if (res.data) {
        setLastDispatchResult({
          recipients_count: res.data.recipients_count ?? totalReachedGuardians,
          notified_count: res.data.notified_count ?? appEnabledGuardiansCount,
          skipped_no_profile_count: res.data.skipped_no_profile_count ?? skippedNoProfileGuardiansCount,
          announcement_id: res.data.announcement_id,
          message: res.data.message
        });

        // Add to local state context as well
        if (familyIntegrations.assinaturaDigital || familyIntegrations.autorizar) {
          addAuthorization(
            title,
            cleanContent,
            'Gratuito'
          );
        } else {
          addAnnouncement(
            title,
            cleanContent,
            docState.signatureName || 'Secretaria Escolar',
            'family'
          );
        }

        // Persist to document template service for audit & history
        try {
          const generatedRecord = await documentTemplateService.recordGeneratedDocument({
            template_id: selectedTemplate.id,
            template_title: selectedTemplate.title,
            subject: docState.subject || selectedTemplate.title,
            category: selectedTemplate.category,
            student_name: dynamicFieldValues['NOME_ALUNO'] || 'Turma Geral / Comunidade Escolar',
            grade: dynamicFieldValues['SERIE_TURMA'] || 'Turma Regular',
            status: (selectedTemplate.requiresSignature || familyIntegrations.assinaturaDigital) ? 'pendente_assinatura' : 'emitido',
            requires_signature: !!(selectedTemplate.requiresSignature || familyIntegrations.assinaturaDigital),
            content_html: cleanContent,
            recipient_audience: sendMode,
            fields_data: dynamicFieldValues,
          });
          setGeneratedHistory(prev => [generatedRecord, ...prev]);
        } catch (recErr) {
          console.warn('Erro ao registrar histórico de emissão:', recErr);
        }

        setShowSuccessOverlay(true);
      }
    } catch (err: any) {
      alert(`Exceção durante o disparo: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const getArtThemeStyles = (themeName: string) => {
    const themes: { [key: string]: { bg: string; text: string; border: string; accent: string; badge: string } } = {
      'Solidário': { bg: 'from-emerald-50 to-teal-50 text-emerald-950', text: 'text-emerald-900', border: 'border-emerald-300', accent: 'bg-emerald-600 text-white', badge: 'Ação Solidária ' },
      'Festa Junina': { bg: 'from-amber-50 to-orange-100 text-amber-950', text: 'text-amber-900', border: 'border-amber-300', accent: 'bg-amber-600 text-white', badge: 'Arraial Escolar ' },
      'Dia das Mães': { bg: 'from-pink-50 to-rose-100 text-pink-950', text: 'text-pink-900', border: 'border-pink-300', accent: 'bg-pink-600 text-white', badge: 'Dia das Mães ' },
      'Dia dos Pais': { bg: 'from-blue-50 to-indigo-100 text-[var(--text-heading)]', text: 'text-[var(--text-heading)]', border: 'border-[var(--border)]', accent: 'bg-[var(--accent)] text-[var(--accent-fg)]', badge: 'Dia dos Pais ' },
      'Natal': { bg: 'from-red-50 to-rose-100 text-red-950', text: 'text-red-900', border: 'border-red-300', accent: 'bg-red-700 text-white', badge: 'Natal Solidário ' },
      'Páscoa': { bg: 'from-indigo-50 to-purple-100 text-purple-950', text: 'text-purple-900', border: 'border-purple-300', accent: 'bg-purple-600 text-white', badge: 'Páscoa Feliz ' },
      'Feiras': { bg: 'from-sky-50 to-blue-100 text-[var(--text-heading)]', text: 'text-[var(--text-heading)]', border: 'border-[var(--border)]', accent: 'bg-[var(--accent)] text-[var(--accent-fg)]', badge: 'Feira de Ciências ' },
      'Eventos': { bg: 'from-stone-50 to-amber-100 text-[var(--text-heading)]', text: 'text-[var(--text-heading)]', border: 'border-amber-400', accent: 'bg-amber-500 text-[var(--text-heading)]', badge: 'Evento Escolar ' },
      'Esportes': { bg: 'from-orange-50 to-red-100 text-orange-950', text: 'text-orange-900', border: 'border-orange-300', accent: 'bg-orange-600 text-white', badge: 'Esportes ' },
      'Campanhas': { bg: 'from-teal-50 to-cyan-100 text-teal-950', text: 'text-teal-900', border: 'border-teal-300', accent: 'bg-teal-600 text-white', badge: 'Campanha de Apoio ' },
      'Projetos': { bg: 'from-slate-50 to-blue-100 text-[var(--text-heading)]', text: 'text-[var(--text-heading)]', border: 'border-[var(--border)]', accent: 'bg-[var(--accent)] text-[var(--accent-fg)]', badge: 'Projeto Pedagógico ' },
      'Reuniões': { bg: 'from-gray-100 to-slate-200 text-[var(--text-heading)]', text: 'text-[var(--text-heading)]', border: 'border-[var(--border)]', accent: 'bg-slate-600 text-white', badge: 'Fórum & Reunião ' },
      'Pedagógico': { bg: 'from-[#fdfbf7] to-amber-50 text-[var(--text-heading)]', text: 'text-[var(--text-heading)]', border: 'border-amber-300', accent: 'bg-amber-600 text-white', badge: 'Pedagógico ' },
      'Segurança': { bg: 'from-[var(--accent)] to-stone-100 text-[var(--accent-fg)]', text: 'text-[var(--text-heading)]', border: 'border-amber-200', accent: 'bg-[var(--accent)] text-[var(--accent-fg)]', badge: 'Segurança Escolar ' },
    };
    return themes[themeName] || themes['Solidário'];
  };

  const renderRifaWorkstation = () => {
    // Pagination calculation for batch print preview
    const startNum = Math.max(1, rifaBatchStartNum);
    const endNum = Math.min(rifaState.quantity, Math.max(startNum, rifaBatchEndNum));
    const totalBatchCount = Math.max(1, endNum - startNum + 1);
    const perPage = Math.max(1, rifasPorFolha);
    const totalPages = Math.ceil(totalBatchCount / perPage);
    const currentPageClamped = Math.min(totalPages, Math.max(1, rifaBatchCurrentPage));
    
    const pageStartIndex = startNum + (currentPageClamped - 1) * perPage;
    const pageEndIndex = Math.min(endNum, pageStartIndex + perPage - 1);
    
    const currentPageTickets: number[] = [];
    for (let i = pageStartIndex; i <= pageEndIndex; i++) {
      currentPageTickets.push(i);
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 text-[var(--text-heading)] font-sans">
        {/* Tab navigation inside workstation (Mapa de vendas REMOVED per requirement 5) */}
        <div className="flex bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border)] mb-4 shrink-0 justify-between items-center">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setRifaSubTab('bilhete')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                rifaSubTab === 'bilhete' ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Visualizar Bilhete
            </button>
            <button
              type="button"
              onClick={() => setRifaSubTab('impressao')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                rifaSubTab === 'impressao' ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              Configuração e Impressão em Lote
            </button>
          </div>

          <div className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-semibold uppercase px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            Classium Solidário
          </div>
        </div>

        {/* SubTab Content */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {rifaSubTab === 'bilhete' && (
            <div className="space-y-4 text-left">
              {/* TOP ACTION & EXPORTS BAR (Requirements 12 & 13) */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Exportações e Impressão:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-[var(--text-heading)] font-semibold text-xs rounded-xl transition-all flex items-center gap-1 shadow"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir / PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPNG}
                    className="px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] border border-[var(--border)] text-[var(--text-body)] font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJPEG}
                    className="px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] border border-[var(--border)] text-[var(--text-body)] font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    JPEG
                  </button>
                  <button
                    type="button"
                    onClick={handleExportZIP}
                    className="px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-alt)] border border-[var(--border)] text-[var(--text-body)] font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-amber-700" />
                    Lote ZIP
                  </button>
                </div>
              </div>

              {/* Quick active number selector */}
              <div className="flex items-center justify-between bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border)]">
                <div className="text-left">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Navegação nos Bilhetes</p>
                  <p className="text-xs font-bold text-[var(--text-heading)] font-mono">
                    Bilhete Nº <span className="text-amber-700 font-semibold">{rifaActiveNumber}</span> de {formatTicketNumber(rifaState.quantity, rifaState.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const prevNum = (Number(rifaActiveNumber) - 1);
                      if (prevNum >= 1) {
                        setRifaActiveNumber(formatTicketNumber(prevNum, rifaState.quantity));
                      }
                    }}
                    disabled={Number(rifaActiveNumber) <= 1}
                    className="p-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-card)] disabled:opacity-30 text-[var(--text-body)] font-bold text-xs"
                  >
                    ← Anterior
                  </button>
                  <input
                    type="text"
                    value={rifaActiveNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val) {
                        const num = Number(val);
                        if (num >= 1 && num <= rifaState.quantity) {
                          setRifaActiveNumber(formatTicketNumber(num, rifaState.quantity));
                        } else {
                          setRifaActiveNumber(val);
                        }
                      } else {
                        setRifaActiveNumber('');
                      }
                    }}
                    onBlur={() => {
                      const num = parseInt(rifaActiveNumber, 10) || 1;
                      const clamped = Math.max(1, Math.min(rifaState.quantity, num));
                      setRifaActiveNumber(formatTicketNumber(clamped, rifaState.quantity));
                    }}
                    className="w-20 bg-[var(--bg-card)] border border-[var(--border)] text-center font-mono text-xs font-semibold py-1.5 rounded-lg text-amber-700 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = (Number(rifaActiveNumber) + 1);
                      if (nextNum <= rifaState.quantity) {
                        setRifaActiveNumber(formatTicketNumber(nextNum, rifaState.quantity));
                      }
                    }}
                    disabled={Number(rifaActiveNumber) >= rifaState.quantity}
                    className="p-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-card)] disabled:opacity-30 text-[var(--text-body)] font-bold text-xs"
                  >
                    Próximo →
                  </button>
                </div>
              </div>

              {/* PREMIUM TICKET PREVIEW CANVAS WITH DYNAMIC IMAGE POSITIONING */}
              {(() => {
                const theme = getArtThemeStyles(rifaState.selectedArtTemplate);
                const ticketNum = rifaActiveNumber;
                const isSold = !!rifaState.sales[ticketNum];
                const saleInfo = rifaState.sales[ticketNum];

                return (
                  <div className={`w-full bg-gradient-to-tr ${theme.bg} border-2 ${theme.border} rounded-2xl shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] overflow-hidden text-[var(--text-heading)] flex flex-col md:flex-row relative min-h-[320px]`}>
                    {/* Sold Watermark overlay */}
                    {isSold && (
                      <div className="absolute inset-0 bg-emerald-50 backdrop-blur-[0.5px] z-10 flex items-center justify-center select-none pointer-events-none">
                        <div className="transform -rotate-12 border-4 border-emerald-500 bg-emerald-50 text-emerald-600 px-6 py-2 rounded-2xl font-semibold text-xl tracking-widest shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] opacity-90 uppercase">
                          RESERVADO / PAGO 
                        </div>
                      </div>
                    )}

                    {/* CANHOTO / STUB (Left Part) */}
                    <div className="w-full md:w-[30%] p-4 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-[var(--border)] relative flex flex-col justify-between font-sans text-left text-[10px]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="bg-[var(--bg-card)] text-[var(--text-heading)] text-[8px] font-semibold uppercase px-2 py-0.5 rounded">CANHOTO</span>
                          <span className="font-mono font-semibold text-[var(--accent)] bg-[var(--bg-card)] text-[var(--text-heading)] px-2 py-0.5 rounded">Nº {ticketNum}</span>
                        </div>
                        <div className="space-y-1.5 pt-2">
                          <p className="font-bold border-b border-[var(--border)] pb-1 flex justify-between">
                            <span className="text-[var(--text-muted)] font-sans">Valor:</span>
                            <span className="text-[var(--text-heading)] font-mono font-bold">R$ {rifaState.value.toFixed(2)}</span>
                          </p>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Comprador:</span>
                            <p className="font-semibold text-[var(--text-heading)] border-b border-[var(--border)] min-h-[14px] leading-tight">
                              {isSold ? saleInfo.name : '________________________'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Telefone:</span>
                            <p className="font-semibold text-[var(--text-heading)] border-b border-[var(--border)] min-h-[14px] leading-tight">
                              {isSold ? saleInfo.phone : '________________________'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Vendedor:</span>
                            <p className="font-semibold text-[var(--text-heading)] border-b border-[var(--border)] min-h-[14px] leading-tight">
                              {isSold ? saleInfo.seller : '________________________'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 flex items-end justify-between border-t border-[var(--border)] mt-2">
                        <div className="text-[7px] text-[var(--text-muted)] leading-tight">
                          <p className="font-bold">Classium Solidário</p>
                          <p className="font-mono text-[6px]">ID: {rifaState.auditId}</p>
                        </div>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=pix:${rifaState.pixKey}`}
                          alt="Pix QR"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 border p-0.5 bg-[var(--bg-card)] rounded shadow-sm"
                        />
                      </div>

                      {/* Cut scissor icon indicators */}
                      <div className="absolute right-[-10px] top-4 text-[var(--text-muted)] transform translate-x-1/2 z-20 hidden md:block">
                        <Scissors className="w-4 h-4 rotate-90" />
                      </div>
                    </div>

                    {/* BILHETE / RECEIPT (Right Part) */}
                    <div className="flex-1 p-4 flex flex-col justify-between font-sans text-left relative overflow-hidden">
                      <div className="space-y-3">
                        {/* Header Image Option: HEADER POSITION */}
                        {rifaState.logoUrl && rifaImagePosition === 'header' && (
                          <div className="w-full h-24 rounded-xl overflow-hidden mb-2 border border-[var(--border)] shadow-sm relative">
                            <img src={rifaState.logoUrl} alt="Arte Rifa" className="w-full h-full object-cover" />
                            <div className="absolute bottom-1 right-2 bg-[var(--bg-card-alt)] text-[var(--text-heading)] font-mono text-[8px] px-2 py-0.5 rounded font-semibold">
                              Nº {ticketNum}
                            </div>
                          </div>
                        )}

                        {/* Top Bar */}
                        <div className="flex items-start justify-between">
                          <div className="text-left">
                            <span className="text-[8px] font-semibold uppercase tracking-wider text-[var(--text-muted)] leading-none block">Ação Escolar Beneficente</span>
                            <h4 className="text-[11px] font-semibold text-[var(--text-heading)] tracking-tight leading-tight pt-0.5">
                              {headerConfig.schoolName}
                            </h4>
                          </div>
                          <div className="text-right flex flex-col items-end shrink-0">
                            <span className="text-[10px] bg-[var(--bg-card)] text-[var(--text-heading)] font-mono font-semibold px-2.5 py-0.5 rounded shadow-sm">
                              Nº {ticketNum}
                            </span>
                            <span className="text-[7.5px] font-extrabold text-[var(--accent)] bg-[var(--bg-card)] text-[var(--text-heading)] px-1.5 py-0.5 rounded mt-1 uppercase tracking-wider">
                              {theme.badge}
                            </span>
                          </div>
                        </div>

                        <div className="h-0.5 bg-[var(--bg-card-alt)] w-full"></div>

                        {/* Middle Content Layout */}
                        {rifaState.logoUrl && rifaImagePosition === 'above_description' && (
                          <div className="w-full h-20 rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
                            <img src={rifaState.logoUrl} alt="Arte Rifa" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 items-start">
                          <div className={`${rifaState.logoUrl && rifaImagePosition === 'right' ? 'md:col-span-6' : 'md:col-span-9'} space-y-1.5`}>
                            <h3 className="text-xs font-semibold text-[var(--text-heading)] uppercase tracking-tight leading-tight">
                              {rifaState.title}
                            </h3>
                            <p className="text-[10px] text-[var(--text-body)] leading-relaxed font-medium">
                              {rifaState.text}
                            </p>
                          </div>

                          {/* Image Option: RIGHT POSITION */}
                          {rifaState.logoUrl && rifaImagePosition === 'right' && (
                            <div className="md:col-span-3 h-24 rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
                              <img src={rifaState.logoUrl} alt="Arte Rifa" className="w-full h-full object-cover" />
                            </div>
                          )}

                          {/* QR Code / Value badge */}
                          <div className={`${rifaState.logoUrl && rifaImagePosition === 'right' ? 'md:col-span-3' : 'md:col-span-3'} flex flex-col items-center justify-center bg-[var(--bg-card-alt)] border border-[var(--border)] p-2 rounded-xl text-center shrink-0`}>
                            <span className="text-[7px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">VALOR</span>
                            <span className="text-xs font-semibold text-[var(--text-heading)] font-mono py-0.5 font-bold">R$ {rifaState.value.toFixed(2)}</span>
                            <div className="w-11 h-11 bg-[var(--bg-card)] p-0.5 rounded border border-[var(--border)] mt-0.5">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=pix:${rifaState.pixKey}`}
                                alt="Pix QR"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Prize section */}
                        <div className="bg-[var(--bg-card-alt)] border border-[var(--border)] rounded-xl p-2.5 space-y-1 flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 border border-amber-200 shadow-sm">
                            <Award className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <span className="text-[7.5px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block leading-none">Prêmio Oficial</span>
                            <p className="text-[10px] font-semibold text-[var(--text-heading)] leading-tight pt-0.5">
                              {rifaState.prize}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer with audit metadata (Requirements 17) */}
                      <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 text-[8px] text-[var(--text-muted)] font-sans mt-2">
                        <div className="text-left space-y-0.5 max-w-[70%]">
                          <p className="leading-tight"><strong className="text-[var(--text-body)]">Regras:</strong> {rifaState.rules}</p>
                          {rifaState.sponsors && (
                            <p className="leading-tight"><strong className="text-[var(--text-body)]">Apoio:</strong> {rifaState.sponsors}</p>
                          )}
                          <p className="text-[7px] font-mono text-[var(--text-muted)] pt-0.5">
                            Audit ID: {rifaState.auditId} • Hash: {rifaState.auditHash.substring(0, 10)}... • Resp: {rifaState.responsibleUser}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[var(--text-body)]">Sorteio Oficial:</p>
                          <p className="font-semibold text-[var(--text-heading)] text-[9px]">{rifaState.date}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Operational Banner */}
              <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="space-y-1 text-left">
                  <p className="text-xs font-bold text-[var(--text-heading)] flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-700" />
                    Fluxo Financeiro Digital Integrado Classium
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                    Toda numeração é sincronizada em tempo real com o módulo financeiro do Classium Família para baixa automática de recebimentos via Pix e auditoria em lote.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRifaSubTab('impressao')}
                  className="px-4 py-2 bg-gradient-to-r from-[var(--accent)] to-[var(--accent)] text-[var(--accent-fg)] font-semibold text-xs rounded-xl shadow transition-all shrink-0"
                >
                  Configurar Impressão
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPRESSÃO EM LOTE E ORGANIZAÇÃO AUTOMÁTICA (Requirements 6, 7, 8, 9, 10, 11, 12, 14, 15) */}
          {rifaSubTab === 'impressao' && (
            <div className="space-y-4 text-left font-sans">
              {/* BATCH PRINT CONFIGURATION PANEL */}
              <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-heading)] uppercase tracking-wider flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-amber-700" />
                      Painel de Configuração de Impressão e Diagramação
                    </h4>
                    <p className="text-[10px] text-[var(--text-muted)] pt-0.5">
                      Organização e diagramação automática de bilhetes por folha para corte rápido sem desperdício de papel.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-imprimir-lote-rifas"
                      type="button"
                      onClick={() => handlePrintBatch(batchPages.length)}
                      disabled={isPreparingPrint}
                      className="px-4 py-2 bg-gradient-to-r from-[var(--accent)] to-[var(--accent)] text-[var(--accent-fg)] font-semibold text-xs rounded-xl shadow hover:brightness-110 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-60 cursor-pointer"
                    >
                      {isPreparingPrint ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{printProgress || 'Preparando...'}</span>
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          <span>Imprimir Lote ({totalBatchCount} bilhetes • {batchPages.length} {batchPages.length === 1 ? 'folha' : 'folhas'})</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportZIP}
                      className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-amber-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <FolderArchive className="w-3.5 h-3.5" />
                      Baixar ZIP
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Range selection */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Número Inicial do Lote</label>
                    <input
                      type="number"
                      min={1}
                      max={rifaState.quantity}
                      value={rifaBatchStartNum}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(rifaState.quantity, Number(e.target.value)));
                        setRifaBatchStartNum(val);
                        setRifaBatchCurrentPage(1);
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2 text-xs text-amber-700 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Número Final do Lote</label>
                    <input
                      type="number"
                      min={rifaBatchStartNum}
                      max={rifaState.quantity}
                      value={rifaBatchEndNum}
                      onChange={(e) => {
                        const val = Math.max(rifaBatchStartNum, Math.min(rifaState.quantity, Number(e.target.value)));
                        setRifaBatchEndNum(val);
                        setRifaBatchCurrentPage(1);
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2 text-xs text-amber-700 font-mono font-bold"
                    />
                  </div>

                  {/* Quantity per sheet */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Rifas por Folha (Organização)</label>
                    <select
                      value={rifasPorFolha}
                      onChange={(e) => {
                        setRifasPorFolha(Number(e.target.value));
                        setRifaBatchCurrentPage(1);
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-heading)] font-bold cursor-pointer"
                    >
                      {[2, 4, 5, 6, 8, 10, 12, 16, 20].map(n => (
                        <option key={n} value={n} className="bg-[var(--bg-card)] text-[var(--text-heading)]">{n} bilhetes por folha</option>
                      ))}
                    </select>
                  </div>

                  {/* Paper format selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Formato do Papel</label>
                    <select
                      value={rifaPaperFormat}
                      onChange={(e) => setRifaPaperFormat(e.target.value as any)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-heading)] cursor-pointer"
                    >
                      <option value="a4" className="bg-[var(--bg-card)] text-[var(--text-heading)]">Papel A4 Retrato</option>
                      <option value="a4_landscape" className="bg-[var(--bg-card)] text-[var(--text-heading)]">Papel A4 Paisagem</option>
                      <option value="carta" className="bg-[var(--bg-card)] text-[var(--text-heading)]">Papel Carta (Letter)</option>
                      <option value="oficio" className="bg-[var(--bg-card)] text-[var(--text-heading)]">Papel Ofício (Legal)</option>
                      <option value="a5" className="bg-[var(--bg-card)] text-[var(--text-heading)]">Papel A5</option>
                      <option value="custom" className="bg-[var(--bg-card)] text-[var(--text-heading)]">Formato Personalizado</option>
                    </select>
                  </div>
                </div>

                {/* Print Toggles */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-body)]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rifaShowCropLines}
                      onChange={(e) => setRifaShowCropLines(e.target.checked)}
                      className="rounded border-[var(--border)] bg-[var(--bg-card)] text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="text-[11px] font-medium">Exibir Linhas de Corte ()</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rifaShowFoldMarks}
                      onChange={(e) => setRifaShowFoldMarks(e.target.checked)}
                      className="rounded border-[var(--border)] bg-[var(--bg-card)] text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="text-[11px] font-medium">Exibir Marcas de Dobra e Margens de Segurança</span>
                  </label>
                </div>
              </div>

              {/* LIVE PRINT PREVIEW & VIRTUALIZED PAGINATION CANVAS */}
              <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)] space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div>
                    <span className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider block">Pré-visualização em Tempo Real da Diagramação</span>
                    <p className="text-xs font-bold text-[var(--text-heading)] font-mono">
                      Folha {currentPageClamped} de {totalPages} • Exibindo Bilhetes Nº {formatTicketNumber(pageStartIndex, rifaState.quantity)} até Nº {formatTicketNumber(pageEndIndex, rifaState.quantity)}
                    </p>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRifaBatchCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPageClamped <= 1}
                      className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-body)] text-xs font-bold rounded-lg disabled:opacity-30 transition-all"
                    >
                      ← Folha Anterior
                    </button>
                    <span className="text-xs font-mono font-semibold text-amber-700 px-2">
                      {currentPageClamped} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRifaBatchCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPageClamped >= totalPages}
                      className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-body)] text-xs font-bold rounded-lg disabled:opacity-30 transition-all"
                    >
                      Próxima Folha →
                    </button>
                  </div>
                </div>

                {/* SIMULATED SHEET LAYOUT CONTAINER */}
                <div className="bg-[var(--bg-card)] p-4 sm:p-6 rounded-2xl border border-[var(--border)] overflow-x-auto flex justify-center">
                  <div className={`bg-[var(--bg-card)] text-[var(--text-heading)] p-6 rounded-xl shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] space-y-3 border border-[var(--border)] relative w-full max-w-[800px] ${
                    rifaPaperFormat === 'a4_landscape' ? 'aspect-[1.414/1]' : 'min-h-[900px]'
                  }`}>
                    {/* Page Header */}
                    <div className="flex justify-between items-center text-[8px] text-[var(--text-muted)] font-mono border-b pb-2 mb-2">
                      <span>CLASSIUM SOLIDÁRIO — LOTE DE IMPRESSÃO OFICIAL</span>
                      <span>FOLHA {currentPageClamped}/{totalPages} (BILHETES {formatTicketNumber(pageStartIndex, rifaState.quantity)} - {formatTicketNumber(pageEndIndex, rifaState.quantity)})</span>
                      <span>FORMATO: {rifaPaperFormat.toUpperCase()}</span>
                    </div>

                    {/* Automatic Grid Organization according to rifasPorFolha */}
                    <div className={`grid gap-3 ${
                      rifasPorFolha <= 5 ? 'grid-cols-1' : rifasPorFolha <= 10 ? 'grid-cols-2' : 'grid-cols-3'
                    }`}>
                      {currentPageTickets.map((n) => {
                        const numStr = formatTicketNumber(n, rifaState.quantity);
                        const theme = getArtThemeStyles(rifaState.selectedArtTemplate);
                        return (
                          <div
                            key={n}
                            className={`bg-gradient-to-tr ${theme.bg} border ${theme.border} rounded-lg p-2.5 text-[var(--text-heading)] flex text-left text-[8px] relative overflow-hidden transition-all shadow-sm ${
                              rifasPorFolha > 10 ? 'h-24' : 'h-28'
                            }`}
                          >
                            {/* Stub left */}
                            <div className="w-[30%] border-r border-dashed border-[var(--border)] pr-2 flex flex-col justify-between">
                              <div className="flex justify-between font-bold">
                                <span>CANHOTO</span>
                                <span className="font-mono text-[var(--text-heading)] font-semibold">Nº {numStr}</span>
                              </div>
                              <p className="border-b pb-0.5 mt-0.5 font-mono text-[7.5px] font-bold">VALOR: R$ {rifaState.value.toFixed(2)}</p>
                              <div className="space-y-0.5 text-[6.5px] text-[var(--text-body)]">
                                <p>Nome: _________________</p>
                                <p>CPF:  _________________</p>
                                <p>Fone: _________________</p>
                              </div>
                            </div>

                            {/* Ticket Right */}
                            <div className="flex-1 pl-2.5 flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-semibold text-[6.5px] uppercase tracking-wider text-[var(--text-muted)] block leading-none">Ação Escolar Beneficente</span>
                                  <h4 className="font-extrabold text-[var(--text-heading)] text-[9px] leading-tight pt-0.5 truncate">{rifaState.title}</h4>
                                  <span className="text-[6.5px] text-[var(--text-muted)] block leading-none pt-0.5 truncate">{headerConfig?.schoolName || 'Escola Municipal Vereador José Ferreira de Aguiar'}</span>
                                </div>
                                <span className="bg-[var(--bg-card)] text-[var(--text-heading)] font-mono font-semibold px-1.5 py-0.5 rounded text-[8px] shrink-0">Nº {numStr}</span>
                              </div>
                              <p className="text-[7px] text-[var(--text-body)] line-clamp-2 leading-relaxed font-medium">{rifaState.text}</p>
                              <div className="bg-[var(--bg-card-alt)] p-1 rounded flex justify-between font-bold text-[var(--text-heading)] text-[7px]">
                                <span className="truncate max-w-[65%]"> PRÊMIO: {rifaState.prize}</span>
                                <span>SORTEIO: {rifaState.date}</span>
                              </div>
                            </div>

                            {/* Cut Scissor indicators */}
                            {rifaShowCropLines && (
                              <div className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-30 pointer-events-none">
                                <Scissors className="w-3 h-3 text-[var(--text-body)]" />
                              </div>
                            )}

                            {/* Fold Mark indicator */}
                            {rifaShowFoldMarks && (
                              <div className="absolute left-[30%] top-0 bottom-0 border-l border-amber-200 opacity-40 pointer-events-none"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Page Footer */}
                    <div className="pt-4 border-t text-center text-[7.5px] text-[var(--text-muted)] font-mono">
                      Documento oficial gerado pelo ecossistema Classium • ID de Autenticidade: {rifaState.auditId}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RESERVATION DIALOG / MODAL */}
        {showRifaSaleModal && (
          <div className="absolute inset-0 bg-[var(--bg-card-alt)] z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-3xl max-w-sm w-full space-y-4 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] text-left font-sans">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  Reservar Número {rifaActiveNumber}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRifaSaleModal(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-heading)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Nome do Comprador</label>
                  <input
                    type="text"
                    value={tempBuyerName}
                    onChange={(e) => setTempBuyerName(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-heading)] focus:outline-none focus:border-amber-500"
                    placeholder="Ex: Maria da Silva"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={tempBuyerPhone}
                    onChange={(e) => setTempBuyerPhone(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-heading)] focus:outline-none focus:border-amber-500"
                    placeholder="Ex: (11) 99999-8888"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Vendedor Responsável</label>
                  <input
                    type="text"
                    value={tempSellerName}
                    onChange={(e) => setTempSellerName(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-2 text-xs text-[var(--text-heading)] focus:outline-none focus:border-amber-500"
                    placeholder="Ex: Prof. João (Secretaria)"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRifaSaleModal(false)}
                  className="flex-1 py-2 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSellTicket(rifaActiveNumber)}
                  disabled={!tempBuyerName.trim()}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  Confirmar Venda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IMAGE ZOOM MODAL */}
        {showImageZoomModal && rifaState.logoUrl && (
          <div className="absolute inset-0 bg-[var(--bg-card-alt)] z-50 flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-3xl max-w-2xl w-full space-y-4 shadow-[0_24px_60px_-34px_rgba(16,24,40,0.35)] text-left font-sans relative">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4" />
                  Visualização da Arte Ampliada
                </span>
                <button
                  type="button"
                  onClick={() => setShowImageZoomModal(false)}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-heading)] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden border border-[var(--border)] max-h-[70vh] flex items-center justify-center bg-black">
                <img
                  src={rifaState.logoUrl}
                  alt="Arte Rifa Ampliada"
                  className="max-h-[65vh] w-auto object-contain"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImageZoomModal(false)}
                  className="px-4 py-2 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card-alt)] text-[var(--text-body)] text-xs font-bold rounded-xl"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-6 min-h-[calc(100vh-140px)] pr-2">
      {/* HEADER DO MÓDULO & ABAS PRINCIPAIS */}
      <div className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6 shrink-0 flex flex-col gap-5">
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
        <div className="relative flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_12px_24px_-14px_rgba(16,24,40,0.6)]" style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}>
            <MessageSquare className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-serif text-[28px] font-semibold leading-tight tracking-[-0.015em] text-[var(--text-heading)]">Comunicação</h1>
            <p className="mt-1 text-[15px] text-[var(--text-muted)]">Comunicados, convocações, documentos para assinar e envios para a comunidade escolar.</p>
          </div>
        </div>

        {/* 6 ABAS OFICIAIS SOLICITADAS */}
        <div className="relative flex flex-wrap gap-1 rounded-[22px] bg-[var(--bg-card-alt)] p-1">
          <button 
            type="button"
            onClick={() => setActiveTab('urgente')} 
            className={`h-10 px-4 text-[13px] font-semibold rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'urgente' 
                ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm' 
                : 'text-[var(--text-body)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Urgente
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('assinaturas')} 
            className={`h-10 px-4 text-[13px] font-semibold rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'assinaturas' 
                ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm' 
                : 'text-[var(--text-body)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]'
            }`}
          >
            <FileSignature className="w-4 h-4 shrink-0" />
            Assinaturas
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('convocacoes')} 
            className={`h-10 px-4 text-[13px] font-semibold rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'convocacoes' 
                ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm' 
                : 'text-[var(--text-body)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Convocações
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('informativos')} 
            className={`h-10 px-4 text-[13px] font-semibold rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'informativos' 
                ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm' 
                : 'text-[var(--text-body)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            Informativos
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('midia')} 
            className={`h-10 px-4 text-[13px] font-semibold rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'midia' 
                ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm' 
                : 'text-[var(--text-body)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Ticket className="w-4 h-4 shrink-0" />
            Rifas e ações
          </button>

          <div className="w-px h-6 bg-[var(--border)] self-center mx-1 hidden sm:block" />

          <button 
            type="button"
            onClick={() => setActiveTab('reais')} 
            className={`h-10 px-4 text-[13px] font-semibold rounded-full transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reais' 
                ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm' 
                : 'text-[var(--text-body)] hover:bg-[var(--bg-card)] hover:text-[var(--text-heading)]'
            }`}
          >
            <Send className="w-4 h-4 shrink-0" />
            Envios
          </button>
        </div>
      </div>



      {/* 1. COMUNICADO URGENTE */}
      {activeTab === 'urgente' && (
        <div className="w-full">
          <ComunicadoUrgenteTab
            realStudents={realStudents}
            realClasses={realClasses}
            schoolName={headerConfig?.schoolName || 'Escola Municipal Vereador José Ferreira de Aguiar'}
            senderName={docState.signatureName || 'Coordenação Escolar'}
            senderRole={docState.signatureRole || 'Direção'}
            organizationId={audienceData?.organization_id}
            onSuccessPublished={loadAudience}
          />
        </div>
      )}

      {/* 2. ASSINATURAS */}
      {activeTab === 'assinaturas' && (
        <div className="w-full">
          <AssinaturasTab
            realStudents={realStudents}
            realClasses={realClasses}
            schoolName={headerConfig?.schoolName || 'Escola Municipal Vereador José Ferreira de Aguiar'}
            senderName={docState.signatureName || 'Secretaria Escolar'}
            senderRole={docState.signatureRole || 'Direção'}
            organizationId={audienceData?.organization_id}
            onSuccessPublished={loadAudience}
          />
        </div>
      )}

      {/* 3. CONVOCAÇÕES */}
      {activeTab === 'convocacoes' && (
        <div className="w-full">
          <ConvocacoesTab
            realStudents={realStudents}
            realClasses={realClasses}
            schoolName={headerConfig?.schoolName || 'Escola Municipal Vereador José Ferreira de Aguiar'}
            senderName={docState.signatureName || 'Equipe Pedagógica'}
            senderRole={docState.signatureRole || 'Coordenação'}
            organizationId={audienceData?.organization_id}
            onSuccessPublished={loadAudience}
          />
        </div>
      )}

      {/* 4. INFORMATIVOS GERAIS */}
      {activeTab === 'informativos' && (
        <div className="w-full">
          <InformativosTab
            realStudents={realStudents}
            realClasses={realClasses}
            schoolName={headerConfig?.schoolName || 'Escola Municipal Vereador José Ferreira de Aguiar'}
            senderName={docState.signatureName || 'Gestão Escolar'}
            senderRole={docState.signatureRole || 'Direção'}
            organizationId={audienceData?.organization_id}
            onSuccessPublished={loadAudience}
          />
        </div>
      )}

      {/* 5. CRIAR RIFAS E AÇÕES */}
      {activeTab === 'midia' && (
        <div className="w-full">
          {renderRifaWorkstation()}
        </div>
      )}

      {/* 6. PAINEL DE ENVIOS (REALTIME) */}
      {activeTab === 'reais' && (
        <div className="w-full">
          <AdminComunicacao organizationId={audienceData?.organization_id} />
        </div>
      )}
      {/* Dedicated Printable Rifas Batch Document (Hidden on screen, full pages printed) */}
      <PrintableRifasBatch
        pages={batchPages}
        rifaInfo={{
          title: rifaState.title,
          prize: rifaState.prize,
          value: rifaState.value,
          date: rifaState.date,
          rules: rifaState.rules,
          sponsors: rifaState.sponsors,
          pixKey: rifaState.pixKey,
          logoUrl: rifaState.logoUrl,
          imagePosition: rifaImagePosition,
          selectedArtTemplate: rifaState.selectedArtTemplate,
          auditId: rifaState.auditId,
          auditHash: rifaState.auditHash,
          responsibleUser: rifaState.responsibleUser,
          text: rifaState.text,
          totalQuantity: rifaState.quantity,
          showCropLines: rifaShowCropLines,
          showFoldMarks: rifaShowFoldMarks,
          schoolName: headerConfig?.schoolName || 'Escola Municipal Vereador José Ferreira de Aguiar'
        }}
        rifasPorFolha={rifasPorFolha}
        paperFormat={rifaPaperFormat}
      />
    </div>
  );
}