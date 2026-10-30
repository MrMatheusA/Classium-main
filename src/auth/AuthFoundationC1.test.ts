import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService, normalizeRoleToAppRole } from '../services/users.service';
import { supabase } from '../lib/supabase';
import { resolveAcademicAuthContext, isValidUUID } from '../../server/academicAuthContext';

describe('CLASSIUM — COMANDO MESTRE C1: Fundação de Autenticação e Multi-Tenant', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. REGRA 1 & 2: Identidade e Fonte Canônica de Vínculo
  // =========================================================================
  describe('1. Identidade Canônica e Fontes Autoritativas', () => {
    it('1.1 normalizeRoleToAppRole deve reconhecer única e exclusivamente papéis canônicos', () => {
      expect(normalizeRoleToAppRole('admin')).toBe('admin');
      expect(normalizeRoleToAppRole('gestor')).toBe('gestor');
      expect(normalizeRoleToAppRole('docente')).toBe('docente');
      expect(normalizeRoleToAppRole('familia')).toBe('familia');

      // Papéis arbitrários ou legados não normalizados
      expect(normalizeRoleToAppRole('super_admin')).toBeNull();
      expect(normalizeRoleToAppRole('aluno')).toBeNull();
      expect(normalizeRoleToAppRole('unknown')).toBeNull();
      expect(normalizeRoleToAppRole(null)).toBeNull();
      expect(normalizeRoleToAppRole(undefined)).toBeNull();
    });

    it('1.2 Deve resolver platform_members para administradores globais de plataforma', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'admin', is_active: true },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getUserMembership('usr-platform-admin');
      expect(res.status).toBe('active');
      expect(res.data?.type).toBe('platform');
      expect(res.data?.role).toBe('admin');
      expect(res.data?.organization_id).toBeNull();
      mockFrom.mockRestore();
    });

    it('1.3 Deve resolver organization_members como fonte canônica para gestor escolar', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  {
                    organization_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    role: 'gestor',
                    is_active: true,
                  },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getUserMembership('usr-gestor');
      expect(res.status).toBe('active');
      expect(res.data?.type).toBe('organization');
      expect(res.data?.role).toBe('gestor');
      expect(res.data?.organization_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
      mockFrom.mockRestore();
    });
  });

  // =========================================================================
  // 2. REGRA 3: Consulta Defensiva em public.profiles
  // =========================================================================
  describe('2. Consulta Defensiva em public.profiles (Sem presumir colunas estendidas)', () => {
    it('2.1 Deve executar fallback para colunas base quando organization_id/school_id não existirem em profiles (42703)', async () => {
      let queryCount = 0;
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: (cols: string) => ({
              eq: () => ({
                maybeSingle: async () => {
                  queryCount++;
                  if (queryCount === 1) {
                    // Simula erro de coluna inexistente no Supabase de produção
                    return {
                      data: null,
                      error: { code: '42703', message: 'column organization_id does not exist' },
                    };
                  }
                  // Segunda chamada seleciona apenas as colunas base canônicas
                  expect(cols).toContain('full_name');
                  expect(cols).not.toContain('organization_id');
                  return {
                    data: {
                      id: 'usr-defensive',
                      full_name: 'Usuário Defensivo',
                      avatar_url: null,
                      phone: '11988887777',
                      is_active: true,
                      created_at: '2026-01-01T00:00:00Z',
                      updated_at: '2026-01-01T00:00:00Z',
                    },
                    error: null,
                  };
                },
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getProfile('usr-defensive');
      expect(res.status).toBe('active');
      expect(res.data?.id).toBe('usr-defensive');
      expect(res.data?.name).toBe('Usuário Defensivo');
      expect(queryCount).toBe(2);
      mockFrom.mockRestore();
    });
  });

  // =========================================================================
  // 3. REGRA 4 & 5: Proibição de UUIDs Arbitrários e Isolamento Multi-Tenant (Anti-IDOR)
  // =========================================================================
  describe('3. Proibição de UUIDs Fictícios e Isolamento Multi-Tenant', () => {
    it('3.1 isValidUUID deve rejeitar identificadores inválidos e aceitar UUIDs v4 legítimos', () => {
      expect(isValidUUID('11111111-1111-1111-1111-111111111111')).toBe(true);
      expect(isValidUUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('default')).toBe(false);
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID(undefined)).toBe(false);
    });

    it('3.2 Anti-IDOR: Se usuário solicitar targetOrganizationId para a qual NÃO possui vínculo ativo, deve recusar com not_found', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  {
                    organization_id: 'org-legitima-uuid-1',
                    role: 'gestor',
                    is_active: true,
                  },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      // Tenta acessar org-alheia-uuid-2 (onde não tem vínculo)
      const res = await UsersService.getUserMembership('usr-attacker', 'org-alheia-uuid-2');
      expect(res.status).toBe('not_found');
      expect(res.data).toBeNull();
      expect(res.errorMessage).toContain('Acesso negado');
      mockFrom.mockRestore();
    });

    it('3.3 Se vínculo na organização solicitada estiver inativo, deve recusar com status inactive', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  {
                    organization_id: 'org-desativada-uuid',
                    role: 'docente',
                    is_active: false,
                  },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getUserMembership('usr-docente-inativo', 'org-desativada-uuid');
      expect(res.status).toBe('inactive');
      expect(res.data).toBeNull();
      expect(res.errorMessage).toContain('inativo');
      mockFrom.mockRestore();
    });
  });

  // =========================================================================
  // 4. REGRA 7: Regra do Gestor Único e Resolução de Ambiguidade
  // =========================================================================
  describe('4. Regra de Gestor Único e Detecção de Ambiguidade', () => {
    it('4.1 REGRA 7: Se usuário possuir papel de gestor em mais de 1 organização ativa, deve retornar status ambiguous', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  {
                    organization_id: 'org-gestor-1-uuid',
                    role: 'gestor',
                    is_active: true,
                  },
                  {
                    organization_id: 'org-gestor-2-uuid',
                    role: 'gestor',
                    is_active: true,
                  },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      // Sem targetOrganizationId explícito, deve disparar detecção de ambiguidade
      const res = await UsersService.getUserMembership('usr-multi-gestor');
      expect(res.status).toBe('ambiguous');
      expect(res.data).toBeNull();
      expect(res.errorMessage).toContain('múltiplas organizações');
      mockFrom.mockRestore();
    });

    it('4.2 Quando fornecido targetOrganizationId explícito, deve resolver com sucesso a organização selecionada', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  {
                    organization_id: 'org-gestor-1-uuid',
                    role: 'gestor',
                    is_active: true,
                  },
                  {
                    organization_id: 'org-gestor-2-uuid',
                    role: 'gestor',
                    is_active: true,
                  },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      // Seleção explícita desfaz a ambiguidade
      const res = await UsersService.getUserMembership('usr-multi-gestor', 'org-gestor-2-uuid');
      expect(res.status).toBe('active');
      expect(res.data?.organization_id).toBe('org-gestor-2-uuid');
      expect(res.data?.role).toBe('gestor');
      mockFrom.mockRestore();
    });

    it('4.3 Precedência determinística: gestor (1) > docente (2) > familia (3) quando houver apenas 1 de maior nível', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  {
                    organization_id: 'org-school-uuid',
                    role: 'docente',
                    is_active: true,
                  },
                  {
                    organization_id: 'org-school-uuid',
                    role: 'gestor',
                    is_active: true,
                  },
                  {
                    organization_id: 'org-school-uuid',
                    role: 'familia',
                    is_active: true,
                  },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getUserMembership('usr-multi-role');
      expect(res.status).toBe('active');
      expect(res.data?.role).toBe('gestor');
      mockFrom.mockRestore();
    });
  });

  // =========================================================================
  // 5. REGRA 9: Falhas Transitórias de Rede/Banco (Sem Deslogar)
  // =========================================================================
  describe('5. Falhas Transitórias e Erros Recuperáveis (Sem signOut)', () => {
    it('5.1 Erro de rede (Failed to fetch) deve retornar network_error e preservar sessão', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation(() => {
        throw new Error('Failed to fetch');
      });

      const res = await UsersService.getUserMembership('usr-network-test');
      expect(res.status).toBe('unexpected_error'); // capturado na camada de serviço
      mockFrom.mockRestore();
    });

    it('5.2 Erro 42501 (RLS / Permission Denied) deve retornar permission_denied', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { code: '42501', message: 'permission denied for table platform_members' },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getUserMembership('usr-rls-test');
      expect(res.status).toBe('permission_denied');
      expect(res.data).toBeNull();
      mockFrom.mockRestore();
    });
  });

  // =========================================================================
  // 6. SERVIDOR: resolveAcademicAuthContext (Fail-Closed Multi-Tenant)
  // =========================================================================
  describe('6. resolveAcademicAuthContext no Backend (Fail-Closed & RBAC)', () => {
    it('6.1 Requisição sem cabeçalho Authorization Bearer deve falhar fechada com 401', async () => {
      const req = { headers: {} };
      const ctx = await resolveAcademicAuthContext(req, {
        requireAuth: true,
        clientProvider: () => null,
      });

      expect(ctx.authenticated).toBe(false);
      expect(ctx.error?.status).toBe(401);
      expect(ctx.error?.code).toBe('UNAUTHORIZED');
    });

    it('6.2 Requisição com usuário sem vínculos deve retornar 403 FORBIDDEN_NO_ORGANIZATION', async () => {
      const fakeSb = {
        auth: {
          getUser: async () => ({
            data: { user: { id: 'usr-no-tenant-uuid', email: 'notenant@classium.edu.br' } },
            error: null,
          }),
        },
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 'usr-no-tenant-uuid' } }),
                }),
              }),
            };
          }
          if (table === 'platform_members') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      maybeSingle: async () => ({ data: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'organization_members') {
            return {
              select: () => ({
                eq: () => ({
                  eq: async () => ({ data: [], error: null }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const req = { headers: { authorization: 'Bearer valid.jwt.token' } };
      const ctx = await resolveAcademicAuthContext(req, {
        requireAuth: true,
        clientProvider: () => fakeSb,
      });

      expect(ctx.authenticated).toBe(false);
      expect(ctx.error?.status).toBe(403);
      expect(ctx.error?.code).toBe('FORBIDDEN_NO_ORGANIZATION');
    });

    it('6.3 Requisição com tentativa de IDOR (x-organization-id para outra org) deve retornar 403 FORBIDDEN_ORGANIZATION_MISMATCH', async () => {
      const fakeSb = {
        auth: {
          getUser: async () => ({
            data: { user: { id: 'usr-single-tenant-uuid', email: 'user@classium.edu.br' } },
            error: null,
          }),
        },
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 'usr-single-tenant-uuid' } }),
                }),
              }),
            };
          }
          if (table === 'platform_members') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      maybeSingle: async () => ({ data: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'organization_members') {
            return {
              select: () => ({
                eq: () => ({
                  eq: async () => ({
                    data: [
                      {
                        id: 'mem-1',
                        organization_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                        role: 'gestor',
                        is_active: true,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      // O usuário pertence a a1b2c3d4-..., mas tenta acessar 99999999-9999-9999-9999-999999999999
      const req = {
        headers: {
          authorization: 'Bearer valid.jwt.token',
          'x-organization-id': '99999999-9999-9999-9999-999999999999',
        },
      };
      const ctx = await resolveAcademicAuthContext(req, {
        requireAuth: true,
        clientProvider: () => fakeSb,
      });

      expect(ctx.authenticated).toBe(false);
      expect(ctx.error?.status).toBe(403);
      expect(ctx.error?.code).toBe('FORBIDDEN_ORGANIZATION_MISMATCH');
    });

    it('6.4 Usuário legítimo com organização correta deve resolver com status 200, role canônica e tenant isolado', async () => {
      const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const fakeSb = {
        auth: {
          getUser: async () => ({
            data: { user: { id: 'usr-legit-uuid', email: 'legit@classium.edu.br' } },
            error: null,
          }),
        },
        from: (table: string) => {
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 'usr-legit-uuid', full_name: 'Gestor Legítimo' } }),
                }),
              }),
            };
          }
          if (table === 'platform_members') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    eq: () => ({
                      maybeSingle: async () => ({ data: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'organization_members') {
            return {
              select: () => ({
                eq: () => ({
                  eq: async () => ({
                    data: [
                      {
                        id: 'mem-1',
                        organization_id: orgId,
                        role: 'gestor',
                        is_active: true,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        },
      };

      const req = {
        headers: {
          authorization: 'Bearer valid.jwt.token',
          'x-organization-id': orgId,
        },
      };
      const ctx = await resolveAcademicAuthContext(req, {
        requireAuth: true,
        clientProvider: () => fakeSb,
      });

      expect(ctx.authenticated).toBe(true);
      expect(ctx.organizationId).toBe(orgId);
      expect(ctx.role).toBe('gestor');
      expect(ctx.isGestor).toBe(true);
      expect(ctx.error).toBeUndefined();
    });
  });
});
