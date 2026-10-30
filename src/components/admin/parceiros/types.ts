export type EntityType = 'pessoa_fisica' | 'pessoa_juridica' | 'apoio_infra';

export type PartnerRegistrationStatus = 
  | 'pendente_analise' 
  | 'em_analise' 
  | 'aprovado' 
  | 'rejeitado' 
  | 'suspenso' 
  | 'cancelado';

export type PublicationStatus = 
  | 'publicado' 
  | 'despublicado' 
  | 'bloqueado' 
  | 'rascunho';

export type FinancialStatus = 
  | 'adimplente' 
  | 'pendente' 
  | 'inadimplente' 
  | 'isento' 
  | 'cancelado';

export type PlanType = 'gratuito' | 'prata' | 'ouro' | 'diamante' | 'institucional';

export interface PlanConfig {
  id: PlanType;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  badgeColor: string;
  maxPhotos: number;
  maxVideos: number;
  maxBanners: number;
  officialSeal: boolean;
  whatsappDirect: boolean;
  aiIntegration: boolean;
  detailedReports: boolean;
  priorityScore: number;
  activeCount?: number;
}

export interface CuratedDocument {
  id: string;
  partnerId: string;
  docType: 'cnpj' | 'crp_crm' | 'alvara' | 'certidao' | 'contrato' | 'identidade' | 'outro';
  title: string;
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  uploadedAt: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  partnerId: string;
  partnerName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  method: 'pix' | 'cartao_credito' | 'boleto' | 'transferencia' | 'isencao';
  status: 'pago' | 'pendente' | 'atrasado' | 'cancelado' | 'estornado';
  pixCode?: string;
  pixQrCodeUrl?: string;
  pdfReceiptUrl?: string;
  notes?: string;
}

export interface PlanChangeHistoryItem {
  id: string;
  partnerId: string;
  partnerName: string;
  previousPlan: string;
  newPlan: string;
  changedBy: string;
  changedAt: string;
  reason: string;
}

export interface PortalVisibility {
  portalFamilia: boolean;
  portalProfessor: boolean;
  portalGestor: boolean;
  portalEstudante: boolean;
  highlightPosition: 'normal' | 'destaque_topo' | 'banner_principal' | 'recomendado_ia';
}

export interface PartnerAdvertiser {
  id: string;
  entityType: EntityType;
  name: string; // Nome ou Razão Social
  tradeName?: string; // Nome Fantasia
  cpfCnpj: string;
  professionalReg?: string; // CRP, CRM, MEC, CRFa, OAB
  email: string;
  whatsapp: string;
  phone?: string;
  website: string;
  city: string;
  state: string;
  category: string;
  subCategory: string;
  plan: PlanType;
  planCustomName?: string;
  registrationStatus: PartnerRegistrationStatus;
  publicationStatus: PublicationStatus;
  financialStatus: FinancialStatus;
  monthlyFee?: number;
  rating?: number;
  reviewCount?: number;
  officialPartnerSeal: boolean;
  sealText?: string;
  vipExclusive?: boolean;
  isMentisTherapy?: boolean;
  
  // Media & Visuals
  logo: string;
  banner?: string;
  catalogPdfUrl?: string;
  colorGradient?: string;
  
  // Text content & CTAs
  description: string;
  promoText?: string;
  officialMessage?: string;
  price?: string;
  originalPrice?: string;
  discountBadge?: string;
  highlights: string[];
  tags?: string[];
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;

  // Visibility & Portal rules
  visibility: PortalVisibility;

  // Metrics
  views?: number;
  clicks?: number;
  leadsGenerated?: number;
  conversions?: number;
  
  // Audit & Dates
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  moderationNotes?: string;
  rejectionReason?: string;
  
  // Invoices & Documents
  invoices?: InvoiceItem[];
  documents?: CuratedDocument[];
}
