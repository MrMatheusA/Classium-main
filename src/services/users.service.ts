import { supabase } from '../lib/supabase';
import { UserProfile, School, UserRole } from '../types/auth';

/**
 * Validação estrita do papel do usuário.
 * Reconhece única e exclusivamente os papéis canônicos oficiais:
 * - 'admin': Administrador da plataforma
 * - 'gestor': Gestor escolar da organização
 * - 'docente': Professor / Corpo docente
 * - 'familia': Responsável familiar
 * 
 * Papéis legados ou não canônicos NÃO são aceitos e NÃO são convertidos/apelidados.
 */
export function normalizeRoleToAppRole(roleCode?: string | null): UserRole | null {
  if (!roleCode) return null;
  const normalized = roleCode.toLowerCase().trim();
  
  if (normalized === 'admin' || normalized === 'gestor' || normalized === 'docente' || normalized === 'familia') {
    return normalized as UserRole;
  }

  return null;
}

export interface UserMembershipResult {
  type: 'platform' | 'organization';
  role: UserRole;
  organization_id: string | null;
}

export type ProfileStatus =
  | 'active'
  | 'inactive'
  | 'not_found'
  | 'permission_denied'
  | 'network_error'
  | 'unexpected_error';

export interface ProfileResolution {
  status: ProfileStatus;
  data: UserProfile | null;
  errorMessage?: string;
  errorCode?: string;
}

export type MembershipStatus =
  | 'active'
  | 'inactive'
  | 'not_found'
  | 'ambiguous'
  | 'permission_denied'
  | 'network_error'
  | 'unexpected_error';

export interface MembershipResolution {
  status: MembershipStatus;
  data: UserMembershipResult | null;
  errorMessage?: string;
  errorCode?: string;
}

function categorizeError(error: any): 'network_error' | 'permission_denied' | 'unexpected_error' {
  if (!error) return 'unexpected_error';
  const msg = (error.message || '').toLowerCase();
  const code = (error.code || '').toString().toLowerCase();

  if (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    code === 'fetch_error'
  ) {
    return 'network_error';
  }

  if (
    code === '42501' ||
    code === '403' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security') ||
    msg.includes('not authorized')
  ) {
    return 'permission_denied';
  }

  return 'unexpected_error';
}

export const UsersService = {
  /**
   * Obtém o perfil canônico do usuário em public.profiles.
   * Consulta sem filtro is_active = true para distinguir perfil inexistente de inativo.
   * Retorna ProfileResolution discriminando status real:
   * - 'active': perfil existente e ativo (is_active = true)
   * - 'inactive': perfil existente, mas inativo (is_active = false)
   * - 'not_found': nenhum registro localizado em public.profiles
   * - 'network_error': falha de transporte ou rede
   * - 'permission_denied': bloqueio RLS ou permissão negada
   * - 'unexpected_error': exceção inesperada
   */
  async getProfile(userId: string): Promise<ProfileResolution> {
    try {
      if (!userId) {
        return {
          status: 'not_found',
          data: null,
          errorMessage: 'ID de usuário não fornecido.',
        };
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, is_active, organization_id, school_id, role, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      let activeProfile = profile;

      if (error) {
        // Fallback resiliente: se o esquema remoto de produção não contiver organization_id / school_id
        if (
          error.code === '42703' ||
          (error.message && (error.message.toLowerCase().includes('column') || error.message.toLowerCase().includes('does not exist')))
        ) {
          console.warn('[UsersService.getProfile] Colunas estendidas ausentes em public.profiles, executando consulta base...');
          const { data: baseProfile, error: baseError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone, is_active, created_at, updated_at')
            .eq('id', userId)
            .maybeSingle();

          if (!baseError && baseProfile) {
            activeProfile = baseProfile as any;
          } else if (baseError) {
            console.error('[UsersService.getProfile] Erro ao buscar profile base:', baseError.message);
            const errType = categorizeError(baseError);
            return {
              status: errType,
              data: null,
              errorMessage: baseError.message,
              errorCode: baseError.code ? String(baseError.code) : undefined,
            };
          }
        } else {
          if (
            error.message &&
            (error.message.toLowerCase().includes('jwt issued at future') ||
             error.message.toLowerCase().includes('jwt') ||
             error.message.toLowerCase().includes('token'))
          ) {
            console.warn('[UsersService.getProfile] Detectado JWT inválido ou futuro. Limpando sessão...');
            try {
              await supabase.auth.signOut();
              localStorage.removeItem('educa_plus_supabase_auth_token');
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('supabase') || key.includes('sb-'))) {
                  localStorage.removeItem(key);
                }
              }
            } catch {}
            return {
              status: 'not_found',
              data: null,
              errorMessage: 'Sessão expirada ou com divergência temporal (JWT future). Faça login novamente.',
              errorCode: 'JWT_FUTURE',
            };
          }
          console.error('[UsersService.getProfile] Erro ao buscar profile:', error.message);
          const errType = categorizeError(error);
          return {
            status: errType,
            data: null,
            errorMessage: error.message,
            errorCode: error.code ? String(error.code) : undefined,
          };
        }
      }

      if (!activeProfile) {
        return {
          status: 'not_found',
          data: null,
          errorMessage: 'Perfil não localizado na tabela public.profiles.',
        };
      }

      if (activeProfile.is_active === false) {
        return {
          status: 'inactive',
          data: null,
          errorMessage: 'Perfil de usuário inativo.',
        };
      }

      return {
        status: 'active',
        data: {
          id: activeProfile.id,
          name: activeProfile.full_name || '',
          email: '',
          avatar_url: activeProfile.avatar_url || undefined,
          phone: activeProfile.phone || undefined,
          organization_id: (activeProfile as any).organization_id || undefined,
          school_id: (activeProfile as any).school_id || undefined,
          role: (activeProfile as any).role || undefined,
          created_at: activeProfile.created_at || new Date().toISOString(),
          updated_at: activeProfile.updated_at || new Date().toISOString(),
        },
      };
    } catch (e: any) {
      console.error('[UsersService.getProfile] Exceção inesperada:', e);
      return {
        status: 'unexpected_error',
        data: null,
        errorMessage: e?.message || 'Falha inesperada ao consultar perfil.',
      };
    }
  },

  /**
   * Resolução canônica e resiliente de vínculo institucional:
   * 1. Administrador da plataforma via public.platform_members (role = 'admin')
   *    - Se ativo -> retorna status: 'active', data: { type: 'platform', role: 'admin' }
   *    - Se inativo -> registra inatividade global e prossegue para vínculos organizacionais
   *    - Se erro na consulta -> retorna status do erro (network_error / permission_denied / unexpected_error)
   *      SEM assumir falsamente ausência de vínculo!
   * 2. Vínculos em public.organization_members:
   *    - Executado somente quando a consulta de platform_members concluir SEM erro e com data = null
   *    - Suporte a múltiplos tenants ordenados por precedência canônica: gestor > docente > familia
   *    - Se ativo -> retorna status: 'active', data: { type: 'organization', role, organization_id }
   * 3. Se nenhum vínculo ativo for localizado, mas existirem vínculos inativos -> retorna status: 'inactive'
   * 4. Se nenhum registro for encontrado em nenhuma tabela -> retorna status: 'not_found'
   * 5. Erros de rede ou permissão -> retornam status: 'network_error' ou 'permission_denied' sem converter para not_found
   */
  /**
   * Resolução canônica e resiliente de vínculo institucional:
   * 1. Administrador da plataforma via public.platform_members (role = 'admin')
   *    - Se ativo -> retorna status: 'active', data: { type: 'platform', role: 'admin', organization_id: targetOrganizationId || null }
   * 2. Vínculos em public.organization_members:
   *    - Se targetOrganizationId fornecido:
   *      - Valida se o usuário possui vínculo ativo na organização especificada (anti-IDOR).
   *      - Se não possui ou vínculo inativo, retorna 'not_found' / 'inactive'.
   *    - Se targetOrganizationId NÃO fornecido:
   *      - Regra 7: Se o usuário possuir papel de gestor em mais de 1 organização ativa, retorna status: 'ambiguous'
   *      - Precedência determinística: gestor (1) > docente (2) > familia (3)
   *      - Se houver colisão de múltiplas organizações no mesmo papel de maior precedência, retorna status: 'ambiguous'
   * 3. Se nenhum vínculo ativo for localizado, mas existirem vínculos inativos -> retorna status: 'inactive'
   * 4. Se nenhum registro for encontrado -> retorna status: 'not_found'
   * 5. Erros transitórios de rede ou permissão -> 'network_error' ou 'permission_denied'
   */
  async getUserMembership(userId: string, targetOrganizationId?: string | null): Promise<MembershipResolution> {
    try {
      if (!userId) {
        return {
          status: 'not_found',
          data: null,
          errorMessage: 'ID de usuário não fornecido.',
        };
      }

      let hasInactivePlatformLink = false;

      // 1. Verificar se é administrador da plataforma via public.platform_members (Autorização Canônica)
      const { data: platformMember, error: platformError } = await supabase
        .from('platform_members')
        .select('role, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (platformError) {
        console.warn('[UsersService.getUserMembership] Erro ao consultar platform_members:', platformError.message);
        const errType = categorizeError(platformError);
        return {
          status: errType,
          data: null,
          errorMessage: platformError.message,
          errorCode: platformError.code ? String(platformError.code) : undefined,
        };
      }

      if (platformMember) {
        if (platformMember.is_active === true) {
          const canonicalRole = normalizeRoleToAppRole(platformMember.role);
          if (canonicalRole === 'admin') {
            return {
              status: 'active',
              data: {
                type: 'platform',
                role: 'admin',
                organization_id: targetOrganizationId || null,
              },
            };
          }
        } else {
          hasInactivePlatformLink = true;
        }
      }

      // 2. Verificar vínculos em public.organization_members
      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id, role, is_active')
        .eq('user_id', userId);

      if (orgError) {
        console.error('[UsersService.getUserMembership] Erro ao consultar organization_members:', orgError.message);
        const errType = categorizeError(orgError);
        return {
          status: errType,
          data: null,
          errorMessage: orgError.message,
          errorCode: orgError.code ? String(orgError.code) : undefined,
        };
      }

      if (orgMembers && orgMembers.length > 0) {
        // Se foi solicitado um tenant específico (targetOrganizationId), validar isolamento estrito (anti-IDOR)
        if (targetOrganizationId) {
          const matchingMemberships = orgMembers.filter(m => m.organization_id === targetOrganizationId);
          if (matchingMemberships.length === 0) {
            return {
              status: 'not_found',
              data: null,
              errorMessage: 'Acesso negado: usuário não possui vínculo com a instituição especificada.',
            };
          }

          const activeMatch = matchingMemberships.find(m => m.is_active === true);
          if (!activeMatch) {
            return {
              status: 'inactive',
              data: null,
              errorMessage: 'Vínculo institucional inativo para a organização selecionada.',
            };
          }

          const canonicalRole = normalizeRoleToAppRole(activeMatch.role);
          if (!canonicalRole) {
            return {
              status: 'inactive',
              data: null,
              errorMessage: 'Papel institucional não autorizado para a organização selecionada.',
            };
          }

          return {
            status: 'active',
            data: {
              type: 'organization',
              role: canonicalRole,
              organization_id: targetOrganizationId,
            },
          };
        }

        // Sem targetOrganizationId explícito: avaliar vínculos ativos
        const activeOrgMembers = orgMembers.filter(m => m.is_active === true);

        if (activeOrgMembers.length > 0) {
          const validActiveMembers = activeOrgMembers
            .map(m => ({ member: m, canonicalRole: normalizeRoleToAppRole(m.role) }))
            .filter((item): item is { member: typeof activeOrgMembers[0]; canonicalRole: UserRole } =>
              item.canonicalRole !== null && (item.canonicalRole === 'gestor' || item.canonicalRole === 'docente' || item.canonicalRole === 'familia')
            );

          if (validActiveMembers.length === 0) {
            return {
              status: 'inactive',
              data: null,
              errorMessage: 'Nenhum papel canônico válido ativo localizado.',
            };
          }

          // REGRA 7: Se o usuário possuir papel de gestor em mais de 1 organização ativa, contexto é ambíguo!
          const activeGestors = validActiveMembers.filter(m => m.canonicalRole === 'gestor');
          const distinctGestorOrgs = Array.from(new Set(activeGestors.map(m => m.member.organization_id).filter(Boolean)));
          if (distinctGestorOrgs.length > 1) {
            return {
              status: 'ambiguous',
              data: null,
              errorMessage: 'Usuário possui papel de gestor em múltiplas organizações ativas. É necessário selecionar a instituição.',
            };
          }

          // Precedência canônica: gestor (1) > docente (2) > familia (3)
          const rolePrecedence: Record<string, number> = {
            gestor: 1,
            docente: 2,
            familia: 3,
          };

          validActiveMembers.sort((a, b) => (rolePrecedence[a.canonicalRole] || 99) - (rolePrecedence[b.canonicalRole] || 99));

          const topRole = validActiveMembers[0].canonicalRole;
          const topRoleMembers = validActiveMembers.filter(m => m.canonicalRole === topRole);
          const distinctTopOrgs = Array.from(new Set(topRoleMembers.map(m => m.member.organization_id).filter(Boolean)));

          // Se houver mais de uma organização distinta para o papel de maior precedência, também tratar como ambíguo
          if (distinctTopOrgs.length > 1) {
            return {
              status: 'ambiguous',
              data: null,
              errorMessage: `Usuário possui papel de ${topRole} ativo em múltiplas organizações. É necessário selecionar a instituição.`,
            };
          }

          const chosen = validActiveMembers[0];
          return {
            status: 'active',
            data: {
              type: 'organization',
              role: chosen.canonicalRole,
              organization_id: chosen.member.organization_id,
            },
          };
        }

        // Há registros organizacionais, mas nenhum ativo
        return {
          status: 'inactive',
          data: null,
          errorMessage: 'Vínculo institucional inativo ou não autorizado.',
        };
      }

      // Se não possui vínculos organizacionais:
      if (hasInactivePlatformLink) {
        return {
          status: 'inactive',
          data: null,
          errorMessage: 'Vínculo da plataforma inativo.',
        };
      }

      // Nenhum vínculo localizado (ausência comprovada)
      return {
        status: 'not_found',
        data: null,
        errorMessage: 'Nenhum vínculo institucional localizado.',
      };
    } catch (e: any) {
      console.error('[UsersService.getUserMembership] Exceção inesperada:', e);
      return {
        status: 'unexpected_error',
        data: null,
        errorMessage: e?.message || 'Falha inesperada ao consultar vínculos.',
      };
    }
  },

  /**
   * @deprecated Consulta legada de escola mantida estritamente para compatibilidade temporária de interface.
   * Não participa do fluxo de autenticação nem de determinação de autoridade/tenant.
   */
  async getSchool(schoolId: string): Promise<School | null> {
    try {
      if (!schoolId) return null;

      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .maybeSingle();
      
      if (!error && data) {
        return data as School;
      }
      return null;
    } catch {
      return null;
    }
  }
};
