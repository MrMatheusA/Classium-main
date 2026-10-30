import { createClient } from '@supabase/supabase-js';

export interface AcademicAuthContext {
  authenticated: boolean;
  user: any | null;
  profile: any | null;
  organizationId: string | null;
  role: 'admin' | 'gestor' | 'docente' | 'familia' | 'aluno' | 'anon';
  isAdmin: boolean;
  isGestor: boolean;
  isDocente: boolean;
  isFamilia: boolean;
  memberships: Array<{
    id: string;
    organization_id: string;
    role: string;
    is_active: boolean;
  }>;
  sb: any;
  error?: {
    code: string;
    message: string;
    status: number;
    details?: string;
  };
}

export interface AcademicAuthOptions {
  requireAuth?: boolean;
  requiredRoles?: Array<'admin' | 'gestor' | 'docente' | 'familia' | 'aluno'>;
  allowAdminBypass?: boolean;
  clientProvider?: (authToken?: string) => any;
}

export const isValidUUID = (id?: string | null): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const defaultSupabaseServerClient = (authToken?: string) => {
  const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const rawAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (!rawUrl || !rawAnonKey) return null;

  if (authToken) {
    try {
      const formatted = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      return createClient(rawUrl, rawAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            Authorization: formatted
          }
        }
      });
    } catch (_) {
      return null;
    }
  }

  try {
    return createClient(rawUrl, rawAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (_) {
    return null;
  }
};

/**
 * Utilitário canônico de resolução de contexto de autenticação,
 * autorização (RBAC fail-closed) e isolamento multi-tenant acadêmico.
 */
export const resolveAcademicAuthContext = async (
  req: any,
  options: AcademicAuthOptions = {}
): Promise<AcademicAuthContext> => {
  const {
    requireAuth = true,
    requiredRoles,
    allowAdminBypass = true,
    clientProvider = defaultSupabaseServerClient
  } = options;

  // 1. Extração segura do cabeçalho de autorização
  const rawAuth = req?.headers?.['authorization'] || req?.headers?.['x-supabase-auth'];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : (typeof rawAuth === 'string' ? rawAuth : undefined);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const anonSb = clientProvider();
    if (requireAuth) {
      return {
        authenticated: false,
        user: null,
        profile: null,
        organizationId: null,
        role: 'anon',
        isAdmin: false,
        isGestor: false,
        isDocente: false,
        isFamilia: false,
        memberships: [],
        sb: anonSb,
        error: { code: 'UNAUTHORIZED', message: 'Token de autenticação Bearer JWT obrigatório.', status: 401 }
      };
    }
    return {
      authenticated: false,
      user: null,
      profile: null,
      organizationId: null,
      role: 'anon',
      isAdmin: false,
      isGestor: false,
      isDocente: false,
      isFamilia: false,
      memberships: [],
      sb: anonSb
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    const anonSb = clientProvider();
    return {
      authenticated: false,
      user: null,
      profile: null,
      organizationId: null,
      role: 'anon',
      isAdmin: false,
      isGestor: false,
      isDocente: false,
      isFamilia: false,
      memberships: [],
      sb: anonSb,
      error: { code: 'UNAUTHORIZED', message: 'Token JWT vazio ou malformado.', status: 401 }
    };
  }

  // 2. Criação do cliente Supabase usando o contrato real autenticado
  const sb = clientProvider(authHeader);
  if (!sb) {
    return {
      authenticated: false,
      user: null,
      profile: null,
      organizationId: null,
      role: 'anon',
      isAdmin: false,
      isGestor: false,
      isDocente: false,
      isFamilia: false,
      memberships: [],
      sb: null,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço de banco de dados indisponível.', status: 503 }
    };
  }

  try {
    // 3. Validação estrita da identidade do usuário com Supabase Auth
    const { data: { user } = {}, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user || !user.id) {
      return {
        authenticated: false,
        user: null,
        profile: null,
        organizationId: null,
        role: 'anon',
        isAdmin: false,
        isGestor: false,
        isDocente: false,
        isFamilia: false,
        memberships: [],
        sb,
        error: { code: 'INVALID_TOKEN', message: 'Sessão inválida ou expirada.', status: 401 }
      };
    }

    // 4. Consulta defensiva a public.profiles
    let profileData: any = null;
    try {
      const { data: prof } = await sb
        .from('profiles')
        .select('id, full_name, avatar_url, phone, is_active, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();
      if (prof) {
        profileData = { ...prof, email: user.email };
      }
    } catch (_) {}

    // 5. Verificação de Platform Admin (acesso global de plataforma)
    let isPlatformAdmin = false;
    try {
      const { data: platformMember } = await sb
        .from('platform_members')
        .select('id, user_id, role, is_active')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .eq('is_active', true)
        .maybeSingle();
      if (platformMember) {
        isPlatformAdmin = true;
      }
    } catch (_) {}

    // Obtenção de dica de tenant solicitada (NÃO é prova de autorização, apenas intenção de escopo)
    const rawRequestedOrg = req?.headers?.['x-organization-id'] || req?.query?.organization_id || req?.body?.organization_id;
    const requestedOrgId = typeof rawRequestedOrg === 'string' && isValidUUID(rawRequestedOrg.trim()) ? rawRequestedOrg.trim() : null;

    if (isPlatformAdmin && allowAdminBypass) {
      return {
        authenticated: true,
        user,
        profile: profileData,
        organizationId: requestedOrgId,
        role: 'admin',
        isAdmin: true,
        isGestor: true,
        isDocente: true,
        isFamilia: true,
        memberships: [],
        sb
      };
    }

    // 6. Resolução autoritativa de vínculos em public.organization_members
    const { data: rawMemberships, error: memErr } = await sb
      .from('organization_members')
      .select('id, organization_id, role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (memErr) {
      return {
        authenticated: false,
        user,
        profile: profileData,
        organizationId: null,
        role: 'anon',
        isAdmin: false,
        isGestor: false,
        isDocente: false,
        isFamilia: false,
        memberships: [],
        sb,
        error: { code: 'DATABASE_QUERY_ERROR', message: 'Falha ao consultar vínculos de organização.', status: 500 }
      };
    }

    const memberships = (rawMemberships || []).filter((m: any) => isValidUUID(m.organization_id));

    if (memberships.length === 0) {
      return {
        authenticated: false,
        user,
        profile: profileData,
        organizationId: null,
        role: 'anon',
        isAdmin: false,
        isGestor: false,
        isDocente: false,
        isFamilia: false,
        memberships: [],
        sb,
        error: { code: 'FORBIDDEN_NO_ORGANIZATION', message: 'Usuário autenticado não possui vínculo ativo com nenhuma organização escolar.', status: 403 }
      };
    }

    // 7. Resolução da Organização Ativa e Prevenção de Ambiguidade / IDOR
    let activeMembership: any = null;

    if (requestedOrgId) {
      activeMembership = memberships.find((m: any) => m.organization_id === requestedOrgId);
      if (!activeMembership) {
        return {
          authenticated: false,
          user,
          profile: profileData,
          organizationId: null,
          role: 'anon',
          isAdmin: false,
          isGestor: false,
          isDocente: false,
          isFamilia: false,
          memberships,
          sb,
          error: { code: 'FORBIDDEN_ORGANIZATION_MISMATCH', message: 'Acesso negado: usuário não possui vínculo ativo com a organização solicitada.', status: 403 }
        };
      }
    } else {
      if (memberships.length === 1) {
        activeMembership = memberships[0];
      } else {
        return {
          authenticated: false,
          user,
          profile: profileData,
          organizationId: null,
          role: 'anon',
          isAdmin: false,
          isGestor: false,
          isDocente: false,
          isFamilia: false,
          memberships,
          sb,
          error: { code: 'AMBIGUOUS_ORGANIZATION_CONTEXT', message: 'Contexto de organização ambíguo: usuário vinculado a múltiplas escolas. Informe o cabeçalho "x-organization-id".', status: 400 }
        };
      }
    }

    // 8. Determinação do papel canônico do usuário na organização ativa (RBAC FAIL-CLOSED)
    const rawRole = (activeMembership.role || '').toLowerCase().trim();
    let canonicalRole: 'gestor' | 'docente' | 'familia' | 'aluno' | null = null;

    if (['gestor', 'diretor', 'coordenador', 'admin', 'administrador'].includes(rawRole)) {
      canonicalRole = 'gestor';
    } else if (['docente', 'professor', 'professora'].includes(rawRole)) {
      canonicalRole = 'docente';
    } else if (['familia', 'responsavel', 'guardian'].includes(rawRole)) {
      canonicalRole = 'familia';
    } else if (['aluno', 'estudante', 'student'].includes(rawRole)) {
      canonicalRole = 'aluno';
    } else {
      // REGRA FAIL-CLOSED:
      // Nenhum papel desconhecido, vazio, 'member', 'secretaria', 'auxiliar', etc. recebe privilégios.
      // Recusa explícita com HTTP 403.
      return {
        authenticated: false,
        user,
        profile: profileData,
        organizationId: activeMembership.organization_id,
        role: 'anon',
        isAdmin: false,
        isGestor: false,
        isDocente: false,
        isFamilia: false,
        memberships,
        sb,
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Papel de membro "${rawRole || 'indefinido'}" não autorizado ou não catalogado para operações acadêmicas.`,
          status: 403
        }
      };
    }

    const isGestor = canonicalRole === 'gestor';
    const isDocente = canonicalRole === 'docente';
    const isFamilia = canonicalRole === 'familia';

    // 9. Verificação de papéis exigidos
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.includes(canonicalRole);
      if (!hasRequiredRole) {
        return {
          authenticated: false,
          user,
          profile: profileData,
          organizationId: activeMembership.organization_id,
          role: canonicalRole,
          isAdmin: false,
          isGestor,
          isDocente,
          isFamilia,
          memberships,
          sb,
          error: { code: 'FORBIDDEN_ROLE', message: 'Permissão insuficiente para a operação acadêmica solicitada.', status: 403 }
        };
      }
    }

    return {
      authenticated: true,
      user,
      profile: profileData,
      organizationId: activeMembership.organization_id,
      role: canonicalRole,
      isAdmin: false,
      isGestor,
      isDocente,
      isFamilia,
      memberships,
      sb
    };
  } catch (err: any) {
    return {
      authenticated: false,
      user: null,
      profile: null,
      organizationId: null,
      role: 'anon',
      isAdmin: false,
      isGestor: false,
      isDocente: false,
      isFamilia: false,
      memberships: [],
      sb,
      error: { code: 'AUTH_EXCEPTION', message: 'Falha interna ao validar credenciais.', status: 500 }
    };
  }
};
