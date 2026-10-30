import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getActiveOrganizationId, getActiveOrganizationDetails, getGestorKpis } from './queries';
import { supabase } from '../../lib/supabase';

describe('Gestor Queries & Organization Resolution Suite (P2.351)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getActiveOrganizationId()', () => {
    it('should return organization_id when user has an active membership (is_active = true)', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: (_col1: string, _val1: any) => ({
                eq: (_col2: string, _val2: any) => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: { organization_id: 'org-123-uuid' },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const orgId = await getActiveOrganizationId('user-456');
      expect(orgId).toBe('org-123-uuid');
      mockFrom.mockRestore();
    });

    it('should return null when userId is empty or null', async () => {
      const orgId = await getActiveOrganizationId('');
      expect(orgId).toBeNull();
    });

    it('should return null when no active membership row is found', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const orgId = await getActiveOrganizationId('user-no-membership');
      expect(orgId).toBeNull();
      mockFrom.mockRestore();
    });

    it('should return null and log warning when query errors out', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'organization_members') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: 'Database connection timeout', code: '57P01' },
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const orgId = await getActiveOrganizationId('user-error');
      expect(orgId).toBeNull();
      mockFrom.mockRestore();
    });
  });

  describe('getActiveOrganizationDetails()', () => {
    it('should return mapped organization details with canonical name and trade_name', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'org-abc-789',
                    name: 'Colégio Alpha Modelo',
                    trade_name: 'Alpha Modelo Unidade Central',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });

      const details = await getActiveOrganizationDetails('org-abc-789');
      expect(details).not.toBeNull();
      expect(details?.id).toBe('org-abc-789');
      expect(details?.name).toBe('Colégio Alpha Modelo');
      expect(details?.legal_name).toBe('Colégio Alpha Modelo');
      expect(details?.trade_name).toBe('Alpha Modelo Unidade Central');
      mockFrom.mockRestore();
    });

    it('should return null if orgId is null or empty', async () => {
      const details = await getActiveOrganizationDetails('');
      expect(details).toBeNull();
    });
  });

  describe('getGestorKpis()', () => {
    it('should query all KPI tables filtering by organization_id and return totals', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        return {
          select: (_cols: string, _opts: any) => ({
            eq: (_col: string, _val: any) => Promise.resolve({
              count: table === 'students' ? 120 : (table === 'teachers' ? 14 : 5),
              error: null
            })
          })
        } as any;
      });

      const kpis = await getGestorKpis('org-test-1');
      expect(kpis.totalAlunos).toBe(120);
      expect(kpis.totalProfessores).toBe(14);
      expect(kpis.totalTurmas).toBe(5);
      mockFrom.mockRestore();
    });

    it('should return zero for failed queries without throwing', async () => {
      const mockFrom = vi.spyOn(supabase, 'from').mockImplementation(() => {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              count: null,
              error: { message: 'relation does not exist' }
            })
          })
        } as any;
      });

      const kpis = await getGestorKpis('org-test-error');
      expect(kpis.totalAlunos).toBe(0);
      expect(kpis.totalProfessores).toBe(0);
      mockFrom.mockRestore();
    });
  });
});
