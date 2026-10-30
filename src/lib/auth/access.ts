import { EDUCA_PORTALS } from '../portals';

export const ADMIN_ROLES = ['superadmin', 'admin', 'diretor', 'gestor', 'role_admin_master', 'admin_master'];

export function isAdminRole(roles: string[]): boolean {
  return roles.some(role => ADMIN_ROLES.includes(role));
}

export function canAccessPortal(roles: string[], portalKey: string): boolean {
  if (isAdminRole(roles)) return true;
  
  const portal = EDUCA_PORTALS.find(p => p.key === portalKey);
  if (!portal) return false;
  
  return roles.some(role => (portal.roles as readonly string[]).includes(role));
}
