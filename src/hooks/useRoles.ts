import { useAuthContext } from '../contexts/AuthContext';

export function useRoles() {
  const { roles, schools, isLoading } = useAuthContext();

  const hasRole = (role: string) => {
    return roles.includes('ClassiumAdmin') || roles.includes(role);
  };

  const canAccessSchool = (schoolId: string) => {
    return roles.includes('ClassiumAdmin') || schools.includes(schoolId);
  };

  return {
    roles,
    schools,
    hasRole,
    canAccessSchool,
    isAdmin: roles.includes('ClassiumAdmin'),
    isGestor: roles.includes('ClassiumGestor'),
    isLoading,
  };
}
