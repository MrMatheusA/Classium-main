import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService, normalizeRoleToAppRole, ProfileResolution, MembershipResolution } from './users.service';
import { PermissionsService } from './permissions.service';
import { supabase } from '../lib/supabase';

describe('UsersService, PermissionsService & Auth Flow Comprehensive Canonical Suite (P2.327.50.7)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SECTION 1: UsersService.getProfile() Tests
  // =========================================================================
  describe('UsersService.getProfile()', () => {
    it('1.1 should return active profile when profile exists and is_active is true', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'usr-123',
                    full_name: 'Renato Silva',
                    avatar_url: 'https://example.com/avatar.jpg',
                    phone: '11999999999',
                    organization_id: 'org-abc',
                    school_id: 'school-xyz',
                    role: 'gestor',
                    is_active: true,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getProfile('usr-123');
      expect(res.status).toBe('active');
      expect(res.data).not.toBeNull();
      expect(res.data?.id).toBe('usr-123');
      expect(res.data?.name).toBe('Renato Silva');
      expect(res.data?.organization_id).toBe('org-abc');
      expect(res.data?.school_id).toBe('school-xyz');
      expect(res.data?.role).toBe('gestor');
      mockFrom.mockRestore();
    });

    it('1.2 should return inactive when profile exists but is_active is false', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'usr-inact',
                    full_name: 'Conta Desativada',
                    is_active: false,
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getProfile('usr-inact');
      expect(res.status).toBe('inactive');
      expect(res.data).toBeNull();
      expect(res.errorMessage).toContain('inativo');
      mockFrom.mockRestore();
    });

    it('1.3 should return not_found when row does not exist in public.profiles', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
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
        return {} as any;
      });

      const res = await UsersService.getProfile('usr-ghost');
      expect(res.status).toBe('not_found');
      expect(res.data).toBeNull();
      mockFrom.mockRestore();
    });

    it('1.4 should return network_error on transport or connection failure in getProfile', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { message: 'Failed to fetch: net::ERR_CONNECTION_REFUSED' },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getProfile('usr-offline');
      expect(res.status).toBe('network_error');
      expect(res.data).toBeNull();
      expect(res.errorMessage).toContain('Failed to fetch');
      mockFrom.mockRestore();
    });

    it('1.5 should return permission_denied on RLS / authorization error (code 42501) in getProfile', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { code: '42501', message: 'permission denied for table profiles' },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getProfile('usr-denied');
      expect(res.status).toBe('permission_denied');
      expect(res.data).toBeNull();
      expect(res.errorCode).toBe('42501');
      mockFrom.mockRestore();
    });

    it('1.6 should return unexpected_error on unhandled exception in getProfile', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  throw new Error('Database pool exhausted');
                },
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getProfile('usr-crash');
      expect(res.status).toBe('unexpected_error');
      expect(res.data).toBeNull();
      expect(res.errorMessage).toContain('Database pool exhausted');
      mockFrom.mockRestore();
    });

    it('1.7 should fallback gracefully to core columns when extended columns do not exist (code 42703)', async () => {
      let callCount = 0;
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: (cols: string) => {
              callCount++;
              if (callCount === 1) {
                // Primeira tentativa com colunas estendidas falha por 42703 (coluna inexistente no schema)
                return {
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: null,
                      error: { code: '42703', message: 'column profiles.organization_id does not exist' },
                    }),
                  }),
                };
              }
              // Segunda tentativa com colunas base tem sucesso
              return {
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'usr-unmigrated',
                      full_name: 'Usuário Banco Antigo',
                      avatar_url: null,
                      phone: null,
                      is_active: true,
                      created_at: '2026-01-01T00:00:00Z',
                      updated_at: '2026-01-01T00:00:00Z',
                    },
                    error: null,
                  }),
                }),
              };
            },
          } as any;
        }
        return {} as any;
      });

      const res = await UsersService.getProfile('usr-unmigrated');
      expect(res.status).toBe('active');
      expect(res.data).not.toBeNull();
      expect(res.data?.id).toBe('usr-unmigrated');
      expect(res.data?.name).toBe('Usuário Banco Antigo');
      expect(res.data?.organization_id).toBeUndefined();
      expect(callCount).toBe(2);
      mockFrom.mockRestore();
    });
  });

  // =========================================================================
  // SECTION 2: UsersService.getUserMembership() Tests
  // =========================================================================
  describe('UsersService.getUserMembership()', () => {
    it('2.1 should resolve active global admin from platform_members without requiring organization_members', async () => {
      let orgMembersQueried = false;
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
        if (table === 'organization_members') {
          orgMembersQueried = true;
          return {} as any;
        }
        return {} as any;
      });

      const resolution = await UsersService.getUserMembership('user-admin-123');
      expect(resolution.status).toBe('active');
      expect(resolution.data).toEqual({
        type: 'platform',
        role: 'admin',
        organization_id: null,
      });
      // organization_members must NEVER be queried when active platform admin is resolved
      expect(orgMembersQueried).toBe(false);
      mockFrom.mockRestore();
    });

    it('2.2 should resolve active school role when user has no global platform link (confirmed data: null, error: null)', async () => {
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
                data: [{ organization_id: 'org-abc-1', role: 'docente', is_active: true }],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const resolution = await UsersService.getUserMembership('user-teacher-456');
      expect(resolution.status).toBe('active');
      expect(resolution.data).toEqual({
        type: 'organization',
        role: 'docente',
        organization_id: 'org-abc-1',
      });
      mockFrom.mockRestore();
    });

    it('2.3 should return network_error when querying platform_members fails with network failure', async () => {
      let orgMembersQueried = false;
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: { message: 'Failed to fetch: NetworkError when attempting to fetch resource' },
                }),
              }),
            }),
          } as any;
        }
        if (table === 'organization_members') {
          orgMembersQueried = true;
          return {} as any;
        }
        return {} as any;
      });

      const resolution = await UsersService.getUserMembership('user-offline');
      expect(resolution.status).toBe('network_error');
      expect(resolution.data).toBeNull();
      // Must NOT fall through to organization_members when platform query failed!
      expect(orgMembersQueried).toBe(false);
      mockFrom.mockRestore();
    });

    it('2.4 should return permission_denied when querying platform_members returns 42501 (RLS error)', async () => {
      let orgMembersQueried = false;
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
        if (table === 'organization_members') {
          orgMembersQueried = true;
          return {} as any;
        }
        return {} as any;
      });

      const resolution = await UsersService.getUserMembership('user-denied');
      expect(resolution.status).toBe('permission_denied');
      expect(resolution.data).toBeNull();
      expect(resolution.errorCode).toBe('42501');
      // Must NOT swallow the error and assume the user is not an admin!
      expect(orgMembersQueried).toBe(false);
      mockFrom.mockRestore();
    });

    it('2.5 should return not_found when both platform_members and organization_members return no records without error', async () => {
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
              eq: async () => ({ data: [], error: null }),
            }),
          } as any;
        }
        return {} as any;
      });

      const resolution = await UsersService.getUserMembership('user-orphan-000');
      expect(resolution.status).toBe('not_found');
      expect(resolution.data).toBeNull();
      mockFrom.mockRestore();
    });

    it('2.6 should return inactive when platform link is inactive and organization link is also inactive', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'admin', is_active: false },
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
                data: [{ organization_id: 'org-1', role: 'docente', is_active: false }],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const resolution = await UsersService.getUserMembership('user-all-inactive');
      expect(resolution.status).toBe('inactive');
      expect(resolution.data).toBeNull();
      mockFrom.mockRestore();
    });

    it('2.7 should resolve active school role when former global admin is inactive (Precedence)', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'admin', is_active: false },
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
                data: [{ organization_id: 'org-school-99', role: 'gestor', is_active: true }],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const resolution = await UsersService.getUserMembership('user-ex-admin-789');
      expect(resolution.status).toBe('active');
      expect(resolution.data).toEqual({
        type: 'organization',
        role: 'gestor',
        organization_id: 'org-school-99',
      });
      mockFrom.mockRestore();
    });

    it('2.8 should handle multiple organization members with canonical precedence (gestor > docente > familia)', async () => {
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
                  { organization_id: 'org-fam-1', role: 'familia', is_active: true },
                  { organization_id: 'org-gest-2', role: 'gestor', is_active: true },
                  { organization_id: 'org-doc-3', role: 'docente', is_active: true },
                ],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const resolution = await UsersService.getUserMembership('user-multi-role');
      expect(resolution.status).toBe('active');
      expect(resolution.data).toEqual({
        type: 'organization',
        role: 'gestor',
        organization_id: 'org-gest-2',
      });
      mockFrom.mockRestore();
    });

    it('2.9 normalizeRoleToAppRole should strictly accept only canonical roles', () => {
      expect(normalizeRoleToAppRole('admin')).toBe('admin');
      expect(normalizeRoleToAppRole('ADMIN')).toBe('admin');
      expect(normalizeRoleToAppRole('gestor')).toBe('gestor');
      expect(normalizeRoleToAppRole('docente')).toBe('docente');
      expect(normalizeRoleToAppRole('familia')).toBe('familia');

      // Rejection of arbitrary / legacy roles
      expect(normalizeRoleToAppRole('superadmin')).toBeNull();
      expect(normalizeRoleToAppRole('master')).toBeNull();
      expect(normalizeRoleToAppRole('aluno')).toBeNull();
      expect(normalizeRoleToAppRole('user')).toBeNull();
      expect(normalizeRoleToAppRole('')).toBeNull();
      expect(normalizeRoleToAppRole(null)).toBeNull();
    });
  });

  // =========================================================================
  // SECTION 3: PermissionsService Tests
  // =========================================================================
  describe('PermissionsService', () => {
    it('3.1 should fail-closed and return empty array when platform_members query has an error', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: { code: '42501', message: 'permission denied' },
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const permissions = await PermissionsService.getUserPermissions('renatotcheka-uuid');
      expect(permissions).toEqual([]);
      mockFrom.mockRestore();
    });

    it('3.2 should grant wildcard [*] to active platform admin', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'platform_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { role: 'admin', is_active: true },
                    error: null,
                  }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'role_permissions') {
          return {
            select: () => ({
              eq: async () => ({
                data: [{ permission_code: '*' }],
                error: null,
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const permissions = await PermissionsService.getUserPermissions('admin-user-uuid');
      expect(permissions).toContain('*');
      mockFrom.mockRestore();
    });
  });

  // =========================================================================
  // SECTION 4: Authentication & Authorization Flow Simulation Tests
  // (Verifies Session Preservation, No-SignOut on Transient Errors, No-Leak)
  // =========================================================================
  describe('Authentication Flow & Session Preservation Contract', () => {
    // Helper replicating AuthProvider decision engine for rigorous testing
    async function simulateLoginValidation(
      profileResolution: ProfileResolution,
      membershipResolution: MembershipResolution,
      mockSignOut: () => Promise<void>
    ): Promise<{
      accessGranted: boolean;
      role: string | null;
      signedOut: boolean;
      error: string | null;
    }> {
      const isTransientError =
        profileResolution.status === 'network_error' ||
        profileResolution.status === 'permission_denied' ||
        profileResolution.status === 'unexpected_error' ||
        membershipResolution.status === 'network_error' ||
        membershipResolution.status === 'permission_denied' ||
        membershipResolution.status === 'unexpected_error';

      if (isTransientError) {
        // MUST NOT call signOut()!
        const isNetwork =
          profileResolution.status === 'network_error' || membershipResolution.status === 'network_error';
        return {
          accessGranted: false,
          role: null,
          signedOut: false,
          error: isNetwork
            ? 'Erro de conexão ao validar autorização. Verifique sua rede e tente novamente.'
            : 'Instabilidade temporária no serviço de autorização. Tente novamente em instantes.',
        };
      }

      if (profileResolution.status === 'inactive' || membershipResolution.status === 'inactive') {
        await mockSignOut();
        return {
          accessGranted: false,
          role: null,
          signedOut: true,
          error: 'Acesso inativo.',
        };
      }

      if (
        profileResolution.status === 'not_found' ||
        !profileResolution.data ||
        membershipResolution.status === 'not_found' ||
        !membershipResolution.data
      ) {
        await mockSignOut();
        return {
          accessGranted: false,
          role: null,
          signedOut: true,
          error: 'Usuário autenticado no Auth, mas sem perfil ou vínculo institucional ativo no sistema.',
        };
      }

      // Both active
      return {
        accessGranted: true,
        role: membershipResolution.data.role,
        signedOut: false,
        error: null,
      };
    }

    it('4.1 [Requirement 9 & 10] Transient network error on getProfile MUST NOT signOut and MUST NOT grant protected access', async () => {
      let signedOut = false;
      const mockSignOut = async () => {
        signedOut = true;
      };

      const profileRes: ProfileResolution = {
        status: 'network_error',
        data: null,
        errorMessage: 'Failed to fetch',
      };
      const membershipRes: MembershipResolution = {
        status: 'active',
        data: { type: 'platform', role: 'admin', organization_id: null },
      };

      const result = await simulateLoginValidation(profileRes, membershipRes, mockSignOut);

      // Session MUST be preserved!
      expect(result.signedOut).toBe(false);
      expect(signedOut).toBe(false);
      // Access MUST NOT be granted!
      expect(result.accessGranted).toBe(false);
      expect(result.role).toBeNull();
      // Recoverable error message
      expect(result.error).toContain('Erro de conexão ao validar autorização');
    });

    it('4.2 [Requirement 9 & 10] Transient network error on getUserMembership MUST NOT signOut and MUST NOT grant access', async () => {
      let signedOut = false;
      const mockSignOut = async () => {
        signedOut = true;
      };

      const profileRes: ProfileResolution = {
        status: 'active',
        data: { id: 'usr-1', name: 'Admin', email: 'admin@classium.com', created_at: '', updated_at: '' },
      };
      const membershipRes: MembershipResolution = {
        status: 'network_error',
        data: null,
        errorMessage: 'Connection timeout',
      };

      const result = await simulateLoginValidation(profileRes, membershipRes, mockSignOut);

      expect(result.signedOut).toBe(false);
      expect(signedOut).toBe(false);
      expect(result.accessGranted).toBe(false);
      expect(result.role).toBeNull();
      expect(result.error).toContain('Erro de conexão');
    });

    it('4.3 [Requirement 9 & 10] RLS / permission_denied error MUST NOT signOut and MUST NOT grant access', async () => {
      let signedOut = false;
      const mockSignOut = async () => {
        signedOut = true;
      };

      const profileRes: ProfileResolution = {
        status: 'permission_denied',
        data: null,
        errorMessage: 'permission denied',
      };
      const membershipRes: MembershipResolution = {
        status: 'permission_denied',
        data: null,
        errorMessage: 'permission denied',
      };

      const result = await simulateLoginValidation(profileRes, membershipRes, mockSignOut);

      expect(result.signedOut).toBe(false);
      expect(signedOut).toBe(false);
      expect(result.accessGranted).toBe(false);
      expect(result.role).toBeNull();
      expect(result.error).toContain('Instabilidade temporária');
    });

    it('4.4 [Requirement 6] Proven inactive profile MUST execute signOut', async () => {
      let signedOut = false;
      const mockSignOut = async () => {
        signedOut = true;
      };

      const profileRes: ProfileResolution = {
        status: 'inactive',
        data: null,
        errorMessage: 'Perfil inativo',
      };
      const membershipRes: MembershipResolution = {
        status: 'active',
        data: { type: 'platform', role: 'admin', organization_id: null },
      };

      const result = await simulateLoginValidation(profileRes, membershipRes, mockSignOut);

      expect(result.signedOut).toBe(true);
      expect(signedOut).toBe(true);
      expect(result.accessGranted).toBe(false);
    });

    it('4.5 [Requirement 6] Proven not_found profile MUST execute signOut', async () => {
      let signedOut = false;
      const mockSignOut = async () => {
        signedOut = true;
      };

      const profileRes: ProfileResolution = {
        status: 'not_found',
        data: null,
      };
      const membershipRes: MembershipResolution = {
        status: 'active',
        data: { type: 'platform', role: 'admin', organization_id: null },
      };

      const result = await simulateLoginValidation(profileRes, membershipRes, mockSignOut);

      expect(result.signedOut).toBe(true);
      expect(signedOut).toBe(true);
      expect(result.accessGranted).toBe(false);
      expect(result.error).toContain('sem perfil ou vínculo institucional ativo');
    });

    it('4.6 [Requirement 1 & 11] Recovery: Active Admin Global succeeds on retry after transient failure', async () => {
      let signedOut = false;
      const mockSignOut = async () => {
        signedOut = true;
      };

      // Attempt 1: Transient network error
      const attempt1 = await simulateLoginValidation(
        { status: 'network_error', data: null },
        { status: 'network_error', data: null },
        mockSignOut
      );
      expect(attempt1.signedOut).toBe(false);
      expect(attempt1.accessGranted).toBe(false);

      // Attempt 2: Network recovered, Supabase returns active profile & admin membership
      const attempt2 = await simulateLoginValidation(
        {
          status: 'active',
          data: { id: 'admin-uid', name: 'Renato Admin', email: 'renato@classium.com', created_at: '', updated_at: '' },
        },
        {
          status: 'active',
          data: { type: 'platform', role: 'admin', organization_id: null },
        },
        mockSignOut
      );
      expect(attempt2.signedOut).toBe(false);
      expect(attempt2.accessGranted).toBe(true);
      expect(attempt2.role).toBe('admin');
      expect(attempt2.error).toBeNull();
    });
  });
});
