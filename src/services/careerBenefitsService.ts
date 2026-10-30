import { PartnerService, CanonicalPartner, CreatePartnerPayload, UpdatePartnerPayload } from './partnerService';
import { integrationHub } from '../lib/integrationHub';
import { PartnerAd } from '../components/carreira/EducaCarreiraEBeneficios';

export interface FetchPartnersOptions {
  category?: string;
  search?: string;
  onlyApproved?: boolean;
  organizationId?: string;
  schoolId?: string;
}

export interface PartnerMetricResult {
  success: boolean;
  metric?: string;
  current_value?: number;
  error?: string;
}

export class CareerBenefitsService {
  /**
   * Helper to map CanonicalPartner DB record to PartnerAd UI interface
   */
  static mapCanonicalPartnerToPartnerAd(partner: CanonicalPartner): PartnerAd {
    const meta = partner.metadata || {};

    let highlightsArr: string[] = [];
    if (Array.isArray(meta.highlights)) {
      highlightsArr = meta.highlights;
    } else if (typeof meta.highlights === 'string') {
      try {
        const parsed = JSON.parse(meta.highlights);
        if (Array.isArray(parsed)) highlightsArr = parsed;
        else highlightsArr = [meta.highlights];
      } catch {
        highlightsArr = meta.highlights.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    let tagsArr: string[] = [];
    if (Array.isArray(meta.tags)) {
      tagsArr = meta.tags;
    } else if (typeof meta.tags === 'string') {
      try {
        const parsed = JSON.parse(meta.tags);
        if (Array.isArray(parsed)) tagsArr = parsed;
        else tagsArr = [meta.tags];
      } catch {
        tagsArr = meta.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    return {
      id: partner.id,
      name: partner.partner_name || 'Parceiro Educacional',
      logo: meta.logo || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
      banner: meta.banner,
      rating: Number(meta.rating) || 5.0,
      reviewCount: Number(meta.reviewCount) || 0,
      category: (partner.category as any) || 'formacao',
      subCategory: meta.subCategory || '',
      plan: (partner.plan_id as any) || 'ouro',
      highlights: highlightsArr,
      duration: meta.duration,
      modality: meta.modality || 'Online',
      price: meta.price,
      originalPrice: meta.originalPrice,
      discountBadge: meta.discountBadge,
      vipExclusive: Boolean(meta.vipExclusive),
      isMentisTherapy: Boolean(meta.isMentisTherapy),
      whatsapp: partner.phone || meta.whatsapp || '',
      website: partner.website || '',
      catalogPdfUrl: meta.catalogPdfUrl,
      description: partner.description || '',
      officialPartnerSeal: Boolean(meta.officialPartnerSeal),
      status: (partner.status === 'active' && partner.approval_status === 'approved') ? 'aprovado' : 'pendente',
      views: Number(meta.views) || 0,
      clicks: Number(meta.clicks) || 0,
      leadsGenerated: Number(meta.leadsGenerated) || 0,
      location: meta.location || 'Nacional',
      primaryButtonLink: meta.primaryButtonLink || partner.website || '',
      tags: tagsArr,
      officialMessage: meta.officialMessage,
      promoText: meta.promoText,
      planTitle: meta.planTitle,
      primaryButtonText: meta.primaryButtonText,
      secondaryButtonText: meta.secondaryButtonText,
      colorGradient: meta.colorGradient,
      sealText: meta.sealText
    };
  }

  /**
   * Fetch partners strictly from canonical PartnerService (/api/partners)
   */
  static async getPartners(options: FetchPartnersOptions = {}): Promise<PartnerAd[]> {
    try {
      // 1. Fetch from canonical PartnerService
      const canonicalPartners = await PartnerService.listPartners();

      // 2. Filter active & approved partners for the showcase vitrine
      let activeAndApproved = canonicalPartners.filter(p => 
        p.is_active && p.status === 'active' && p.approval_status === 'approved'
      );

      // 3. Filter by category if requested
      if (options.category && options.category !== 'todos') {
        activeAndApproved = activeAndApproved.filter(p => p.category === options.category);
      }

      // 4. Map to PartnerAd[]
      let mapped = activeAndApproved.map(p => this.mapCanonicalPartnerToPartnerAd(p));

      // 5. Filter by search query if requested
      if (options.search) {
        const s = options.search.toLowerCase().trim();
        mapped = mapped.filter(item => 
          item.name.toLowerCase().includes(s) ||
          item.description.toLowerCase().includes(s) ||
          item.category.toLowerCase().includes(s) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(s)) ||
          (item.highlights && item.highlights.some(h => h.toLowerCase().includes(s))) ||
          (item.tags && item.tags.some(t => t.toLowerCase().includes(s)))
        );
      }

      return mapped;
    } catch (err) {
      console.warn('[CareerBenefitsService.getPartners] Canonical fetch failed:', err);
      // ABSOLUTE RULE: NO MOCK / NO FALLBACK TO STATIC DATA
      return [];
    }
  }

  /**
   * Create or update partner in Canonical PartnerService
   */
  static async savePartner(
    partner: Partial<PartnerAd>, 
    organizationId?: string,
    schoolId?: string
  ): Promise<{ success: boolean; data?: PartnerAd; error?: string }> {
    try {
      let result: CanonicalPartner;

      const isCanonicalUuid = Boolean(
        partner.id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partner.id) &&
        !partner.id.startsWith('temp-') &&
        !partner.id.startsWith('ad-custom-')
      );

      if (isCanonicalUuid && partner.id) {
        // 1. Obter o registro canônico real do banco de dados imediatamente antes de montar o payload
        const canonical = await PartnerService.getPartnerById(partner.id);

        // 2. Base de preservação integral do metadata canônico existente
        const baseMetadata: Record<string, unknown> = {
          ...(canonical.metadata || {})
        };

        // 3. Atualizar somente os campos gerenciados que foram efetivamente fornecidos pelo chamador
        const updatedMetadata: Record<string, unknown> = {
          ...baseMetadata
        };

        if (partner.logo !== undefined) updatedMetadata.logo = partner.logo;
        if (partner.banner !== undefined) updatedMetadata.banner = partner.banner;
        if (partner.rating !== undefined) updatedMetadata.rating = partner.rating;
        if (partner.reviewCount !== undefined) updatedMetadata.reviewCount = partner.reviewCount;
        if (partner.subCategory !== undefined) updatedMetadata.subCategory = partner.subCategory;
        if (partner.highlights !== undefined) updatedMetadata.highlights = partner.highlights;
        if (partner.duration !== undefined) updatedMetadata.duration = partner.duration;
        if (partner.modality !== undefined) updatedMetadata.modality = partner.modality;
        if (partner.price !== undefined) updatedMetadata.price = partner.price;
        if (partner.originalPrice !== undefined) updatedMetadata.originalPrice = partner.originalPrice;
        if (partner.discountBadge !== undefined) updatedMetadata.discountBadge = partner.discountBadge;
        if (partner.vipExclusive !== undefined) updatedMetadata.vipExclusive = partner.vipExclusive;
        if (partner.isMentisTherapy !== undefined) updatedMetadata.isMentisTherapy = partner.isMentisTherapy;
        if (partner.whatsapp !== undefined) updatedMetadata.whatsapp = partner.whatsapp;
        if (partner.catalogPdfUrl !== undefined) updatedMetadata.catalogPdfUrl = partner.catalogPdfUrl;
        if (partner.officialPartnerSeal !== undefined) updatedMetadata.officialPartnerSeal = partner.officialPartnerSeal;
        if (partner.location !== undefined) updatedMetadata.location = partner.location;
        if (partner.primaryButtonLink !== undefined) {
          updatedMetadata.primaryButtonLink = partner.primaryButtonLink;
        } else if (partner.website !== undefined && !baseMetadata.primaryButtonLink) {
          updatedMetadata.primaryButtonLink = partner.website;
        }
        if (partner.tags !== undefined) updatedMetadata.tags = partner.tags;
        if (partner.officialMessage !== undefined) updatedMetadata.officialMessage = partner.officialMessage;
        if (partner.promoText !== undefined) updatedMetadata.promoText = partner.promoText;
        if (partner.planTitle !== undefined) updatedMetadata.planTitle = partner.planTitle;
        if (partner.primaryButtonText !== undefined) updatedMetadata.primaryButtonText = partner.primaryButtonText;
        if (partner.secondaryButtonText !== undefined) updatedMetadata.secondaryButtonText = partner.secondaryButtonText;
        if (partner.colorGradient !== undefined) updatedMetadata.colorGradient = partner.colorGradient;
        if (partner.sealText !== undefined) updatedMetadata.sealText = partner.sealText;

        // 4. Montar payload de atualização canônica preservando os campos cadastrais diretos
        const updatePayload: UpdatePartnerPayload = {
          partner_name: partner.name !== undefined ? partner.name : canonical.partner_name,
          description: partner.description !== undefined ? partner.description : canonical.description,
          website: partner.website !== undefined ? partner.website : canonical.website,
          phone: partner.whatsapp !== undefined ? partner.whatsapp : canonical.phone,
          category: partner.category !== undefined ? partner.category : canonical.category,
          plan_id: partner.plan !== undefined ? partner.plan : canonical.plan_id,
          metadata: updatedMetadata
        };

        // Update existing canonical partner
        result = await PartnerService.updatePartner(partner.id, updatePayload);
      } else {
        // Create new canonical partner onboarding (fluxo de criação inicial)
        const initialMetadata: Record<string, unknown> = {
          logo: partner.logo,
          banner: partner.banner,
          rating: partner.rating !== undefined ? partner.rating : 5.0,
          reviewCount: partner.reviewCount !== undefined ? partner.reviewCount : 0,
          subCategory: partner.subCategory,
          highlights: partner.highlights || [],
          duration: partner.duration,
          modality: partner.modality || 'Online',
          price: partner.price,
          originalPrice: partner.originalPrice,
          discountBadge: partner.discountBadge,
          vipExclusive: partner.vipExclusive ?? false,
          isMentisTherapy: partner.isMentisTherapy ?? false,
          whatsapp: partner.whatsapp,
          catalogPdfUrl: partner.catalogPdfUrl,
          officialPartnerSeal: partner.officialPartnerSeal ?? (partner.plan === 'diamante'),
          location: partner.location || 'Nacional',
          primaryButtonLink: partner.primaryButtonLink || partner.website,
          tags: partner.tags || [],
          officialMessage: partner.officialMessage,
          promoText: partner.promoText,
          planTitle: partner.planTitle,
          primaryButtonText: partner.primaryButtonText,
          secondaryButtonText: partner.secondaryButtonText,
          colorGradient: partner.colorGradient,
          sealText: partner.sealText,
          views: partner.views || 0,
          clicks: partner.clicks || 0,
          leadsGenerated: partner.leadsGenerated || 0
        };

        const createPayload: CreatePartnerPayload = {
          partner_name: partner.name || 'Novo Parceiro',
          description: partner.description,
          website: partner.website,
          phone: partner.whatsapp,
          category: partner.category || 'formacao',
          plan_id: partner.plan || 'ouro',
          metadata: initialMetadata
        };

        result = await PartnerService.createPartner(createPayload);
      }

      // Publish Realtime event to Integration Hub
      integrationHub.publishEvent({
        type: 'ItemUpdated',
        moduleSource: 'Gestor',
        targetScope: { targetType: 'all', targetName: 'Portal Docente & Gestor' },
        entity: 'conecta',
        action: 'Benefício / Parceiro Atualizado',
        title: partner.name || 'Parceiro Educacional',
        description: 'Benefício atualizado e sincronizado no Núcleo Canônico de Parceiros.',
        user: { name: 'Gestor Escolar', role: 'Administração', ip: '127.0.0.1' }
      });

      return { success: true, data: this.mapCanonicalPartnerToPartnerAd(result) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao salvar parceiro no núcleo canônico.' };
    }
  }

  /**
   * Delete partner via Canonical PartnerService
   */
  static async deletePartner(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await PartnerService.deletePartner(id);

      integrationHub.publishEvent({
        type: 'ItemDeleted',
        moduleSource: 'Gestor',
        targetScope: { targetType: 'all', targetName: 'Portal Docente & Gestor' },
        entity: 'conecta',
        action: 'Benefício Removido',
        title: 'Parceiro Desvinculado',
        description: 'O parceiro foi removido do Núcleo Canônico de Parceiros.',
        user: { name: 'Gestor Escolar', role: 'Administração', ip: '127.0.0.1' }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao remover parceiro.' };
    }
  }

  /**
   * Record metric (view, click, lead) via Canonical PartnerService metadata update
   */
  static async recordMetric(id: string, metricType: 'view' | 'click' | 'lead' = 'click'): Promise<PartnerMetricResult> {
    try {
      if (!id || id.startsWith('temp-') || id.startsWith('ad-custom-')) {
        return { success: true };
      }

      const partner = await PartnerService.getPartnerById(id).catch(() => null);
      if (partner) {
        const metadata = partner.metadata || {};
        const key = metricType === 'view' ? 'views' : metricType === 'lead' ? 'leadsGenerated' : 'clicks';
        const currentVal = Number(metadata[key]) || 0;
        metadata[key] = currentVal + 1;

        await PartnerService.updatePartner(id, { metadata }).catch(() => {});
        return { success: true, metric: metricType, current_value: metadata[key] };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  static async recordClick(id: string): Promise<void> {
    await this.recordMetric(id, 'click');
  }

  static async recordLead(id: string): Promise<void> {
    await this.recordMetric(id, 'lead');
  }

  static async recordView(id: string): Promise<void> {
    await this.recordMetric(id, 'view');
  }

  /**
   * Helper for image upload using base64 data URL
   */
  static async uploadImage(file: File, folder = 'logos'): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { success: true, url: base64 };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro no upload da imagem.' };
    }
  }

  /**
   * Subscribe to Realtime events via IntegrationHub
   */
  static subscribeToPartnerChanges(callback: () => void, organizationId?: string) {
    const unsubHub = integrationHub.subscribe((e) => {
      if (e.entity === 'conecta') {
        callback();
      }
    });

    return () => {
      unsubHub();
    };
  }
}
