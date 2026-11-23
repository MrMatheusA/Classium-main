import { BaseService } from '../shared/base.service';
import { supabase } from '../../lib/supabase';
import { resolveOrgId, friendlyDbError, isUuid } from '../tenant';
import { isValidCPF } from '../../utils/masks';

export interface StudentGuardianLink {
  link_id?: string;
  student_id: string;
  guardian_id: string;
  full_name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  is_primary_contact: boolean;
  is_financial_responsible: boolean;
  can_pickup: boolean;
  has_app_access: boolean;
}

export interface LinkGuardianInput {
  guardianId?: string;
  fullName: string;
  cpf?: string;
  phone?: string;
  email?: string;
  relationship?: string;
  isPrimary?: boolean;
  isFinancial?: boolean;
  canPickup?: boolean;
}

export interface Student {
  id: string;
  student_id?: string;
  organization_id?: string;
  school_id?: string;
  class_id?: string;
  name: string;
  full_name?: string;
  registration_code?: string;
  code?: string;
  grade?: string;
  class_name?: string;
  birth_date?: string;
  cpf?: string;
  document_number?: string;
  sex?: 'M' | 'F' | string;
  gender?: string;
  status?: string;
  uses_transport?: boolean;
  transport_required?: boolean;
  transport_line?: string;
  transport_stop?: string;
  aee?: boolean;
  laudo?: boolean;
  dietary_info?: string;
  medical_notes?: string;
  address_cep?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_complement?: string;
  created_at?: string;
  updated_at?: string;
  classes?: any[];
  guardians?: any[];
}

export function deduplicateStudents<T extends { id?: string; student_id?: string; registration_code?: string; code?: string; matricula?: string; cpf?: string; document_number?: string; full_name?: string; name?: string; birth_date?: string }>(students: T[]): T[] {
  if (!Array.isArray(students)) return [];
  const seenIds = new Set<string>();
  const seenCodes = new Set<string>();
  const seenCpfs = new Set<string>();
  const seenNames = new Set<string>();
  const result: T[] = [];

  for (const s of students) {
    if (!s) continue;
    const id = String(s.id || s.student_id || '').trim();
    const code = String(s.registration_code || s.code || s.matricula || '').trim().toUpperCase();
    const cpf = String(s.cpf || s.document_number || '').replace(/\D/g, '');
    const name = String(s.full_name || s.name || '').trim().toLowerCase();
    const birth = String(s.birth_date || '').split('T')[0].trim();
    const nameBirthKey = name && birth ? `${name}|${birth}` : '';

    if (id && seenIds.has(id)) continue;
    if (code && seenCodes.has(code)) continue;
    if (cpf && cpf.length === 11 && seenCpfs.has(cpf)) continue;
    if (nameBirthKey && seenNames.has(nameBirthKey)) continue;

    if (id) seenIds.add(id);
    if (code) seenCodes.add(code);
    if (cpf && cpf.length === 11) seenCpfs.add(cpf);
    if (nameBirthKey) seenNames.add(nameBirthKey);

    result.push(s);
  }

  return result;
}

class StudentsService extends BaseService<Student> {
  constructor() {
    super('students');
  }

  // Fetch metrics directly from canonical API
  async getMetrics(organizationId?: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const queryParam = organizationId ? `?organization_id=${encodeURIComponent(organizationId)}` : '';
      const response = await fetch(`/api/students/metrics${queryParam}`, {
        headers
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json && json.data) {
        return { data: json.data, error: null };
      }

      const errorMessage = json?.error || (
        response.status === 401 ? 'Sua sessão expirou. Entre de novo.' :
        response.status === 403 ? 'Sem permissão para visualizar métricas.' :
        'Erro ao carregar métricas de estudantes.'
      );

      return { data: null, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.getMetrics] Network/transport error:', err);
      return { data: null, error: 'Sem conexão com o servidor. Verifique a internet e tente de novo.' };
    }
  }

  // Fetch students via canonical server API with multi-tenant filtering
  async getStudents(
    organizationId?: string,
    params?: { search?: string; class_id?: string; status?: string; year?: string; page?: number; limit?: number }
  ) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const queryParams = new URLSearchParams();
      if (organizationId) queryParams.set('organization_id', organizationId);
      if (params?.search) queryParams.set('search', params.search);
      if (params?.class_id && params.class_id !== 'Todas') queryParams.set('class_id', params.class_id);
      if (params?.status && params.status !== 'Todos') queryParams.set('status', params.status);
      if (params?.year && params.year !== 'Todos') queryParams.set('year', params.year);
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());

      const url = queryParams.toString() ? `/api/students?${queryParams.toString()}` : '/api/students';
      const response = await fetch(url, { headers });

      const json = await response.json().catch(() => null);

      if (response.ok && json && Array.isArray(json.items || json.data)) {
        const list = deduplicateStudents(json.items || json.data);
        return { items: list, total: json.total ?? list.length, canManage: !!json.canManage, error: null };
      }

      const errorMessage = json?.error || (
        response.status === 401 ? 'Sua sessão expirou. Entre de novo.' :
        response.status === 403 ? 'Sem permissão para acessar a lista de estudantes.' :
        'Erro ao carregar estudantes do servidor.'
      );

      return { items: [], total: 0, canManage: false, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.getStudents] Network/transport error:', err);
      return { items: [], total: 0, canManage: false, error: 'Sem conexão com o servidor. Verifique a internet e tente de novo.' };
    }
  }

  // Get student by ID via canonical server API
  async getStudentById(id: string) {
    if (!id) return { student: null, error: 'Estudante inválido. Atualize a tela.' };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/students/${encodeURIComponent(id)}`, { headers });
      const json = await response.json().catch(() => null);

      if (response.ok && json && (json.data || json.student)) {
        return { student: json.data || json.student, error: null };
      }

      const errorMessage = json?.error || (
        response.status === 401 ? 'Sua sessão expirou. Entre de novo.' :
        response.status === 403 ? 'Sem permissão para visualizar este estudante.' :
        response.status === 404 ? 'Estudante não encontrado.' :
        'Erro ao carregar estudante no servidor.'
      );

      return { student: null, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.getStudentById] Network/transport error:', err);
      return { student: null, error: 'Sem conexão com o servidor. Verifique a internet e tente de novo.' };
    }
  }

  // Create new student
  async createStudent(payload: any) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/students', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const json = await response.json().catch(() => null);

      if (response.ok && (json?.success || json?.student)) {
        return { student: json.student || json.data, error: null };
      }

      const errorMessage = json?.error || (
        response.status === 401 ? 'Sua sessão expirou. Entre de novo.' :
        response.status === 403 ? 'Sem permissão para cadastrar estudante.' :
        response.status === 400 ? 'Dados inválidos para cadastro do estudante.' :
        'Erro ao cadastrar estudante no servidor.'
      );

      return { student: null, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.createStudent] Network/transport error:', err);
      return { student: null, error: 'Sem conexão com o servidor. Verifique a internet e tente de novo.' };
    }
  }

  // Update student
  async updateStudent(id: string, payload: any) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/students/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id, payload })
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.success) {
        return { success: true, error: null };
      }

      const errorMessage = json?.error || (
        response.status === 401 ? 'Sua sessão expirou. Entre de novo.' :
        response.status === 403 ? 'Sem permissão para atualizar estudante.' :
        response.status === 404 ? 'Estudante não encontrado.' :
        response.status === 400 ? 'Dados inválidos para atualização do estudante.' :
        'Erro ao atualizar estudante no servidor.'
      );

      return { success: false, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.updateStudent] Network/transport error:', err);
      return { success: false, error: 'Sem conexão com o servidor. Verifique a internet e tente de novo.' };
    }
  }

  // Delete student
  async deleteStudent(id: string) {
    if (!id) return { success: false, error: 'Estudante inválido. Atualize a tela.' };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/students/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id })
      });

      const json = await response.json().catch(() => null);

      if (response.ok && (json?.success || json?.ok)) {
        return { success: true, error: null };
      }

      const errorMessage = json?.error || (
        response.status === 401 ? 'Sua sessão expirou. Entre de novo.' :
        response.status === 403 ? 'Sem permissão para excluir estudante.' :
        response.status === 404 ? 'Estudante não encontrado.' :
        response.status === 400 ? 'ID do estudante inválido.' :
        'Erro ao excluir estudante no servidor.'
      );

      return { success: false, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.deleteStudent] Network/transport error:', err);
      return { success: false, error: 'Sem conexão com o servidor. Verifique a internet e tente de novo.' };
    }
  }

  // Toggle student status via canonical server API
  async toggleStudentStatus(id: string, status: string) {
    if (!id || !status) {
      return { success: false, error: 'ID e status são obrigatórios.' };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Sua sessão expirou. Entre de novo.' };
      }

      const response = await fetch('/api/students/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id, status })
      });

      const json = await response.json().catch(() => null);

      if (response.ok && (json?.success || json?.ok)) {
        return { success: true, error: null };
      }

      const errorMessage = json?.error || (
        response.status === 401 ? 'Sua sessão expirou. Entre de novo.' :
        response.status === 403 ? 'Sem permissão para alterar status do estudante.' :
        response.status === 404 ? 'Estudante não encontrado.' :
        response.status === 400 ? 'Dados inválidos para alteração de status.' :
        'Erro ao alterar status do estudante no servidor.'
      );

      return { success: false, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.toggleStudentStatus] Network/transport error:', err);
      return { success: false, error: 'Sem conexão com o servidor. Verifique a internet e tente de novo.' };
    }
  }

  /**
   * Todos os vínculos estudante ↔ responsável da escola.
   * Lê direto do banco (a rota /api/students/guardians era capturada pela rota /api/students/:id).
   */
  async getStudentGuardians(organizationId?: string): Promise<StudentGuardianLink[]> {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return [];

    const { data, error } = await supabase
      .from('student_responsible_links')
      .select('id, student_id, guardian_id, relationship, is_primary_contact, is_financial_responsible, can_pickup, guardians ( id, full_name, name, cpf, email, phone, user_id, profile_id )')
      .eq('organization_id', orgId);

    if (error) {
      console.error('[StudentsService.getStudentGuardians]', error.message);
      return [];
    }

    return ((data || []) as any[]).map(row => {
      const g = Array.isArray(row.guardians) ? row.guardians[0] : row.guardians;
      return {
        link_id: row.id,
        student_id: row.student_id,
        guardian_id: row.guardian_id,
        full_name: g?.full_name || g?.name || '',
        cpf: g?.cpf || undefined,
        email: g?.email || undefined,
        phone: g?.phone || undefined,
        relationship: row.relationship || undefined,
        is_primary_contact: !!row.is_primary_contact,
        is_financial_responsible: !!row.is_financial_responsible,
        can_pickup: row.can_pickup !== false,
        has_app_access: !!(g?.user_id || g?.profile_id),
      };
    });
  }

  /** Responsáveis de um estudante */
  async listGuardians(studentId: string): Promise<{ items: StudentGuardianLink[]; error: string | null }> {
    if (!isUuid(studentId)) return { items: [], error: 'Estudante inválido. Atualize a tela.' };
    const { data, error } = await supabase.rpc('classium_list_student_guardians', { p_student_id: studentId });
    if (error) return { items: [], error: friendlyDbError(error.message, 'Não foi possível carregar os responsáveis.') };
    const items = (Array.isArray(data) ? data : []).map((g: any) => ({ ...g, student_id: studentId })) as StudentGuardianLink[];
    return { items, error: null };
  }

  /**
   * Cadastra ou reaproveita (pelo CPF) o responsável e liga ao estudante.
   * Se a pessoa já tiver conta com o mesmo CPF ou e-mail, ela ganha acesso ao portal da família.
   */
  async linkGuardian(studentId: string, input: LinkGuardianInput): Promise<{ success: boolean; guardianId?: string; hasAppAccess?: boolean; error: string | null }> {
    if (!isUuid(studentId)) return { success: false, error: 'Estudante inválido. Atualize a tela.' };

    const cpf = (input.cpf || '').replace(/\D/g, '');
    if (cpf && !isValidCPF(cpf)) return { success: false, error: 'CPF inválido. Confira os números.' };
    const phone = (input.phone || '').replace(/\D/g, '');
    if (phone && phone.length < 10) return { success: false, error: 'Telefone incompleto. Informe DDD e número.' };
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      return { success: false, error: 'E-mail inválido.' };
    }

    const { data, error } = await supabase.rpc('classium_link_guardian', {
      p_student_id: studentId,
      p_full_name: input.fullName?.trim() || null,
      p_cpf: cpf || null,
      p_phone: input.phone?.trim() || null,
      p_email: input.email?.trim() || null,
      p_relationship: input.relationship?.trim() || 'Responsável',
      p_is_primary: !!input.isPrimary,
      p_is_financial: !!input.isFinancial,
      p_can_pickup: input.canPickup !== false,
      p_guardian_id: isUuid(input.guardianId) ? input.guardianId : null,
    });

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível vincular o responsável.') };
    if (!data?.success) return { success: false, error: data?.error || 'Não foi possível vincular o responsável.' };

    notify('classium_students_updated');
    return { success: true, guardianId: data.guardian_id, hasAppAccess: !!data.has_app_access, error: null };
  }

  /** Desfaz o vínculo. O cadastro do responsável continua (ele pode ter outros filhos). */
  async unlinkGuardian(studentId: string, guardianId: string): Promise<{ success: boolean; error: string | null }> {
    if (!isUuid(studentId) || !isUuid(guardianId)) return { success: false, error: 'Vínculo inválido. Atualize a tela.' };
    const { data, error } = await supabase.rpc('classium_unlink_guardian', { p_student_id: studentId, p_guardian_id: guardianId });
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível remover o vínculo.') };
    if (!data?.success) return { success: false, error: data?.error || 'Não foi possível remover o vínculo.' };
    notify('classium_students_updated');
    return { success: true, error: null };
  }

  /**
   * Salva os dados do cadastro do estudante direto no banco.
   * O banco só aceita as colunas permitidas e confere se o usuário é da equipe da escola.
   */
  async updateStudentFields(studentId: string, fields: Record<string, any>): Promise<{ success: boolean; error: string | null }> {
    if (!isUuid(studentId)) return { success: false, error: 'Estudante inválido. Atualize a tela.' };
    if (fields.full_name !== undefined && !String(fields.full_name).trim()) return { success: false, error: 'Informe o nome do estudante.' };
    if (fields.cpf) {
      const cpf = String(fields.cpf).replace(/\D/g, '');
      if (cpf && !isValidCPF(cpf)) return { success: false, error: 'CPF do estudante inválido.' };
      fields = { ...fields, cpf };
    }

    const { data, error } = await supabase.rpc('classium_update_student', { p_student_id: studentId, p_payload: fields });
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível salvar o cadastro.') };
    if (!data?.success) return { success: false, error: data?.error || 'Não foi possível salvar o cadastro.' };
    notify('classium_students_updated');
    return { success: true, error: null };
  }

  /**
   * Liga ou desliga o transporte escolar do estudante.
   * Ligado: entra na fila do Transporte para ser colocado num veículo.
   * Desligado: sai do veículo e da fila.
   */
  async setTransport(studentId: string, enable: boolean, organizationId?: string): Promise<{ success: boolean; error: string | null }> {
    const res = await this.updateStudentFields(studentId, { uses_transport: enable, uses_school_transport: enable, transport_required: enable });
    if (!res.success) return res;

    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { success: true, error: null };

    if (enable) {
      await supabase
        .from('transport_agreements')
        .update({ status: 'aguardando_vinculacao', requested_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('status', 'cancelado');
      const { error } = await supabase.from('transport_agreements').upsert(
        { organization_id: orgId, school_id: orgId, student_id: studentId, status: 'aguardando_vinculacao', requested_at: new Date().toISOString() },
        { onConflict: 'student_id,school_id', ignoreDuplicates: true }
      );
      if (error) return { success: false, error: friendlyDbError(error.message, 'O transporte foi marcado, mas o estudante não entrou na fila do Transporte.') };
    } else {
      const { error } = await supabase
        .from('transport_agreements')
        .update({ status: 'cancelado', vehicle_id: null, route_id: null, linked_at: null })
        .eq('student_id', studentId);
      if (error) return { success: false, error: friendlyDbError(error.message, 'O transporte foi desmarcado, mas o estudante continua no veículo.') };
      await supabase.from('transport_students').delete().eq('student_id', studentId);
    }

    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('classium_transport_updated'));
    return { success: true, error: null };
  }

  /** Coloca o estudante numa turma (ou tira, com classId vazio). Respeita o limite de vagas. */
  async setStudentClass(studentId: string, classId: string | null): Promise<{ success: boolean; error: string | null }> {
    if (!isUuid(studentId)) return { success: false, error: 'Estudante inválido. Atualize a tela.' };
    const { data, error } = await supabase.rpc('classium_set_student_class', {
      p_student_id: studentId,
      p_class_id: isUuid(classId) ? classId : null,
    });
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível alterar a turma.') };
    if (!data?.success) return { success: false, error: data?.error || 'Não foi possível alterar a turma.' };
    notify('classium_students_updated');
    notify('classium_classes_updated');
    return { success: true, error: null };
  }
}

function notify(eventName: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(eventName));
}

export const studentsService = new StudentsService();