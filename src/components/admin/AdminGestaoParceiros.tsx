import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRightLeft,
  BadgeCheck,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Globe,
  History,
  Layers,
  LayoutGrid,
  MapPin,
  MousePointerClick,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  TrendingUp,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';
import {
  PartnerAdvertiser,
  PlanConfig,
  InvoiceItem,
  CuratedDocument,
  PlanChangeHistoryItem,
  PlanType,
  EntityType,
  PartnerRegistrationStatus,
  PublicationStatus,
  FinancialStatus,
} from './parceiros/types';
import { AdminPartnerService, DEFAULT_PLANS } from '../../services/adminPartnerService';
import {
  PartnerService,
  CanonicalPartner,
  CreatePartnerPayload,
  UpdatePartnerPayload,
  UpdatePartnerApprovalPayload,
} from '../../services/partnerService';
import { maskCPF, maskCNPJ } from '../../utils/masks';
import {
  Alert,
  Badge,
  BrandHero,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  HeroButton,
  HeroEyebrow,
  HeroStats,
  HeroText,
  HeroTitle,
  IconTile,
  Modal,
  Page,
  PillNav,
  Skeleton,
  StatCard,
  TableShell,
  Toast,
  Toggle,
  cx,
  inputCls,
  tdCls,
  thCls,
} from '../ui/kit';
import { CountUp } from '../landing/effects';

type TabKey = 'overview' | 'directory' | 'moderation' | 'plans' | 'billing' | 'portals' | 'audit';
type Tone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger';

/* ------------------------------------------------------------------ */
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

const brl = (v?: number | null) =>
  typeof v === 'number' && !Number.isNaN(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const num = (v?: number | null) => (typeof v === 'number' ? v.toLocaleString('pt-BR') : '—');

const date = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

const ENTITY_LABEL: Record<string, string> = {
  pessoa_juridica: 'Empresa ou instituição',
  pessoa_fisica: 'Profissional autônomo',
  apoio_infra: 'Apoio e infraestrutura',
};

const REG_STATUS: Record<string, { label: string; tone: Tone; icon: LucideIcon }> = {
  aprovado: { label: 'Aprovado', tone: 'success', icon: CheckCircle2 },
  pendente_analise: { label: 'Aguardando análise', tone: 'warning', icon: Clock },
  em_analise: { label: 'Em análise', tone: 'accent', icon: Search },
  rejeitado: { label: 'Recusado', tone: 'danger', icon: XCircle },
  suspenso: { label: 'Suspenso', tone: 'neutral', icon: Ban },
  cancelado: { label: 'Cancelado', tone: 'neutral', icon: Ban },
};

const PUB_STATUS: Record<string, { label: string; tone: Tone }> = {
  publicado: { label: 'No ar', tone: 'success' },
  bloqueado: { label: 'Bloqueado', tone: 'danger' },
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  despublicado: { label: 'Fora do ar', tone: 'neutral' },
};

const INVOICE_STATUS: Record<string, { label: string; tone: Tone }> = {
  pago: { label: 'Paga', tone: 'success' },
  pendente: { label: 'Em aberto', tone: 'warning' },
  atrasado: { label: 'Atrasada', tone: 'danger' },
  cancelado: { label: 'Cancelada', tone: 'neutral' },
};

const DOC_STATUS: Record<string, { label: string; tone: Tone }> = {
  aprovado: { label: 'Aprovado', tone: 'success' },
  pendente: { label: 'Pendente', tone: 'warning' },
  rejeitado: { label: 'Recusado', tone: 'danger' },
};

const planName = (plans: PlanConfig[], id?: string) =>
  plans.find((p) => p.id === id)?.name ?? (id ? id.charAt(0).toUpperCase() + id.slice(1) : '—');

const isPendingReg = (p: PartnerAdvertiser) => p.registrationStatus === 'pendente_analise' || p.registrationStatus === 'em_analise';

/** Esconde parte do CPF/CNPJ na lista */
const maskDoc = (doc?: string) => {
  if (!doc) return 'Documento não informado';
  return doc.length > 14 ? `${doc.slice(0, 6)}••.•••/••••-••` : `${doc.slice(0, 3)}.•••.•••-••`;
};

/* ------------------------------------------------------------------ */
/* Adaptador: public.partners -> PartnerAdvertiser                     */
/* ------------------------------------------------------------------ */

function mapCanonicalToPartnerAdvertiser(cp: CanonicalPartner): PartnerAdvertiser {
  const meta = cp.metadata || {};

  let regStatus: PartnerRegistrationStatus = 'pendente_analise';
  if (cp.approval_status === 'approved') regStatus = 'aprovado';
  else if (cp.approval_status === 'rejected') regStatus = 'rejeitado';
  else if (cp.approval_status === 'in_review') regStatus = 'em_analise';
  else if (cp.status === 'suspended') regStatus = 'suspenso';
  else if (cp.status === 'cancelled') regStatus = 'cancelado';

  let pubStatus: PublicationStatus = 'despublicado';
  if (cp.status === 'suspended') pubStatus = 'bloqueado';
  else if (cp.status === 'draft') pubStatus = 'rascunho';
  else if (cp.is_active) pubStatus = 'publicado';

  let entityType: EntityType = 'pessoa_juridica';
  if (meta.entityType === 'pessoa_fisica' || meta.entityType === 'pessoa_juridica' || meta.entityType === 'apoio_infra') {
    entityType = meta.entityType;
  } else if (cp.document_type === 'CPF') {
    entityType = 'pessoa_fisica';
  }

  const PLAN_IDS = ['gratuito', 'prata', 'ouro', 'diamante', 'institucional'];
  let planType: PlanType = 'ouro';
  if (cp.plan_id && PLAN_IDS.includes(cp.plan_id)) planType = cp.plan_id as PlanType;
  else if (meta.plan && PLAN_IDS.includes(meta.plan)) planType = meta.plan as PlanType;

  let finStatus: FinancialStatus = 'adimplente';
  if (meta.financialStatus && ['adimplente', 'pendente', 'inadimplente', 'isento', 'cancelado'].includes(meta.financialStatus)) {
    finStatus = meta.financialStatus as FinancialStatus;
  }

  return {
    id: cp.id,
    entityType,
    name: cp.legal_name || cp.partner_name,
    tradeName: cp.partner_name || cp.legal_name || '',
    cpfCnpj: cp.document_number || '',
    professionalReg: meta.professionalReg || undefined,
    email: cp.email || '',
    whatsapp: cp.phone || meta.whatsapp || '',
    phone: cp.phone || meta.phone || undefined,
    website: cp.website || '',
    // sem valores inventados: o que não foi informado fica vazio
    city: meta.city || '',
    state: meta.state || '',
    category: cp.category || meta.category || 'Geral',
    subCategory: meta.subCategory || 'Parceiro',
    plan: planType,
    planCustomName: meta.planCustomName,
    registrationStatus: regStatus,
    publicationStatus: pubStatus,
    financialStatus: finStatus,
    monthlyFee: typeof meta.monthlyFee === 'number' ? meta.monthlyFee : undefined,
    rating: typeof meta.rating === 'number' ? meta.rating : undefined,
    reviewCount: typeof meta.reviewCount === 'number' ? meta.reviewCount : undefined,
    officialPartnerSeal: Boolean(meta.officialPartnerSeal ?? cp.approval_status === 'approved'),
    sealText: meta.sealText || (cp.approval_status === 'approved' ? 'Parceiro aprovado' : undefined),
    vipExclusive: Boolean(meta.vipExclusive),
    isMentisTherapy: Boolean(meta.isMentisTherapy),
    logo: meta.logo || '',
    banner: meta.banner,
    catalogPdfUrl: meta.catalogPdfUrl,
    colorGradient: meta.colorGradient,
    description: cp.description || meta.description || '',
    promoText: meta.promoText,
    officialMessage: meta.officialMessage,
    price: meta.price,
    originalPrice: meta.originalPrice,
    discountBadge: meta.discountBadge,
    highlights: Array.isArray(meta.highlights) ? meta.highlights : [],
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    primaryButtonText: meta.primaryButtonText,
    primaryButtonLink: meta.primaryButtonLink,
    secondaryButtonText: meta.secondaryButtonText,
    secondaryButtonLink: meta.secondaryButtonLink,
    visibility: meta.visibility || {
      portalFamilia: true,
      portalProfessor: true,
      portalGestor: false,
      portalEstudante: false,
      highlightPosition: 'normal',
    },
    views: typeof meta.views === 'number' ? meta.views : undefined,
    clicks: typeof meta.clicks === 'number' ? meta.clicks : undefined,
    leadsGenerated: typeof meta.leadsGenerated === 'number' ? meta.leadsGenerated : undefined,
    conversions: typeof meta.conversions === 'number' ? meta.conversions : undefined,
    createdAt: cp.created_at,
    updatedAt: cp.updated_at,
    lastLogin: meta.lastLogin,
    moderationNotes: meta.moderationNotes,
    rejectionReason: meta.rejectionReason,
    invoices: Array.isArray(meta.invoices) ? meta.invoices : undefined,
    documents: Array.isArray(meta.documents) ? meta.documents : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function AdminGestaoParceiros() {
  const { role, addAuditLog } = usePlatform();

  // Dados
  const [partners, setPartners] = useState<PartnerAdvertiser[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState<boolean>(true);
  const [partnersLoadError, setPartnersLoadError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [plans] = useState<PlanConfig[]>(() => AdminPartnerService.loadPlans());
  const [invoices, setInvoices] = useState<InvoiceItem[]>(() => AdminPartnerService.loadInvoices());
  const [documents] = useState<CuratedDocument[]>(() => AdminPartnerService.loadDocuments());
  const [planHistory, setPlanHistory] = useState<PlanChangeHistoryItem[]>(() => AdminPartnerService.loadPlanHistory());

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const loadCanonicalPartners = async (showLoadingState = true) => {
    try {
      if (showLoadingState) setIsLoadingPartners(true);
      setPartnersLoadError(null);
      const canonicalList = await PartnerService.listPartners();
      setPartners(canonicalList.map(mapCanonicalToPartnerAdvertiser));
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error('[AdminGestaoParceiros] Erro ao carregar parceiros:', err);
      setPartnersLoadError('Não foi possível carregar os parceiros agora. Verifique a conexão e tente de novo.');
    } finally {
      if (showLoadingState) setIsLoadingPartners(false);
    }
  };

  useEffect(() => {
    loadCanonicalPartners(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtros do diretório
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('todos');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('todos');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('todos');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');
  const [selectedFinancialFilter, setSelectedFinancialFilter] = useState<string>('todos');

  // Janelas
  const [selectedPartnerForDetail, setSelectedPartnerForDetail] = useState<PartnerAdvertiser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerAdvertiser | null>(null);
  const [isSubmittingPartner, setIsSubmittingPartner] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [isPlanChangeModalOpen, setIsPlanChangeModalOpen] = useState(false);
  const [planChangePartner, setPlanChangePartner] = useState<PartnerAdvertiser | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<PlanType>('ouro');
  const [planChangeReason, setPlanChangeReason] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingPartner, setRejectingPartner] = useState<PartnerAdvertiser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deletingPartner, setDeletingPartner] = useState<PartnerAdvertiser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Aviso
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' | 'info' } | null>(null);
  const showToast = (message: string, tone: 'success' | 'danger' | 'info' = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast((t) => (t?.message === message ? null : t)), 4500);
  };

  const updateInvoicesState = (updated: InvoiceItem[]) => {
    setInvoices(updated);
    AdminPartnerService.saveInvoices(updated);
  };

  const updatePlanHistoryState = (updated: PlanChangeHistoryItem[]) => {
    setPlanHistory(updated);
    AdminPartnerService.savePlanHistory(updated);
  };

  /* ---------------- Indicadores ---------------- */

  const metrics = useMemo(() => {
    const total = partners.length;
    const active = partners.filter((p) => p.registrationStatus === 'aprovado' && p.publicationStatus === 'publicado').length;
    const pendingModeration = partners.filter(isPendingReg).length;
    const defaultRateCount = partners.filter((p) => p.financialStatus === 'inadimplente').length;

    const mrr = partners.reduce(
      (acc, p) => (p.registrationStatus === 'aprovado' && p.publicationStatus !== 'bloqueado' ? acc + (p.monthlyFee || 0) : acc),
      0,
    );

    const totalViews = partners.reduce((acc, p) => acc + (p.views || 0), 0);
    const totalClicks = partners.reduce((acc, p) => acc + (p.clicks || 0), 0);
    const totalLeads = partners.reduce((acc, p) => acc + (p.leadsGenerated || 0), 0);
    const totalConversions = partners.reduce((acc, p) => acc + (p.conversions || 0), 0);
    const ctrAvg = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    const totalPendingInvoicesAmount = invoices
      .filter((i) => i.status === 'pendente' || i.status === 'atrasado')
      .reduce((acc, i) => acc + i.amount, 0);

    return {
      total,
      active,
      pendingModeration,
      defaultRateCount,
      mrr,
      totalViews,
      totalClicks,
      totalLeads,
      totalConversions,
      ctrAvg,
      totalPendingInvoicesAmount,
    };
  }, [partners, invoices]);

  // Carteira por plano (dados reais da lista)
  const planBreakdown = useMemo(() => {
    const rows = plans.map((pl) => {
      const list = partners.filter((p) => p.plan === pl.id);
      const revenue = list
        .filter((p) => p.registrationStatus === 'aprovado' && p.publicationStatus !== 'bloqueado')
        .reduce((acc, p) => acc + (p.monthlyFee || 0), 0);
      return { id: pl.id, name: pl.name, count: list.length, revenue };
    });
    const total = rows.reduce((a, r) => a + r.count, 0);
    return { rows, total };
  }, [plans, partners]);

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    partners.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [partners]);

  const recentPartners = useMemo(
    () => [...partners].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [partners],
  );

  const filteredPartners = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return partners.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.tradeName && p.tradeName.toLowerCase().includes(q)) ||
        p.cpfCnpj.includes(searchTerm.trim()) ||
        p.email.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q);
      const matchEntity = selectedEntityFilter === 'todos' || p.entityType === selectedEntityFilter;
      const matchCategory = selectedCategoryFilter === 'todos' || p.category === selectedCategoryFilter;
      const matchPlan = selectedPlanFilter === 'todos' || p.plan === selectedPlanFilter;
      const matchStatus = selectedStatusFilter === 'todos' || p.registrationStatus === selectedStatusFilter;
      const matchFinancial = selectedFinancialFilter === 'todos' || p.financialStatus === selectedFinancialFilter;
      return matchSearch && matchEntity && matchCategory && matchPlan && matchStatus && matchFinancial;
    });
  }, [partners, searchTerm, selectedEntityFilter, selectedCategoryFilter, selectedPlanFilter, selectedStatusFilter, selectedFinancialFilter]);

  const hasActiveFilters =
    searchTerm !== '' ||
    [selectedEntityFilter, selectedCategoryFilter, selectedPlanFilter, selectedStatusFilter, selectedFinancialFilter].some((f) => f !== 'todos');

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedEntityFilter('todos');
    setSelectedCategoryFilter('todos');
    setSelectedPlanFilter('todos');
    setSelectedStatusFilter('todos');
    setSelectedFinancialFilter('todos');
  };

  const uniqueCategories = useMemo(() => Array.from(new Set(partners.map((p) => p.category))), [partners]);

  /* ---------------- Ações ---------------- */

  const handleApprovePartner = async (partner: PartnerAdvertiser) => {
    setBusyId(partner.id);
    try {
      const payload: UpdatePartnerApprovalPayload = { approval_status: 'approved', status: 'active', is_active: true };
      await PartnerService.updatePartnerApproval(partner.id, payload);
      addAuditLog('APPROVE_PARTNER', 'Gestão de Parceiros', `Parceiro: ${partner.name}`, `Cadastro aprovado e publicado pelo perfil ${role}.`);
      showToast(`${partner.tradeName || partner.name} foi aprovado e já aparece nos portais.`);
      await loadCanonicalPartners(true);
    } catch (err: any) {
      console.error('[AdminGestaoParceiros] Erro ao aprovar parceiro:', err);
      showToast(`Não foi possível aprovar: ${err?.message || 'tente novamente.'}`, 'danger');
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenRejectModal = (partner: PartnerAdvertiser) => {
    setRejectingPartner(partner);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectingPartner) return;
    setBusyId(rejectingPartner.id);
    try {
      const payload: UpdatePartnerApprovalPayload = { approval_status: 'rejected', status: 'inactive', is_active: false };
      await PartnerService.updatePartnerApproval(rejectingPartner.id, payload);
      addAuditLog(
        'REJECT_PARTNER',
        'Gestão de Parceiros',
        `Parceiro: ${rejectingPartner.name}`,
        `Cadastro recusado. Motivo: ${rejectionReason || 'Não informado'}.`,
      );
      setIsRejectModalOpen(false);
      showToast(`O cadastro de ${rejectingPartner.tradeName || rejectingPartner.name} foi recusado.`, 'info');
      setRejectingPartner(null);
      await loadCanonicalPartners(true);
    } catch (err: any) {
      console.error('[AdminGestaoParceiros] Erro ao recusar parceiro:', err);
      showToast(`Não foi possível recusar: ${err?.message || 'tente novamente.'}`, 'danger');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleBlockPartner = async (partner: PartnerAdvertiser) => {
    const willBlock = partner.publicationStatus !== 'bloqueado';
    setBusyId(partner.id);
    try {
      const payload: UpdatePartnerApprovalPayload = willBlock
        ? { status: 'suspended', is_active: false }
        : { approval_status: 'approved', status: 'active', is_active: true };
      await PartnerService.updatePartnerApproval(partner.id, payload);
      addAuditLog(
        willBlock ? 'BLOCK_PARTNER' : 'UNBLOCK_PARTNER',
        'Gestão de Parceiros',
        `Parceiro: ${partner.name}`,
        `Status alterado para ${willBlock ? 'BLOQUEADO' : 'LIBERADO'} pela administração.`,
      );
      showToast(willBlock ? `${partner.tradeName || partner.name} foi bloqueado.` : `${partner.tradeName || partner.name} foi liberado.`, 'info');
      await loadCanonicalPartners(true);
    } catch (err: any) {
      console.error('[AdminGestaoParceiros] Erro ao alterar status do parceiro:', err);
      showToast(`Não foi possível alterar o status: ${err?.message || 'tente novamente.'}`, 'danger');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPartner) return;
    const { id, name } = deletingPartner;
    setBusyId(id);
    try {
      await PartnerService.deletePartner(id);
      addAuditLog('DELETE_PARTNER', 'Gestão de Parceiros', `Parceiro: ${name}`, `Cadastro excluído (ID: ${id}).`);
      showToast(`${name} foi excluído.`, 'info');
      setDeletingPartner(null);
      await loadCanonicalPartners(true);
    } catch (err: any) {
      console.error('[AdminGestaoParceiros] Erro ao excluir parceiro:', err);
      showToast(`Não foi possível excluir: ${err?.message || 'tente novamente.'}`, 'danger');
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenPlanChange = (partner: PartnerAdvertiser) => {
    setPlanChangePartner(partner);
    setSelectedNewPlan(partner.plan);
    setPlanChangeReason('');
    setIsPlanChangeModalOpen(true);
  };

  const handleConfirmPlanChange = async () => {
    if (!planChangePartner) return;

    const isUUID = (val?: string): boolean =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    if (!isUUID(planChangePartner.id)) {
      showToast('Este parceiro ainda não foi salvo, então o plano não pode ser alterado.', 'danger');
      return;
    }

    setIsSavingPlan(true);
    try {
      const targetPlanConfig = plans.find((pl) => pl.id === selectedNewPlan) || DEFAULT_PLANS[0];
      const prevPlanName = planChangePartner.plan.toUpperCase();
      const nextPlanName = selectedNewPlan.toUpperCase();

      await PartnerService.updatePartner(planChangePartner.id, { plan_id: selectedNewPlan });

      const newHistoryItem: PlanChangeHistoryItem = {
        id: `hist-${Date.now()}`,
        partnerId: planChangePartner.id,
        partnerName: planChangePartner.name,
        previousPlan: prevPlanName,
        newPlan: nextPlanName,
        changedBy: `Administrador (${role})`,
        changedAt: new Date().toISOString(),
        reason: planChangeReason || 'Ajuste de plano solicitado pelo anunciante ou pela gestão.',
      };
      updatePlanHistoryState([newHistoryItem, ...planHistory]);

      addAuditLog(
        'CHANGE_PARTNER_PLAN',
        'Gestão de Parceiros',
        `Parceiro: ${planChangePartner.name}`,
        `Plano alterado de ${prevPlanName} para ${nextPlanName}. Mensalidade ajustada para R$ ${targetPlanConfig.monthlyPrice.toFixed(2)}.`,
      );

      await loadCanonicalPartners(true);
      setIsPlanChangeModalOpen(false);
      showToast(`Plano de ${planChangePartner.tradeName || planChangePartner.name} alterado para ${planName(plans, selectedNewPlan)}.`);
      setPlanChangePartner(null);
    } catch (err: any) {
      console.error('[AdminGestaoParceiros] Erro ao alterar plano do parceiro:', err);
      showToast(`Não foi possível alterar o plano: ${err?.message || 'tente novamente.'}`, 'danger');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    setFormErrorMessage(null);

    const isNew = !partners.some((p) => p.id === editingPartner.id);
    const cleanDoc = editingPartner.cpfCnpj ? editingPartner.cpfCnpj.replace(/\D/g, '') : '';
    const docType =
      cleanDoc.length === 11 ? 'CPF' : cleanDoc.length === 14 ? 'CNPJ' : editingPartner.entityType === 'pessoa_fisica' ? 'CPF' : 'CNPJ';

    setIsSubmittingPartner(true);
    try {
      if (isNew) {
        const payload: CreatePartnerPayload = {
          partner_name: editingPartner.tradeName?.trim() || editingPartner.name.trim(),
          legal_name: editingPartner.name.trim(),
          document_type: docType,
          document_number: editingPartner.cpfCnpj.trim() || null,
          email: editingPartner.email?.trim() || null,
          phone: editingPartner.whatsapp?.trim() || editingPartner.phone?.trim() || null,
          website: editingPartner.website?.trim() || null,
          description: editingPartner.description?.trim() || null,
          category: editingPartner.category || 'Geral',
          plan_id: editingPartner.plan || 'ouro',
          metadata: {
            entityType: editingPartner.entityType,
            city: editingPartner.city,
            state: editingPartner.state,
            monthlyFee: editingPartner.monthlyFee,
            whatsapp: editingPartner.whatsapp,
            professionalReg: editingPartner.professionalReg || undefined,
            visibility: editingPartner.visibility,
          },
        };

        const created = await PartnerService.createPartner(payload);
        addAuditLog('CREATE_PARTNER', 'Gestão de Parceiros', `Parceiro: ${created.partner_name}`, `Novo parceiro cadastrado (ID: ${created.id}).`);
        showToast(`${created.partner_name} foi cadastrado.`);
      } else {
        // pega o registro atual para não perder nenhum dado extra (metadata)
        const canonical = await PartnerService.getPartnerById(editingPartner.id);
        const updatedMetadata: Record<string, unknown> = {
          ...(canonical.metadata || {}),
          entityType: editingPartner.entityType,
          city: editingPartner.city,
          state: editingPartner.state,
          monthlyFee: editingPartner.monthlyFee,
          whatsapp: editingPartner.whatsapp,
          professionalReg: editingPartner.professionalReg || undefined,
          visibility: editingPartner.visibility,
        };

        const updatePayload: UpdatePartnerPayload = {
          partner_name: editingPartner.tradeName?.trim() || editingPartner.name.trim(),
          legal_name: editingPartner.name.trim(),
          document_type: docType,
          document_number: editingPartner.cpfCnpj.trim() || null,
          email: editingPartner.email?.trim() || null,
          phone: editingPartner.whatsapp?.trim() || editingPartner.phone?.trim() || null,
          website: editingPartner.website?.trim() || null,
          description: editingPartner.description?.trim() || null,
          category: editingPartner.category || 'Geral',
          plan_id: editingPartner.plan || 'ouro',
          metadata: updatedMetadata,
        };

        const updated = await PartnerService.updatePartner(editingPartner.id, updatePayload);
        addAuditLog('UPDATE_PARTNER', 'Gestão de Parceiros', `Parceiro: ${updated.partner_name}`, `Dados cadastrais atualizados (ID: ${updated.id}).`);
        showToast(`Alterações de ${updated.partner_name} salvas.`);
      }

      setIsEditModalOpen(false);
      setEditingPartner(null);
      await loadCanonicalPartners(true);
    } catch (err: any) {
      console.error('[AdminGestaoParceiros] Erro ao salvar parceiro:', err);
      setFormErrorMessage(err?.message || 'Não foi possível salvar o parceiro. Tente novamente.');
    } finally {
      setIsSubmittingPartner(false);
    }
  };

  const handleOpenNewPartner = () => {
    setFormErrorMessage(null);
    const defaultPlan = plans.find((p) => p.id === 'ouro') ?? plans[0];
    const newEmpty: PartnerAdvertiser = {
      id: `new-partner-${Date.now()}`,
      entityType: 'pessoa_juridica',
      name: '',
      tradeName: '',
      cpfCnpj: '',
      email: '',
      whatsapp: '',
      website: '',
      city: '',
      state: '',
      category: '',
      subCategory: 'Parceiro',
      plan: (defaultPlan?.id as PlanType) ?? 'ouro',
      registrationStatus: 'pendente_analise',
      publicationStatus: 'despublicado',
      financialStatus: 'adimplente',
      monthlyFee: defaultPlan?.monthlyPrice,
      officialPartnerSeal: false,
      logo: '',
      description: '',
      highlights: [],
      visibility: {
        portalFamilia: true,
        portalProfessor: true,
        portalGestor: false,
        portalEstudante: false,
        highlightPosition: 'normal',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingPartner(newEmpty);
    setIsEditModalOpen(true);
  };

  const openEdit = (p: PartnerAdvertiser) => {
    setFormErrorMessage(null);
    setEditingPartner({ ...p, visibility: { ...p.visibility } });
    setIsEditModalOpen(true);
  };

  const handleMarkInvoicePaid = (invId: string) => {
    const updated = invoices.map((i) =>
      i.id === invId ? { ...i, status: 'pago' as const, paymentDate: new Date().toISOString().split('T')[0] } : i,
    );
    updateInvoicesState(updated);
    addAuditLog('MARK_INVOICE_PAID', 'Faturamento Parceiros', `Fatura: ${invId}`, 'Baixa manual confirmada pelo gestor.');
    showToast('Fatura marcada como paga.');
  };

  const handleCopyPix = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Código Pix copiado.');
    } catch {
      showToast('Não foi possível copiar. Selecione o código e copie manualmente.', 'danger');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Nome', 'Razao_Social', 'CPF_CNPJ', 'Tipo', 'Categoria', 'Plano', 'Status_Cadastro', 'Status_Publicacao', 'Status_Financeiro', 'Mensalidade', 'Views', 'Clicks', 'Leads', 'Email', 'WhatsApp'];
    const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = partners.map((p) => [
      q(p.id),
      q(p.tradeName || p.name),
      q(p.name),
      q(p.cpfCnpj),
      q(p.entityType),
      q(p.category),
      q(p.plan),
      q(p.registrationStatus),
      q(p.publicationStatus),
      q(p.financialStatus),
      p.monthlyFee ?? '',
      p.views ?? '',
      p.clicks ?? '',
      p.leadsGenerated ?? '',
      q(p.email),
      q(p.whatsapp),
    ]);

    const csv = '﻿' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `parceiros_classium_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Planilha de parceiros baixada.');
  };

  /* ---------------- Tela ---------------- */

  const pendingList = partners.filter(isPendingReg);

  const tabs: { id: TabKey; label: string; icon: LucideIcon; badge?: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão geral', icon: LayoutGrid },
    { id: 'directory', label: 'Parceiros', icon: Users, badge: partners.length || undefined },
    { id: 'moderation', label: 'Análise', icon: FileCheck, badge: metrics.pendingModeration || undefined },
    { id: 'plans', label: 'Planos', icon: Layers },
    { id: 'billing', label: 'Cobranças', icon: CreditCard, badge: invoices.length || undefined },
    { id: 'portals', label: 'Onde aparece', icon: Globe },
    { id: 'audit', label: 'Histórico', icon: History },
  ];

  return (
    <Page>
      {/* Hero */}
      <BrandHero>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <HeroEyebrow icon={Store}>Rede de parceiros</HeroEyebrow>
            <HeroTitle highlight="parceiros">Gestão de</HeroTitle>
            <HeroText>
              Aprove profissionais e empresas, acompanhe planos e cobranças e decida em quais portais cada parceiro aparece para
              as famílias e professores.
            </HeroText>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-[420px] lg:justify-end">
            <HeroButton icon={Plus} onClick={handleOpenNewPartner}>
              Novo parceiro
            </HeroButton>
            <HeroButton variant="outline" icon={Download} onClick={handleExportCSV} disabled={partners.length === 0}>
              Exportar
            </HeroButton>
            <HeroButton
              variant="outline"
              icon={RefreshCw}
              loading={isLoadingPartners}
              onClick={() => loadCanonicalPartners(true)}
              aria-label="Atualizar lista"
              title={lastSyncTime ? `Atualizado às ${lastSyncTime}` : 'Atualizar'}
            >
              <span className="hidden sm:inline">Atualizar</span>
            </HeroButton>
            <HeroButton variant="outline" icon={Printer} onClick={() => window.print()} aria-label="Imprimir" title="Imprimir" iconOnly />
          </div>
        </div>

        <HeroStats
          items={[
            { label: 'Receita mensal', value: <CountUp to={metrics.mrr} decimals={2} prefix="R$ " duration={1.2} />, hint: 'parceiros aprovados' },
            { label: 'Parceiros no ar', value: <CountUp to={metrics.active} duration={1} />, hint: `de ${metrics.total} cadastrados` },
            { label: 'Aguardando análise', value: <CountUp to={metrics.pendingModeration} duration={1} />, hint: 'cadastros novos' },
            { label: 'Contatos gerados', value: <CountUp to={metrics.totalLeads} duration={1.2} />, hint: `${num(metrics.totalConversions)} conversões` },
          ]}
        />
      </BrandHero>

      <PillNav<TabKey> label="Seções de parceiros" items={tabs} value={activeTab} onChange={setActiveTab} />

      {partnersLoadError && (
        <Alert
          tone="danger"
          title="Lista indisponível"
          action={
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => loadCanonicalPartners(true)}>
              Tentar de novo
            </Button>
          }
        >
          {partnersLoadError}
        </Alert>
      )}

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        {/* ---------------- Visão geral ---------------- */}
        {activeTab === 'overview' && (
          <>
            {metrics.pendingModeration > 0 && (
              <Alert
                tone="warning"
                title={`${metrics.pendingModeration} ${metrics.pendingModeration === 1 ? 'cadastro aguarda' : 'cadastros aguardam'} análise`}
                action={
                  <Button size="sm" onClick={() => setActiveTab('moderation')}>
                    Analisar agora
                  </Button>
                }
              >
                Confira documentos e registro profissional antes de liberar nos portais.
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard index={0} label="Visualizações" value={num(metrics.totalViews)} icon={Eye} hint="nos portais da escola" />
              <StatCard index={1} label="Cliques" value={num(metrics.totalClicks)} icon={MousePointerClick} hint={`${metrics.ctrAvg.toFixed(1).replace('.', ',')}% de quem viu`} />
              <StatCard index={2} label="Em aberto" value={brl(metrics.totalPendingInvoicesAmount)} icon={CreditCard} tone="warning" hint="faturas a receber" />
              <StatCard
                index={3}
                label="Em atraso"
                value={num(metrics.defaultRateCount)}
                icon={AlertTriangle}
                tone={metrics.defaultRateCount > 0 ? 'danger' : 'neutral'}
                hint="parceiros inadimplentes"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader icon={Layers} title="Carteira por plano" subtitle="Quantos parceiros e quanto cada plano gera por mês" />
                {isLoadingPartners ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 rounded-full" />
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : planBreakdown.total === 0 ? (
                  <EmptyState compact icon={Layers} title="Nenhum parceiro ainda" text="Quando o primeiro parceiro for cadastrado, a divisão por plano aparece aqui." />
                ) : (
                  <>
                    {/* barra empilhada */}
                    <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
                      {planBreakdown.rows
                        .filter((r) => r.count > 0)
                        .map((r, i) => (
                          <motion.span
                            key={r.id}
                            initial={{ width: 0 }}
                            animate={{ width: `${(r.count / planBreakdown.total) * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                            style={{ background: shade(i) }}
                            title={`${r.name}: ${r.count}`}
                          />
                        ))}
                    </div>
                    <ul className="mt-5 divide-y divide-[var(--border)]">
                      {planBreakdown.rows.map((r, i) => (
                        <li key={r.id} className="flex items-center gap-3 py-3">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.count > 0 ? shade(planBreakdown.rows.filter((x) => x.count > 0).indexOf(r)) : 'var(--border)' }} />
                          <span className="flex-1 text-[14px] font-medium text-[var(--text-heading)]">{r.name}</span>
                          <span className="w-24 text-right text-[13px] text-[var(--text-muted)] tabular-nums">
                            {r.count} {r.count === 1 ? 'parceiro' : 'parceiros'}
                          </span>
                          <span className="w-28 text-right text-[14px] font-semibold text-[var(--text-heading)] tabular-nums">{brl(r.revenue)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader icon={TrendingUp} title="Categorias" subtitle="Áreas com mais parceiros" />
                {isLoadingPartners ? (
                  <div className="space-y-4">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8" />
                    ))}
                  </div>
                ) : categoryBreakdown.length === 0 ? (
                  <EmptyState compact icon={TrendingUp} title="Sem categorias" />
                ) : (
                  <ul className="space-y-4">
                    {categoryBreakdown.map((c, i) => {
                      const max = categoryBreakdown[0].value || 1;
                      return (
                        <li key={c.name}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                            <span className="truncate font-medium text-[var(--text-heading)]">{c.name}</span>
                            <span className="tabular-nums text-[var(--text-muted)]">{c.value}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-card-alt)]">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: 'var(--accent)' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(c.value / max) * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>

            <Card>
              <CardHeader
                icon={Clock}
                title="Últimos cadastros"
                subtitle="Os parceiros que entraram por último"
                action={
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab('directory')}>
                    Ver todos
                  </Button>
                }
              />
              {isLoadingPartners ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : recentPartners.length === 0 ? (
                <EmptyState
                  compact
                  icon={Store}
                  title="Nenhum parceiro cadastrado"
                  text="Cadastre profissionais e empresas que oferecem serviços para a comunidade escolar."
                  action={
                    <Button icon={Plus} onClick={handleOpenNewPartner}>
                      Novo parceiro
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {recentPartners.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPartnerForDetail(p)}
                        className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-[var(--bg-card-alt)]"
                      >
                        <PartnerLogo partner={p} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-[var(--text-heading)]">{p.tradeName || p.name}</p>
                          <p className="truncate text-[13px] text-[var(--text-muted)]">
                            {p.category} · {planName(plans, p.plan)}
                          </p>
                        </div>
                        <RegBadge status={p.registrationStatus} />
                        <span className="hidden w-24 text-right text-[13px] text-[var(--text-muted)] sm:block">{date(p.createdAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        {/* ---------------- Diretório ---------------- */}
        {activeTab === 'directory' && (
          <Card padded={false} className="overflow-hidden">
            <div className="space-y-4 border-b border-[var(--border)] p-5 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="search"
                    aria-label="Buscar parceiro"
                    placeholder="Buscar por nome, CPF/CNPJ, e-mail ou cidade"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cx(inputCls, 'pl-10')}
                  />
                </div>
                <p className="shrink-0 text-[13px] text-[var(--text-muted)]">
                  <strong className="text-[var(--text-heading)]">{filteredPartners.length}</strong> de {partners.length} parceiros
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                <FilterSelect label="Tipo" value={selectedEntityFilter} onChange={setSelectedEntityFilter}>
                  <option value="todos">Todos os tipos</option>
                  <option value="pessoa_fisica">Profissional autônomo</option>
                  <option value="pessoa_juridica">Empresa ou instituição</option>
                  <option value="apoio_infra">Apoio e infraestrutura</option>
                </FilterSelect>
                <FilterSelect label="Categoria" value={selectedCategoryFilter} onChange={setSelectedCategoryFilter}>
                  <option value="todos">Todas as categorias</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Plano" value={selectedPlanFilter} onChange={setSelectedPlanFilter}>
                  <option value="todos">Todos os planos</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect label="Cadastro" value={selectedStatusFilter} onChange={setSelectedStatusFilter}>
                  <option value="todos">Todos</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="pendente_analise">Aguardando análise</option>
                  <option value="em_analise">Em análise</option>
                  <option value="rejeitado">Recusado</option>
                  <option value="suspenso">Suspenso</option>
                </FilterSelect>
                <FilterSelect label="Financeiro" value={selectedFinancialFilter} onChange={setSelectedFinancialFilter}>
                  <option value="todos">Todos</option>
                  <option value="adimplente">Em dia</option>
                  <option value="pendente">Pagamento pendente</option>
                  <option value="inadimplente">Em atraso</option>
                </FilterSelect>
              </div>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="text-[13px] font-semibold text-[var(--accent)] hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>

            {isLoadingPartners ? (
              <div className="space-y-2 p-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Search}
                  title={partners.length === 0 ? 'Nenhum parceiro cadastrado' : 'Nenhum parceiro com esses filtros'}
                  text={partners.length === 0 ? 'Cadastre o primeiro parceiro para começar.' : 'Tente outra busca ou limpe os filtros.'}
                  action={
                    partners.length === 0 ? (
                      <Button icon={Plus} onClick={handleOpenNewPartner}>
                        Novo parceiro
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    )
                  }
                />
              </div>
            ) : (
              <TableShell minWidth={940}>
                <thead className="bg-[var(--bg-card-alt)]">
                  <tr>
                    <th className={thCls}>Parceiro</th>
                    <th className={thCls}>Categoria</th>
                    <th className={thCls}>Plano</th>
                    <th className={thCls}>Situação</th>
                    <th className={cx(thCls, 'text-right')}>Desempenho</th>
                    <th className={cx(thCls, 'text-right')}>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredPartners.map((p) => {
                    const isBlocked = p.publicationStatus === 'bloqueado';
                    const busy = busyId === p.id;
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-[var(--bg-card-alt)]">
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <PartnerLogo partner={p} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 font-semibold text-[var(--text-heading)]">
                                <span className="truncate">{p.tradeName || p.name}</span>
                                {p.officialPartnerSeal && (
                                  <span title={p.sealText || 'Parceiro aprovado'} className="shrink-0 text-[var(--accent)]">
                                    <BadgeCheck className="h-4 w-4" />
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                                <span className="whitespace-nowrap tabular-nums">{maskDoc(p.cpfCnpj)}</span>
                                {p.professionalReg && <span className="whitespace-nowrap">· {p.professionalReg}</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <p className="font-medium text-[var(--text-heading)]">{p.category}</p>
                          {(p.city || p.state) && (
                            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
                              <MapPin className="h-3 w-3" />
                              {[p.city, p.state].filter(Boolean).join('/')}
                            </p>
                          )}
                        </td>
                        <td className={tdCls}>
                          <p className="font-medium text-[var(--text-heading)]">{planName(plans, p.plan)}</p>
                          <p className="mt-0.5 text-[12px] tabular-nums text-[var(--text-muted)]">
                            {typeof p.monthlyFee === 'number' && p.monthlyFee > 0 ? `${brl(p.monthlyFee)}/mês` : 'Sem mensalidade'}
                          </p>
                        </td>
                        <td className={tdCls}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <RegBadge status={p.registrationStatus} />
                            {!isPendingReg(p) && (
                              <Badge tone={PUB_STATUS[p.publicationStatus]?.tone ?? 'neutral'} className="whitespace-nowrap">
                                {PUB_STATUS[p.publicationStatus]?.label ?? p.publicationStatus}
                              </Badge>
                            )}
                          </div>
                          {isPendingReg(p) && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleApprovePartner(p)}
                              className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {busy ? 'Aprovando…' : 'Aprovar agora'}
                            </button>
                          )}
                        </td>
                        <td className={cx(tdCls, 'whitespace-nowrap text-right text-[13px] tabular-nums')}>
                          <p className="font-semibold text-[var(--text-heading)]" title="Visualizações">
                            {num(p.views)}
                          </p>
                          <p className="text-[12px] text-[var(--text-muted)]">{num(p.leadsGenerated)} contatos</p>
                        </td>
                        <td className={cx(tdCls, 'whitespace-nowrap px-3 text-right')}>
                          <div className="flex items-center justify-end gap-0.5">
                            <IconAction icon={Eye} label="Ver ficha" onClick={() => setSelectedPartnerForDetail(p)} />
                            <IconAction icon={Edit3} label="Editar" onClick={() => openEdit(p)} />
                            <IconAction icon={ArrowRightLeft} label="Trocar plano" onClick={() => handleOpenPlanChange(p)} />
                            <IconAction
                              icon={isBlocked ? ShieldCheck : Ban}
                              label={isBlocked ? 'Liberar' : 'Bloquear'}
                              onClick={() => handleToggleBlockPartner(p)}
                              disabled={busy}
                            />
                            <IconAction icon={Trash2} label="Excluir" danger onClick={() => setDeletingPartner(p)} disabled={busy} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableShell>
            )}
          </Card>
        )}

        {/* ---------------- Análise de cadastros ---------------- */}
        {activeTab === 'moderation' && (
          <>
            <Card>
              <CardHeader
                icon={FileCheck}
                title="Cadastros para analisar"
                subtitle="Confira registro profissional, documentos e contato antes de liberar nos portais"
              />
              {isLoadingPartners ? (
                <Skeleton className="h-40" />
              ) : pendingList.length === 0 ? (
                <EmptyState compact icon={CheckCircle2} title="Tudo em dia" text="Não há cadastros esperando análise." />
              ) : (
                <div className="space-y-4">
                  {pendingList.map((p, i) => (
                    <motion.article
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.05 }}
                      className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card-alt)] p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                          <PartnerLogo partner={p} size={48} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-[16px] font-semibold text-[var(--text-heading)]">{p.tradeName || p.name}</h3>
                              <Badge>{ENTITY_LABEL[p.entityType] ?? p.entityType}</Badge>
                            </div>
                            <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                              {[p.category, [p.city, p.state].filter(Boolean).join('/'), `cadastrado em ${date(p.createdAt)}`].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" variant="secondary" icon={X} onClick={() => handleOpenRejectModal(p)}>
                            Recusar
                          </Button>
                          <Button size="sm" icon={Check} loading={busyId === p.id} onClick={() => handleApprovePartner(p)}>
                            Aprovar
                          </Button>
                        </div>
                      </div>

                      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                        <InfoBox label="Documento">
                          <span className="tabular-nums">{p.cpfCnpj || '—'}</span>
                          {p.professionalReg && <span className="block text-[12px] text-[var(--text-muted)]">Registro: {p.professionalReg}</span>}
                        </InfoBox>
                        <InfoBox label="Contato">
                          <span className="block truncate">{p.email || '—'}</span>
                          <span className="block text-[12px] text-[var(--text-muted)]">{p.whatsapp || 'Sem WhatsApp'}</span>
                        </InfoBox>
                        <InfoBox label="Plano escolhido">
                          {planName(plans, p.plan)}
                          <span className="block text-[12px] text-[var(--text-muted)]">
                            {typeof p.monthlyFee === 'number' ? `${brl(p.monthlyFee)}/mês` : 'Sem mensalidade'}
                          </span>
                        </InfoBox>
                      </dl>

                      <p className="mt-4 text-[14px] leading-relaxed text-[var(--text-body)]">{p.description || 'Sem descrição.'}</p>

                      {p.moderationNotes && (
                        <div className="mt-4">
                          <Alert tone="warning">{p.moderationNotes}</Alert>
                        </div>
                      )}
                    </motion.article>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader icon={FileText} title="Documentos enviados" subtitle={`${documents.length} ${documents.length === 1 ? 'arquivo' : 'arquivos'}`} />
              {documents.length === 0 ? (
                <EmptyState compact icon={FileText} title="Nenhum documento enviado" />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {documents.map((doc) => {
                    const docPartner = partners.find((p) => p.id === doc.partnerId);
                    const st = DOC_STATUS[doc.status] ?? { label: doc.status, tone: 'neutral' as Tone };
                    return (
                      <div key={doc.id} className="flex flex-col rounded-3xl border border-[var(--border)] p-4 transition-shadow hover:shadow-[0_18px_36px_-26px_rgba(16,24,40,0.45)]">
                        <div className="flex items-start gap-3">
                          <IconTile icon={FileText} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold leading-snug text-[var(--text-heading)]">{doc.title}</p>
                            <p className="truncate text-[12px] text-[var(--text-muted)]">{docPartner?.tradeName || docPartner?.name || 'Parceiro'}</p>
                          </div>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </div>
                        <p className="mt-3 text-[12px] text-[var(--text-muted)]">
                          {doc.fileName}
                          {doc.fileSize ? ` · ${doc.fileSize}` : ''} · enviado em {date(doc.uploadedAt)}
                        </p>
                        {doc.notes && <p className="mt-2 text-[12px] text-[#A15C07]">{doc.notes}</p>}
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[var(--border)] text-[13px] font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent)]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Abrir arquivo
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ---------------- Planos ---------------- */}
        {activeTab === 'plans' && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((pl, i) => {
              const activeCount = partners.filter((p) => p.plan === pl.id && p.publicationStatus === 'publicado').length;
              const revenue = activeCount * pl.monthlyPrice;
              const features: [boolean, string][] = [
                [true, `Até ${pl.maxPhotos} fotos no catálogo`],
                [true, `Até ${pl.maxBanners} banners`],
                [Boolean(pl.whatsappDirect), 'Botão de WhatsApp'],
                [Boolean(pl.aiIntegration), 'Indicação pelo assistente'],
                [Boolean(pl.detailedReports), 'Relatório de contatos'],
                [Boolean(pl.officialSeal), 'Selo de parceiro oficial'],
              ];
              return (
                <motion.div
                  key={pl.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_28px_50px_-30px_rgba(16,24,40,0.5)]"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-70 blur-2xl"
                    style={{ background: 'var(--accent-soft)' }}
                  />
                  <div className="relative flex items-center justify-between">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{pl.name}</p>
                    {pl.officialSeal && <BadgeCheck className="h-5 w-5 text-[var(--accent)]" />}
                  </div>
                  <p className="relative mt-3 font-serif text-[34px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-heading)]">
                    {brl(pl.monthlyPrice)}
                    <span className="ml-1 font-sans text-[14px] font-normal text-[var(--text-muted)]">/mês</span>
                  </p>
                  <p className="relative mt-1 text-[12px] text-[var(--text-muted)]">{brl(pl.annualPrice)} no plano anual</p>
                  <p className="relative mt-4 text-[14px] leading-relaxed text-[var(--text-body)]">{pl.description}</p>

                  <ul className="relative mt-5 space-y-2.5 border-t border-[var(--border)] pt-5 text-[14px]">
                    {features.map(([ok, text]) => (
                      <li key={text} className={cx('flex items-center gap-2.5', !ok && 'text-[var(--text-muted)] line-through decoration-[var(--border)]')}>
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={ok ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'var(--bg-card-alt)' }}
                        >
                          {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </span>
                        {text}
                      </li>
                    ))}
                  </ul>

                  <div className="relative mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--bg-card-alt)] p-3 text-[12px]">
                    <div>
                      <p className="text-[var(--text-muted)]">No ar</p>
                      <p className="text-[16px] font-semibold text-[var(--text-heading)] tabular-nums">{activeCount}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text-muted)]">Por mês</p>
                      <p className="text-[16px] font-semibold text-[var(--text-heading)] tabular-nums">{brl(revenue)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ---------------- Cobranças ---------------- */}
        {activeTab === 'billing' && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard index={0} label="Total emitido" value={brl(invoices.reduce((acc, i) => acc + i.amount, 0))} icon={FileText} />
              <StatCard index={1} label="Em aberto" value={brl(metrics.totalPendingInvoicesAmount)} icon={Clock} tone="warning" />
              <StatCard
                index={2}
                label="Inadimplência"
                value={`${((metrics.defaultRateCount / (metrics.total || 1)) * 100).toFixed(1).replace('.', ',')}%`}
                icon={AlertTriangle}
                tone={metrics.defaultRateCount > 0 ? 'danger' : 'success'}
                hint={`${metrics.defaultRateCount} de ${metrics.total} parceiros`}
              />
            </div>

            <Card padded={false} className="overflow-hidden">
              <div className="p-5 sm:p-6">
                <CardHeader icon={CreditCard} title="Faturas" subtitle="Cobranças dos parceiros e baixa de pagamentos" />
              </div>
              {invoices.length === 0 ? (
                <div className="px-5 pb-6">
                  <EmptyState compact icon={CreditCard} title="Nenhuma fatura emitida" />
                </div>
              ) : (
                <TableShell minWidth={820}>
                  <thead className="bg-[var(--bg-card-alt)]">
                    <tr>
                      <th className={thCls}>Fatura</th>
                      <th className={thCls}>Parceiro</th>
                      <th className={cx(thCls, 'text-right')}>Valor</th>
                      <th className={thCls}>Vencimento</th>
                      <th className={thCls}>Forma</th>
                      <th className={thCls}>Situação</th>
                      <th className={cx(thCls, 'text-right')}>
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {invoices.map((inv) => {
                      const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, tone: 'neutral' as Tone };
                      return (
                        <tr key={inv.id} className="transition-colors hover:bg-[var(--bg-card-alt)]">
                          <td className={cx(tdCls, 'font-semibold tabular-nums text-[var(--text-heading)]')}>{inv.invoiceNumber}</td>
                          <td className={tdCls}>{inv.partnerName}</td>
                          <td className={cx(tdCls, 'text-right font-semibold tabular-nums text-[var(--text-heading)]')}>{brl(inv.amount)}</td>
                          <td className={cx(tdCls, 'tabular-nums')}>{date(inv.dueDate)}</td>
                          <td className={cx(tdCls, 'capitalize')}>{String(inv.method || '').replace(/_/g, ' ')}</td>
                          <td className={tdCls}>
                            <Badge tone={st.tone}>{st.label}</Badge>
                          </td>
                          <td className={cx(tdCls, 'text-right')}>
                            <div className="flex items-center justify-end gap-1">
                              {inv.pixCode && <IconAction icon={Copy} label="Copiar Pix" onClick={() => handleCopyPix(inv.pixCode || '')} />}
                              {inv.status !== 'pago' && (
                                <Button size="sm" variant="secondary" icon={Check} onClick={() => handleMarkInvoicePaid(inv.id)}>
                                  Dar baixa
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableShell>
              )}
            </Card>
          </>
        )}

        {/* ---------------- Onde cada parceiro aparece ---------------- */}
        {activeTab === 'portals' && (
          <Card padded={false} className="overflow-hidden">
            <div className="p-5 sm:p-6">
              <CardHeader icon={Globe} title="Onde cada parceiro aparece" subtitle="Escolha em quais portais o anúncio é mostrado" />
            </div>
            {partners.length === 0 ? (
              <div className="px-5 pb-6">
                <EmptyState compact icon={Globe} title="Nenhum parceiro cadastrado" />
              </div>
            ) : (
              <TableShell minWidth={760}>
                <thead className="bg-[var(--bg-card-alt)]">
                  <tr>
                    <th className={thCls}>Parceiro</th>
                    <th className={cx(thCls, 'text-center')}>Família</th>
                    <th className={cx(thCls, 'text-center')}>Professor</th>
                    <th className={cx(thCls, 'text-center')}>Gestão</th>
                    <th className={thCls}>Destaque</th>
                    <th className={cx(thCls, 'text-right')}>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {partners.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-[var(--bg-card-alt)]">
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <PartnerLogo partner={p} size={34} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--text-heading)]">{p.tradeName || p.name}</p>
                            <p className="truncate text-[12px] text-[var(--text-muted)]">{p.category}</p>
                          </div>
                        </div>
                      </td>
                      {[p.visibility?.portalFamilia, p.visibility?.portalProfessor, p.visibility?.portalGestor].map((on, idx) => (
                        <td key={idx} className={cx(tdCls, 'text-center')}>
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full"
                            style={on ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'var(--bg-card-alt)', color: 'var(--text-muted)' }}
                            aria-label={on ? 'Aparece' : 'Não aparece'}
                          >
                            {on ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                          </span>
                        </td>
                      ))}
                      <td className={cx(tdCls, 'capitalize')}>{String(p.visibility?.highlightPosition || 'normal').replace(/_/g, ' ')}</td>
                      <td className={cx(tdCls, 'text-right')}>
                        <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                          Configurar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>
        )}

        {/* ---------------- Histórico ---------------- */}
        {activeTab === 'audit' && (
          <Card>
            <CardHeader icon={History} title="Histórico de mudanças" subtitle="Trocas de plano e decisões da administração" />
            {planHistory.length === 0 ? (
              <EmptyState compact icon={History} title="Nada registrado ainda" />
            ) : (
              <ol className="relative ml-3 border-l border-[var(--border)]">
                {planHistory.map((item, i) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
                    className="relative pb-6 pl-6 last:pb-0"
                  >
                    <span
                      className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border-2"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--accent)' }}
                    />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--text-heading)]">{item.partnerName}</p>
                        <p className="mt-0.5 text-[13px] text-[var(--text-body)]">
                          Plano {item.previousPlan.toLowerCase()} → <strong>{item.newPlan.toLowerCase()}</strong>
                        </p>
                        <p className="mt-1 text-[13px] text-[var(--text-muted)]">{item.reason}</p>
                      </div>
                      <p className="shrink-0 text-[12px] text-[var(--text-muted)] sm:text-right">
                        {new Date(item.changedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        <span className="block">{item.changedBy}</span>
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            )}
          </Card>
        )}
      </motion.div>

      {/* ---------------- Ficha do parceiro ---------------- */}
      <Modal
        open={Boolean(selectedPartnerForDetail)}
        onClose={() => setSelectedPartnerForDetail(null)}
        size="lg"
        icon={selectedPartnerForDetail ? <PartnerLogo partner={selectedPartnerForDetail} size={44} /> : null}
        title={selectedPartnerForDetail?.tradeName || selectedPartnerForDetail?.name || ''}
        subtitle={
          selectedPartnerForDetail
            ? [selectedPartnerForDetail.category, [selectedPartnerForDetail.city, selectedPartnerForDetail.state].filter(Boolean).join('/')].filter(Boolean).join(' · ')
            : ''
        }
        footer={
          selectedPartnerForDetail && (
            <>
              <Button variant="secondary" onClick={() => setSelectedPartnerForDetail(null)}>
                Fechar
              </Button>
              <Button
                icon={Edit3}
                onClick={() => {
                  const p = selectedPartnerForDetail;
                  setSelectedPartnerForDetail(null);
                  openEdit(p);
                }}
              >
                Editar
              </Button>
            </>
          )
        }
      >
        {selectedPartnerForDetail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
              {[
                ['Visualizações', num(selectedPartnerForDetail.views)],
                ['Cliques', num(selectedPartnerForDetail.clicks)],
                ['Contatos', num(selectedPartnerForDetail.leadsGenerated)],
                ['Conversões', num(selectedPartnerForDetail.conversions)],
              ].map(([l, v]) => (
                <div key={l} className="bg-[var(--bg-card)] px-4 py-3">
                  <p className="text-[12px] text-[var(--text-muted)]">{l}</p>
                  <p className="mt-0.5 font-serif text-[22px] font-semibold tabular-nums text-[var(--text-heading)]">{v}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <RegBadge status={selectedPartnerForDetail.registrationStatus} />
              <Badge tone={PUB_STATUS[selectedPartnerForDetail.publicationStatus]?.tone ?? 'neutral'}>
                {PUB_STATUS[selectedPartnerForDetail.publicationStatus]?.label ?? selectedPartnerForDetail.publicationStatus}
              </Badge>
              <Badge tone="accent">Plano {planName(plans, selectedPartnerForDetail.plan)}</Badge>
              {selectedPartnerForDetail.officialPartnerSeal && (
                <Badge tone="accent">
                  <BadgeCheck className="h-3.5 w-3.5" /> {selectedPartnerForDetail.sealText || 'Parceiro aprovado'}
                </Badge>
              )}
            </div>

            <section>
              <h3 className="text-[13px] font-semibold text-[var(--text-heading)]">Sobre</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-body)]">{selectedPartnerForDetail.description || 'Sem descrição.'}</p>
            </section>

            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoBox label="Documento">{selectedPartnerForDetail.cpfCnpj || '—'}</InfoBox>
              <InfoBox label="Mensalidade">
                {typeof selectedPartnerForDetail.monthlyFee === 'number' && selectedPartnerForDetail.monthlyFee > 0
                  ? `${brl(selectedPartnerForDetail.monthlyFee)}/mês`
                  : 'Não informada'}
              </InfoBox>
              <InfoBox label="E-mail">{selectedPartnerForDetail.email || '—'}</InfoBox>
              <InfoBox label="WhatsApp">{selectedPartnerForDetail.whatsapp || '—'}</InfoBox>
              <InfoBox label="Site">
                {selectedPartnerForDetail.website ? (
                  <a href={selectedPartnerForDetail.website} target="_blank" rel="noreferrer" className="break-all text-[var(--accent)] hover:underline">
                    {selectedPartnerForDetail.website}
                  </a>
                ) : (
                  '—'
                )}
              </InfoBox>
              <InfoBox label="Tipo">{ENTITY_LABEL[selectedPartnerForDetail.entityType] ?? selectedPartnerForDetail.entityType}</InfoBox>
            </dl>

            {selectedPartnerForDetail.highlights && selectedPartnerForDetail.highlights.length > 0 && (
              <section>
                <h3 className="text-[13px] font-semibold text-[var(--text-heading)]">Diferenciais</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedPartnerForDetail.highlights.map((h, i) => (
                    <Badge key={i}>
                      <Check className="h-3 w-3" /> {h}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>

      {/* ---------------- Cadastro / edição ---------------- */}
      <Modal
        open={isEditModalOpen && Boolean(editingPartner)}
        onClose={() => !isSubmittingPartner && setIsEditModalOpen(false)}
        size="lg"
        title={editingPartner && partners.some((p) => p.id === editingPartner.id) ? 'Editar parceiro' : 'Novo parceiro'}
        subtitle="Dados do parceiro, plano e onde ele aparece"
        footer={
          <>
            <Button variant="secondary" type="button" disabled={isSubmittingPartner} onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="partner-form" loading={isSubmittingPartner}>
              Salvar parceiro
            </Button>
          </>
        }
      >
        {editingPartner && (
          <form id="partner-form" onSubmit={handleSavePartner} className="space-y-6">
            {formErrorMessage && <Alert tone="danger">{formErrorMessage}</Alert>}

            <FormSection title="Identificação">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tipo" required>
                  {(id) => (
                    <select
                      id={id}
                      value={editingPartner.entityType}
                      onChange={(e) => setEditingPartner({ ...editingPartner, entityType: e.target.value as EntityType })}
                      className={inputCls}
                    >
                      <option value="pessoa_juridica">Empresa ou instituição</option>
                      <option value="pessoa_fisica">Profissional autônomo</option>
                      <option value="apoio_infra">Apoio e infraestrutura</option>
                    </select>
                  )}
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Razão social ou nome completo" required>
                    {(id) => (
                      <input
                        id={id}
                        required
                        value={editingPartner.name}
                        onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                        className={inputCls}
                      />
                    )}
                  </Field>
                </div>
                <Field label="Nome de exibição" required>
                  {(id) => (
                    <input
                      id={id}
                      required
                      value={editingPartner.tradeName || ''}
                      onChange={(e) => setEditingPartner({ ...editingPartner, tradeName: e.target.value })}
                      className={inputCls}
                    />
                  )}
                </Field>
                <Field label="CPF ou CNPJ" required>
                  {(id) => (
                    <input
                      id={id}
                      required
                      inputMode="numeric"
                      value={editingPartner.cpfCnpj}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '');
                        setEditingPartner({ ...editingPartner, cpfCnpj: digits.length > 11 ? maskCNPJ(e.target.value) : maskCPF(e.target.value) });
                      }}
                      className={inputCls}
                    />
                  )}
                </Field>
                <Field label="Registro profissional" hint="CRP, CRM, CRFa... se houver">
                  {(id) => (
                    <input
                      id={id}
                      value={editingPartner.professionalReg || ''}
                      onChange={(e) => setEditingPartner({ ...editingPartner, professionalReg: e.target.value })}
                      className={inputCls}
                    />
                  )}
                </Field>
                <Field label="Categoria" required>
                  {(id) => (
                    <>
                      <input
                        id={id}
                        required
                        list="partner-categories"
                        value={editingPartner.category}
                        onChange={(e) => setEditingPartner({ ...editingPartner, category: e.target.value })}
                        placeholder="Ex.: Psicopedagogia"
                        className={inputCls}
                      />
                      <datalist id="partner-categories">
                        {uniqueCategories.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </>
                  )}
                </Field>
              </div>
            </FormSection>

            <FormSection title="Contato e endereço">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="E-mail" required>
                  {(id) => (
                    <input
                      id={id}
                      type="email"
                      required
                      value={editingPartner.email}
                      onChange={(e) => setEditingPartner({ ...editingPartner, email: e.target.value })}
                      className={inputCls}
                    />
                  )}
                </Field>
                <Field label="WhatsApp" required>
                  {(id) => (
                    <input
                      id={id}
                      required
                      inputMode="tel"
                      value={editingPartner.whatsapp}
                      onChange={(e) => setEditingPartner({ ...editingPartner, whatsapp: e.target.value })}
                      placeholder="(62) 99999-9999"
                      className={inputCls}
                    />
                  )}
                </Field>
                <Field label="Site">
                  {(id) => (
                    <input
                      id={id}
                      type="url"
                      value={editingPartner.website || ''}
                      onChange={(e) => setEditingPartner({ ...editingPartner, website: e.target.value })}
                      placeholder="https://"
                      className={inputCls}
                    />
                  )}
                </Field>
                <div className="grid grid-cols-[1fr_88px] gap-3">
                  <Field label="Cidade" required>
                    {(id) => (
                      <input
                        id={id}
                        required
                        value={editingPartner.city}
                        onChange={(e) => setEditingPartner({ ...editingPartner, city: e.target.value })}
                        className={inputCls}
                      />
                    )}
                  </Field>
                  <Field label="UF" required>
                    {(id) => (
                      <input
                        id={id}
                        required
                        maxLength={2}
                        value={editingPartner.state}
                        onChange={(e) => setEditingPartner({ ...editingPartner, state: e.target.value.toUpperCase() })}
                        className={cx(inputCls, 'uppercase')}
                      />
                    )}
                  </Field>
                </div>
              </div>
            </FormSection>

            <FormSection title="Plano">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Plano" required>
                  {(id) => (
                    <select
                      id={id}
                      value={editingPartner.plan}
                      onChange={(e) => {
                        const newPl = e.target.value as PlanType;
                        const cfg = plans.find((p) => p.id === newPl);
                        setEditingPartner({
                          ...editingPartner,
                          plan: newPl,
                          monthlyFee: cfg ? cfg.monthlyPrice : editingPartner.monthlyFee,
                          officialPartnerSeal: cfg ? cfg.officialSeal : editingPartner.officialPartnerSeal,
                        });
                      }}
                      className={inputCls}
                    >
                      {plans.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name} · {brl(pl.monthlyPrice)}/mês
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Mensalidade (R$)" required>
                  {(id) => (
                    <input
                      id={id}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editingPartner.monthlyFee ?? ''}
                      onChange={(e) => setEditingPartner({ ...editingPartner, monthlyFee: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                      className={cx(inputCls, 'tabular-nums')}
                    />
                  )}
                </Field>
                <Field label="Situação do cadastro" required>
                  {(id) => (
                    <select
                      id={id}
                      value={editingPartner.registrationStatus}
                      onChange={(e) => setEditingPartner({ ...editingPartner, registrationStatus: e.target.value as PartnerRegistrationStatus })}
                      className={inputCls}
                    >
                      <option value="aprovado">Aprovado</option>
                      <option value="pendente_analise">Aguardando análise</option>
                      <option value="em_analise">Em análise</option>
                      <option value="suspenso">Suspenso</option>
                      <option value="rejeitado">Recusado</option>
                    </select>
                  )}
                </Field>
              </div>
            </FormSection>

            <FormSection title="Onde aparece">
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ['portalFamilia', 'Portal da Família'],
                    ['portalProfessor', 'Portal do Professor'],
                    ['portalGestor', 'Portal da Gestão'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-[14px] font-medium text-[var(--text-heading)]">
                    {label}
                    <Toggle
                      label={label}
                      checked={Boolean(editingPartner.visibility?.[key])}
                      onChange={(v) => setEditingPartner({ ...editingPartner, visibility: { ...editingPartner.visibility, [key]: v } })}
                    />
                  </label>
                ))}
              </div>
            </FormSection>

            <Field label="Descrição" required hint="Aparece para as famílias e professores. Conte o que o parceiro oferece.">
              {(id) => (
                <textarea
                  id={id}
                  rows={4}
                  required
                  value={editingPartner.description}
                  onChange={(e) => setEditingPartner({ ...editingPartner, description: e.target.value })}
                  className={cx(inputCls, 'resize-y')}
                />
              )}
            </Field>
          </form>
        )}
      </Modal>

      {/* ---------------- Troca de plano ---------------- */}
      <Modal
        open={isPlanChangeModalOpen && Boolean(planChangePartner)}
        onClose={() => !isSavingPlan && setIsPlanChangeModalOpen(false)}
        title="Trocar plano"
        subtitle={planChangePartner ? planChangePartner.tradeName || planChangePartner.name : ''}
        icon={<IconTile icon={ArrowRightLeft} />}
        footer={
          <>
            <Button variant="secondary" disabled={isSavingPlan} onClick={() => setIsPlanChangeModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={isSavingPlan}
              disabled={!planChangePartner || selectedNewPlan === planChangePartner.plan || planChangeReason.trim() === ''}
              onClick={handleConfirmPlanChange}
            >
              Confirmar troca
            </Button>
          </>
        }
      >
        {planChangePartner && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-card-alt)] px-4 py-3 text-[14px]">
              <span className="text-[var(--text-muted)]">Plano atual: </span>
              <strong className="text-[var(--text-heading)]">{planName(plans, planChangePartner.plan)}</strong>
              <span className="text-[var(--text-muted)]"> · {brl(planChangePartner.monthlyFee)}/mês</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {plans.map((pl) => {
                const selected = selectedNewPlan === pl.id;
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => setSelectedNewPlan(pl.id as PlanType)}
                    aria-pressed={selected}
                    className={cx(
                      'rounded-2xl border px-4 py-3 text-left transition-all',
                      selected ? 'border-[var(--accent)] ring-4 ring-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--accent)]',
                    )}
                  >
                    <p className="text-[14px] font-semibold text-[var(--text-heading)]">{pl.name}</p>
                    <p className="text-[13px] tabular-nums text-[var(--text-muted)]">{brl(pl.monthlyPrice)}/mês</p>
                  </button>
                );
              })}
            </div>
            <Field label="Motivo da troca" required hint="Fica salvo no histórico.">
              {(id) => (
                <textarea
                  id={id}
                  rows={3}
                  value={planChangeReason}
                  onChange={(e) => setPlanChangeReason(e.target.value)}
                  placeholder="Ex.: o parceiro pediu para incluir banners."
                  className={cx(inputCls, 'resize-y')}
                />
              )}
            </Field>
          </div>
        )}
      </Modal>

      {/* ---------------- Recusa ---------------- */}
      <Modal
        open={isRejectModalOpen && Boolean(rejectingPartner)}
        onClose={() => setIsRejectModalOpen(false)}
        title="Recusar cadastro"
        subtitle={rejectingPartner ? rejectingPartner.tradeName || rejectingPartner.name : ''}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={busyId === rejectingPartner?.id} disabled={rejectionReason.trim() === ''} onClick={handleConfirmRejection}>
              Recusar cadastro
            </Button>
          </>
        }
      >
        <Field label="Motivo" required hint="O parceiro recebe essa explicação.">
          {(id) => (
            <textarea
              id={id}
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex.: o registro no conselho está inativo."
              className={cx(inputCls, 'resize-y')}
            />
          )}
        </Field>
      </Modal>

      {/* ---------------- Exclusão ---------------- */}
      <Modal
        open={Boolean(deletingPartner)}
        onClose={() => setDeletingPartner(null)}
        title="Excluir parceiro?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingPartner(null)}>
              Cancelar
            </Button>
            <Button variant="danger" icon={Trash2} loading={busyId === deletingPartner?.id} onClick={handleConfirmDelete}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-[var(--text-body)]">
          O cadastro de <strong className="text-[var(--text-heading)]">{deletingPartner?.tradeName || deletingPartner?.name}</strong> será apagado
          de vez e sairá de todos os portais. Essa ação não pode ser desfeita.
        </p>
      </Modal>

      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Peças menores                                                       */
/* ------------------------------------------------------------------ */

/** Tons da cor da marca para separar os planos */
function shade(i: number) {
  const mix = [100, 72, 48, 30, 18][i % 5];
  return `color-mix(in srgb, var(--accent) ${mix}%, var(--bg-card))`;
}

function PartnerLogo({ partner, size = 40 }: { partner: PartnerAdvertiser; size?: number }) {
  const [broken, setBroken] = useState(false);
  const name = partner.tradeName || partner.name || '?';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (partner.logo && !broken) {
    return (
      <img
        src={partner.logo}
        alt=""
        onError={() => setBroken(true)}
        className="shrink-0 rounded-xl border border-[var(--border)] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.34, background: 'var(--accent-soft)', color: 'var(--accent)' }}
      aria-hidden
    >
      {initials || <Building2 className="h-4 w-4" />}
    </span>
  );
}

function RegBadge({ status }: { status: string }) {
  const s = REG_STATUS[status] ?? { label: status, tone: 'neutral' as Tone, icon: Clock };
  const Icon = s.icon;
  return (
    <Badge tone={s.tone} className="whitespace-nowrap">
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </Badge>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cx(
        'flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors disabled:opacity-50',
        danger ? 'hover:bg-[#FDECEC] hover:text-[#B42318]' : 'hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-[var(--text-muted)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'py-2 text-[13px]')}>
        {children}
      </select>
    </label>
  );
}

function InfoBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
      <dt className="text-[12px] font-medium text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-medium text-[var(--text-heading)]">{children}</dd>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{title}</legend>
      {children}
    </fieldset>
  );
}