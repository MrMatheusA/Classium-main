import { BaseService } from '../shared/base.service';
import { supabase } from '../../lib/supabase';

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
        response.status === 401 ? 'Não autenticado.' :
        response.status === 403 ? 'Sem permissão para visualizar métricas.' :
        'Erro ao carregar métricas de estudantes.'
      );

      return { data: null, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.getMetrics] Network/transport error:', err);
      return { data: null, error: 'Não foi possível comunicar com o servidor.' };
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
        response.status === 401 ? 'Não autenticado.' :
        response.status === 403 ? 'Sem permissão para acessar a lista de estudantes.' :
        'Erro ao carregar estudantes do servidor.'
      );

      return { items: [], total: 0, canManage: false, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.getStudents] Network/transport error:', err);
      return { items: [], total: 0, canManage: false, error: 'Não foi possível comunicar com o servidor.' };
    }
  }

  // Get student by ID via canonical server API
  async getStudentById(id: string) {
    if (!id) return { student: null, error: 'ID do estudante é obrigatório.' };

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
        response.status === 401 ? 'Não autenticado.' :
        response.status === 403 ? 'Sem permissão para visualizar este estudante.' :
        response.status === 404 ? 'Estudante não encontrado.' :
        'Erro ao carregar estudante no servidor.'
      );

      return { student: null, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.getStudentById] Network/transport error:', err);
      return { student: null, error: 'Não foi possível comunicar com o servidor.' };
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
        response.status === 401 ? 'Não autenticado.' :
        response.status === 403 ? 'Sem permissão para cadastrar estudante.' :
        response.status === 400 ? 'Dados inválidos para cadastro do estudante.' :
        'Erro ao cadastrar estudante no servidor.'
      );

      return { student: null, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.createStudent] Network/transport error:', err);
      return { student: null, error: 'Não foi possível comunicar com o servidor.' };
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
        response.status === 401 ? 'Não autenticado.' :
        response.status === 403 ? 'Sem permissão para atualizar estudante.' :
        response.status === 404 ? 'Estudante não encontrado.' :
        response.status === 400 ? 'Dados inválidos para atualização do estudante.' :
        'Erro ao atualizar estudante no servidor.'
      );

      return { success: false, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.updateStudent] Network/transport error:', err);
      return { success: false, error: 'Não foi possível comunicar com o servidor.' };
    }
  }

  // Delete student
  async deleteStudent(id: string) {
    if (!id) return { success: false, error: 'ID do estudante é obrigatório.' };

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
        response.status === 401 ? 'Não autenticado.' :
        response.status === 403 ? 'Sem permissão para excluir estudante.' :
        response.status === 404 ? 'Estudante não encontrado.' :
        response.status === 400 ? 'ID do estudante inválido.' :
        'Erro ao excluir estudante no servidor.'
      );

      return { success: false, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.deleteStudent] Network/transport error:', err);
      return { success: false, error: 'Não foi possível comunicar com o servidor.' };
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
        return { success: false, error: 'Não autenticado.' };
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
        response.status === 401 ? 'Não autenticado.' :
        response.status === 403 ? 'Sem permissão para alterar status do estudante.' :
        response.status === 404 ? 'Estudante não encontrado.' :
        response.status === 400 ? 'Dados inválidos para alteração de status.' :
        'Erro ao alterar status do estudante no servidor.'
      );

      return { success: false, error: errorMessage };
    } catch (err: any) {
      console.error('[StudentsService.toggleStudentStatus] Network/transport error:', err);
      return { success: false, error: 'Não foi possível comunicar com o servidor.' };
    }
  }

  // Fetch student guardians links via canonical server API
  async getStudentGuardians() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/students/guardians', { headers });
      const json = await response.json().catch(() => null);

      if (response.ok && json && Array.isArray(json.items || json.data)) {
        return json.items || json.data;
      }
      return [];
    } catch (err) {
      console.error('[StudentsService.getStudentGuardians] Network/transport error:', err);
      return [];
    }
  }
}

export const studentsService = new StudentsService();
