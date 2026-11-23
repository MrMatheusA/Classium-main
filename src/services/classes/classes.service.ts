import { supabase } from '../../lib/supabase';
import { BaseService } from '../shared/base.service';
import { ClassModel, ClassEnrolledStudent } from '../../types/class.types';
import { resolveOrgId, NO_SCHOOL_ERROR, friendlyDbError, isUuid } from '../tenant';

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
  weekly_classes?: number;
  area?: string;
  color?: string;
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

type Op = { success: boolean; error?: string };

function notifyClasses() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('classium_classes_updated'));
    window.dispatchEvent(new CustomEvent('classium_students_updated'));
  }
}

const INACTIVE_STUDENT = ['inativo', 'transferido', 'cancelado', 'inactive', 'evadido'];

function mapClass(c: any, studentsCount: number, teachersCount: number): ClassModel {
  const capacity = c.capacity ?? c.max_students ?? c.max_capacity ?? null;
  const year = c.academic_year ? String(c.academic_year) : '';
  return {
    ...c,
    id: c.id,
    organization_id: c.organization_id,
    code: c.code || '',
    name: c.name || '',
    grade: c.grade || '',
    shift: c.shift || '',
    room: c.room || '',
    max_capacity: capacity,
    max_students: capacity,
    academic_year: year,
    academic_year_name: year,
    status: c.status || (c.is_active === false ? 'inactive' : 'active'),
    is_active: c.is_active !== false,
    students_count: studentsCount,
    teachers_count: teachersCount,
    numeration_status: !!c.numeration_status,
    kit_escolar_status: !!c.kit_escolar_status,
    uniform_status: !!c.uniform_status,
    school_days: c.school_days ?? null,
    students: [],
    created_at: c.created_at,
  } as ClassModel;
}

/** Campos da tela → colunas da tabela classes */
function toClassRecord(payload: Partial<ClassModel> & Record<string, any>): Record<string, any> {
  const rec: Record<string, any> = {};
  if (payload.name !== undefined) rec.name = String(payload.name).trim();
  if (payload.code !== undefined) rec.code = String(payload.code).trim() || null;
  if (payload.grade !== undefined) rec.grade = String(payload.grade).trim() || null;
  if (payload.shift !== undefined) rec.shift = payload.shift || null;
  if (payload.room !== undefined) rec.room = String(payload.room).trim() || null;
  if (payload.max_capacity !== undefined || payload.max_students !== undefined) {
    const cap = Number(payload.max_capacity ?? payload.max_students);
    rec.capacity = Number.isFinite(cap) && cap > 0 ? cap : null;
  }
  if (payload.academic_year !== undefined) {
    const y = Number(payload.academic_year);
    rec.academic_year = Number.isFinite(y) && y > 2000 ? y : null;
  }
  if (payload.is_active !== undefined) rec.is_active = !!payload.is_active;
  else if (payload.status !== undefined) rec.is_active = payload.status !== 'inactive';
  if (rec.is_active !== undefined) rec.status = rec.is_active ? 'active' : 'inactive';
  if (payload.numeration_status !== undefined) rec.numeration_status = !!payload.numeration_status;
  if (payload.kit_escolar_status !== undefined) rec.kit_escolar_status = !!payload.kit_escolar_status;
  if (payload.uniform_status !== undefined) rec.uniform_status = !!payload.uniform_status;
  if (payload.school_days !== undefined) {
    const d = Number(payload.school_days);
    rec.school_days = Number.isFinite(d) && d > 0 ? d : null;
  }
  return rec;
}

class ClassesService extends BaseService<ClassModel> {
  constructor() {
    super('classes');
  }

  /**
   * Turmas da escola com o número real de estudantes e professores.
   * Em caso de erro devolve lista vazia e registra no console (mesmo comportamento de antes).
   */
  async getClassesByOrganization(organizationId: string): Promise<ClassModel[]> {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) {
      console.error('[ClassesService]', NO_SCHOOL_ERROR);
      return [];
    }

    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('[ClassesService.getClassesByOrganization]', error.message);
      return [];
    }
    const list = (classes || []) as any[];
    if (list.length === 0) return [];

    const ids = list.map(c => c.id);
    const [studRes, teachRes] = await Promise.all([
      supabase.from('students').select('class_id, status').in('class_id', ids),
      supabase.from('class_teachers').select('class_id, teacher_id').in('class_id', ids),
    ]);

    const studentCount: Record<string, number> = {};
    ((studRes.data || []) as any[]).forEach(s => {
      if (s.class_id && !INACTIVE_STUDENT.includes(String(s.status || '').toLowerCase())) {
        studentCount[s.class_id] = (studentCount[s.class_id] || 0) + 1;
      }
    });

    const teacherSets: Record<string, Set<string>> = {};
    ((teachRes.data || []) as any[]).forEach(t => {
      if (!t.class_id || !t.teacher_id) return;
      (teacherSets[t.class_id] ||= new Set()).add(t.teacher_id);
    });

    return list.map(c => mapClass(c, studentCount[c.id] || 0, teacherSets[c.id]?.size || 0));
  }

  async createClass(payload: Partial<ClassModel>, organizationId: string): Promise<{ success: boolean; data?: ClassModel; error?: string }> {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };
    if (!payload.name?.trim()) return { success: false, error: 'Informe o nome da turma.' };

    const record: Record<string, any> = { ...toClassRecord(payload as any), organization_id: orgId, school_id: orgId };
    if (record.is_active === undefined) {
      record.is_active = true;
      record.status = 'active';
    }

    const { data, error } = await supabase.from('classes').insert(record).select().single();
    if (error || !data) {
      const msg = error?.message?.includes('classes_org_code_uq')
        ? 'Já existe uma turma com este código.'
        : friendlyDbError(error?.message, 'Não foi possível cadastrar a turma.');
      return { success: false, error: msg };
    }

    notifyClasses();
    return { success: true, data: mapClass(data, 0, 0) };
  }

  async updateClass(id: string, payload: Partial<ClassModel>, _organizationId: string): Promise<{ success: boolean; data?: ClassModel; error?: string }> {
    if (!isUuid(id)) return { success: false, error: 'Turma inválida. Atualize a tela.' };
    const record = toClassRecord(payload as any);
    if (record.name === '') return { success: false, error: 'Informe o nome da turma.' };
    if (Object.keys(record).length === 0) return { success: true };

    if (record.capacity) {
      const { count } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('class_id', id);
      if ((count || 0) > record.capacity) {
        return { success: false, error: `A turma já tem ${count} estudantes. A capacidade não pode ser menor que isso.` };
      }
    }

    const { data, error } = await supabase.from('classes').update(record).eq('id', id).select().maybeSingle();
    if (error) {
      const msg = error.message?.includes('classes_org_code_uq')
        ? 'Já existe uma turma com este código.'
        : friendlyDbError(error.message, 'Não foi possível salvar a turma.');
      return { success: false, error: msg };
    }
    if (!data) return { success: false, error: 'Turma não encontrada ou sem permissão.' };

    notifyClasses();
    return { success: true, data: mapClass(data, 0, 0) };
  }

  /** Só exclui turma vazia */
  async deleteClass(id: string, _organizationId: string): Promise<Op> {
    if (!isUuid(id)) return { success: false, error: 'Turma inválida. Atualize a tela.' };

    const { count, error: countErr } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', id);
    if (countErr) return { success: false, error: friendlyDbError(countErr.message) };
    if ((count || 0) > 0) {
      return { success: false, error: `Esta turma tem ${count} estudante(s). Mude os estudantes de turma antes de excluir.` };
    }

    const { data, error } = await supabase.from('classes').delete().eq('id', id).select('id');
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível excluir a turma.') };
    if (!data || data.length === 0) return { success: false, error: 'Turma não encontrada ou sem permissão.' };

    notifyClasses();
    return { success: true };
  }

  /** Estudantes da turma, em ordem alfabética, com o número de chamada */
  async getClassStudents(classId: string, organizationId: string): Promise<ClassEnrolledStudent[]> {
    if (!isUuid(classId)) return [];
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return [];

    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, name, registration_code, birth_date, gender, sex, status, created_at')
      .eq('organization_id', orgId)
      .eq('class_id', classId)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[ClassesService] Não foi possível carregar os estudantes da turma.', error.message);
      return [];
    }

    return ((data || []) as any[]).map((st, idx) => ({
      id: st.id,
      student_id: st.id,
      name: st.full_name || st.name || '',
      full_name: st.full_name || st.name || '',
      registration_code: st.registration_code || '',
      birth_date: st.birth_date,
      sex: st.gender || st.sex || '',
      gender: st.gender || st.sex || '',
      status: st.status || 'Matriculado',
      class_id: classId,
      number_in_class: idx + 1,
      created_at: st.created_at,
    } as ClassEnrolledStudent));
  }

  /** Todos os estudantes da escola, dizendo se já estão em alguma turma */
  async getAvailableStudents(organizationId: string): Promise<AvailableStudentItem[]> {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return [];

    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, name, registration_code, status, gender, sex, birth_date, class_id')
      .eq('organization_id', orgId)
      .order('full_name');

    if (error) {
      console.error('[ClassesService] Não foi possível carregar os estudantes.', error.message);
      return [];
    }

    return ((data || []) as any[]).map(s => ({
      id: s.id,
      name: s.full_name || s.name || '',
      full_name: s.full_name || s.name || '',
      registration_code: s.registration_code || '',
      status: s.status || 'Matriculado',
      gender: s.gender || s.sex || undefined,
      birth_date: s.birth_date || undefined,
      is_enrolled: !!s.class_id,
      class_id: s.class_id || undefined,
    }));
  }

  /** Enturma o estudante (o banco confere a escola e as vagas) */
  async linkStudent(classId: string, studentId: string, _organizationId: string): Promise<Op> {
    if (!isUuid(classId) || !isUuid(studentId)) return { success: false, error: 'Turma ou estudante inválido. Atualize a tela.' };
    const { data, error } = await supabase.rpc('classium_set_student_class', { p_student_id: studentId, p_class_id: classId });
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível enturmar o estudante.') };
    if (!data?.success) return { success: false, error: data?.error || 'Não foi possível enturmar o estudante.' };
    notifyClasses();
    return { success: true };
  }

  async unlinkStudent(classId: string, studentId: string, _organizationId: string): Promise<Op> {
    if (!isUuid(studentId)) return { success: false, error: 'Estudante inválido. Atualize a tela.' };

    const { data: current } = await supabase.from('students').select('class_id').eq('id', studentId).maybeSingle();
    if (current && current.class_id && current.class_id !== classId) {
      return { success: false, error: 'Este estudante já está em outra turma.' };
    }

    const { data, error } = await supabase.rpc('classium_set_student_class', { p_student_id: studentId, p_class_id: null });
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível tirar o estudante da turma.') };
    if (!data?.success) return { success: false, error: data?.error || 'Não foi possível tirar o estudante da turma.' };
    notifyClasses();
    return { success: true };
  }

  /* -------------------------- Disciplinas -------------------------- */

  async getDisciplines(organizationId: string): Promise<DisciplineEntity[]> {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return [];

    const { data, error } = await supabase
      .from('disciplines')
      .select('id, organization_id, name, code, workload_hours, weekly_classes, area, color, created_at')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('[ClassesService] Não foi possível carregar as disciplinas.', error.message);
      return [];
    }
    return (data || []) as DisciplineEntity[];
  }

  async createDiscipline(name: string, code: string, workload: number, organizationId: string): Promise<{ success: boolean; data?: DisciplineEntity; error?: string }> {
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };
    if (!name?.trim()) return { success: false, error: 'Informe o nome da disciplina.' };

    const { data: existing } = await supabase
      .from('disciplines')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('name', name.trim())
      .eq('is_active', true)
      .maybeSingle();
    if (existing) return { success: false, error: 'Já existe uma disciplina com este nome.' };

    const hours = Number(workload);
    const { data, error } = await supabase
      .from('disciplines')
      .insert({
        organization_id: orgId,
        name: name.trim(),
        code: code?.trim() || null,
        workload_hours: Number.isFinite(hours) && hours > 0 ? hours : null,
      })
      .select()
      .single();

    if (error || !data) return { success: false, error: friendlyDbError(error?.message, 'Não foi possível cadastrar a disciplina.') };
    return { success: true, data: data as DisciplineEntity };
  }

  /** Desativa a disciplina (os horários antigos continuam com o nome dela) */
  async deleteDiscipline(id: string, _organizationId: string): Promise<Op> {
    if (!isUuid(id)) return { success: false, error: 'Disciplina inválida. Atualize a tela.' };
    const { data, error } = await supabase.from('disciplines').update({ is_active: false }).eq('id', id).select('id');
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível excluir a disciplina.') };
    if (!data || data.length === 0) return { success: false, error: 'Disciplina não encontrada ou sem permissão.' };
    return { success: true };
  }

  /* --------------------- Professores da turma ---------------------- */

  async getClassTeachers(classId: string): Promise<ClassTeacherLink[]> {
    if (!isUuid(classId)) return [];
    const { data, error } = await supabase
      .from('class_teachers')
      .select('id, class_id, teacher_id, teacher_name, subject, weekly_classes, academic_year')
      .eq('class_id', classId)
      .order('subject');
    if (error) {
      console.error('[ClassesService] Não foi possível carregar os professores da turma.', error.message);
      return [];
    }
    return ((data || []) as any[]).map(t => ({ ...t, name: t.teacher_name, full_name: t.teacher_name }));
  }

  async linkTeacher(
    classId: string,
    teacherId: string,
    subject: string,
    _grade: string,
    _shift: string,
    organizationId: string,
    teacherName?: string
  ): Promise<Op> {
    if (!isUuid(classId) || !isUuid(teacherId)) return { success: false, error: 'Turma ou professor inválido. Atualize a tela.' };
    const orgId = await resolveOrgId(organizationId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };

    const { error } = await supabase.from('class_teachers').insert({
      organization_id: orgId,
      class_id: classId,
      teacher_id: teacherId,
      teacher_name: teacherName?.trim() || null,
      subject: subject?.trim() || null,
    });

    if (error) {
      const msg = error.message?.includes('duplicate')
        ? 'Este professor já está nesta turma com esta disciplina.'
        : friendlyDbError(error.message, 'Não foi possível vincular o professor.');
      return { success: false, error: msg };
    }
    notifyClasses();
    return { success: true };
  }

  /**
   * Remove o professor da turma.
   * Com teacherId: remove esse professor da turma linkIdOrClassId.
   * Sem teacherId: linkIdOrClassId é o id do vínculo.
   */
  async unlinkTeacher(linkIdOrClassId: string, teacherId?: string, _organizationId?: string): Promise<Op> {
    if (!isUuid(linkIdOrClassId)) return { success: false, error: 'Vínculo inválido. Atualize a tela.' };

    let query = supabase.from('class_teachers').delete();
    query = isUuid(teacherId)
      ? query.eq('class_id', linkIdOrClassId).eq('teacher_id', teacherId)
      : query.eq('id', linkIdOrClassId);

    const { data, error } = await query.select('id');
    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível remover o professor.') };
    if (!data || data.length === 0) return { success: false, error: 'Vínculo não encontrado ou sem permissão.' };
    notifyClasses();
    return { success: true };
  }
}

const classesService = new ClassesService();
export { classesService };