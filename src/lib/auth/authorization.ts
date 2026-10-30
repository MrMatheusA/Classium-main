import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../supabase';

export interface TeacherClassAuthResult {
  authorized: boolean;
  status: 200 | 400 | 401 | 403;
  error?: string;
  userId?: string;
  teacherId?: string;
  role?: string;
  organizationId?: string;
}

export interface CheckTeacherClassOptions {
  client?: SupabaseClient | any;
  userId?: string | null;
  classId: string;
  organizationId?: string | null;
}

/**
 * Canonical helper for teacher-class authorization.
 * Strict PostgREST-compliant implementation without arbitrary SQL subqueries.
 * Strictly separates profiles.id (auth user) and teachers.id (canonical teacher entity).
 */
export async function checkTeacherClassAuthorization(
  optionsOrUserId: CheckTeacherClassOptions | string | null | undefined,
  maybeClassId?: string,
  maybeOrganizationId?: string | null,
  maybeClient?: any
): Promise<TeacherClassAuthResult> {
  let userId: string | null | undefined;
  let classId: string;
  let organizationId: string | null | undefined;
  let client: any;

  if (optionsOrUserId && typeof optionsOrUserId === 'object') {
    userId = optionsOrUserId.userId;
    classId = optionsOrUserId.classId;
    organizationId = optionsOrUserId.organizationId;
    client = optionsOrUserId.client || defaultSupabase;
  } else {
    userId = typeof optionsOrUserId === 'string' ? optionsOrUserId : (optionsOrUserId === null ? null : undefined);
    classId = maybeClassId || '';
    organizationId = maybeOrganizationId;
    client = maybeClient || defaultSupabase;
  }

  // 1. Mandatory Parameters Validation
  if (!classId) {
    return {
      authorized: false,
      status: 400,
      error: 'Identificador da turma é obrigatório.'
    };
  }

  if (!userId) {
    return {
      authorized: false,
      status: 401,
      error: 'Não autenticado.'
    };
  }

  if (!client) {
    return {
      authorized: false,
      status: 403,
      error: 'Cliente de banco de dados indisponível para verificação.'
    };
  }

  try {
    // 2. Verify Class & its Organization Boundary
    const { data: classRow, error: classErr } = await client
      .from('classes')
      .select('id, organization_id, name')
      .eq('id', classId)
      .maybeSingle();

    if (classErr) {
      console.warn('[checkTeacherClassAuthorization] Erro ao consultar turma:', classErr);
      return {
        authorized: false,
        status: 403,
        error: 'Acesso negado: falha ao consultar turma.'
      };
    }

    const classOrgId = classRow?.organization_id;
    const targetOrgId = organizationId || classOrgId;

    if (classOrgId && organizationId && classOrgId !== organizationId) {
      return {
        authorized: false,
        status: 403,
        error: 'Acesso negado: turma pertence a outra organização.'
      };
    }

    // 3. Verify Organization Membership & Active Status
    let membershipQuery = client
      .from('organization_members')
      .select('id, member_role, status, organization_id')
      .eq('user_id', userId);

    if (targetOrgId) {
      membershipQuery = membershipQuery.eq('organization_id', targetOrgId);
    }

    const { data: members, error: memErr } = await membershipQuery;

    if (memErr) {
      console.warn('[checkTeacherClassAuthorization] Erro ao consultar organization_members:', memErr);
      return {
        authorized: false,
        status: 403,
        error: 'Acesso negado: falha ao consultar vínculo organizacional.'
      };
    }

    const memberList = Array.isArray(members) ? members : (members ? [members] : []);
    const activeMembership = memberList.find((m: any) => m.status === 'active');

    if (!activeMembership) {
      return {
        authorized: false,
        status: 403,
        error: 'Acesso negado: vínculo organizacional inativo ou inexistente.'
      };
    }

    const memberRole = String(activeMembership.member_role || '').toLowerCase().trim();

    // 4. Institutional / Managerial Roles (Global institutional permission for tenant)
    const managerialRoles = ['admin', 'superadmin', 'diretor', 'gestor', 'role_admin_master', 'admin_master'];
    if (managerialRoles.includes(memberRole)) {
      return {
        authorized: true,
        status: 200,
        userId,
        role: memberRole,
        organizationId: targetOrgId || activeMembership.organization_id
      };
    }

    // 5. Verify Teacher Roles
    const teacherRoles = ['professor', 'docente', 'teacher'];
    if (!teacherRoles.includes(memberRole)) {
      return {
        authorized: false,
        status: 403,
        error: 'Acesso negado: papel sem permissão para registrar ou consultar frequência.'
      };
    }

    // 6. Explicitly resolve teacher record in `teachers` table by profile_id
    // Must NOT mix profiles.id with teachers.id. Fail-closed if no teacher record exists.
    let teacherQuery = client
      .from('teachers')
      .select('id, profile_id, status, organization_id')
      .eq('profile_id', userId);

    if (targetOrgId) {
      teacherQuery = teacherQuery.eq('organization_id', targetOrgId);
    }

    const { data: teacherRow, error: teacherErr } = await teacherQuery.maybeSingle();

    if (teacherErr) {
      console.warn('[checkTeacherClassAuthorization] Erro ao consultar professores:', teacherErr);
      return {
        authorized: false,
        status: 403,
        error: 'Acesso negado: falha ao consultar registro de professor.'
      };
    }

    if (!teacherRow || !teacherRow.id) {
      return {
        authorized: false,
        status: 403,
        error: 'Acesso negado: perfil docente não localizado para o usuário autenticado.'
      };
    }

    // 7. Verify Teacher-Class link in `class_teachers` table strictly by canonical teacher_id (teachers.id)
    const { data: linkRow, error: linkErr } = await client
      .from('class_teachers')
      .select('id, class_id, teacher_id')
      .eq('class_id', classId)
      .eq('teacher_id', teacherRow.id)
      .maybeSingle();

    if (linkErr) {
      console.warn('[checkTeacherClassAuthorization] Erro ao consultar class_teachers:', linkErr);
      return {
        authorized: false,
        status: 403,
        error: 'Acesso negado: falha ao consultar vínculos de turma.'
      };
    }

    if (!linkRow) {
      return {
        authorized: false,
        status: 403,
        error: 'Acesso negado: docente não vinculado a esta turma.'
      };
    }

    return {
      authorized: true,
      status: 200,
      userId,
      teacherId: linkRow.teacher_id,
      role: memberRole,
      organizationId: targetOrgId || activeMembership.organization_id
    };
  } catch (err: any) {
    console.error('[checkTeacherClassAuthorization] Exceção inesperada:', err);
    return {
      authorized: false,
      status: 403,
      error: 'Acesso negado: falha na validação de permissões.'
    };
  }
}

/**
 * Boolean wrapper for simpler checks
 */
export async function isTeacherAuthorizedForClass(
  userId: string,
  classId: string,
  organizationId?: string,
  client?: any
): Promise<boolean> {
  const result = await checkTeacherClassAuthorization(userId, classId, organizationId, client);
  return result.authorized;
}
