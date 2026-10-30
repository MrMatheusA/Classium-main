import { supabase } from '../lib/supabase';
import { PartnerAd, Professional, ServiceProvider } from '../context/PlatformContext';

const KEYS = {
  PROFESSIONALS: 'educa_professionals_v2',
  SERVICE_PROVIDERS: 'educa_service_providers_v2',
  CURRENT_PARTNER: 'educa_current_partner_v2',
};

// In-memory session cache ensuring seamless UX even if browser storage quota is exceeded
let inMemoryCurrentPartner: PartnerAd | null = null;

// Sanitize heavy payloads (e.g. large base64 data URLs) before persisting into browser localStorage
export function sanitizeAdForLocalStorage(ad: PartnerAd): PartnerAd {
  if (!ad) return ad;
  const clone = { ...ad };

  // If logo is a raw oversized data URL (> 2000 chars), replace with safe lightweight default
  if (clone.logo && clone.logo.startsWith('data:') && clone.logo.length > 2000) {
    clone.logo = 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150';
  }
  // If banner is a raw oversized data URL (> 2000 chars), replace or clear
  if (clone.banner && clone.banner.startsWith('data:') && clone.banner.length > 2000) {
    clone.banner = '';
  }
  // Prune long billing history in local storage
  if (Array.isArray(clone.billingHistory) && clone.billingHistory.length > 5) {
    clone.billingHistory = clone.billingHistory.slice(0, 5);
  }
  // Prune leads list in local storage
  if (Array.isArray(clone.leadsList) && clone.leadsList.length > 10) {
    clone.leadsList = clone.leadsList.slice(0, 10);
  }
  return clone;
}

// Resilient localStorage setter with QuotaExceededError protection and multi-tier fallbacks
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`LocalStorage quota exceeded or blocked for '${key}'. Executing cleanup & fallback:`, err?.message || err);

    // 1. Quota recovery: clear transient/legacy keys that might be filling up storage
    try {
      const keysToClean = ['classium_generated_docs_history', 'classium_debug_logs', 'educa_temp_upload'];
      for (const k of keysToClean) {
        localStorage.removeItem(k);
      }
    } catch {}

    // 2. Retry setItem once after cleanup
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      // 3. Fallback to sessionStorage
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch (sessionErr) {
        console.warn(`SessionStorage fallback note for '${key}':`, sessionErr);
      }
    }
  }
  return false;
}

export const PartnerPersistenceService = {
  // Load Professionals
  loadProfessionals(initialDefault: Professional[] = []): Professional[] {
    try {
      const stored = localStorage.getItem(KEYS.PROFESSIONALS) || sessionStorage.getItem(KEYS.PROFESSIONALS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading professionals from localStorage:', e);
    }
    return initialDefault;
  },

  // Save Professionals locally and sync to Supabase
  async saveProfessionals(profs: Professional[]): Promise<void> {
    try {
      safeLocalStorageSet(KEYS.PROFESSIONALS, JSON.stringify((profs || []).slice(0, 50)));
    } catch (e) {
      console.warn('Error saving professionals to localStorage:', e);
    }

    try {
      if (profs.length === 0) return;
      const dbRows = profs.map(p => {
        const pAny = p as any;
        return {
          id: p.id,
          organization_id: pAny.organization_id || pAny.school_id || null,
          full_name: p.name || 'Profissional',
          name: p.name || 'Profissional',
          role_category: pAny.role_category || pAny.category || 'Profissionais da Educação',
          professional_title: pAny.title || p.specialty || 'Especialista',
          hourly_rate: pAny.pricePerHour || pAny.hourly_rate || 0,
          city: p.city || pAny.location || 'Curitiba',
          status: p.status === 'Aprovado' || pAny.status === 'approved' || pAny.status === 'active' ? 'approved' : 'pending_approval',
          avatar_url: pAny.avatarUrl || p.avatar || null,
          is_verified: pAny.isVerified !== false,
          updated_at: new Date().toISOString()
        };
      });
      const { error } = await supabase.from('professionals').upsert(dbRows, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase professionals upsert note:', error.message);
      }
    } catch (err) {
      console.warn('Supabase professionals sync note:', err);
    }
  },

  // Load Service Providers
  loadServiceProviders(initialDefault: ServiceProvider[] = []): ServiceProvider[] {
    try {
      const stored = localStorage.getItem(KEYS.SERVICE_PROVIDERS) || sessionStorage.getItem(KEYS.SERVICE_PROVIDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading service providers from localStorage:', e);
    }
    return initialDefault;
  },

  // Save Service Providers
  async saveServiceProviders(providers: ServiceProvider[]): Promise<void> {
    try {
      safeLocalStorageSet(KEYS.SERVICE_PROVIDERS, JSON.stringify((providers || []).slice(0, 50)));
    } catch (e) {
      console.warn('Error saving service providers to localStorage:', e);
    }

    try {
      if (providers.length === 0) return;
      const dbRows = providers.map(sp => ({
        id: sp.id,
        name: sp.name,
        cnpj: sp.cnpj,
        email: sp.email,
        phone: sp.phone,
        category: sp.category,
        plan: sp.plan,
        status: sp.status,
        location: sp.location,
        description: sp.description,
        rating: sp.rating,
        review_count: sp.reviewCount,
        payload: sp,
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('service_providers').upsert(dbRows, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase service_providers upsert note:', error.message);
      }
    } catch (err) {
      console.warn('Supabase service_providers sync note:', err);
    }
  },

  // Fetch Remote Professionals directly from Supabase (Strictly published/approved)
  async fetchRemoteProfessionals(): Promise<Professional[] | null> {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return null;
      }

      return data.map((row: any) => ({
        ...(row.payload || {}),
        id: row.id,
        name: row.full_name || row.name || row.payload?.name || 'Profissional Especialista',
        title: row.professional_title || row.payload?.title || 'Especialista',
        roleType: row.role_category || row.payload?.roleType || 'Profissionais da Educação',
        category: row.role_category || row.payload?.category || 'Profissionais da Educação',
        subjects: Array.isArray(row.specialties) ? row.specialties : (row.payload?.subjects || ['Reforço Escolar']),
        pricePerHour: row.hourly_rate ? Number(row.hourly_rate) : (row.payload?.pricePerHour || 80),
        rating: row.rating ? Number(row.rating) : (row.payload?.rating || 5.0),
        reviewCount: row.review_count !== undefined ? Number(row.review_count) : (row.payload?.reviewCount || 0),
        location: row.location_label || `${row.city || 'Curitiba'} - ${row.state || 'PR'}`,
        neighborhood: row.payload?.neighborhood || 'Centro',
        city: row.city || row.payload?.city || 'Curitiba',
        state: row.state || row.payload?.state || 'PR',
        avatarUrl: row.profile_picture_url || row.avatar || row.payload?.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200',
        coverUrl: row.cover_picture_url || row.payload?.coverUrl || '',
        planTier: row.plan_tier || row.payload?.planTier || 'ouro',
        isVerified: row.is_verified === true,
        cpfValidated: row.cpf_validated === true,
        degrees: row.payload?.degrees || ['Graduação Especializada'],
        postGraduation: row.payload?.postGraduation || 'Especialização Executiva',
        experienceYears: row.payload?.experienceYears || 5,
        bio: row.description || row.payload?.bio || 'Profissional especialista dedicado ao acompanhamento e desenvolvimento educacional e psicopedagógico.',
        university: row.payload?.university || 'Universidade Federal',
        modalities: Array.isArray(row.payload?.modalities) ? row.payload.modalities : ['Presencial', 'Online'],
        availableDays: row.payload?.availableDays || ['Segunda', 'Quarta', 'Sexta'],
        scheduleSlots: row.payload?.scheduleSlots || [
          { day: 'Segunda-feira', time: '09:00 - 10:00', status: 'Livre' },
          { day: 'Quarta-feira', time: '14:00 - 15:00', status: 'Livre' }
        ],
        whatsapp: row.whatsapp || row.contact_phone || row.payload?.whatsapp || '(11) 98765-4321',
        email: row.contact_email || row.payload?.email || '',
        instagram: row.instagram_url || row.payload?.instagram || '',
        website: row.website_url || row.payload?.website || '',
        reviews: row.payload?.reviews || []
      }));
    } catch (err) {
      console.warn('Error fetching remote professionals:', err);
      return null;
    }
  },

  // Fetch Remote Service Providers directly from Supabase
  async fetchRemoteServiceProviders(): Promise<ServiceProvider[] | null> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return null;
      }

      return data.map((row: any) => ({
        ...(row.payload || {}),
        id: row.id,
        name: row.name || row.payload?.name || '',
        cnpj: row.cnpj || row.payload?.cnpj || '',
        email: row.email || row.payload?.email || '',
        phone: row.phone || row.payload?.phone || '',
        category: row.category || row.payload?.category || '',
        plan: row.plan || row.payload?.plan || 'Prata',
        status: row.status || row.payload?.status || 'Ativo',
        location: row.location || row.payload?.location || '',
        description: row.description || row.payload?.description || '',
        rating: row.rating || row.payload?.rating || 5,
        reviewCount: row.review_count ?? row.payload?.reviewCount ?? 0
      }));
    } catch (err) {
      console.warn('Error fetching remote service providers:', err);
      return null;
    }
  },

  // Session & Local Storage Auth for Portal do Parceiro
  loadCurrentPartnerSession(): PartnerAd | null {
    if (inMemoryCurrentPartner) {
      return inMemoryCurrentPartner;
    }
    try {
      const stored = localStorage.getItem(KEYS.CURRENT_PARTNER) || sessionStorage.getItem(KEYS.CURRENT_PARTNER);
      if (stored) {
        const parsed = JSON.parse(stored);
        inMemoryCurrentPartner = parsed;
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  },

  saveCurrentPartnerSession(partner: PartnerAd | null): void {
    inMemoryCurrentPartner = partner;
    if (partner) {
      const sanitized = sanitizeAdForLocalStorage(partner);
      safeLocalStorageSet(KEYS.CURRENT_PARTNER, JSON.stringify(sanitized));
    } else {
      try {
        localStorage.removeItem(KEYS.CURRENT_PARTNER);
      } catch {}
      try {
        sessionStorage.removeItem(KEYS.CURRENT_PARTNER);
      } catch {}
    }
  }
};
