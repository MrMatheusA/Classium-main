export type RoleProfile = 
  | 'ROLE_ADMIN_MASTER' 
  | 'admin' 
  | 'professor' 
  | 'family' 
  | 'pedagogo' 
  | 'secretaria' 
  | 'disciplinario';

export const ROLE_PROFILE_LABELS: Record<RoleProfile, string> = {
  ROLE_ADMIN_MASTER: 'ClassiumAdmin Suite (Acesso Total - Global Control Center)',
  admin: 'ClassiumGestor (Painel Direção Escolar)',
  professor: 'ClassiumDocente (Portal do Professor)',
  family: 'ClassiumFamília (Portal dos Responsáveis)',
  pedagogo: 'ClassiumPedagógico (Orientação & Psicopedagogia)',
  secretaria: 'ClassiumSecretaria (Secretaria & Documentos)',
  disciplinario: 'ClassiumDisciplina (Inspeção & Convivência)'
};

export type PermissionType = 'menu' | 'submenu' | 'button' | 'action' | 'field';

export interface GranularActions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

export interface PermissionNode {
  id: string;
  label: string;
  type: PermissionType;
  visible: boolean;
  actions?: GranularActions;
  children?: PermissionNode[];
}

export type RolePermissionMatrix = Record<RoleProfile, PermissionNode[]>;

export interface StaffMemberPermission {
  userId: string;
  userName: string;
  userEmail: string;
  role: RoleProfile;
  sector: 'Pedagógico' | 'Secretaria Acadêmica' | 'Corpo Disciplinar' | 'Financeiro Escolar' | 'Serviços Gerais' | 'Apoio ao Aluno' | 'Direção Auxiliar';
  isTemporary: boolean;
  expiresAt?: string;
  customMatrix?: RolePermissionMatrix;
}

export interface SectorPermissionRule {
  sectorId: string;
  sectorName: string;
  defaultRole: RoleProfile;
  allowedMenuIds: string[];
  description: string;
}

export interface PermissionSnapshot {
  id: string;
  name: string;
  timestamp: string;
  createdBy: string;
  note?: string;
  matrix: RolePermissionMatrix;
}
