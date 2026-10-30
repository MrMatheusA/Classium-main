import { Session, User } from '@supabase/supabase-js';

/**
 * Papéis oficiais canônicos do Classium.
 * - 'admin': Administrador da plataforma (vinculado via public.platform_members)
 * - 'gestor': Gestor escolar da organização (vinculado via public.organization_members)
 * - 'docente': Professor / Corpo docente (vinculado via public.organization_members)
 * - 'familia': Responsável / Família (vinculado via public.organization_members)
 */
export type UserRole = 'admin' | 'admin_master' | 'gestor' | 'docente' | 'familia' | 'family' | string;

/**
 * Representação canônica do perfil do usuário em public.profiles.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  organization_id?: string;
  school_id?: string;
  role?: UserRole | string;
  user_id?: string;
  rawRole?: string;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Entidade legada mantida temporariamente por compatibilidade interna.
 * A entidade canônica de tenant é public.organizations.
 */
export interface School {
  id: string;
  name: string;
  cnpj?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Resultado explícito e tipado da resolução de sessão e organização.
 * Evita retornos void silenciosos, descartes sem rastreabilidade
 * e possibilita aos consumidores aguardarem a conclusão ou substituição.
 */
export type AuthResolutionResult =
  | {
      status: 'resolved';
      userId: string;
      role: UserRole | string | null;
      organizationId: string | null;
      schoolId?: string | null;
    }
  | {
      status: 'unauthenticated';
      userId: null;
      role: null;
      organizationId: null;
    }
  | {
      status: 'failed';
      error: string;
      code?: string;
    }
  | {
      status: 'superseded';
      reason?: string;
    };

/**
 * Contrato de contexto de autenticação consumido pelos providers e hooks.
 */
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  /** @deprecated Utilizar o contexto canônico de organização */
  school: School | null;
  role: UserRole | null;
  organizationId: string | null;
  permissions: string[];
  loading: boolean;
  login: (email: string, password: string, selectedTab?: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshProfile: (currentSession?: Session | null) => Promise<AuthResolutionResult>;
}
