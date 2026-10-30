export type AdminMasterTab = 
  | 'dashboard'
  | 'supabase_config'
  | 'eduos'
  | 'builder'
  | 'business_center'
  | 'connect'
  | 'instituicoes'
  | 'usuarios'
  | 'planos'
  | 'comercial'
  | 'financeiro'
  | 'marketplace'
  | 'studio'
  | 'smart-horarios'
  | 'rede-reforco'
  | 'carreira'
  | 'pesquisa'
  | 'super-ia'
  | 'automacoes'
  | 'integracoes'
  | 'seguranca'
  | 'logs'
  | 'backup'
  | 'atualizacoes'
  | 'modulos-config'
  | 'dev-center'
  | 'configuracoes'
  | 'bi'
  | 'monitoramento'
  | 'crm'
  | 'ecossistema'
  | 'governanca'
  | 'governanca_educacional'
  | 'trust_center';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ROLE_ADMIN_MASTER' | 'ADMIN_OPERATOR' | 'ADMIN_AUDITOR';
  avatarUrl?: string;
  permissions: string[];
  status: 'Ativo' | 'Inativo' | 'Bloqueado';
  twoFactorEnabled: boolean;
  lastLogin: string;
  createdAt: string;
}

export interface AdminPermission {
  id: string;
  role: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canImport: boolean;
}

export interface SystemModule {
  id: string;
  name: string;
  category: 'Core' | 'Premium' | 'IA' | 'Infra' | 'Finanças';
  version: string;
  status: 'Ativo' | 'Manutenção' | 'Beta' | 'Desativado';
  subscribersCount: number;
  uptime: string;
  lastUpdated: string;
}

export interface SystemSetting {
  key: string;
  category: 'Geral' | 'IA' | 'Segurança' | 'Notificações' | 'Servidores';
  value: string;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SystemLog {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  message: string;
  timestamp: string;
  ip: string;
  details?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  timestamp: string;
  read: boolean;
  category: 'System' | 'Security' | 'Billing' | 'AI';
}

export interface SystemVersion {
  version: string;
  releaseDate: string;
  title: string;
  changelog: string[];
  status: 'Estável' | 'LTS' | 'Beta';
}

export interface SystemUpdate {
  id: string;
  version: string;
  description: string;
  scheduledFor: string;
  status: 'Agendada' | 'Em Andamento' | 'Concluída' | 'Falhou';
  impactLevel: 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  timestamp: string;
  date: string;
  time: string;
  ip: string;
  browser: string;
  device: string;
  stateBefore?: string;
  stateAfter?: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  targetAudience: 'all' | 'beta_schools' | 'premium_only' | 'internal_admins';
  rolloutPercentage: number;
}

export interface ImpersonationState {
  isImpersonating: boolean;
  originalAdminName: string;
  impersonatedUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    schoolName?: string;
  };
}
