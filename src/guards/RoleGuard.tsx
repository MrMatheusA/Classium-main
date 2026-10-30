import React from 'react';
import { useRoles } from '../hooks/useRoles';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback = null }) => {
  const { hasRole, isLoading } = useRoles();

  if (isLoading) return null; // Ou um Loading Spinner

  const isAllowed = allowedRoles.some(role => hasRole(role));

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
