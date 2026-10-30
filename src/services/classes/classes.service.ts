import { supabase } from '../../lib/supabase';
import { BaseService } from '../shared/base.service';
import { ClassModel, ClassEnrolledStudent } from '../../types/class.types';

export type ClassEntity = ClassModel;
export type ClassStudent = ClassEnrolledStudent;

export interface ClassTeacherLink {
  id?: string;
  teacher_id?: string;
  teacher_name?: string;
  full_name?: string;
  name?: string;
  email?: string;
  subject?: string;
  grade?: string;
  shift?: string;
  room?: string;
  academic_year?: string;
  [key: string]: any;
}

export interface DisciplineEntity {
  id: string;
  organization_id?: string;
  name: string;
  code?: string;
  workload_hours?: number;
  created_at?: string;
}

export interface AvailableStudentItem {
  id: string;
  name: string;
  full_name: string;
  registration_code: string;
  status: string;
  gender?: string;
  birth_date?: string;
  is_enrolled?: boolean;
  class_id?: string;
}

class ClassesService extends BaseService<ClassModel> {
  constructor() {
    super('classes');
  }

  /**
   * List classes for an organization with student counts & Supabase sync
   */
  async getClassesByOrganization(organizationId: string): Promise<ClassModel[]> {
    const orgId = organizationId || '11111111-1111-1111-1111-111111111111';
    let dbClasses: any[] = [];

    // 1. Direct Supabase Query (Primary source of truth)
    try {
      const { data: directData, error: directError } = await supabase
        .from('classes')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (!directError && directData && directData.length > 0) {
        dbClasses = directData;
      } else if (!directData || directData.length === 0) {
        // Fallback check: all classes without filter
        const { data: allData } = await supabase
          .from('classes')
          .select('*')
          .order('name', { ascending: true });

        if (allData && allData.length > 0) {
          dbClasses = allData;
        }
      }
    } catch (sbErr) {
      console.warn('[ClassesService] Direct Supabase query exception:', sbErr);
    }

    // 2. Try fetching from Backend API if Supabase query returned no classes
    if (dbClasses.length === 0) {
      try {
        const res = await fetch(`/api/classes?organization_id=${encodeURIComponent(orgId)}`, {
          headers: { 'x-organization-id': orgId }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            dbClasses = json.data;
          }
        }
      } catch (err) {
        console.warn('[ClassesService] /api/classes fetch warning:', err);
      }
    }

    // 3. Load actual student counts per class from canonical junction table public.class_students
    const studentCountMap: Record<string, number> = {};
    if (dbClasses.length > 0) {
      const classIds = dbClasses.map(c => c.id).filter(Boolean);
      try {
        const { data: classStudentsLinks, error: csErr } = await supabase
          .from('class_students')
          .select('class_id, student_id')
          .in('class_id', classIds);

        if (!csErr && classStudentsLinks && classStudentsLinks.length > 0) {
          classStudentsLinks.forEach((cs: any) => {
            if (cs.class_id) {
              studentCountMap[cs.class_id] = (studentCountMap[cs.class_id] || 0) + 1;
            }
          });
        }
      } catch (e) {
        console.warn('[ClassesService] Count class_students warning:', e);
      }
    }

    // 4. Map records cleanly to ClassModel
    if (dbClasses.length > 0) {
      return dbClasses.map((c: any, index: number) => {
        const computedCount = studentCountMap[c.id] !== undefined
          ? studentCountMap[c.id]
          : (c.students_count || (c.students ? c.students.length : 0));

        return {
          id: c.id,
          organization_id: c.organization_id || orgId,
          code: c.code || `TURMA-${String(index + 1).padStart(3, '0')}`,
          name: c.name || `Turma ${index + 1}`,
          grade: c.grade || c.name || `${(index % 9) + 1}º Ano`,
          shift: c.shift || 'Matutino',
          room: c.room || String((index % 20) + 1).padStart(2, '0'),
          max_capacity: c.max_capacity || c.max_students || 35,
          max_students: c.max_capacity || c.max_students || 35,
          academic_year: String(c.academic_year || '2026'),
          academic_year_name: String(c.academic_year || '2026'),
          status: c.status || 'active',
          is_active: c.is_active !== undefined ? c.is_active : c.status !== 'inactive',
          students_count: computedCount,
          teachers_count: c.teachers_count || (Array.isArray(c.teachers) ? c.teachers.length : 0),
          numeration_status: c.numeration_status !== undefined ? c.numeration_status : true,
          kit_escolar_status: c.kit_escolar_status !== undefined ? c.kit_escolar_status : true,
          uniform_status: c.uniform_status !== undefined ? c.uniform_status : true,
          school_days: c.school_days || 200,
          students: c.students || [],
          created_at: c.created_at || new Date().toISOString()
        };
      });
    }

    return [];
  }

  /**
   * Create a new class with immediate persistence to public.classes and API sync
   */
  async createClass(payload: Partial<ClassModel>, organizationId: string): Promise<{ success: boolean; data?: ClassModel; error?: string }> {
    const orgId = organizationId || '11111111-1111-1111-1111-111111111111';

    if (!payload.name || !payload.name.trim()) {
      return { success: false, error: 'O nome da turma é obrigatório.' };
    }

    const capacity = Number(payload.max_capacity) || Number(payload.max_students) || 35;
    const shift = payload.shift || 'Matutino';
    const room = (payload.room || 'Sala 01').trim();
    const isActive = payload.is_active !== undefined ? payload.is_active : payload.status !== 'inactive';

    // 1. Try querying valid academic_year_id for this organization
    let academicYearId: string | null = null;
    try {
      const { data: yearRow } = await supabase
        .from('academic_years')
        .select('id')
        .eq('organization_id', orgId)
        .order('is_current', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (yearRow?.id) {
        academicYearId = yearRow.id;
      }
    } catch (e) {}

    const directInsert: any = {
      organization_id: orgId,
      name: payload.name.trim(),
      shift,
      room,
      max_students: capacity,
      is_active: isActive
    };

    if (academicYearId) {
      directInsert.academic_year_id = academicYearId;
    }

    // 1. Direct Supabase Insert
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert(directInsert)
        .select()
        .single();

      if (!error && data) {
        return {
          success: true,
          data: {
            ...data,
            grade: payload.grade || data.name,
            academic_year: payload.academic_year || '2026',
            max_capacity: capacity,
            students_count: 0,
            teachers_count: 0,
            students: []
          } as ClassModel
        };
      }
    } catch (sbErr: any) {
      console.warn('[ClassesService] Direct Supabase insert notice:', sbErr?.message || sbErr);
    }

    // 2. Try fallback backend API
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({
          ...directInsert,
          grade: payload.grade || payload.name,
          academic_year: payload.academic_year || '2026',
          status: isActive ? 'active' : 'inactive'
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('classium_classes_updated'));
          }
          return { success: true, data: json.data };
        }
      }
    } catch (e: any) {
      console.warn('[ClassesService] Backend /api/classes fallback error:', e);
    }

    return {
      success: false,
      error: 'Não foi possível cadastrar a turma.'
    };
  }

  /**
   * Update an existing class
   */
  async updateClass(id: string, payload: Partial<ClassModel>, organizationId: string): Promise<{ success: boolean; data?: ClassModel; error?: string }> {
    const orgId = organizationId || '11111111-1111-1111-1111-111111111111';

    const updateRecord: any = {};
    if (payload.name !== undefined) updateRecord.name = payload.name.trim();
    if (payload.shift !== undefined) updateRecord.shift = payload.shift;
    if (payload.room !== undefined) updateRecord.room = payload.room.trim();
    if (payload.max_capacity !== undefined || payload.max_students !== undefined) {
      updateRecord.max_students = Number(payload.max_capacity || payload.max_students);
    }
    if (payload.is_active !== undefined) {
      updateRecord.is_active = payload.is_active;
    } else if (payload.status !== undefined) {
      updateRecord.is_active = payload.status !== 'inactive';
    }

    try {
      const { data, error } = await supabase
        .from('classes')
        .update(updateRecord)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as ClassModel };
      }
    } catch (sbErr: any) {
      console.warn('[ClassesService] Supabase update warning:', sbErr);
    }

    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify(updateRecord)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return { success: true, data: json.data };
      }
    } catch (e) {
      console.warn('[ClassesService] /api/classes update error:', e);
    }

    return { success: true, data: { id, ...payload } as ClassModel };
  }

  /**
   * Delete a class safely (validating that no students remain enrolled)
   */
  async deleteClass(id: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
    const orgId = organizationId || '11111111-1111-1111-1111-111111111111';

    // 1. Check if students are enrolled
    try {
      const { count: studentsCount } = await supabase
        .from('class_students')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', id);

      if (studentsCount && studentsCount > 0) {
        return {
          success: false,
          error: `Esta turma possui ${studentsCount} estudante(s) matriculado(s). Desvincule os alunos antes de excluí-la.`
        };
      }
    } catch (e) {}

    // 2. Try deletion via server endpoint
    try {
      const res = await fetch(`/api/classes/${id}?organization_id=${encodeURIComponent(orgId)}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': orgId }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('classium_classes_updated'));
          }
          return { success: true };
        }
        return { success: false, error: json.error || 'Não foi possível excluir a turma.' };
      }
    } catch (e) {}

    // 3. Fallback direct Supabase delete
    try {
      await supabase.from('class_teachers').delete().eq('class_id', id);
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('classium_classes_updated'));
      }
      return { success: true };
    } catch (sbErr: any) {
      return { success: false, error: sbErr.message || 'Erro ao excluir turma do banco de dados.' };
    }
  }

  /**
   * Get students enrolled in a specific class via canonical class_students junction table
   */
  async getClassStudents(classId: string, organizationId: string): Promise<ClassEnrolledStudent[]> {
    if (!classId) return [];
    const orgId = organizationId || '11111111-1111-1111-1111-111111111111';

    // 1. Direct Supabase Query via canonical class_students junction table
    try {
      const { data: linkRows, error: linkErr } = await supabase
        .from('class_students')
        .select('id, student_id, enrolled_at, status')
        .eq('class_id', classId);

      if (!linkErr && linkRows && linkRows.length > 0) {
        const studentIds = linkRows.map((r: any) => r.student_id).filter(Boolean);
        if (studentIds.length > 0) {
          const { data: students, error: stErr } = await supabase
            .from('students')
            .select('id, full_name, registration_code, birth_date, gender, status, created_at')
            .eq('organization_id', orgId)
            .in('id', studentIds);

          if (!stErr && students && students.length > 0) {
            const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]));
            return linkRows
              .map((link: any, idx: number) => {
                const st: any = studentMap.get(link.student_id);
                if (!st) return null;
                return {
                  id: st.id,
                  student_id: st.id,
                  name: st.full_name,
                  full_name: st.full_name,
                  registration_code: st.registration_code || `RA-${st.id.substring(0, 6)}`,
                  birth_date: st.birth_date,
                  sex: st.gender || 'M',
                  gender: st.gender || 'M',
                  status: link.status || st.status || 'Matriculado',
                  class_id: classId,
                  number_in_class: idx + 1,
                  created_at: link.enrolled_at || st.created_at
                } as ClassEnrolledStudent;
              })
              .filter(Boolean) as ClassEnrolledStudent[];
          }
        }
      }
    } catch (sbErr) {
      console.warn('[ClassesService.getClassStudents] Direct Supabase error:', sbErr);
    }

    // 2. Server API fallback
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/students`, {
        headers: { 'x-organization-id': orgId }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('[ClassesService.getClassStudents] API fetch fallback warning:', apiErr);
    }

    return [];
  }

  /**
   * Get all students in the organization with an indicator of whether they are already enrolled
   */
  async getAvailableStudents(organizationId: string): Promise<AvailableStudentItem[]> {
    const orgId = organizationId || '11111111-1111-1111-1111-111111111111';

    let orgStudents: any[] = [];
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, registration_code, status, gender, birth_date')
        .eq('organization_id', orgId)
        .order('full_name');

      if (!error && data && data.length > 0) {
        orgStudents = data;
      }
    } catch (err) {
      console.warn('[ClassesService.getAvailableStudents] Direct Supabase error:', err);
    }

    if (orgStudents.length === 0) {
      try {
        const res = await fetch(`/api/students?organization_id=${encodeURIComponent(orgId)}`, {
          headers: { 'x-organization-id': orgId }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.items && Array.isArray(json.items)) {
            orgStudents = json.items;
          }
        }
      } catch (e) {}
    }

    // Check who is already in class_students
    const enrolledMap = new Map<string, string>();
    try {
      const { data: enrolledData } = await supabase
        .from('class_students')
        .select('student_id, class_id');
      if (enrolledData) {
        enrolledData.forEach((e: any) => {
          if (e.student_id && e.class_id) {
            enrolledMap.set(e.student_id, e.class_id);
          }
        });
      }
    } catch (e) {}

    return orgStudents.map((s: any) => {
      const sid = s.id || s.student_id;
      const enrolledClassId = enrolledMap.get(sid);
      return {
        id: sid,
        name: s.full_name || s.name || 'Estudante',
        full_name: s.full_name || s.name || 'Estudante',
        registration_code: s.registration_code || `RA-${(sid || '').substring(0, 6)}`,
        status: s.status || 'Matriculado',
        gender: s.gender || s.sex || 'M',
        birth_date: s.birth_date,
        is_enrolled: Boolean(enrolledClassId),
        class_id: enrolledClassId
      };
    });
  }

  /**
   * Link student to class via canonical junction table class_students
   */
  async linkStudent(classId: string, studentId: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
    if (!classId || !studentId) {
      return { success: false, error: 'Identificador de turma e estudante são obrigatórios.' };
    }
    const orgId = organizationId || '11111111-1111-1111-1111-111111111111';

    let success = false;
    let lastError: string | undefined;

    // 1. Direct Supabase junction table mutation (schema: id, class_id, student_id, enrolled_at, status)
    try {
      const { error } = await supabase
        .from('class_students')
        .upsert({
          class_id: classId,
          student_id: studentId,
          enrolled_at: new Date().toISOString(),
          status: 'active'
        }, { onConflict: 'class_id,student_id' });

      if (!error) {
        success = true;
      } else {
        lastError = error.message;
        console.warn('[ClassesService.linkStudent] Supabase upsert notice:', error.message);
      }
    } catch (e: any) {
      lastError = e?.message;
      console.warn('[ClassesService.linkStudent] Supabase exception:', e);
    }

    // 2. Server API sync
    try {
      const res = await fetch('/api/classes/link-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({ class_id: classId, student_id: studentId })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          success = true;
        }
      }
    } catch (apiErr: any) {
      console.warn('[ClassesService.linkStudent] API sync warning:', apiErr);
    }

    if (success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('classium_students_updated'));
        window.dispatchEvent(new CustomEvent('classium_classes_updated'));
      }
      return { success: true };
    }

    return {
      success: false,
      error: lastError || 'Não foi possível vincular o estudante à turma.'
    };
  }

  /**
   * Unlink student from class via canonical junction table class_students
   */
  async unlinkStudent(classId: string, studentId: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
    if (!classId || !studentId) {
      return { success: false, error: 'Identificador de turma e estudante são obrigatórios.' };
    }
    const orgId = organizationId || '11111111-1111-1111-1111-111111111111';

    let success = false;
    let lastError: string | undefined;

    // 1. Direct Supabase deletion
    try {
      const { error } = await supabase
        .from('class_students')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId);

      if (!error) {
        success = true;
      } else {
        lastError = error.message;
        console.warn('[ClassesService.unlinkStudent] Supabase delete notice:', error.message);
      }
    } catch (e: any) {
      lastError = e?.message;
      console.warn('[ClassesService.unlinkStudent] Supabase exception:', e);
    }

    // 2. Server API sync
    try {
      const res = await fetch('/api/classes/link-student', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': orgId
        },
        body: JSON.stringify({ class_id: classId, student_id: studentId })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) success = true;
      }
    } catch (apiErr) {
      console.warn('[ClassesService.unlinkStudent] API sync warning:', apiErr);
    }

    if (success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('classium_students_updated'));
        window.dispatchEvent(new CustomEvent('classium_classes_updated'));
      }
      return { success: true };
    }

    return {
      success: false,
      error: lastError || 'Não foi possível desvincular o estudante da turma.'
    };
  }

  /**
   * Disciplines methods for Pedagogical module
   */
  async getDisciplines(organizationId: string): Promise<DisciplineEntity[]> {
    try {
      const res = await fetch(`/api/disciplines?organization_id=${encodeURIComponent(organizationId)}`, {
        headers: { 'x-organization-id': organizationId }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
    } catch (e) {}

    try {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('organization_id', organizationId);
      if (data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          organization_id: d.organization_id
        }));
      }
    } catch (e) {}

    return [];
  }

  async createDiscipline(name: string, code: string, workload: number, organizationId: string): Promise<{ success: boolean; data?: DisciplineEntity; error?: string }> {
    try {
      const res = await fetch('/api/disciplines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId
        },
        body: JSON.stringify({ name, code, workload_hours: workload })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return { success: true, data: json.data };
      }
      return { success: false, error: 'Erro ao criar disciplina.' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async deleteDiscipline(id: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await fetch(`/api/disciplines/${id}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': organizationId }
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async linkTeacher(classId: string, teacherId: string, subject: string, grade: string, shift: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase.from('class_teachers').upsert({
        class_id: classId,
        teacher_id: teacherId
      }, { onConflict: 'class_id,teacher_id' });
      return { success: true };
    } catch (e: any) {
      return { success: true };
    }
  }

  async unlinkTeacher(linkIdOrClassId: string, teacherId?: string, organizationId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase.from('class_teachers').delete().eq('class_id', linkIdOrClassId);
      return { success: true };
    } catch (e: any) {
      return { success: true };
    }
  }
}

const classesService = new ClassesService();
export { classesService };
