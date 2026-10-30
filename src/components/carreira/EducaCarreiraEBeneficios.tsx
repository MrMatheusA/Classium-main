import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { CareerBenefitsService } from '../../services/careerBenefitsService';
import { PartnerService, UpdatePartnerApprovalPayload } from '../../services/partnerService';
import {
  BadgeCheck,
  Ban,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Check,
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Heart,
  Layers,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { CommercialEcosystemModal } from '../commercial/CommercialEcosystemModal';
import { AdvertiserDashboardModal } from '../commercial/AdvertiserDashboardModal';
import { CommercialAdminModule } from '../commercial/CommercialAdminModule';
import { Badge, Button, EmptyState, Field, Modal, PillNav, Skeleton, Toast, Toggle, cx, inputCls } from '../ui/kit';
import { ConfirmModal, ModuleHeader, RoundIconButton } from '../ui/ModuleParts';

export interface PartnerAd {
  id: string;
  name: string;
  logo: string;
  banner?: string;
  rating: number;
  reviewCount: number;
  reviewLabel?: string;
  category: 'formacao' | 'cursos' | 'livros' | 'universidades' | 'carreira' | 'marketplace' | 'bemestar' | 'financeira' | 'tecnologia' | 'parceiras';
  subCategory: string;
  plan: 'prata' | 'ouro' | 'diamante';
  highlights: string[];
  duration?: string;
  modality?: string;
  price?: string;
  originalPrice?: string;
  discountBadge?: string;
  vipExclusive?: boolean;
  isMentisTherapy?: boolean;
  whatsapp: string;
  website: string;
  catalogPdfUrl?: string;
  description: string;
  officialPartnerSeal: boolean;
  status: 'aprovado' | 'pendente' | 'suspenso';
  views: number;
  clicks: number;
  leadsGenerated: number;
  location?: string;
  primaryButtonLink?: string;
  tags?: string[];
  officialMessage?: string;
  promoText?: string;
  planTitle?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  colorGradient?: string;
  sealText?: string;
}

/** Mantido para compatibilidade com outros módulos que importam este tipo */
export interface Professional {
  id: string;
  name: string;
  cpf: string;
  specialty: string;
  city: string;
  plan: 'Prata' | 'Ouro' | 'Diamante';
  status: 'Aprovado' | 'Aguardando aprovação' | 'Suspenso';
  views: number;
  contacts: number;
  avatar: string;
}

export interface EducaCarreiraEBeneficiosProps {
  teacherName?: string;
  teacherSubject?: string;
  onLogout?: () => void;
}

type Tab = 'marketplace' | 'mentis' | 'prestadores' | 'admin';

const CATEGORIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'todos', label: 'Todas', icon: Layers },
  { id: 'formacao', label: 'Formação', icon: GraduationCap },
  { id: 'cursos', label: 'Cursos rápidos', icon: BookOpen },
  { id: 'livros', label: 'Livros e editoras', icon: FileText },
  { id: 'universidades', label: 'Universidades', icon: Building2 },
  { id: 'carreira', label: 'Carreira e vagas', icon: Briefcase },
  { id: 'marketplace', label: 'Profissionais e reforço', icon: Users },
  { id: 'bemestar', label: 'Bem-estar', icon: Heart },
  { id: 'financeira', label: 'Educação financeira', icon: DollarSign },
  { id: 'tecnologia', label: 'Tecnologia', icon: Brain },
];

const PROVIDER_CATEGORIES = ['Todos', 'Construção', 'Limpeza', 'Tecnologia', 'Segurança', 'Móveis', 'Material Escolar', 'Material Pedagógico', 'Alimentação Escolar', 'Dedetização', 'Informática', 'Manutenção', 'Elétrica', 'Hidráulica', 'Consultorias'];

/** Fundos do card em destaque. Os valores antigos gravados no banco continuam funcionando. */
const FEATURE_THEMES = [
  { name: 'Cor da escola', value: '' },
  { name: 'Púrpura', value: 'from-purple-950/80 via-[#100826] to-[#08142d]' },
  { name: 'Dourado', value: 'from-amber-950/90 via-[#1a1200] to-[#0a1224]' },
  { name: 'Esmeralda', value: 'from-emerald-950/90 via-[#051a10] to-[#08142d]' },
  { name: 'Azul', value: 'from-blue-950/90 via-[#0a1530] to-[#08142d]' },
  { name: 'Grafite', value: 'from-slate-950 via-[#0b0f19] to-[#050b1a]' },
];

const isApproved = (s?: string) => s === 'aprovado' || s === 'Ativo';
const onlyDigits = (v?: string) => (v || '').replace(/\D/g, '');
const safeUrl = (v?: string) => {
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

export function EducaCarreiraEBeneficios({ teacherName, teacherSubject, onLogout }: EducaCarreiraEBeneficiosProps = {}) {
  const { role, serviceProviders, partnerAds, updatePartnerAd } = usePlatform();
  const isAdminMaster = role === 'admin_master' || role === 'ROLE_ADMIN_MASTER';
  const isGestor = role === 'gestor' || role === 'admin' || isAdminMaster;
  const canEditFeature = role === 'admin_master' || role === 'admin';

  const [ads, setAds] = useState<PartnerAd[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [providerCategory, setProviderCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [activeTab, setActiveTab] = useState<Tab>('marketplace');
  const [compareList, setCompareList] = useState<PartnerAd[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [selectedAdForDetail, setSelectedAdForDetail] = useState<PartnerAd | null>(null);
  const [deleting, setDeleting] = useState<PartnerAd | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [isCommercialModalOpen, setIsCommercialModalOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);

  const [isFeatureEditorOpen, setIsFeatureEditorOpen] = useState(false);
  const [featureTab, setFeatureTab] = useState<'info' | 'preco' | 'botao' | 'imagens' | 'aparencia'>('info');
  const [savingFeature, setSavingFeature] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'success') => setToast({ text, type });
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ---------------- Dados ---------------- */

  // A busca é feita na tela (lista em memória); o servidor recebe só categoria.
  const loadPartnersFromDb = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(false);
      const data = await CareerBenefitsService.getPartners({ onlyApproved: !isGestor, category: 'todos', search: '' });
      if (Array.isArray(data)) setAds(data);
    } catch (err) {
      console.warn('[EducaCarreiraEBeneficios] Error loading partners:', err);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isGestor]);

  useEffect(() => {
    loadPartnersFromDb();
  }, [loadPartnersFromDb]);

  useEffect(() => {
    const unsubscribe = CareerBenefitsService.subscribeToPartnerChanges(() => loadPartnersFromDb());
    return () => unsubscribe();
  }, [loadPartnersFromDb]);

  const currentAdsList: PartnerAd[] = ads.length > 0 ? ads : partnerAds || [];

  const featureAd: PartnerAd | null = useMemo(
    () => currentAdsList.find((a) => a.isMentisTherapy || a.id === 'mentis-therapy-1') || null,
    [currentAdsList],
  );

  const filteredAds = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return currentAdsList.filter((ad) => {
      if (ad.isMentisTherapy) return false; // aparece no destaque
      if (!isApproved(ad.status) && !isGestor) return false;
      if (selectedCategory !== 'todos' && ad.category !== selectedCategory) return false;
      if (q) {
        return (
          ad.name.toLowerCase().includes(q) ||
          (ad.category || '').toLowerCase().includes(q) ||
          (ad.subCategory || '').toLowerCase().includes(q) ||
          (ad.description || '').toLowerCase().includes(q) ||
          (ad.highlights || []).some((h) => h.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [currentAdsList, deferredSearch, selectedCategory, isGestor]);

  const pendingCount = currentAdsList.filter((a) => a.status === 'pendente').length;

  const filteredProviders = useMemo(
    () => (serviceProviders || []).filter((sp: any) => sp.status === 'Aprovado' && (providerCategory === 'todos' || sp.category === providerCategory)),
    [serviceProviders, providerCategory],
  );

  /* ---------------- Ações ---------------- */

  const handleToggleCompare = (ad: PartnerAd) => {
    if (compareList.some((i) => i.id === ad.id)) {
      setCompareList(compareList.filter((i) => i.id !== ad.id));
      return;
    }
    if (compareList.length >= 3) {
      showToast('Dá para comparar até 3 parceiros por vez.', 'info');
      return;
    }
    setCompareList([...compareList, ad]);
  };

  const handleAdClick = (ad: PartnerAd, actionType: 'whatsapp' | 'website' | 'details' | 'catalog') => {
    CareerBenefitsService.recordClick(ad.id);
    setAds((prev) =>
      prev.map((a) => (a.id === ad.id ? { ...a, clicks: (a.clicks || 0) + 1, leadsGenerated: actionType === 'whatsapp' ? (a.leadsGenerated || 0) + 1 : a.leadsGenerated } : a)),
    );
    if (actionType === 'whatsapp' && onlyDigits(ad.whatsapp)) {
      const msg = encodeURIComponent(`Olá, ${ad.name}! Vi a sua oferta no Classium e gostaria de mais informações.`);
      window.open(`https://wa.me/${onlyDigits(ad.whatsapp)}?text=${msg}`, '_blank', 'noopener');
    } else if (actionType === 'website' && (ad.primaryButtonLink || ad.website)) {
      window.open(safeUrl(ad.primaryButtonLink || ad.website), '_blank', 'noopener');
    } else if (actionType === 'catalog' && ad.catalogPdfUrl) {
      window.open(ad.catalogPdfUrl, '_blank', 'noopener');
    } else if (actionType === 'details') {
      setSelectedAdForDetail(ad);
    }
  };

  const changeApproval = async (ad: PartnerAd, approve: boolean) => {
    setBusyId(ad.id);
    try {
      const payload: UpdatePartnerApprovalPayload = approve ? { approval_status: 'approved', status: 'active', is_active: true } : { status: 'suspended', is_active: false };
      const updatedCanonical = await PartnerService.updatePartnerApproval(ad.id, payload);
      const updatedAd = CareerBenefitsService.mapCanonicalPartnerToPartnerAd(updatedCanonical);
      setAds((prev) => prev.map((a) => (a.id === ad.id ? updatedAd : a)));
      showToast(approve ? `“${updatedAd.name || ad.name}” aprovado. Já aparece para os professores.` : `“${updatedAd.name || ad.name}” suspenso.`, approve ? 'success' : 'info');
      loadPartnersFromDb();
    } catch (err: any) {
      console.error('[EducaCarreiraEBeneficios] Erro ao alterar parceiro:', err);
      showToast(`Não foi possível ${approve ? 'aprovar' : 'suspender'}: ${err?.message || 'tente de novo'}.`, 'danger');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusyId(target.id);
    try {
      await CareerBenefitsService.deletePartner(target.id);
      setAds((prev) => prev.filter((a) => a.id !== target.id));
      setCompareList((prev) => prev.filter((a) => a.id !== target.id));
      showToast(`“${target.name}” removido do catálogo.`, 'info');
      setDeleting(null);
      loadPartnersFromDb();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível remover.', 'danger');
    } finally {
      setBusyId(null);
    }
  };

  /* ---------------- Card em destaque (edição) ---------------- */

  const updateFeature = (patch: Partial<PartnerAd>) => {
    if (!featureAd) return;
    const updated = { ...featureAd, ...patch };
    if ('primaryButtonLink' in patch) updated.website = patch.primaryButtonLink || '';
    setAds((prev) => (prev.some((a) => a.id === featureAd.id) ? prev.map((a) => (a.id === featureAd.id ? updated : a)) : [updated, ...prev]));
    updatePartnerAd?.(updated);
  };

  const featureTags = featureAd ? featureAd.tags || featureAd.highlights || [] : [];

  const saveFeature = async () => {
    if (!featureAd) return;
    setSavingFeature(true);
    try {
      updatePartnerAd?.(featureAd);
      const res: any = await CareerBenefitsService.savePartner(featureAd);
      if (res && res.success === false) throw new Error(res.error || 'Não foi possível salvar.');
      showToast('Card em destaque salvo.');
      setIsFeatureEditorOpen(false);
      loadPartnersFromDb();
    } catch (err: any) {
      showToast(err?.message || 'Não foi possível salvar o card.', 'danger');
    } finally {
      setSavingFeature(false);
    }
  };

  const showFeature = featureAd && (activeTab === 'mentis' || (activeTab === 'marketplace' && (selectedCategory === 'todos' || selectedCategory === 'bemestar') && !deferredSearch.trim()));

  /* ---------------- Tela ---------------- */

  const tabs: { id: Tab; label: string; icon: LucideIcon; badge?: React.ReactNode }[] = [
    { id: 'marketplace', label: 'Ofertas', icon: Briefcase, badge: filteredAds.length || undefined },
    ...(featureAd ? [{ id: 'mentis' as Tab, label: featureAd.name, icon: Heart }] : []),
    ...(isGestor ? [{ id: 'prestadores' as Tab, label: 'Prestadores', icon: Building2 }] : []),
    ...(isAdminMaster ? [{ id: 'admin' as Tab, label: 'Homologação', icon: ShieldCheck, badge: pendingCount || undefined }] : []),
  ];

  return (
    <div className="space-y-6 pb-16 text-left">
      <ModuleHeader
        icon={Briefcase}
        title="Carreira e benefícios"
        text={
          <>
            Formação, bolsas, saúde emocional e ofertas de parceiros para professores e equipe.
            {(teacherName || teacherSubject) && (
              <span className="mt-1 block text-[13px]">
                {[teacherName, teacherSubject].filter(Boolean).join(' · ')}
              </span>
            )}
          </>
        }
        actions={
          <>
            {isGestor && activeTab === 'marketplace' && (
              <Button icon={Plus} onClick={() => setIsCommercialModalOpen(true)}>
                Cadastrar parceiro
              </Button>
            )}
            <RoundIconButton icon={RefreshCw} label="Atualizar" onClick={loadPartnersFromDb} spinning={isLoading} disabled={isLoading} />
            {onLogout && <RoundIconButton icon={LogOut} label="Sair" onClick={onLogout} />}
          </>
        }
      >
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 lg:flex-row lg:items-center lg:justify-between">
          <PillNav label="Seções" value={activeTab} onChange={setActiveTab} items={tabs} />
          {activeTab === 'marketplace' && (
            <div className="relative lg:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                aria-label="Buscar ofertas"
                placeholder="Pós-graduação, livros, psicologia…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cx(inputCls, 'pl-10')}
              />
            </div>
          )}
        </div>
      </ModuleHeader>

      {/* Categorias */}
      {activeTab === 'marketplace' && (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex w-max gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              const count = cat.id === 'todos' ? null : currentAdsList.filter((a) => !a.isMentisTherapy && a.category === cat.id && (isGestor || isApproved(a.status))).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cx(
                    'flex h-10 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-colors',
                    active ? 'border-transparent' : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-body)] hover:border-[var(--accent)]',
                  )}
                  style={active ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                  {count !== null && count > 0 && <span className="text-[11px] opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Destaque */}
      {showFeature && featureAd && <FeatureCard ad={featureAd} canEdit={canEditFeature} onEdit={() => setIsFeatureEditorOpen(true)} onVisit={() => handleAdClick(featureAd, 'website')} />}

      {/* Ofertas */}
      {activeTab === 'marketplace' &&
        (isLoading && currentAdsList.length === 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96 rounded-3xl" />
            ))}
          </div>
        ) : loadError && currentAdsList.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="Não foi possível carregar as ofertas"
            text="Verifique a conexão e tente de novo."
            action={
              <Button variant="secondary" icon={RefreshCw} onClick={loadPartnersFromDb}>
                Tentar de novo
              </Button>
            }
          />
        ) : filteredAds.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={deferredSearch.trim() || selectedCategory !== 'todos' ? 'Nenhuma oferta encontrada' : 'Ainda não há ofertas publicadas'}
            text={deferredSearch.trim() || selectedCategory !== 'todos' ? 'Tente outra busca ou outra categoria.' : isGestor ? 'Cadastre o primeiro parceiro para ele aparecer aqui.' : 'Quando a escola publicar ofertas de parceiros, elas aparecem aqui.'}
            action={
              deferredSearch.trim() || selectedCategory !== 'todos' ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('todos');
                  }}
                >
                  Limpar filtros
                </Button>
              ) : isGestor ? (
                <Button icon={Plus} onClick={() => setIsCommercialModalOpen(true)}>
                  Cadastrar parceiro
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredAds.map((ad) => (
              <OfferCard
                key={ad.id}
                ad={ad}
                compared={compareList.some((i) => i.id === ad.id)}
                onCompare={() => handleToggleCompare(ad)}
                onAction={(t) => handleAdClick(ad, t)}
                moderation={
                  isGestor ? (
                    <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                      {isApproved(ad.status) ? (
                        <Button size="sm" variant="ghost" icon={Ban} disabled={busyId === ad.id} onClick={() => changeApproval(ad, false)}>
                          Suspender
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" icon={Check} loading={busyId === ad.id} onClick={() => changeApproval(ad, true)}>
                          Aprovar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" icon={Trash2} disabled={busyId === ad.id} onClick={() => setDeleting(ad)}>
                        Excluir
                      </Button>
                    </div>
                  ) : null
                }
              />
            ))}
          </div>
        ))}

      {/* Barra do comparador */}
      {compareList.length > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-full border border-[var(--border)] bg-[var(--bg-card)] py-2 pl-5 pr-2 shadow-[0_20px_50px_-20px_rgba(16,24,40,0.45)]">
          <p className="truncate text-[14px] text-[var(--text-heading)]">
            <strong>{compareList.length}</strong> {compareList.length === 1 ? 'oferta selecionada' : 'ofertas selecionadas'} para comparar
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setCompareList([])}>
              Limpar
            </Button>
            <Button size="sm" icon={Layers} onClick={() => setIsCompareModalOpen(true)}>
              Comparar
            </Button>
          </div>
        </div>
      )}

      {/* Prestadores */}
      {activeTab === 'prestadores' && isGestor && (
        <div className="space-y-5">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex w-max gap-2">
              {PROVIDER_CATEGORIES.map((cat) => {
                const id = cat === 'Todos' ? 'todos' : cat;
                const active = providerCategory === id;
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setProviderCategory(id)}
                    className={cx(
                      'h-9 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
                      active ? 'border-transparent' : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-body)] hover:border-[var(--accent)]',
                    )}
                    style={active ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredProviders.length === 0 ? (
            <EmptyState icon={Building2} title="Nenhum prestador nesta categoria" text="Ainda não há prestadores aprovados aqui." />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredProviders.map((sp: any) => (
                <article key={sp.id} className="flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge>{sp.category}</Badge>
                    {sp.rating ? (
                      <span className="flex items-center gap-1 text-[13px] font-semibold text-[var(--text-heading)]">
                        <Star className="h-3.5 w-3.5 fill-[#F5B800] text-[#F5B800]" /> {sp.rating}
                        {sp.reviewCount ? <span className="font-normal text-[var(--text-muted)]">({sp.reviewCount})</span> : null}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-serif text-[18px] font-semibold text-[var(--text-heading)]">{sp.name}</h3>
                  {sp.location && <p className="text-[12px] text-[var(--text-muted)]">{sp.location}</p>}
                  <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-[var(--text-body)]">{sp.description}</p>
                  <div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-4">
                    {onlyDigits(sp.whatsapp || sp.phone) && (
                      <a
                        href={`https://wa.me/${onlyDigits(sp.whatsapp || sp.phone)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold"
                        style={{ background: '#E7F6EE', color: '#127A4B' }}
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    )}
                    {sp.website && (
                      <a
                        href={safeUrl(sp.website)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] text-[13px] font-semibold text-[var(--text-heading)] hover:border-[var(--accent)]"
                      >
                        <ExternalLink className="h-4 w-4" /> Site
                      </a>
                    )}
                    {!onlyDigits(sp.whatsapp || sp.phone) && !sp.website && <p className="text-[12px] text-[var(--text-muted)]">Sem contato cadastrado.</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin' && isAdminMaster && <CommercialAdminModule />}

      {/* Detalhes */}
      <Modal
        open={Boolean(selectedAdForDetail)}
        onClose={() => setSelectedAdForDetail(null)}
        size="md"
        icon={selectedAdForDetail?.logo ? <img src={selectedAdForDetail.logo} alt="" className="h-10 w-10 rounded-xl object-cover" /> : undefined}
        title={selectedAdForDetail?.name || ''}
        subtitle={selectedAdForDetail?.subCategory}
        footer={
          selectedAdForDetail && (
            <>
              {(selectedAdForDetail.primaryButtonLink || selectedAdForDetail.website) && (
                <Button variant="secondary" icon={ExternalLink} onClick={() => handleAdClick(selectedAdForDetail, 'website')}>
                  Site
                </Button>
              )}
              {onlyDigits(selectedAdForDetail.whatsapp) && (
                <Button icon={MessageCircle} onClick={() => handleAdClick(selectedAdForDetail, 'whatsapp')}>
                  Conversar no WhatsApp
                </Button>
              )}
            </>
          )
        }
      >
        {selectedAdForDetail && (
          <div className="space-y-4 text-[14px] leading-relaxed text-[var(--text-body)]">
            {selectedAdForDetail.description && <p>{selectedAdForDetail.description}</p>}
            {(selectedAdForDetail.highlights || []).length > 0 && (
              <ul className="space-y-1.5 rounded-2xl bg-[var(--bg-card-alt)] p-4">
                {selectedAdForDetail.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {selectedAdForDetail.price && <Detail label="Investimento" value={selectedAdForDetail.price} strong />}
              {selectedAdForDetail.duration && <Detail label="Duração" value={selectedAdForDetail.duration} />}
              {selectedAdForDetail.modality && <Detail label="Modalidade" value={selectedAdForDetail.modality} />}
              {selectedAdForDetail.location && <Detail label="Local" value={selectedAdForDetail.location} />}
            </dl>
            {selectedAdForDetail.catalogPdfUrl && (
              <Button variant="ghost" size="sm" icon={FileText} onClick={() => handleAdClick(selectedAdForDetail, 'catalog')}>
                Ver catálogo em PDF
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Comparador */}
      <Modal open={isCompareModalOpen} onClose={() => setIsCompareModalOpen(false)} size="lg" icon={<Layers className="h-5 w-5" />} title="Comparar ofertas" footer={<Button onClick={() => setIsCompareModalOpen(false)}>Fechar</Button>}>
        {compareList.length === 0 ? (
          <EmptyState icon={Layers} title="Nada para comparar" compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
              <thead>
                <tr>
                  <th className="w-32 border-b border-[var(--border)] p-3" />
                  {compareList.map((ad) => (
                    <th key={ad.id} className="border-b border-[var(--border)] p-3 align-top">
                      <div className="flex items-center gap-2">
                        {ad.logo && <img src={ad.logo} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--text-heading)]">{ad.name}</p>
                          <p className="truncate text-[12px] font-normal text-[var(--text-muted)]">{ad.subCategory}</p>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {[
                  ['Investimento', (a: PartnerAd) => a.price || '—'],
                  ['Duração', (a: PartnerAd) => a.duration || '—'],
                  ['Modalidade', (a: PartnerAd) => a.modality || '—'],
                  ['Avaliação', (a: PartnerAd) => (a.rating ? `${a.rating.toFixed(1)}${a.reviewCount ? ` (${a.reviewCount})` : ''}` : '—')],
                  ['Destaques', (a: PartnerAd) => (a.highlights || []).slice(0, 3).join(' · ') || '—'],
                ].map(([label, get]) => (
                  <tr key={label as string}>
                    <th className="p-3 align-top text-[12px] font-medium text-[var(--text-muted)]">{label as string}</th>
                    {compareList.map((ad) => (
                      <td key={ad.id} className="p-3 align-top text-[var(--text-heading)]">
                        {(get as (a: PartnerAd) => string)(ad)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th className="p-3" />
                  {compareList.map((ad) => (
                    <td key={ad.id} className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {onlyDigits(ad.whatsapp) && (
                          <Button size="sm" icon={MessageCircle} onClick={() => handleAdClick(ad, 'whatsapp')}>
                            WhatsApp
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" icon={X} onClick={() => handleToggleCompare(ad)}>
                          Tirar
                        </Button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Editor do destaque */}
      <Modal
        open={isFeatureEditorOpen && Boolean(featureAd)}
        onClose={() => !savingFeature && setIsFeatureEditorOpen(false)}
        size="lg"
        icon={<Edit className="h-5 w-5" />}
        title="Editar card em destaque"
        subtitle="As mudanças aparecem na prévia; só ficam salvas ao clicar em Salvar."
        footer={
          <>
            <Button variant="secondary" disabled={savingFeature} onClick={() => setIsFeatureEditorOpen(false)}>
              Fechar
            </Button>
            <Button icon={Save} loading={savingFeature} onClick={saveFeature}>
              Salvar
            </Button>
          </>
        }
      >
        {featureAd && (
          <div className="space-y-5">
            <div className="pointer-events-none origin-top scale-[0.92]">
              <FeatureCard ad={featureAd} compact />
            </div>

            <PillNav
              label="Partes do card"
              value={featureTab}
              onChange={setFeatureTab}
              items={[
                { id: 'info', label: 'Texto' },
                { id: 'preco', label: 'Preço' },
                { id: 'botao', label: 'Botão e contato' },
                { id: 'imagens', label: 'Imagens' },
                { id: 'aparencia', label: 'Aparência' },
              ]}
            />

            {featureTab === 'info' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome">{(id) => <input id={id} value={featureAd.name} onChange={(e) => updateFeature({ name: e.target.value })} className={inputCls} />}</Field>
                  <Field label="Segmento">{(id) => <input id={id} value={featureAd.subCategory || ''} onChange={(e) => updateFeature({ subCategory: e.target.value })} className={inputCls} />}</Field>
                </div>
                <Field label="Mensagem principal">
                  {(id) => (
                    <textarea
                      id={id}
                      rows={3}
                      value={featureAd.officialMessage || featureAd.description || ''}
                      onChange={(e) => updateFeature({ officialMessage: e.target.value })}
                      className={cx(inputCls, 'resize-y')}
                    />
                  )}
                </Field>
                <Field label="Frase de apoio">{(id) => <input id={id} value={featureAd.promoText || ''} onChange={(e) => updateFeature({ promoText: e.target.value })} className={inputCls} />}</Field>
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-[var(--text-heading)]">Benefícios</p>
                  <div className="space-y-2">
                    {featureTags.map((tag, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          aria-label={`Benefício ${i + 1}`}
                          value={tag}
                          onChange={(e) => updateFeature({ tags: featureTags.map((t, j) => (j === i ? e.target.value : t)) })}
                          className={inputCls}
                        />
                        <button
                          type="button"
                          aria-label="Remover benefício"
                          onClick={() => updateFeature({ tags: featureTags.filter((_, j) => j !== i) })}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[#FDECEC] hover:text-[#B42318]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button size="sm" variant="secondary" icon={Plus} onClick={() => updateFeature({ tags: [...featureTags, ''] })}>
                      Adicionar benefício
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {featureTab === 'preco' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Título do plano">{(id) => <input id={id} placeholder="Ex.: Plano para professores" value={featureAd.planTitle || ''} onChange={(e) => updateFeature({ planTitle: e.target.value })} className={inputCls} />}</Field>
                <Field label="Preço">{(id) => <input id={id} placeholder="Ex.: R$ 89,90 por sessão" value={featureAd.price || ''} onChange={(e) => updateFeature({ price: e.target.value })} className={inputCls} />}</Field>
                <Field label="Preço antes (opcional)">{(id) => <input id={id} value={featureAd.originalPrice || ''} onChange={(e) => updateFeature({ originalPrice: e.target.value })} className={inputCls} />}</Field>
                <Field label="Selo de desconto (opcional)">{(id) => <input id={id} placeholder="Ex.: 20% para professores" value={featureAd.discountBadge || ''} onChange={(e) => updateFeature({ discountBadge: e.target.value })} className={inputCls} />}</Field>
              </div>
            )}

            {featureTab === 'botao' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Texto do botão">{(id) => <input id={id} placeholder="Visitar site" value={featureAd.primaryButtonText || ''} onChange={(e) => updateFeature({ primaryButtonText: e.target.value })} className={inputCls} />}</Field>
                <Field label="Endereço do site">
                  {(id) => <input id={id} type="url" placeholder="https://" value={featureAd.primaryButtonLink || featureAd.website || ''} onChange={(e) => updateFeature({ primaryButtonLink: e.target.value })} className={inputCls} />}
                </Field>
                <Field label="WhatsApp" hint="Com DDD, só números.">
                  {(id) => <input id={id} inputMode="tel" placeholder="5511999999999" value={featureAd.whatsapp || ''} onChange={(e) => updateFeature({ whatsapp: onlyDigits(e.target.value) })} className={inputCls} />}
                </Field>
              </div>
            )}

            {featureTab === 'imagens' && (
              <div className="space-y-4">
                <Field label="Endereço da logo" hint="Imagem quadrada, de preferência PNG com fundo transparente.">
                  {(id) => <input id={id} type="url" value={featureAd.logo || ''} onChange={(e) => updateFeature({ logo: e.target.value })} className={inputCls} />}
                </Field>
                <Field label="Endereço do banner (opcional)">{(id) => <input id={id} type="url" placeholder="https://" value={featureAd.banner || ''} onChange={(e) => updateFeature({ banner: e.target.value })} className={inputCls} />}</Field>
                {featureAd.banner && <img src={featureAd.banner} alt="Prévia do banner" className="h-32 w-full rounded-2xl object-cover" />}
              </div>
            )}

            {featureTab === 'aparencia' && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-[var(--text-heading)]">Fundo</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {FEATURE_THEMES.map((t) => {
                      const active = (featureAd.colorGradient || '') === t.value;
                      return (
                        <button
                          key={t.name}
                          type="button"
                          aria-pressed={active}
                          onClick={() => updateFeature({ colorGradient: t.value })}
                          className={cx('flex items-center gap-2 rounded-2xl border p-2 text-left text-[13px] font-medium', active ? 'border-[var(--accent)] ring-4 ring-[var(--accent-soft)]' : 'border-[var(--border)]')}
                        >
                          <span className={cx('h-8 w-8 shrink-0 rounded-lg', t.value && `bg-gradient-to-r ${t.value}`)} style={t.value ? undefined : { background: 'var(--sidebar-bg)' }} />
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
                  <div>
                    <p className="text-[14px] font-medium text-[var(--text-heading)]">Selo de parceiro oficial</p>
                    <p className="text-[12px] text-[var(--text-muted)]">Mostra o selo ao lado do nome</p>
                  </div>
                  <Toggle label="Selo de parceiro oficial" checked={Boolean(featureAd.officialPartnerSeal)} onChange={(v) => updateFeature({ officialPartnerSeal: v })} />
                </div>
                {featureAd.officialPartnerSeal && (
                  <Field label="Texto do selo">{(id) => <input id={id} placeholder="Parceiro oficial" value={featureAd.sealText || ''} onChange={(e) => updateFeature({ sealText: e.target.value })} className={inputCls} />}</Field>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete} loading={busyId === deleting?.id} title="Remover parceiro?" confirmLabel="Remover" icon={Trash2}>
        <strong className="text-[var(--text-heading)]">“{deleting?.name}”</strong> sai do catálogo de ofertas. Não dá para desfazer.
      </ConfirmModal>

      <CommercialEcosystemModal isOpen={isCommercialModalOpen} onClose={() => setIsCommercialModalOpen(false)} onSuccessOpenDashboard={() => setIsDashboardModalOpen(true)} />
      <AdvertiserDashboardModal isOpen={isDashboardModalOpen} onClose={() => setIsDashboardModalOpen(false)} onOpenNewRegistration={() => setIsCommercialModalOpen(true)} />

      <Toast message={toast?.text ?? null} tone={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] px-4 py-3">
      <dt className="text-[12px] text-[var(--text-muted)]">{label}</dt>
      <dd className={cx('mt-0.5 text-[var(--text-heading)]', strong ? 'text-[16px] font-semibold' : 'font-medium')}>{value}</dd>
    </div>
  );
}

function Logo({ src, name, size = 56 }: { src?: string; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-2xl font-serif text-[20px] font-semibold"
        style={{ width: size, height: size, background: 'var(--accent-soft)', color: 'var(--accent)' }}
        aria-hidden
      >
        {name.trim().charAt(0).toUpperCase() || '?'}
      </span>
    );
  }
  return <img src={src} alt="" onError={() => setBroken(true)} className="shrink-0 rounded-2xl bg-white object-contain p-1" style={{ width: size, height: size }} />;
}

function OfferCard({
  ad,
  compared,
  onCompare,
  onAction,
  moderation,
}: {
  ad: PartnerAd;
  compared: boolean;
  onCompare: () => void;
  onAction: (t: 'whatsapp' | 'website' | 'details') => void;
  moderation: React.ReactNode;
}) {
  const hasWhats = Boolean(onlyDigits(ad.whatsapp));
  const hasSite = Boolean(ad.primaryButtonLink || ad.website);
  return (
    <article
      className={cx(
        'group flex flex-col rounded-3xl border bg-[var(--bg-card)] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-26px_rgba(16,24,40,0.45)]',
        ad.plan === 'diamante' ? 'border-[var(--accent)]' : 'border-[var(--border)]',
      )}
    >
      <div className="flex items-start gap-3">
        <Logo src={ad.logo} name={ad.name} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-serif text-[18px] font-semibold leading-snug text-[var(--text-heading)]">
            <span className="line-clamp-2">{ad.name}</span>
            {ad.officialPartnerSeal && <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-label="Parceiro oficial" />}
          </h3>
          {ad.subCategory && <p className="truncate text-[12px] text-[var(--text-muted)]">{ad.subCategory}</p>}
          {ad.rating > 0 && ad.reviewCount > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--text-heading)]">
              <Star className="h-3.5 w-3.5 fill-[#F5B800] text-[#F5B800]" /> {ad.rating.toFixed(1)} <span className="text-[var(--text-muted)]">({ad.reviewCount})</span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCompare}
          aria-pressed={compared}
          title={compared ? 'Tirar da comparação' : 'Comparar'}
          aria-label={compared ? 'Tirar da comparação' : 'Comparar'}
          className={cx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors',
            compared ? 'border-transparent' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
          )}
          style={compared ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>

      {ad.status !== 'aprovado' && (
        <div className="mt-3">
          <Badge tone={ad.status === 'pendente' ? 'warning' : 'danger'}>{ad.status === 'pendente' ? 'Aguardando aprovação' : 'Suspenso'}</Badge>
        </div>
      )}

      {(ad.highlights || []).length > 0 && (
        <ul className="mt-4 space-y-1.5 text-[13px] text-[var(--text-body)]">
          {ad.highlights.slice(0, 4).map((h, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
              <span className="leading-snug">{h}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="min-h-[16px] flex-1" aria-hidden />

      {(ad.price || ad.duration || ad.discountBadge) && (
        <div className="rounded-2xl bg-[var(--bg-card-alt)] px-4 py-3">
          {ad.duration && (
            <div className="flex justify-between text-[12px]">
              <span className="text-[var(--text-muted)]">Duração</span>
              <span className="font-medium text-[var(--text-heading)]">{ad.duration}</span>
            </div>
          )}
          {ad.price && (
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-[12px] text-[var(--text-muted)]">Investimento</span>
              <span className="text-right">
                {ad.originalPrice && <span className="mr-1.5 text-[12px] text-[var(--text-muted)] line-through">{ad.originalPrice}</span>}
                <span className="text-[16px] font-semibold text-[var(--text-heading)]">{ad.price}</span>
              </span>
            </div>
          )}
          {ad.discountBadge && (
            <div className="mt-2">
              <Badge tone="success">{ad.discountBadge}</Badge>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          {hasWhats && (
            <Button size="sm" icon={MessageCircle} className="flex-1" onClick={() => onAction('whatsapp')}>
              WhatsApp
            </Button>
          )}
          {hasSite && (
            <Button size="sm" variant="secondary" icon={ExternalLink} className="flex-1" onClick={() => onAction('website')}>
              Site
            </Button>
          )}
          <Button size="sm" variant={hasWhats || hasSite ? 'ghost' : 'secondary'} icon={Eye} className={hasWhats || hasSite ? '' : 'flex-1'} onClick={() => onAction('details')}>
            Detalhes
          </Button>
        </div>
        {moderation}
      </div>
    </article>
  );
}

function FeatureCard({ ad, canEdit, onEdit, onVisit, compact }: { ad: PartnerAd; canEdit?: boolean; onEdit?: () => void; onVisit?: () => void; compact?: boolean }) {
  const tags = (ad.tags || ad.highlights || []).filter(Boolean);
  const link = safeUrl(ad.primaryButtonLink || ad.website);
  const gradient = ad.colorGradient ? `bg-gradient-to-r ${ad.colorGradient}` : '';
  return (
    <section
      className={cx('relative overflow-hidden rounded-[28px] text-white', gradient, compact ? 'p-5' : 'p-6 sm:p-8')}
      style={gradient ? undefined : { background: 'var(--sidebar-bg)', color: 'var(--sidebar-fg)' }}
    >
      {ad.banner && <img src={ad.banner} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15" />}
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Logo src={ad.logo} name={ad.name} size={compact ? 56 : 72} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] opacity-70">Destaque</p>
            <h2 className="flex items-center gap-2 font-serif text-[24px] font-semibold leading-tight sm:text-[28px]">
              {ad.name}
              {ad.officialPartnerSeal && <BadgeCheck className="h-5 w-5 shrink-0" aria-label={ad.sealText || 'Parceiro oficial'} />}
            </h2>
            {ad.subCategory && <p className="text-[14px] opacity-80">{ad.subCategory}</p>}
          </div>
        </div>
        {(ad.price || ad.planTitle) && (
          <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur lg:text-right">
            {ad.planTitle && <p className="text-[12px] opacity-75">{ad.planTitle}</p>}
            {ad.price && (
              <p className="text-[22px] font-semibold">
                {ad.originalPrice && <span className="mr-2 text-[14px] font-normal line-through opacity-60">{ad.originalPrice}</span>}
                {ad.price}
              </p>
            )}
            {ad.discountBadge && <p className="text-[12px] font-semibold opacity-90">{ad.discountBadge}</p>}
          </div>
        )}
      </div>

      {(ad.officialMessage || ad.description) && <p className="relative mt-5 max-w-3xl font-serif text-[16px] leading-relaxed opacity-90">{ad.officialMessage || ad.description}</p>}

      {tags.length > 0 && (
        <ul className="relative mt-4 flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <li key={i} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px]">
              <Check className="h-3.5 w-3.5" /> {t}
            </li>
          ))}
        </ul>
      )}

      {!compact && (
        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onVisit}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-[#101828] transition-transform hover:-translate-y-0.5"
            >
              <ExternalLink className="h-4 w-4" />
              {ad.primaryButtonText || 'Visitar site'}
            </a>
          )}
          {ad.promoText && <p className="text-[13px] opacity-75">{ad.promoText}</p>}
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-full border border-white/30 px-4 text-[13px] font-semibold hover:bg-white/10"
            >
              <Edit className="h-4 w-4" /> Editar card
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default EducaCarreiraEBeneficios;