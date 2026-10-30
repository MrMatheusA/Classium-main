import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkTeacherClassAuthorization, isTeacherAuthorizedForClass } from './authorization';
import { supabase } from '../supabase';

describe('Canonical Teacher-Class Authorization Suite (P2.325.34)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const classId = 'class-9a-uuid';
  const orgA = 'org-alpha-uuid';
  const orgB = 'org-beta-uuid';
  const teacherUserId = 'profile-user-uuid-123';
  const teacherRecordId = 'teacher-entity-uuid-456';

  it('1. Perfil autenticado com registro de professor e vínculo válido com a turma (deve autorizar com status 200)', async () => {
    const recordedCalls: Record<string, any[]> = {};

    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      recordedCalls[table] = recordedCalls[table] || [];
      const calls = recordedCalls[table];

      if (table === 'classes') {
        return {
          select: (cols: string) => ({
            eq: (col: string, val: any) => {
              calls.push({ method: 'eq', col, val });
              return {
                maybeSingle: async () => ({
                  data: { id: classId, organization_id: orgA, name: '9º Ano A' },
                  error: null,
                }),
              };
            },
          }),
        } as any;
      }
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => {
              calls.push({ method: 'eq', col: col1, val: val1 });
              return {
                eq: (col2: string, val2: any) => {
                  calls.push({ method: 'eq', col: col2, val: val2 });
                  return {
                    data: [{ id: 'mem-1', member_role: 'professor', status: 'active', organization_id: orgA }],
                    error: null,
                  };
                },
              };
            },
          }),
        } as any;
      }
      if (table === 'teachers') {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => {
              calls.push({ method: 'eq', col: col1, val: val1 });
              return {
                eq: (col2: string, val2: any) => {
                  calls.push({ method: 'eq', col: col2, val: val2 });
                  return {
                    maybeSingle: async () => ({
                      data: { id: teacherRecordId, profile_id: teacherUserId, status: 'active', organization_id: orgA },
                      error: null,
                    }),
                  };
                },
              };
            },
          }),
        } as any;
      }
      if (table === 'class_teachers') {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => {
              calls.push({ method: 'eq', col: col1, val: val1 });
              return {
                eq: (col2: string, val2: any) => {
                  calls.push({ method: 'eq', col: col2, val: val2 });
                  return {
                    maybeSingle: async () => ({
                      data: { id: 'link-1', class_id: classId, teacher_id: teacherRecordId },
                      error: null,
                    }),
                  };
                },
              };
            },
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await checkTeacherClassAuthorization({
      userId: teacherUserId,
      classId,
      organizationId: orgA,
    });

    expect(res.authorized).toBe(true);
    expect(res.status).toBe(200);
    expect(res.role).toBe('professor');
    expect(res.teacherId).toBe(teacherRecordId);

    // Validate exact arguments sent to Supabase
    expect(recordedCalls['teachers']).toContainEqual({ method: 'eq', col: 'profile_id', val: teacherUserId });
    expect(recordedCalls['class_teachers']).toContainEqual({ method: 'eq', col: 'class_id', val: classId });
    expect(recordedCalls['class_teachers']).toContainEqual({ method: 'eq', col: 'teacher_id', val: teacherRecordId });

    mockFrom.mockRestore();
  });

  it('2. Professor existente, mas sem vínculo com a turma (deve retornar 403 proibido)', async () => {
    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'classes') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: classId, organization_id: orgA, name: '9º Ano A' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                data: [{ id: 'mem-1', member_role: 'professor', status: 'active', organization_id: orgA }],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'teachers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: teacherRecordId, profile_id: teacherUserId, status: 'active', organization_id: orgA },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'class_teachers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await checkTeacherClassAuthorization({
      userId: teacherUserId,
      classId,
      organizationId: orgA,
    });

    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain('não vinculado a esta turma');

    mockFrom.mockRestore();
  });

  it('3. Perfil sem registro correspondente em teachers (deve negar por padrão 403)', async () => {
    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'classes') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: classId, organization_id: orgA, name: '9º Ano A' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                data: [{ id: 'mem-1', member_role: 'professor', status: 'active', organization_id: orgA }],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'teachers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                // No teacher record linked to profile_id
                maybeSingle: async () => ({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await checkTeacherClassAuthorization({
      userId: teacherUserId,
      classId,
      organizationId: orgA,
    });

    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain('perfil docente não localizado');

    mockFrom.mockRestore();
  });

  it('4. teacher_id diferente de profiles.id, com vínculo válido por teachers.id (deve autorizar 200)', async () => {
    const distinctProfileId = 'profile-distinct-1111';
    const distinctTeacherId = 'teacher-entity-9999';

    expect(distinctProfileId).not.toBe(distinctTeacherId);

    const recordedClassTeacherCalls: any[] = [];

    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'classes') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: classId, organization_id: orgA, name: '9º Ano A' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                data: [{ id: 'mem-1', member_role: 'professor', status: 'active', organization_id: orgA }],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'teachers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: distinctTeacherId, profile_id: distinctProfileId, status: 'active', organization_id: orgA },
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'class_teachers') {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => {
              recordedClassTeacherCalls.push({ col: col1, val: val1 });
              return {
                eq: (col2: string, val2: any) => {
                  recordedClassTeacherCalls.push({ col: col2, val: val2 });
                  return {
                    maybeSingle: async () => ({
                      data: { id: 'link-distinct', class_id: classId, teacher_id: distinctTeacherId },
                      error: null,
                    }),
                  };
                },
              };
            },
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await checkTeacherClassAuthorization({
      userId: distinctProfileId,
      classId,
      organizationId: orgA,
    });

    expect(res.authorized).toBe(true);
    expect(res.status).toBe(200);
    expect(res.teacherId).toBe(distinctTeacherId);

    // Verify class_teachers was queried with distinctTeacherId, NEVER distinctProfileId
    expect(recordedClassTeacherCalls).toContainEqual({ col: 'teacher_id', val: distinctTeacherId });
    expect(recordedClassTeacherCalls).not.toContainEqual({ col: 'teacher_id', val: distinctProfileId });

    mockFrom.mockRestore();
  });

  it('5. Tentativa de acesso a outra organização (deve retornar 403 por isolamento multi-tenant)', async () => {
    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'classes') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: classId, organization_id: orgA, name: '9º Ano A' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await checkTeacherClassAuthorization({
      userId: teacherUserId,
      classId,
      organizationId: orgB,
    });

    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain('pertence a outra organização');

    mockFrom.mockRestore();
  });

  it('6. Membership inativo (deve retornar 403 vínculo inativo)', async () => {
    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'classes') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: classId, organization_id: orgA, name: '9º Ano A' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                data: [{ id: 'mem-1', member_role: 'professor', status: 'inactive', organization_id: orgA }],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await checkTeacherClassAuthorization({
      userId: teacherUserId,
      classId,
      organizationId: orgA,
    });

    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain('inativo ou inexistente');

    mockFrom.mockRestore();
  });

  it('7. Papel sem permissão (aluno / responsável) (deve retornar 403)', async () => {
    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'classes') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: classId, organization_id: orgA, name: '9º Ano A' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                data: [{ id: 'mem-student', member_role: 'aluno', status: 'active', organization_id: orgA }],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await checkTeacherClassAuthorization({
      userId: 'student-user-uuid',
      classId,
      organizationId: orgA,
    });

    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain('sem permissão');

    mockFrom.mockRestore();
  });

  it('8. Falha de consulta ou erro de rede (deve falhar fechado com status 403)', async () => {
    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'classes') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: null,
                error: { message: 'Network transport timeout', code: '57P01' },
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await checkTeacherClassAuthorization({
      userId: teacherUserId,
      classId,
      organizationId: orgA,
    });

    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toContain('falha ao consultar');

    mockFrom.mockRestore();
  });

  it('9. Gestor com permissão administrativa válida na própria organização (deve autorizar 200)', async () => {
    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'classes') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: classId, organization_id: orgA, name: '9º Ano A' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                data: [{ id: 'mem-admin', member_role: 'gestor', status: 'active', organization_id: orgA }],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await checkTeacherClassAuthorization({
      userId: 'manager-user-uuid',
      classId,
      organizationId: orgA,
    });

    expect(res.authorized).toBe(true);
    expect(res.status).toBe(200);
    expect(res.role).toBe('gestor');

    mockFrom.mockRestore();
  });

  it('10. Garantia de que nenhuma consulta utiliza uma subconsulta SQL arbitrária em .or()', async () => {
    let orFilterCalled = false;
    let orArgument = '';

    const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        or: (expr: string) => {
          orFilterCalled = true;
          orArgument = expr;
          return builder;
        },
        maybeSingle: async () => {
          if (table === 'classes') return { data: { id: classId, organization_id: orgA }, error: null };
          if (table === 'organization_members') return { data: [{ member_role: 'professor', status: 'active' }], error: null };
          if (table === 'teachers') return { data: { id: teacherRecordId, profile_id: teacherUserId }, error: null };
          if (table === 'class_teachers') return { data: { id: 'link-1', class_id: classId, teacher_id: teacherRecordId }, error: null };
          return { data: null, error: null };
        },
      };
      return builder;
    });

    await checkTeacherClassAuthorization({
      userId: teacherUserId,
      classId,
      organizationId: orgA,
    });

    // Verify that .or() is NEVER called with raw SQL subqueries
    expect(orFilterCalled).toBe(false);
    expect(orArgument).not.toContain('select id from teachers');
    expect(orArgument).not.toContain('select');

    mockFrom.mockRestore();
  });
});
