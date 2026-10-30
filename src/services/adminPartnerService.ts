import { 
  PartnerAdvertiser, 
  PlanConfig, 
  InvoiceItem, 
  CuratedDocument, 
  PlanChangeHistoryItem,
  PlanType
} from '../components/admin/parceiros/types';

const STORAGE_KEYS = {
  PARTNERS: 'classium_admin_partners_v3',
  PLANS: 'classium_admin_plans_v3',
  INVOICES: 'classium_admin_invoices_v3',
  DOCUMENTS: 'classium_admin_documents_v3',
  PLAN_HISTORY: 'classium_admin_plan_history_v3',
};

export const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'prata',
    name: 'Plano Essencial Profissional',
    monthlyPrice: 99.90,
    annualPrice: 999.00,
    description: 'Ideal para profissionais autônomos, professores e consultórios individuais em expansão.',
    badgeColor: 'border-amber-400 text-amber-300 bg-amber-950/40',
    maxPhotos: 5,
    maxVideos: 1,
    maxBanners: 1,
    officialSeal: true,
    whatsappDirect: true,
    aiIntegration: false,
    detailedReports: true,
    priorityScore: 1,
  },
  {
    id: 'ouro',
    name: 'Plano Premium Institucional',
    monthlyPrice: 299.00,
    annualPrice: 2990.00,
    description: 'Para empresas, escolas e clínicas com destaque nos portais e relatórios analíticos de leads.',
    badgeColor: 'border-blue-400 text-blue-300 bg-blue-950/40',
    maxPhotos: 12,
    maxVideos: 4,
    maxBanners: 3,
    officialSeal: true,
    whatsappDirect: true,
    aiIntegration: true,
    detailedReports: true,
    priorityScore: 2,
  },
  {
    id: 'diamante',
    name: 'Plano Corporativo Soluções',
    monthlyPrice: 399.00,
    annualPrice: 3990.00,
    description: 'Apoio, infraestrutura e fornecedores com central de orçamentos e presença multiportal.',
    badgeColor: 'border-purple-400 text-purple-300 bg-purple-950/40',
    maxPhotos: 25,
    maxVideos: 10,
    maxBanners: 6,
    officialSeal: true,
    whatsappDirect: true,
    aiIntegration: true,
    detailedReports: true,
    priorityScore: 3,
  },
  {
    id: 'institucional',
    name: 'Parceiro Institucional / Apoio',
    monthlyPrice: 850.00,
    annualPrice: 8500.00,
    description: 'Contratos corporativos especiais para grandes editoras, universidades e fornecedores de grande porte.',
    badgeColor: 'border-cyan-400 text-cyan-300 bg-cyan-950/40',
    maxPhotos: 50,
    maxVideos: 20,
    maxBanners: 10,
    officialSeal: true,
    whatsappDirect: true,
    aiIntegration: true,
    detailedReports: true,
    priorityScore: 4,
  }
];

export const INITIAL_ADMIN_PARTNERS: PartnerAdvertiser[] = [
  {
    id: 'mentis-therapy-1',
    entityType: 'pessoa_juridica',
    name: 'Mentis Therapy Soluções em Saúde Ltda',
    tradeName: 'Mentis Therapy',
    cpfCnpj: '42.891.203/0001-92',
    professionalReg: 'CRP/SP 06/12894-J',
    email: 'contato@mentistherapy.com.br',
    whatsapp: '5511998877665',
    phone: '(11) 3289-4000',
    website: 'https://mentistherapy.com.br',
    city: 'São Paulo',
    state: 'SP',
    category: 'Saúde & Psicopedagogia',
    subCategory: 'Saúde Mental do Educador & Terapia Online',
    plan: 'diamante',
    registrationStatus: 'aprovado',
    publicationStatus: 'publicado',
    financialStatus: 'adimplente',
    monthlyFee: 499.00,
    rating: 5.0,
    reviewCount: 1420,
    officialPartnerSeal: true,
    sealText: 'Parceiro Oficial de Saúde Mental Classium',
    vipExclusive: true,
    isMentisTherapy: true,
    logo: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
    catalogPdfUrl: 'https://mentistherapy.com.br/guia-saude-mental-professor.pdf',
    description: 'A plataforma oficial parceira do Classium focada no cuidado psicológico, saúde emocional e qualidade de vida de professores, pedagogos e gestores.',
    promoText: '20% OFF exclusivo para toda a rede conveniada Classium',
    officialMessage: 'Programa de Prevenção ao Burnout Docente e Acompanhamento Psicológico Contínuo.',
    price: 'R$ 89,90 / sessão',
    originalPrice: 'R$ 180,00',
    discountBadge: '20% OFF Exclusivo Classium',
    highlights: [
      'Saúde Mental e Prevenção do Burnout Docente',
      'Terapia Online com Psicólogos Especializados',
      'Desenvolvimento Emocional e Inteligência Relacional',
      'Atendimento Especializado com Sigilo Absoluto'
    ],
    tags: ['Psicologia', 'Telemedicina', 'Docentes', 'Bem-Estar'],
    primaryButtonText: 'Agendar Sessão VIP',
    primaryButtonLink: 'https://mentistherapy.com.br',
    secondaryButtonText: 'Baixar Cartilha',
    secondaryButtonLink: 'https://mentistherapy.com.br/guia-saude-mental-professor.pdf',
    visibility: {
      portalFamilia: true,
      portalProfessor: true,
      portalGestor: true,
      portalEstudante: false,
      highlightPosition: 'banner_principal'
    },
    views: 18450,
    clicks: 4320,
    leadsGenerated: 1240,
    conversions: 380,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-09-18T14:30:00Z',
    moderationNotes: 'Empresa homologada com documentação completa e convênio institucional ativo.'
  },
  {
    id: 'uniasselvi-1',
    entityType: 'pessoa_juridica',
    name: 'Sociedade Educacional Leonardo da Vinci S.A.',
    tradeName: 'UNIASSELVI Pós-Graduação',
    cpfCnpj: '01.894.392/0001-55',
    professionalReg: 'MEC Portaria 1.020/2019',
    email: 'convenios@uniasselvi.com.br',
    whatsapp: '5547991234567',
    phone: '(47) 3301-6100',
    website: 'https://uniasselvi.com.br',
    city: 'Blumenau',
    state: 'SC',
    category: 'Formação & Pós',
    subCategory: 'Pós-Graduação & Extensão Docente',
    plan: 'diamante',
    registrationStatus: 'aprovado',
    publicationStatus: 'publicado',
    financialStatus: 'adimplente',
    monthlyFee: 499.00,
    rating: 4.9,
    reviewCount: 980,
    officialPartnerSeal: true,
    sealText: 'Instituição de Ensino Superior Credenciada MEC',
    vipExclusive: true,
    logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
    catalogPdfUrl: 'https://uniasselvi.com.br/pos-graduacao-educacao.pdf',
    description: 'Mais de 100 cursos de Pós-Graduação reconhecidos pelo MEC nas áreas de Educação Especial, Neuropsicopedagogia e Gestão Escolar.',
    promoText: 'Bolsas de até 50% para professores cadastrados no Classium',
    price: 'R$ 149,90 /mês',
    originalPrice: 'R$ 299,00',
    discountBadge: 'Convênio Classium: 50% de desconto',
    highlights: [
      'Psicopedagogia Clínica e Institucional',
      'Educação Especial e Inclusiva',
      'Gestão Escolar e Coordenação Pedagógica'
    ],
    tags: ['EAD', 'Pós-Graduação', 'MEC', 'Formação Continuada'],
    primaryButtonText: 'Garantir Bolsa Classium',
    primaryButtonLink: 'https://uniasselvi.com.br',
    visibility: {
      portalFamilia: false,
      portalProfessor: true,
      portalGestor: true,
      portalEstudante: false,
      highlightPosition: 'destaque_topo'
    },
    views: 12400,
    clicks: 2890,
    leadsGenerated: 850,
    conversions: 210,
    createdAt: '2026-02-15T11:00:00Z',
    updatedAt: '2026-09-15T09:00:00Z',
    moderationNotes: 'Contrato de parceria acadêmica renovado para o ano letivo de 2026.'
  },
  {
    id: 'ftd-educacao-1',
    entityType: 'pessoa_juridica',
    name: 'Editora FTD S.A.',
    tradeName: 'FTD Educação',
    cpfCnpj: '61.186.490/0001-57',
    email: 'escolas@ftd.com.br',
    whatsapp: '5511988887777',
    phone: '(11) 3598-6000',
    website: 'https://ftd.com.br',
    city: 'São Paulo',
    state: 'SP',
    category: 'Livros & Editoras',
    subCategory: 'Sistemas Didáticos & Literatura BNCC',
    plan: 'institucional',
    registrationStatus: 'aprovado',
    publicationStatus: 'publicado',
    financialStatus: 'adimplente',
    monthlyFee: 850.00,
    rating: 4.9,
    reviewCount: 1250,
    officialPartnerSeal: true,
    sealText: 'Parceiro Editorial Homologado',
    logo: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
    description: 'Soluções educacionais completas alinhadas à BNCC para Educação Infantil, Fundamental e Médio.',
    price: 'Condições Especiais para Escolas',
    highlights: [
      'Coleções Didáticas Alinhadas à BNCC',
      'Livros de Literatura e Leitura de Deleite',
      'Plataforma e Catálogos Digitais Interativos'
    ],
    tags: ['Editora', 'BNCC', 'Didáticos', 'Literatura'],
    primaryButtonText: 'Solicitar Amostras para Escola',
    primaryButtonLink: 'https://ftd.com.br',
    visibility: {
      portalFamilia: true,
      portalProfessor: true,
      portalGestor: true,
      portalEstudante: false,
      highlightPosition: 'banner_principal'
    },
    views: 15300,
    clicks: 3410,
    leadsGenerated: 920,
    conversions: 145,
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-09-10T16:00:00Z'
  },
  {
    id: 'dr-carlos-psico-1',
    entityType: 'pessoa_fisica',
    name: 'Dr. Carlos Eduardo Meireles',
    tradeName: 'Consultório de Neuropsicologia & TDAH',
    cpfCnpj: '289.441.908-12',
    professionalReg: 'CRP 06/98231',
    email: 'carlos.neuropsico@gmail.com',
    whatsapp: '5511977771122',
    phone: '(11) 97777-1122',
    website: 'https://drcarlosneuropsico.com.br',
    city: 'Campinas',
    state: 'SP',
    category: 'Saúde & Psicopedagogia',
    subCategory: 'Avaliação Neuropsicológica & TDAH/TEA',
    plan: 'ouro',
    registrationStatus: 'aprovado',
    publicationStatus: 'publicado',
    financialStatus: 'adimplente',
    monthlyFee: 249.00,
    rating: 4.9,
    reviewCount: 310,
    officialPartnerSeal: true,
    logo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    description: 'Especialista em diagnóstico diferencial de TDAH, Dislexia e Altas Habilidades/Superdotação em crianças e adolescentes.',
    price: 'R$ 220,00 / consulta',
    originalPrice: 'R$ 350,00',
    discountBadge: '15% de desconto para alunos Classium',
    highlights: [
      'Laudos Clínicos e Pareceres Escolares',
      'Orientação Parental e aos Professores',
      'Atendimento Presencial e Teleconsulta'
    ],
    tags: ['Neuropsicologia', 'TDAH', 'TEA', 'Laudos'],
    primaryButtonText: 'Agendar Avaliação',
    primaryButtonLink: 'https://drcarlosneuropsico.com.br',
    visibility: {
      portalFamilia: true,
      portalProfessor: true,
      portalGestor: false,
      portalEstudante: false,
      highlightPosition: 'normal'
    },
    views: 4500,
    clicks: 980,
    leadsGenerated: 340,
    conversions: 88,
    createdAt: '2026-03-01T14:00:00Z',
    updatedAt: '2026-09-12T10:00:00Z'
  },
  {
    id: 'uniformes-escolares-sul',
    entityType: 'apoio_infra',
    name: 'Sul Uniformes & Bordados Escolares Ltda',
    tradeName: 'Sul Uniformes',
    cpfCnpj: '18.392.100/0001-44',
    email: 'contato@suluniformes.com.br',
    whatsapp: '5541999998888',
    website: 'https://suluniformes.com.br',
    city: 'Curitiba',
    state: 'PR',
    category: 'Infraestrutura & Apoio',
    subCategory: 'Confecção de Uniformes & Agasalhos Escolares',
    plan: 'prata',
    registrationStatus: 'em_analise',
    publicationStatus: 'rascunho',
    financialStatus: 'pendente',
    monthlyFee: 99.00,
    rating: 4.7,
    reviewCount: 45,
    officialPartnerSeal: false,
    logo: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=150&auto=format&fit=crop&q=80',
    description: 'Fornecedor parceiro de uniformes em tecido anti-pilling com pronta-entrega para o ano letivo.',
    highlights: [
      'Tecido Dry-Fit e Helanca Escolar',
      'Bordados Computadorizados de Alta Definição',
      'Atendimento a Redes de Ensino e Pais'
    ],
    tags: ['Uniformes', 'Vestuário', 'Confecção'],
    primaryButtonText: 'Pedir Orçamento',
    primaryButtonLink: 'https://suluniformes.com.br',
    visibility: {
      portalFamilia: true,
      portalProfessor: false,
      portalGestor: true,
      portalEstudante: false,
      highlightPosition: 'normal'
    },
    views: 890,
    clicks: 140,
    leadsGenerated: 35,
    conversions: 12,
    createdAt: '2026-09-14T09:00:00Z',
    updatedAt: '2026-09-17T11:00:00Z',
    moderationNotes: 'Aguardando envio do contrato social atualizado e fotos do mostruário.'
  },
  {
    id: 'dra-juliana-fono-1',
    entityType: 'pessoa_fisica',
    name: 'Dra. Juliana Bastos Fontana',
    tradeName: 'Fonoaudiologia Educacional & Fala',
    cpfCnpj: '394.021.589-70',
    professionalReg: 'CRFa 2-19842',
    email: 'juliana.fono@gmail.com',
    whatsapp: '5511984445566',
    website: 'https://fonojuliana.com.br',
    city: 'São Paulo',
    state: 'SP',
    category: 'Saúde & Psicopedagogia',
    subCategory: 'Terapia de Linguagem, Fala e Deglutição',
    plan: 'prata',
    registrationStatus: 'pendente_analise',
    publicationStatus: 'rascunho',
    financialStatus: 'pendente',
    monthlyFee: 99.00,
    rating: 5.0,
    reviewCount: 18,
    officialPartnerSeal: false,
    logo: 'https://images.unsplash.com/photo-1594824813512-88f5539bc7a3?w=150&auto=format&fit=crop&q=80',
    description: 'Atendimento clínico especializado em distúrbios dos sons da fala, atraso de linguagem e processamento auditivo central.',
    price: 'R$ 180,00 / sessão',
    highlights: [
      'Triagem Auditiva e Vocal em Escolas',
      'Intervenção Precoce em Atraso de Fala',
      'Relatórios Clínicos Integrados à Equipe Pedagógica'
    ],
    tags: ['Fonoaudiologia', 'Fala', 'Linguagem', 'Audiologia'],
    primaryButtonText: 'Falar com a Fono',
    primaryButtonLink: 'https://fonojuliana.com.br',
    visibility: {
      portalFamilia: true,
      portalProfessor: true,
      portalGestor: false,
      portalEstudante: false,
      highlightPosition: 'normal'
    },
    views: 420,
    clicks: 65,
    leadsGenerated: 22,
    conversions: 8,
    createdAt: '2026-09-18T10:30:00Z',
    updatedAt: '2026-09-18T10:30:00Z',
    moderationNotes: 'Novo cadastro aguardando validação do registro no Conselho Regional de Fonoaudiologia.'
  }
];

export const INITIAL_INVOICES: InvoiceItem[] = [
  {
    id: 'inv-2026-09-01',
    partnerId: 'mentis-therapy-1',
    partnerName: 'Mentis Therapy Soluções em Saúde Ltda',
    invoiceNumber: 'FAT-2026-0941',
    amount: 499.00,
    dueDate: '2026-09-25',
    paymentDate: '2026-09-18',
    method: 'pix',
    status: 'pago',
    pixCode: '00020126580014br.gov.bcb.pix0136classium-pix-mentis@banco.com.br5204000053039865405499.005802BR5916CLASSIUM_GESTAO6009SAO_PAULO62070503***6304E8A1',
    notes: 'Liquidação automática via Webhook Pix Banco Central.'
  },
  {
    id: 'inv-2026-09-02',
    partnerId: 'uniasselvi-1',
    partnerName: 'Sociedade Educacional Leonardo da Vinci S.A.',
    invoiceNumber: 'FAT-2026-0942',
    amount: 499.00,
    dueDate: '2026-09-20',
    paymentDate: '2026-09-15',
    method: 'cartao_credito',
    status: 'pago',
    notes: 'Recorrência mensal autorizada no Cartão Corporativo.'
  },
  {
    id: 'inv-2026-09-03',
    partnerId: 'ftd-educacao-1',
    partnerName: 'Editora FTD S.A.',
    invoiceNumber: 'FAT-2026-0943',
    amount: 850.00,
    dueDate: '2026-09-30',
    method: 'boleto',
    status: 'pendente',
    notes: 'Boleto bancário emitido com vencimento para o final do mês.'
  },
  {
    id: 'inv-2026-09-04',
    partnerId: 'dr-carlos-psico-1',
    partnerName: 'Dr. Carlos Eduardo Meireles',
    invoiceNumber: 'FAT-2026-0944',
    amount: 249.00,
    dueDate: '2026-09-10',
    method: 'pix',
    status: 'atrasado',
    pixCode: '00020126580014br.gov.bcb.pix0136classium-pix-carlos@banco.com.br5204000053039865405249.005802BR5916CLASSIUM_GESTAO6009SAO_PAULO62070503***630499C4',
    notes: 'Fatura vencida há 9 dias. Notificação enviada via WhatsApp e E-mail.'
  }
];

export const INITIAL_DOCUMENTS: CuratedDocument[] = [
  {
    id: 'doc-1',
    partnerId: 'mentis-therapy-1',
    docType: 'cnpj',
    title: 'Comprovante de Inscrição e Situação Cadastral CNPJ',
    fileUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=800&auto=format&fit=crop&q=80',
    fileName: 'cartao_cnpj_mentis.pdf',
    fileSize: '450 KB',
    uploadedAt: '2026-01-10T10:15:00Z',
    status: 'aprovado',
    reviewedBy: 'Gestão Classium',
    reviewedAt: '2026-01-10T14:00:00Z',
    notes: 'CNPJ regular e ativo na Receita Federal.'
  },
  {
    id: 'doc-2',
    partnerId: 'dr-carlos-psico-1',
    docType: 'crp_crm',
    title: 'Certidão de Regularidade Profissional CRP 06',
    fileUrl: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=800&auto=format&fit=crop&q=80',
    fileName: 'certidao_crp_carlos_meireles.pdf',
    fileSize: '1.2 MB',
    uploadedAt: '2026-03-01T14:30:00Z',
    status: 'aprovado',
    reviewedBy: 'Gestão Classium',
    reviewedAt: '2026-03-02T09:00:00Z',
    notes: 'Registro verificado no portal oficial do Conselho Regional de Psicologia.'
  },
  {
    id: 'doc-3',
    partnerId: 'dra-juliana-fono-1',
    docType: 'crp_crm',
    title: 'Carteira Profissional CRFa 2ª Região',
    fileUrl: 'https://images.unsplash.com/photo-1554415707-9e4c09d4882b?w=800&auto=format&fit=crop&q=80',
    fileName: 'crfa_juliana_bastos.pdf',
    fileSize: '890 KB',
    uploadedAt: '2026-09-18T10:35:00Z',
    status: 'pendente',
    notes: 'Aguardando validação no site do Conselho de Fonoaudiologia.'
  }
];

export const INITIAL_PLAN_HISTORY: PlanChangeHistoryItem[] = [
  {
    id: 'hist-1',
    partnerId: 'mentis-therapy-1',
    partnerName: 'Mentis Therapy',
    previousPlan: 'Ouro',
    newPlan: 'Diamante VIP',
    changedBy: 'Admin Master',
    changedAt: '2026-06-01T12:00:00Z',
    reason: 'Upgrade anual com inclusão de banner rotativo em todos os portais.'
  },
  {
    id: 'hist-2',
    partnerId: 'dr-carlos-psico-1',
    partnerName: 'Dr. Carlos Eduardo Meireles',
    previousPlan: 'Prata',
    newPlan: 'Ouro',
    changedBy: 'Gestão Comercial',
    changedAt: '2026-07-15T15:30:00Z',
    reason: 'Inclusão de selo verificado e destaque na busca da Família.'
  }
];

export const AdminPartnerService = {
  // Load Partners (Unifies base partners with new partners created from Portal Parceiro)
  loadPartners(): PartnerAdvertiser[] {
    let resultList = [...INITIAL_ADMIN_PARTNERS];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PARTNERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          resultList = parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading admin partners from localStorage:', e);
    }

    return resultList;
  },

  // Save Partners
  async savePartners(partners: PartnerAdvertiser[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.PARTNERS, JSON.stringify(partners));
    } catch (e) {
      console.warn('Error saving admin partners to localStorage:', e);
    }

    },  

  // Load Invoices
  loadInvoices(): InvoiceItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading invoices from localStorage:', e);
    }
    return INITIAL_INVOICES;
  },

  saveInvoices(invoices: InvoiceItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    } catch (e) {
      console.warn('Error saving invoices to localStorage:', e);
    }
  },

  // Load Documents
  loadDocuments(): CuratedDocument[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading documents from localStorage:', e);
    }
    return INITIAL_DOCUMENTS;
  },

  saveDocuments(docs: CuratedDocument[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
    } catch (e) {
      console.warn('Error saving documents to localStorage:', e);
    }
  },

  // Load Plans
  loadPlans(): PlanConfig[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PLANS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading plans from localStorage:', e);
    }
    return DEFAULT_PLANS;
  },

  savePlans(plans: PlanConfig[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
    } catch (e) {
      console.warn('Error saving plans to localStorage:', e);
    }
  },

  // Load Plan History
  loadPlanHistory(): PlanChangeHistoryItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PLAN_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading plan history from localStorage:', e);
    }
    return INITIAL_PLAN_HISTORY;
  },

  savePlanHistory(history: PlanChangeHistoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAN_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('Error saving plan history to localStorage:', e);
    }
  }
};
