import { supabase } from '../lib/supabase';
import { friendlyDbError, isUuid, safeFileName } from './tenant';

export interface InstitutionData {
  id: string;
  name?: string;
  official_name?: string;
  legal_name?: string;
  fantasy_name?: string;
  trade_name?: string;
  document_number?: string;
  cnpj?: string;
  state_registration?: string;
  inep_code?: string;
  email?: string;
  phone?: string;
  phone_fixed?: string;
  phone_mobile?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  logo_url?: string | null;
  platform_url?: string | null;
  website?: string | null;
  status?: string;
  plan_status?: string;
  is_active?: boolean;
  can_edit?: boolean;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface SchoolShiftData {
  id: string;
  organization_id?: string;
  name: string;
  start_time: string;
  end_time: string;
  interval_start?: string;
  interval_end?: string;
  created_at?: string;
}

export type ManagementRole =
  | 'Diretor(a) Geral'
  | 'Vice-Diretor(a)'
  | 'Pedagogo(a)'
  | 'Supervisor(a)'
  | 'Coordenador(a) Pedagógico(a)'
  | 'Outro';

export const MANAGEMENT_ROLES: ManagementRole[] = [
  'Diretor(a) Geral',
  'Vice-Diretor(a)',
  'Pedagogo(a)',
  'Supervisor(a)',
  'Coordenador(a) Pedagógico(a)',
  'Outro',
];

export interface ManagementTeamMember {
  id: string;
  organization_id?: string;
  school_id?: string;
  name: string;
  role: ManagementRole;
  custom_role_title?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

const NO_SCHOOL = 'Não foi possível identificar a escola. Saia e entre de novo no sistema.';

function formatCnpj(raw?: string | null): string {
  const d = (raw || '').replace(/\D/g, '');
  if (d.length !== 14) return raw || '';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Linha de organizations → formato usado pelas telas */
function toInstitution(row: any): InstitutionData {
  const settings = row?.settings || {};
  const cnpj = formatCnpj(row?.document_number);
  return {
    ...row,
    id: row.id,
    name: row.name || '',
    official_name: row.name || '',
    legal_name: row.name || '',
    fantasy_name: row.trade_name || '',
    trade_name: row.trade_name || '',
    document_number: cnpj,
    cnpj,
    state_registration: settings.state_registration || '',
    inep_code: row.inep_code || '',
    email: row.email || '',
    phone: row.phone || '',
    phone_fixed: row.phone || '',
    phone_mobile: settings.phone_mobile || '',
    address: row.address || '',
    city: row.city || '',
    state: row.state || '',
    postal_code: row.postal_code || '',
    logo_url: row.logo_url || '',
    platform_url: row.platform_url || settings.platform_url || '',
    website: row.website || '',
    status: row.status || 'active',
    is_active: row.is_active !== false,
    can_edit: row.can_edit === true,
    settings,
  };
}

function toMember(m: any): ManagementTeamMember {
  return {
    id: m.id,
    organization_id: m.organization_id,
    school_id: m.school_id,
    name: m.full_name || m.name || '',
    role: (MANAGEMENT_ROLES.includes(m.role) ? m.role : 'Outro') as ManagementRole,
    custom_role_title: m.custom_role_title || (MANAGEMENT_ROLES.includes(m.role) ? undefined : m.role || undefined),
    email: m.email || '',
    phone: m.phone || '',
    is_active: m.status !== 'inativo' && !m.deleted_at,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

export const institutionService = {
  /** Dados da escola. Lança erro se não conseguir ler (sem cópia antiga do navegador). */
  async getOrganization(organizationId?: string): Promise<InstitutionData> {
    if (!isUuid(organizationId)) throw new Error(NO_SCHOOL);

    const { data, error } = await supabase.rpc('classium_get_organization', { p_org: organizationId });
    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível carregar os dados da escola.'));
    if (!data) throw new Error('Seu usuário não tem acesso aos dados desta escola.');
    return toInstitution(data);
  },

  /** Grava os dados da escola. Só diz que salvou se o banco confirmar. */
  async updateOrganization(organizationId: string, payload: Partial<InstitutionData>): Promise<{ success: boolean; data?: InstitutionData; error?: string }> {
    const orgId = isUuid(organizationId) ? organizationId : isUuid(payload.id) ? payload.id : null;
    if (!orgId) return { success: false, error: NO_SCHOOL };

    const name = (payload.official_name || payload.legal_name || payload.name || '').trim();
    if (!name) return { success: false, error: 'Informe o nome oficial da escola.' };

    const cnpjDigits = (payload.cnpj || payload.document_number || '').replace(/\D/g, '');
    if (cnpjDigits && cnpjDigits.length !== 14) return { success: false, error: 'CNPJ incompleto. Confira os 14 números.' };

    const email = (payload.email || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'E-mail inválido.' };

    const body: Record<string, any> = {
      name,
      trade_name: (payload.fantasy_name || payload.trade_name || '').trim(),
      document_number: cnpjDigits,
      inep_code: (payload.inep_code || '').trim(),
      email,
      phone: (payload.phone_fixed || payload.phone || '').trim(),
      address: (payload.address || '').trim(),
      city: (payload.city || '').trim(),
      state: (payload.state || '').trim(),
      postal_code: (payload.postal_code || '').trim(),
      website: (payload.website || '').trim(),
      settings: {
        state_registration: (payload.state_registration || '').trim(),
        phone_mobile: (payload.phone_mobile || '').trim(),
      },
    };
    if (payload.logo_url !== undefined) body.logo_url = payload.logo_url || '';

    const { data, error } = await supabase.rpc('classium_update_organization', { p_org: orgId, p_payload: body });
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível salvar os dados da escola.') };
    if (!data?.success) return { success: false, error: data?.error || 'Não foi possível salvar os dados da escola.' };

    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('classium_school_updated'));
    return { success: true, data: toInstitution(data.data) };
  },

  /** Envia o logo para o espaço da escola e devolve o endereço da imagem */
  async uploadLogo(organizationId: string, file: File): Promise<string> {
    if (!isUuid(organizationId)) throw new Error(NO_SCHOOL);
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) throw new Error('Envie o logo em PNG, JPG, WEBP ou SVG.');
    if (file.size > 5 * 1024 * 1024) throw new Error('O logo passa de 5 MB. Use uma imagem menor.');

    const path = `${organizationId}/${Date.now()}_${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from('school-logos').upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível enviar o logo.'));
    return supabase.storage.from('school-logos').getPublicUrl(path).data.publicUrl;
  },

  /* ---------------------------- Turnos ---------------------------- */

  async getShifts(organizationId?: string): Promise<SchoolShiftData[]> {
    if (!isUuid(organizationId)) return [];
    const { data, error } = await supabase
      .from('school_shifts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[institutionService] Turnos:', error.message);
      return [];
    }
    return (data || []) as SchoolShiftData[];
  },

  async createShift(payload: Partial<SchoolShiftData>, organizationId?: string): Promise<{ success: boolean; data?: SchoolShiftData; error?: string }> {
    if (!isUuid(organizationId)) return { success: false, error: NO_SCHOOL };
    if (!payload.name?.trim() || !payload.start_time || !payload.end_time) return { success: false, error: 'Informe o nome, o início e o fim do turno.' };
    const { data, error } = await supabase
      .from('school_shifts')
      .insert([{ organization_id: organizationId, name: payload.name.trim(), start_time: payload.start_time, end_time: payload.end_time }])
      .select()
      .single();
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível cadastrar o turno.') };
    return { success: true, data };
  },

  async updateShift(shiftId: string, payload: Partial<SchoolShiftData>): Promise<{ success: boolean; data?: SchoolShiftData; error?: string }> {
    const { data, error } = await supabase
      .from('school_shifts')
      .update({ name: payload.name, start_time: payload.start_time, end_time: payload.end_time })
      .eq('id', shiftId)
      .select()
      .maybeSingle();
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível salvar o turno.') };
    if (!data) return { success: false, error: 'Turno não encontrado ou sem permissão.' };
    return { success: true, data };
  },

  async deleteShift(shiftId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.from('school_shifts').delete().eq('id', shiftId).select('id');
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível excluir o turno.') };
    if (!data || data.length === 0) return { success: false, error: 'Turno não encontrado ou sem permissão.' };
    return { success: true };
  },

  /* ------------------------ Equipe gestora ------------------------ */

  /** Direção e coordenação (registros de school_staff marcados como gestão) */
  async getManagementTeam(organizationId?: string): Promise<ManagementTeamMember[]> {
    if (!isUuid(organizationId)) throw new Error(NO_SCHOOL);
    const { data, error } = await supabase
      .from('school_staff')
      .select('id, organization_id, school_id, full_name, name, role, custom_role_title, email, phone, status, deleted_at, created_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('is_management', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível carregar a equipe gestora.'));

    const order = (r: ManagementRole) => MANAGEMENT_ROLES.indexOf(r);
    return ((data || []) as any[]).map(toMember).sort((a, b) => order(a.role) - order(b.role));
  },

  async addManagementTeamMember(organizationId: string, member: Partial<ManagementTeamMember>): Promise<{ success: boolean; data?: ManagementTeamMember; error?: string }> {
    if (!isUuid(organizationId)) return { success: false, error: NO_SCHOOL };
    const name = (member.name || '').trim();
    if (!name) return { success: false, error: 'Informe o nome.' };
    if (member.role === 'Outro' && !member.custom_role_title?.trim()) return { success: false, error: 'Informe o nome do cargo.' };

    const { data, error } = await supabase
      .from('school_staff')
      .insert([{
        organization_id: organizationId,
        full_name: name,
        name,
        role: member.role || 'Outro',
        custom_role_title: member.role === 'Outro' ? member.custom_role_title?.trim() : null,
        job_title: member.role === 'Outro' ? member.custom_role_title?.trim() : member.role,
        email: member.email?.trim() || null,
        phone: member.phone?.trim() || null,
        is_management: true,
        status: 'ativo',
      }])
      .select()
      .single();

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível adicionar.') };
    return { success: true, data: toMember(data) };
  },

  async updateManagementTeamMember(_organizationId: string, memberId: string, updates: Partial<ManagementTeamMember>): Promise<{ success: boolean; data?: ManagementTeamMember; error?: string }> {
    if (!isUuid(memberId)) return { success: false, error: 'Registro inválido. Atualize a tela.' };
    if (updates.name !== undefined && !updates.name.trim()) return { success: false, error: 'Informe o nome.' };
    if (updates.role === 'Outro' && !updates.custom_role_title?.trim()) return { success: false, error: 'Informe o nome do cargo.' };

    const payload: Record<string, any> = {};
    if (updates.name !== undefined) {
      payload.full_name = updates.name.trim();
      payload.name = payload.full_name;
    }
    if (updates.role !== undefined) {
      payload.role = updates.role;
      payload.custom_role_title = updates.role === 'Outro' ? updates.custom_role_title?.trim() || null : null;
      payload.job_title = updates.role === 'Outro' ? payload.custom_role_title : updates.role;
    }
    if (updates.email !== undefined) payload.email = updates.email.trim() || null;
    if (updates.phone !== undefined) payload.phone = updates.phone.trim() || null;

    const { data, error } = await supabase.from('school_staff').update(payload).eq('id', memberId).select().maybeSingle();
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível salvar.') };
    if (!data) return { success: false, error: 'Registro não encontrado ou sem permissão.' };
    return { success: true, data: toMember(data) };
  },

  /** Tira a pessoa da equipe gestora (o cadastro em Funcionários continua) */
  async deleteManagementTeamMember(_organizationId: string, memberId: string): Promise<{ success: boolean; error?: string }> {
    if (!isUuid(memberId)) return { success: false, error: 'Registro inválido. Atualize a tela.' };
    const { data, error } = await supabase.from('school_staff').update({ is_management: false }).eq('id', memberId).select('id');
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível remover.') };
    if (!data || data.length === 0) return { success: false, error: 'Registro não encontrado ou sem permissão.' };
    return { success: true };
  },
};