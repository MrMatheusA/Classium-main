export interface Permission {
  id: string;
  code: string;
  description?: string;
  module?: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permission_code: string;
}

export interface PermissionsContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}
