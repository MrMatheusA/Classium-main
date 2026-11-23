import { supabase } from '../lib/supabase';
import { resolveOrgId, NO_SCHOOL_ERROR, friendlyDbError, isUuid } from './tenant';
import { isValidCPF } from '../utils/masks';

/** Papel no sistema: define o que a pessoa vê e pode fazer */
export type StaffSystemRole = 'gestor' | 'secretaria' | 'coordenacao' | 'docente' | 'portaria' | 'funcionario';

export const STAFF_ROLE_OPTIONS: { id: StaffSystemRole; label: string; hint: string }[] = [
  { id: 'docente', label: 'Professor(a)', hint: 'Diário, turmas, ocorrências e relatórios dos próprios alunos.' },
  { id: 'coordenacao', label: 'Coordenação pedagógica', hint: 'Turmas, estudantes, horários, ocorrências e comunicados.' },
  { id: 'secretaria', label: 'Secretaria', hint: 'Matrículas, turmas, comunicados e cadastros.' },
  { id: 'gestor', label: 'Direção', hint: 'Acesso completo à gestão da escola.' },
  { id: 'portaria', label: 'Portaria', hint: 'Controle de acesso e achados e perdidos.' },
  { id: 'funcionario', label: 'Apoio e outros', hint: 'Merenda, limpeza, transporte e demais funções.' },
];

export const roleLabel = (role?: string | null) => STAFF_ROLE_OPTIONS.find(r => r.id === role)?.label || role || 'Sem função';

export interface StaffMember {
  id: string;
  organization_id: string;
  user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  role: StaffSystemRole | string;
  job_title?: string | null;
  department?: string | null;
  shifts: string[];
  access_enabled: boolean;
  status: 'ativo' | 'inativo' | string;
  is_management?: boolean;
  created_at?: string;
}

export interface StaffInput {
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  role: StaffSystemRole;
  job_title?: string;
  shifts?: string[];
}

type Result<T = undefined> = { success: boolean; error: string | null; data?: T };

function validate(input: StaffInput, requireEmail: boolean): string | null {
  if (!input.full_name?.trim()) return 'Informe o nome completo.';
  const cpf = (input.cpf || '').replace(/\D/g, '');
  if (cpf && !isValidCPF(cpf)) return 'CPF inválido. Confira os números.';
  const email = (input.email || '').trim();
  if (requireEmail && !email) return 'Para criar o acesso, informe o e-mail. É com ele que a pessoa entra no sistema.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail inválido.';
  const phone = (input.phone || '').replace(/\D/g, '');
  if (phone && phone.length < 10) return 'Telefone incompleto. Informe DDD e número.';
  return null;
}

function mapRow(r: any): StaffMember {
  return {
    id: r.id,
    organization_id: r.organization_id,
    user_id: r.user_id,
    full_name: r.full_name || r.name || '',
    email: r.email,
    phone: r.phone,
    cpf: r.cpf,
    role: r.role || 'funcionario',
    job_title: r.job_title,
    department: r.department,
    shifts: Array.isArray(r.shifts) ? r.shifts : [],
    access_enabled: !!r.user_id && r.access_enabled !== false,
    status: r.status || 'ativo',
    is_management: !!r.is_management,
    created_at: r.created_at,
  };
}

async function callApi<T>(path: string, body: Record<string, any>): Promise<Result<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { success: false, error: 'Sua sessão expirou. Entre de novo.' };
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return { success: false, error: json?.error || 'Não foi possível concluir. Tente de novo.' };
    return { success: true, error: null, data: json as T };
  } catch {
    return { success: false, error: 'Sem conexão com o servidor. Verifique a internet.' };
  }
}

/** Mantém o professor na lista de professores (usada em horários, turmas e calendário) */
async function syncTeacher(staff: StaffMember) {
  if (staff.role !== 'docente') return;
  const { data: existing } = await supabase.from('teachers').select('id').eq('staff_id', staff.id).maybeSingle();
  const payload = {
    organization_id: staff.organization_id,
    staff_id: staff.id,
    user_id: staff.user_id || null,
    profile_id: staff.user_id || null,
    full_name: staff.full_name,
    name: staff.full_name,
    email: staff.email || null,
    phone: staff.phone || null,
    cpf: staff.cpf || null,
    specialty: staff.job_title || null,
    status: staff.status === 'inativo' ? 'inativo' : 'ativo',
    deleted_at: staff.status === 'inativo' ? new Date().toISOString() : null,
  };
  const { error } = existing
    ? await supabase.from('teachers').update(payload).eq('id', existing.id)
    : await supabase.from('teachers').insert(payload);
  if (error) console.warn('[staffService] Lista de professores não atualizada:', error.message);
}

export const staffService = {
  async list(organizationId?: string): Promise<{ items: StaffMember[]; error: string | null }> {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { items: [], error: NO_SCHOOL_ERROR };

    const { data, error } = await supabase
      .from('school_staff')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    if (error) return { items: [], error: friendlyDbError(error.message, 'Não foi possível carregar os funcionários.') };
    return { items: ((data || []) as any[]).map(mapRow), error: null };
  },

  /** Cadastra sem acesso ao sistema */
  async create(input: StaffInput, organizationId?: string): Promise<Result<StaffMember>> {
    const invalid = validate(input, false);
    if (invalid) return { success: false, error: invalid };
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };

    const name = input.full_name.trim();
    const { data, error } = await supabase
      .from('school_staff')
      .insert({
        organization_id: orgId,
        full_name: name,
        name,
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone?.trim() || null,
        cpf: (input.cpf || '').replace(/\D/g, '') || null,
        role: input.role,
        job_title: input.job_title?.trim() || null,
        shifts: input.shifts || [],
        access_enabled: false,
        status: 'ativo',
      })
      .select()
      .single();

    if (error || !data) {
      const msg = error?.message?.includes('ss_org_cpf_uq') ? 'Já existe um funcionário com este CPF.' : friendlyDbError(error?.message, 'Não foi possível cadastrar.');
      return { success: false, error: msg };
    }
    const staff = mapRow(data);
    await syncTeacher(staff);
    return { success: true, error: null, data: staff };
  },

  /** Cadastra já com acesso: devolve a senha provisória para a escola entregar à pessoa */
  async createWithAccess(input: StaffInput, organizationId?: string): Promise<Result<{ staff: StaffMember; temporaryPassword: string; email: string }>> {
    const invalid = validate(input, true);
    if (invalid) return { success: false, error: invalid };
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };

    const res = await callApi<{ staff: any; temporaryPassword: string; email: string }>('/api/staff-accounts', {
      organization_id: orgId,
      full_name: input.full_name.trim(),
      email: input.email?.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      cpf: (input.cpf || '').replace(/\D/g, '') || null,
      role: input.role,
      job_title: input.job_title?.trim() || null,
      shifts: input.shifts || [],
    });
    if (!res.success || !res.data) return { success: false, error: res.error };
    return { success: true, error: null, data: { staff: mapRow(res.data.staff), temporaryPassword: res.data.temporaryPassword, email: res.data.email } };
  },

  /** Dá acesso a quem já está cadastrado sem acesso */
  async grantAccess(staff: StaffMember, email: string): Promise<Result<{ temporaryPassword: string; email: string }>> {
    const invalid = validate({ full_name: staff.full_name, email, role: staff.role as StaffSystemRole }, true);
    if (invalid) return { success: false, error: invalid };

    const res = await callApi<{ temporaryPassword: string; email: string }>('/api/staff-accounts', {
      organization_id: staff.organization_id,
      staff_id: staff.id,
      full_name: staff.full_name,
      email: email.trim().toLowerCase(),
      phone: staff.phone,
      cpf: staff.cpf,
      role: staff.role,
      job_title: staff.job_title,
      shifts: staff.shifts,
    });
    if (!res.success || !res.data) return { success: false, error: res.error };
    return { success: true, error: null, data: { temporaryPassword: res.data.temporaryPassword, email: res.data.email } };
  },

  async update(staff: StaffMember, input: StaffInput): Promise<Result<StaffMember>> {
    const invalid = validate(input, false);
    if (invalid) return { success: false, error: invalid };

    const name = input.full_name.trim();
    const payload: Record<string, any> = {
      full_name: name,
      name,
      phone: input.phone?.trim() || null,
      cpf: (input.cpf || '').replace(/\D/g, '') || null,
      job_title: input.job_title?.trim() || null,
      shifts: input.shifts || [],
    };
    // Quem tem acesso não muda o e-mail nem o papel por aqui: isso muda a forma de entrar
    if (!staff.user_id) {
      payload.email = input.email?.trim().toLowerCase() || null;
      payload.role = input.role;
    }

    const { data, error } = await supabase.from('school_staff').update(payload).eq('id', staff.id).select().maybeSingle();
    if (error) {
      const msg = error.message?.includes('ss_org_cpf_uq') ? 'Já existe um funcionário com este CPF.' : friendlyDbError(error.message, 'Não foi possível salvar.');
      return { success: false, error: msg };
    }
    if (!data) return { success: false, error: 'Funcionário não encontrado ou sem permissão.' };
    const updated = mapRow(data);
    await syncTeacher(updated);
    return { success: true, error: null, data: updated };
  },

  async resetPassword(staffId: string, organizationId: string): Promise<Result<{ temporaryPassword: string; email: string }>> {
    if (!isUuid(staffId)) return { success: false, error: 'Funcionário inválido. Atualize a tela.' };
    const res = await callApi<{ temporaryPassword: string; email: string }>(`/api/staff-accounts/${staffId}/reset-password`, { organization_id: organizationId });
    if (!res.success || !res.data) return { success: false, error: res.error };
    return { success: true, error: null, data: { temporaryPassword: res.data.temporaryPassword, email: res.data.email } };
  },

  async setAccess(staffId: string, enabled: boolean, organizationId: string): Promise<Result> {
    if (!isUuid(staffId)) return { success: false, error: 'Funcionário inválido. Atualize a tela.' };
    const res = await callApi(`/api/staff-accounts/${staffId}/access`, { organization_id: organizationId, enabled });
    return { success: res.success, error: res.error };
  },

  /** Desliga da escola: some das listas e perde o acesso. O histórico continua. */
  async deactivate(staff: StaffMember): Promise<Result> {
    if (staff.user_id && staff.access_enabled) {
      const blocked = await this.setAccess(staff.id, false, staff.organization_id);
      if (!blocked.success) return blocked;
    }
    const { data, error } = await supabase.from('school_staff').update({ status: 'inativo', access_enabled: false }).eq('id', staff.id).select('id');
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível desligar.') };
    if (!data || data.length === 0) return { success: false, error: 'Funcionário não encontrado ou sem permissão.' };
    await syncTeacher({ ...staff, status: 'inativo' });
    return { success: true, error: null };
  },

  async reactivate(staff: StaffMember): Promise<Result> {
    const { data, error } = await supabase.from('school_staff').update({ status: 'ativo' }).eq('id', staff.id).select('id');
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível reativar.') };
    if (!data || data.length === 0) return { success: false, error: 'Funcionário não encontrado ou sem permissão.' };
    await syncTeacher({ ...staff, status: 'ativo' });
    return { success: true, error: null };
  },
};