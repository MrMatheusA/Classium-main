import { 
  AdminUser, 
  AdminPermission, 
  SystemModule, 
  SystemSetting, 
  SystemLog, 
  SystemNotification, 
  SystemVersion, 
  SystemUpdate, 
  AuditLog, 
  FeatureFlag 
} from '../types/adminMaster';

export const INITIAL_ADMIN_USERS: AdminUser[] = [];

export const INITIAL_ADMIN_PERMISSIONS: AdminPermission[] = [];

export const INITIAL_SYSTEM_MODULES: SystemModule[] = [
  { id: 'mod-1', name: 'Classium Gestor', category: 'Core', version: 'v4.8.2', status: 'Ativo', subscribersCount: 0, uptime: '100%', lastUpdated: '2026-08-21' },
  { id: 'mod-2', name: 'Portal Família', category: 'Premium', version: 'v3.2.0', status: 'Ativo', subscribersCount: 0, uptime: '100%', lastUpdated: '2026-08-21' },
  { id: 'mod-3', name: 'Classium Portaria', category: 'Infra', version: 'v2.1.0', status: 'Ativo', subscribersCount: 0, uptime: '100%', lastUpdated: '2026-08-21' },
  { id: 'mod-4', name: 'Classium Transporte', category: 'Infra', version: 'v2.0.4', status: 'Ativo', subscribersCount: 0, uptime: '100%', lastUpdated: '2026-08-21' }
];

export const INITIAL_SYSTEM_SETTINGS: SystemSetting[] = [
  { key: 'PLATFORM_NAME', value: 'Classium Educação Integrada', category: 'Geral', description: 'Nome institucional exibido no cabeçalho e relatórios', updatedAt: '2026-08-21', updatedBy: 'Master' },
  { key: 'ENABLE_LGPD_AUDIT', value: 'true', category: 'Segurança', description: 'Registro imutável de logs de acesso e leitura de documentos de estudantes', updatedAt: '2026-08-21', updatedBy: 'Master' },
  { key: 'TIMEZONE', value: 'America/Sao_Paulo', category: 'Geral', description: 'Fuso horário padrão para carimbos de tempo e horários de entrada', updatedAt: '2026-08-21', updatedBy: 'Master' }
];

export const INITIAL_SYSTEM_LOGS: SystemLog[] = [];

export const INITIAL_SYSTEM_NOTIFICATIONS: SystemNotification[] = [];

export const INITIAL_SYSTEM_VERSIONS: SystemVersion[] = [
  { version: 'v4.8.2', releaseDate: '2026-08-21', title: 'Versão 4.8.2 Estável', status: 'Estável', changelog: ['Clean state initialized for production multi-tenant'] }
];

export const INITIAL_SYSTEM_UPDATES: SystemUpdate[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_FEATURE_FLAGS: FeatureFlag[] = [
  { id: 'ff-1', key: 'enable_ai_pedagogy', name: 'IA Pedagógica', description: 'Habilita recursos de análise pedagógica assistida', enabled: true, targetAudience: 'all', rolloutPercentage: 100 },
  { id: 'ff-2', key: 'enable_qr_gate_pass', name: 'Passaporte QR Digital', description: 'Habilita catraca e portaria digital com QR Code criptografado', enabled: true, targetAudience: 'all', rolloutPercentage: 100 },
  { id: 'ff-3', key: 'enable_realtime_bus_sync', name: 'Sincronização Transporte', description: 'Habilita rastreamento e confirmação de embarque escolar', enabled: true, targetAudience: 'all', rolloutPercentage: 100 }
];
