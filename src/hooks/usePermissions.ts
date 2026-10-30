import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { PermissionsContextType } from '../types/permissions';

export const usePermissions = (): PermissionsContextType => {
  const { permissions, role } = useAuth();

  const hasPermission = useCallback((permission: string) => {
    return permissions.includes(permission) || role === permission || role === 'admin_master';
  }, [permissions, role]);

  const hasAnyPermission = useCallback((requiredPermissions: string[]) => {
    if (role === 'admin_master') return true;
    return requiredPermissions.some(permission => permissions.includes(permission) || role === permission);
  }, [permissions, role]);

  const hasAllPermissions = useCallback((requiredPermissions: string[]) => {
    if (role === 'admin_master') return true;
    return requiredPermissions.every(permission => permissions.includes(permission) || role === permission);
  }, [permissions, role]);

  return useMemo(() => ({
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  }), [permissions, role, hasPermission, hasAnyPermission, hasAllPermissions]);
};
