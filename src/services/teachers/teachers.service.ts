import { supabase } from '../../lib/supabase';

export interface TeacherClassLink {
  id?: string;
  class_id?: string;
  class_name?: string;
  grade?: string;
  subject?: string;
  discipline?: string;
  shift?: string;
  room?: string;
  weekly_classes?: number;
  weeklyClasses?: number;
  academic_year?: string;
  year?: string | number;
}

export interface TeacherRole {
  id?: string;
  name?: string;
  code?: string;
  [key: string]: any;
}

export interface TeacherItem {
  id: string;
  user_id?: string;
  teacher_id?: string;
  full_name: string;
  display_name?: string;
  email: string;
  phone?: string;
  employee_code?: string;
  code?: string;
  avatar_url?: string;
  status?: string;
  member_status?: string;
  profile_active?: boolean;
  is_active?: boolean;
  hire_date?: string;
  created_at?: string;
  joined_at?: string;
  bio?: string;
  description?: string;
  roles?: Array<TeacherRole | string>;
  classes?: TeacherClassLink[];
  shifts?: string[];
  disciplines?: string[];
  weekly_classes_total?: number;
  organization_id?: string;
  preferred_shift?: string;
  [key: string]: any;
}

export interface TeacherPayload {
  id?: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone?: string;
  employee_code?: string;
  preferred_shift?: string;
  status?: string;
  bio?: string;
  disciplines?: string[];
  classes?: TeacherClassLink[];
}

export interface LinkClassPayload {
  organization_id: string;
  teacher_id: string;
  grade: string;
  subject: string;
  shift?: string;
  room?: string;
  weekly_classes?: number;
  year?: string | number;
}

export type Teacher = TeacherItem;

export class TeachersService {
  async getAll(organizationIdOrOptions?: string | any): Promise<TeacherItem[]> {
    const orgId = typeof organizationIdOrOptions === 'string' ? organizationIdOrOptions : (organizationIdOrOptions?.organization_id || organizationIdOrOptions?.organizationId || '');
    const res = await this.getTeachers(orgId);
    return res.items;
  }

  async getById(id: string, organizationId?: string): Promise<TeacherItem | null> {
    const items = await this.getAll(organizationId);
    return items.find(t => t.id === id || t.user_id === id) || null;
  }

  async create(data: Partial<TeacherPayload> & Record<string, any>): Promise<TeacherItem> {
    const payload: TeacherPayload = {
      organization_id: data.organization_id || '11111111-1111-1111-1111-111111111111',
      full_name: data.full_name || data.display_name || 'Professor',
      email: data.email || `prof-${Date.now()}@classium.edu.br`,
      phone: data.phone,
      employee_code: data.employee_code,
      preferred_shift: data.preferred_shift,
      status: data.status,
      bio: data.bio
    };
    const res = await this.createTeacher(payload);
    if (res.teacher) return res.teacher;
    throw new Error(res.error || 'Erro ao criar professor');
  }

  async update(id: string, data: Partial<TeacherPayload> & Record<string, any>): Promise<TeacherItem> {
    const res = await this.updateTeacher(id, data);
    if (res.teacher) return res.teacher;
    const updated = await this.getById(id, data.organization_id);
    if (updated) return updated;
    return { id, full_name: data.full_name || 'Professor', email: data.email || '' } as TeacherItem;
  }

  async search(query: string, columnsOrOrgId?: string[] | string): Promise<TeacherItem[]> {
    const orgId = typeof columnsOrOrgId === 'string' ? columnsOrOrgId : undefined;
    const items = await this.getAll(orgId);
    const q = (query || '').toLowerCase().trim();
    if (!q) return items;
    return items.filter(t =>
      (t.full_name || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      (t.employee_code || '').toLowerCase().includes(q)
    );
  }

  async count(organizationIdOrFilters?: string | any): Promise<number> {
    const orgId = typeof organizationIdOrFilters === 'string' ? organizationIdOrFilters : (organizationIdOrFilters?.organization_id || organizationIdOrFilters?.organizationId || '');
    const res = await this.getTeachers(orgId);
    return res.total;
  }

  async exists(idOrFilters: string | Record<string, any>, organizationId?: string): Promise<boolean> {
    if (typeof idOrFilters === 'string') {
      const teacher = await this.getById(idOrFilters, organizationId);
      return !!teacher;
    }
    const count = await this.count(idOrFilters || organizationId);
    return count > 0;
  }

  async getTeachers(organizationId: string): Promise<{ items: TeacherItem[]; total: number; canManage: boolean }> {
    const effectiveOrgId = organizationId || '11111111-1111-1111-1111-111111111111';

    // 1. Primary fetch via backend /api/teachers endpoint with organization_id isolation
    try {
      const res = await fetch(`/api/teachers?organization_id=${encodeURIComponent(effectiveOrgId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.items && Array.isArray(json.items)) {
          return {
            items: json.items,
            total: json.total || json.items.length,
            canManage: json.canManage ?? true
          };
        }
      }
    } catch (err) {
      console.warn('[TeachersService] /api/teachers fetch error, falling back to direct Supabase:', err);
    }

    // 2. Direct Supabase Fallback using get_my_organization_staff RPC and class_teachers table
    try {
      let linksByTeacher: Record<string, TeacherClassLink[]> = {};
      try {
        const { data: linksData } = await supabase
          .from('class_teachers')
          .select('*');

        if (linksData) {
          linksData.forEach((lnk: any) => {
            const tId = lnk.teacher_id;
            if (!tId) return;
            if (!linksByTeacher[tId]) linksByTeacher[tId] = [];
            linksByTeacher[tId].push({
              id: lnk.id,
              class_id: lnk.class_id,
              class_name: lnk.grade ? `${lnk.grade}` : (lnk.class_name || 'Turma'),
              grade: lnk.grade,
              subject: lnk.subject || lnk.discipline || 'Geral',
              discipline: lnk.subject || lnk.discipline,
              shift: lnk.shift || 'Matutino',
              room: lnk.room || '',
              weekly_classes: lnk.weekly_classes || lnk.weeklyClasses || 4,
              academic_year: String(lnk.year || '2026')
            });
          });
        }
      } catch (errLinks) {
        console.warn('[TeachersService] class_teachers load warning:', errLinks);
      }

      const { data: staffData } = await supabase.rpc('get_my_organization_staff');
      if (staffData && Array.isArray(staffData)) {
        const teacherStaff = staffData.filter((s: any) =>
          s.role === 'professor' || s.is_teacher || s.member_role === 'Professor' ||
          (s.metadata && s.metadata.is_teacher) ||
          (s.organization_id && (s.organization_id === effectiveOrgId))
        );

        const items: TeacherItem[] = teacherStaff.map((p: any, idx: number) => {
          const tId = p.id || p.user_id || `teacher-${idx}`;
          const attached = linksByTeacher[tId] || [];

          const shiftsSet = new Set<string>();
          const subjectsSet = new Set<string>();
          let totalWeekly = 0;

          attached.forEach(c => {
            if (c.shift) shiftsSet.add(c.shift);
            if (c.subject || c.discipline) subjectsSet.add(c.subject || c.discipline);
            if (c.weekly_classes || c.weeklyClasses) totalWeekly += Number(c.weekly_classes || c.weeklyClasses);
          });

          if (p.metadata?.preferred_shift) shiftsSet.add(p.metadata.preferred_shift);

          const shiftsArr = Array.from(shiftsSet);
          const subjectsArr = Array.from(subjectsSet);

          return {
            id: tId,
            user_id: tId,
            full_name: p.full_name || p.email || 'Professor',
            display_name: p.full_name || p.email,
            email: p.email || '',
            phone: p.phone || '',
            employee_code: p.metadata?.employee_code || p.employee_code || `PR-2026-${idx + 1}`,
            avatar_url: p.avatar_url || '',
            status: p.status === 'inactive' ? 'inactive' : 'active',
            profile_active: p.status !== 'inactive',
            preferred_shift: p.metadata?.preferred_shift || 'Matutino',
            bio: p.metadata?.bio || '',
            classes: attached,
            shifts: shiftsArr.length > 0 ? shiftsArr : ['Matutino'],
            disciplines: subjectsArr.length > 0 ? subjectsArr : ['Docência Geral'],
            weekly_classes_total: totalWeekly > 0 ? totalWeekly : 16,
            organization_id: effectiveOrgId
          };
        });

        return { items, total: items.length, canManage: true };
      }
    } catch (sbErr) {
      console.error('[TeachersService] Supabase fallback error:', sbErr);
    }

    return { items: [], total: 0, canManage: true };
  }

  async createTeacher(payload: TeacherPayload): Promise<{ success: boolean; teacher?: TeacherItem; generatedPassword?: string; error?: string }> {
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (err) {
      console.warn('[TeachersService] createTeacher API error, using Supabase fallback:', err);
    }

    const newId = payload.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prof-${Date.now()}`);
    const generatedPassword = `classium@${Math.floor(100 + Math.random() * 900)}`;

    try {
      await supabase.from('profiles').insert({
        id: newId,
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone || null,
        role: 'professor',
        organization_id: payload.organization_id,
        status: payload.status === 'Inativo' ? 'inactive' : 'active',
        metadata: {
          employee_code: payload.employee_code,
          bio: payload.bio,
          preferred_shift: payload.preferred_shift,
          provisional_password: generatedPassword,
          is_teacher: true
        }
      });
    } catch (e) {
      console.warn('[TeachersService] Supabase profiles insert fallback exception:', e);
    }

    const teacher: TeacherItem = {
      id: newId,
      user_id: newId,
      full_name: payload.full_name,
      display_name: payload.full_name,
      email: payload.email,
      phone: payload.phone || '',
      employee_code: payload.employee_code || `PR-2026-${Math.floor(100 + Math.random() * 900)}`,
      preferred_shift: payload.preferred_shift || 'Matutino',
      status: payload.status === 'Inativo' ? 'inactive' : 'active',
      profile_active: payload.status !== 'Inativo',
      bio: payload.bio || '',
      organization_id: payload.organization_id,
      classes: [],
      shifts: [payload.preferred_shift || 'Matutino'],
      disciplines: ['Docência Geral'],
      weekly_classes_total: 16
    };

    return { success: true, teacher, generatedPassword };
  }

  async updateTeacher(id: string, payload: Partial<TeacherPayload>): Promise<{ success: boolean; teacher?: TeacherItem; error?: string }> {
    try {
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload })
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (err) {
      console.warn('[TeachersService] updateTeacher API error:', err);
    }

    try {
      await supabase.from('profiles').update({
        full_name: payload.full_name,
        phone: payload.phone || null,
        status: payload.status === 'Inativo' || payload.status === 'inactive' ? 'inactive' : 'active',
        metadata: {
          employee_code: payload.employee_code,
          bio: payload.bio,
          preferred_shift: payload.preferred_shift
        }
      }).eq('id', id);
    } catch (e) {}

    return { success: true };
  }

  async deleteTeacher(id: string, organizationId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/teachers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, organization_id: organizationId })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[TeachersService] deleteTeacher API error:', err);
    }

    try {
      await supabase.from('class_teachers').delete().eq('teacher_id', id);
      await supabase.from('profiles').delete().eq('id', id);
    } catch (e) {}

    return { success: true };
  }

  async linkTeacherClass(payload: LinkClassPayload): Promise<{ success: boolean; link?: TeacherClassLink; error?: string }> {
    try {
      const res = await fetch('/api/teachers/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[TeachersService] linkTeacherClass API error:', err);
    }

    try {
      await supabase.from('class_teachers').insert({
        teacher_id: payload.teacher_id,
        grade: payload.grade,
        subject: payload.subject,
        shift: payload.shift || 'Matutino',
        room: payload.room || '',
        weekly_classes: payload.weekly_classes || 4,
        year: payload.year || 2026,
        organization_id: payload.organization_id
      });
    } catch (e) {}

    return {
      success: true,
      link: {
        id: `link-${Date.now()}`,
        grade: payload.grade,
        subject: payload.subject,
        shift: payload.shift || 'Matutino',
        room: payload.room || '',
        weekly_classes: payload.weekly_classes || 4,
        academic_year: String(payload.year || '2026')
      }
    };
  }

  async unlinkTeacherClass(teacher_id: string, link_id?: string, grade?: string, organization_id?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/teachers/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id, link_id, grade, organization_id })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[TeachersService] unlinkTeacherClass API error:', err);
    }

    try {
      if (link_id && !link_id.startsWith('link-')) {
        await supabase.from('class_teachers').delete().eq('id', link_id);
      } else if (grade) {
        await supabase.from('class_teachers').delete().eq('teacher_id', teacher_id).eq('grade', grade);
      }
    } catch (e) {}

    return { success: true };
  }
}

export const teachersService = new TeachersService();
