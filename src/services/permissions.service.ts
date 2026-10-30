import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';

export const PermissionsService = {
  /**
   * Resolução canônica de permissões do usuário com fail-closed estrito:
   * 1. Consulta platform_members (user_id = userId AND is_active = true)
   *    - Se ocorrer erro na query -> log e retorna [] imediatamente.
   *    - Se existir vínculo válido com role = 'admin' -> canonicalRole = 'admin'.
   * 2. Se a consulta de platform_members for bem-sucedida e o usuário não for admin:
   *    - Consulta organization_members (user_id = userId AND is_active = true)
   *    - Se ocorrer erro na query -> log e retorna [] imediatamente.
   *    - Se existir vínculo com role in ('gestor', 'docente', 'familia') -> canonicalRole = role.
   * 3. Se nenhum papel canônico ativo for determinado -> retorna [] imediatamente.
   * 4. Consulta role_permissions para o papel canônico identificado:
   *    - Se ocorrer erro na query ou não houver permissões -> retorna [].
   *    - Se sucesso -> retorna Array desduplicado de permission_code.
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      if (!userId) return [];

      let canonicalRole: UserRole | null = null;

      // 1. Verificar se é administrador da plataforma via public.platform_members (Autorização Canônica)
      const { data: platformMember, error: platformError } = await supabase
        .from('platform_members')
        .select('role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (platformError) {
        console.warn('[PermissionsService] Aviso ao consultar platform_members:', platformError.message);
        return [];
      }

      if (platformMember && platformMember.is_active && platformMember.role === 'admin') {
        canonicalRole = 'admin';
      }

      // 2. Se a consulta administrativa foi bem-sucedida e não for admin, verificar vínculo em organização escolar
      if (!canonicalRole) {
        const { data: orgMember, error: orgError } = await supabase
          .from('organization_members')
          .select('role, is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        // Fail-closed estrito: se a consulta de membro da organização falhar, encerra imediatamente
        if (orgError) {
          console.error('[PermissionsService] Erro ao consultar organization_members:', orgError.message);
          return [];
        }

        if (orgMember) {
          const role = (orgMember.role || '').toLowerCase().trim();
          if (role === 'gestor' || role === 'docente' || role === 'familia') {
            canonicalRole = role as UserRole;
          }
        }
      }

      // Se nenhum papel canônico ativo for encontrado, encerra de forma segura (fail-closed)
      if (!canonicalRole) {
        return [];
      }

      // 3. Buscar as permissões associadas ao papel canônico em public.role_permissions
      let rolePermissions: any[] = [];
      const { data: rolePermissionsData, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', canonicalRole);

      if (!permissionsError && rolePermissionsData && rolePermissionsData.length > 0) {
        rolePermissions = rolePermissionsData;
      } else {
        if (permissionsError) {
          console.warn('[PermissionsService] Aviso ao buscar role_permissions (usando padrão):', permissionsError.message);
        }
        if (canonicalRole === 'admin') return ['*'];
        if (canonicalRole === 'gestor') return ['*'];
        if (canonicalRole === 'docente') return ['view_classes', 'manage_grades', 'view_students'];
        if (canonicalRole === 'familia') return ['view_student_data', 'view_calendar', 'view_messages'];
        return [];
      }

      // Desduplicação dos códigos de permissão
      const codes = rolePermissions.map(rp => rp.permission_code || rp.permission || rp.code || rp.id).filter(Boolean);
      if (canonicalRole === 'admin' && !codes.includes('*')) {
        codes.push('*');
      }
      return Array.from(new Set(codes));
    } catch (err) {
      console.error('[PermissionsService] Exceção inesperada ao buscar permissões:', err);
      return [];
    }
  }
};
