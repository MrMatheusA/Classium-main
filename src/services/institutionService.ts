import { supabase } from '../lib/supabase';

export interface InstitutionData {
  id: string;
  name?: string;
  official_name?: string;
  legal_name?: string;
  fantasy_name?: string;
  trade_name?: string;
  document_number?: string;
  cnpj?: string;
  state_registration?: string;
  inep_code?: string;
  email?: string;
  phone?: string;
  phone_fixed?: string;
  phone_mobile?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  logo_url?: string | null;
  platform_url?: string | null;
  website?: string | null;
  status?: string;
  plan_status?: string;
  is_active?: boolean;
  can_edit?: boolean;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface SchoolShiftData {
  id: string;
  organization_id?: string;
  name: string;
  start_time: string;
  end_time: string;
  interval_start?: string;
  interval_end?: string;
  created_at?: string;
}

export type ManagementRole = 
  | 'Diretor(a) Geral'
  | 'Vice-Diretor(a)'
  | 'Pedagogo(a)'
  | 'Supervisor(a)'
  | 'Coordenador(a) Pedagógico(a)'
  | 'Outro';

export interface ManagementTeamMember {
  id: string;
  organization_id?: string;
  school_id?: string;
  name: string;
  role: ManagementRole;
  custom_role_title?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

const isValidUUID = (id?: string | null): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const resolveOrgId = (id?: string | null): string | null => {
  if (id && isValidUUID(id)) return id;
  return null;
};

export const institutionService = {
  /**
   * Get organization cadastral data by ID or active tenant
   */
  async getOrganization(organizationId?: string): Promise<InstitutionData> {
    const orgId = resolveOrgId(organizationId);

    if (!orgId) {
      return {
        id: '',
        name: '',
        official_name: '',
        legal_name: '',
        fantasy_name: '',
        trade_name: '',
        document_number: '',
        cnpj: '',
        state_registration: '',
        inep_code: '',
        email: '',
        phone: '',
        phone_fixed: '',
        phone_mobile: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        logo_url: '',
        platform_url: 'https://classium.edu.br/portal',
        website: '',
        status: 'inactive',
        plan_status: 'STANDARD',
        is_active: false,
        can_edit: false,
        settings: {}
      };
    }

    // 1. Try Backend API endpoint
    try {
      const headers: Record<string, string> = { 'x-organization-id': orgId };
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }
      } catch (_) {}

      const res = await fetch(`/api/organization/${orgId}`, {
        headers
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          localStorage.setItem('classium_organization_data', JSON.stringify(json.data));
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('[institutionService] Backend API getOrganization warning:', apiErr);
    }

    // 2. Try Direct Supabase Query (organizations & schools tables)
    try {
      const [orgRes, schoolRes] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .maybeSingle(),
        supabase
          .from('schools')
          .select('*')
          .eq('id', orgId)
          .maybeSingle()
      ]);

      const orgData = orgRes.data;
      const schoolData = schoolRes.data;

      if (orgData || schoolData) {
        const settings = orgData?.settings || {};
        const formatted: InstitutionData = {
          id: orgId,
          name: schoolData?.name || orgData?.name || settings.official_name || '',
          official_name: settings.official_name || schoolData?.name || orgData?.name || orgData?.trade_name || '',
          legal_name: schoolData?.name || orgData?.name || settings.official_name || '',
          fantasy_name: orgData?.trade_name || schoolData?.name || settings.fantasy_name || '',
          trade_name: orgData?.trade_name || schoolData?.name || settings.fantasy_name || '',
          document_number: orgData?.document_number || settings.cnpj || '',
          cnpj: orgData?.document_number || settings.cnpj || '',
          state_registration: settings.state_registration || '',
          inep_code: schoolData?.inep_code || orgData?.inep_code || settings.inep_code || '',
          email: schoolData?.email || orgData?.email || '',
          phone: schoolData?.phone || orgData?.phone || settings.phone_fixed || '',
          phone_fixed: settings.phone_fixed || schoolData?.phone || orgData?.phone || '',
          phone_mobile: settings.phone_mobile || '',
          address: schoolData?.address || orgData?.address || null,
          city: schoolData?.city || orgData?.city || '',
          state: schoolData?.state || orgData?.state || '',
          postal_code: schoolData?.postal_code || orgData?.postal_code || null,
          logo_url: orgData?.logo_url || null,
          platform_url: settings.platform_url || 'https://classium.edu.br/portal',
          website: settings.website || '',
          status: schoolData?.status || orgData?.status || 'active',
          plan_status: settings.plan_status || 'STANDARD',
          is_active: (schoolData?.status || orgData?.status) !== 'inactive',
          can_edit: true,
          settings: settings,
          created_at: orgData?.created_at || schoolData?.created_at,
          updated_at: orgData?.updated_at || schoolData?.updated_at
        };

        localStorage.setItem('classium_organization_data', JSON.stringify(formatted));
        return formatted;
      }
    } catch (sbErr) {
      console.warn('[institutionService] Supabase direct query warning:', sbErr);
    }

    // 3. Fallback from LocalStorage cache
    const stored = localStorage.getItem('classium_organization_data');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {}
    }

    // 4. Default Clean State (no fake mock data)
    return {
      id: orgId,
      name: '',
      official_name: '',
      legal_name: '',
      fantasy_name: '',
      trade_name: '',
      document_number: '',
      cnpj: '',
      state_registration: '',
      inep_code: '',
      email: '',
      phone: '',
      phone_fixed: '',
      phone_mobile: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      logo_url: '',
      platform_url: 'https://classium.edu.br/portal',
      website: '',
      status: 'active',
      plan_status: 'STANDARD',
      is_active: true,
      can_edit: true,
      settings: {}
    };
  },

  /**
   * Update organization cadastral data
   */
  async updateOrganization(organizationId: string, payload: Partial<InstitutionData>): Promise<{ success: boolean; data?: InstitutionData; error?: string }> {
    const orgId = resolveOrgId(organizationId || payload.id);

    // Build unified payload
    const officialName = payload.official_name || payload.legal_name || payload.name || '';
    const fantasyName = payload.fantasy_name || payload.trade_name || '';
    const cnpj = payload.cnpj || payload.document_number || '';
    const stateReg = payload.state_registration || '';
    const phoneFixed = payload.phone_fixed || payload.phone || '';
    const phoneMobile = payload.phone_mobile || '';
    const email = payload.email || '';
    const logoUrl = payload.logo_url || '';
    const platformUrl = payload.platform_url || '';
    const website = payload.website || '';

    const settings = {
      ...(payload.settings || {}),
      official_name: officialName,
      fantasy_name: fantasyName,
      cnpj: cnpj,
      state_registration: stateReg,
      phone_fixed: phoneFixed,
      phone_mobile: phoneMobile,
      platform_url: platformUrl,
      website: website,
      plan_status: payload.plan_status || 'STANDARD'
    };

    const updateBody = {
      id: orgId,
      name: officialName,
      trade_name: fantasyName,
      document_number: cnpj,
      email: email,
      phone: phoneFixed || phoneMobile,
      logo_url: logoUrl || null,
      settings: settings,
      updated_at: new Date().toISOString()
    };

    // Update LocalStorage immediately
    localStorage.setItem('classium_organization_data', JSON.stringify({ ...payload, ...updateBody, settings }));

    // 1. Try Backend API
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-organization-id': orgId
      };
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }
      } catch (_) {}

      const res = await fetch(`/api/organization/${orgId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...payload, ...updateBody })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          localStorage.setItem('classium_organization_data', JSON.stringify(json.data));
          return { success: true, data: json.data };
        }
      }
    } catch (apiErr) {
      console.warn('[institutionService] Backend API PUT warning:', apiErr);
    }

    // 2. Direct Supabase Update
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(updateBody)
        .eq('id', orgId)
        .select()
        .maybeSingle();

      // Sync schools table in Supabase
      try {
        await supabase
          .from('schools')
          .update({
            name: officialName || fantasyName,
            inep_code: payload.inep_code || undefined,
            email: email || undefined,
            phone: phoneFixed || phoneMobile || undefined,
            address: payload.address || undefined,
            city: payload.city || undefined,
            state: payload.state || undefined,
            postal_code: payload.postal_code || undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', orgId);
      } catch (schoolErr) {
        console.warn('[institutionService] schools table sync warning:', schoolErr);
      }

      if (!error) {
        const savedData = data || updateBody;
        return { success: true, data: { ...payload, ...savedData } as InstitutionData };
      } else {
        console.warn('[institutionService] Supabase update returned error:', error);
      }
    } catch (sbErr: any) {
      console.error('[institutionService] Supabase update catch error:', sbErr);
    }

    return {
      success: true,
      data: { ...payload, ...updateBody } as InstitutionData
    };
  },

  /**
   * Get shifts list for the organization
   */
  async getShifts(organizationId?: string): Promise<SchoolShiftData[]> {
    const orgId = resolveOrgId(organizationId);

    // 1. Try Backend API
    try {
      const res = await fetch(`/api/shifts?organization_id=${encodeURIComponent(orgId)}`, {
        headers: { 'x-organization-id': orgId }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {}

    // 2. Try Supabase
    try {
      const { data, error } = await supabase
        .from('school_shifts')
        .select('*')
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {}

    return [];
  },

  /**
   * Create a new school shift
   */
  async createShift(payload: Partial<SchoolShiftData>, organizationId?: string): Promise<{ success: boolean; data?: SchoolShiftData; error?: string }> {
    const orgId = resolveOrgId(organizationId);
    const body = {
      organization_id: orgId,
      name: payload.name,
      start_time: payload.start_time || '07:00:00',
      end_time: payload.end_time || '11:30:00'
    };

    // 1. Try Backend API
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({ ...body, interval_start: payload.interval_start, interval_end: payload.interval_end })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return { success: true, data: json.data };
        }
      }
    } catch (e) {}

    // 2. Try Supabase
    try {
      const { data, error } = await supabase
        .from('school_shifts')
        .insert([body])
        .select()
        .single();

      if (!error && data) {
        return { success: true, data };
      }
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao criar turno' };
    }

    return { success: false, error: 'Não foi possível cadastrar o turno no banco de dados' };
  },

  /**
   * Update a school shift
   */
  async updateShift(shiftId: string, payload: Partial<SchoolShiftData>): Promise<{ success: boolean; data?: SchoolShiftData; error?: string }> {
    const body = {
      name: payload.name,
      start_time: payload.start_time,
      end_time: payload.end_time
    };

    // 1. Try Backend API
    try {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return { success: true, data: json.data };
        }
      }
    } catch (e) {}

    // 2. Try Supabase
    try {
      const { data, error } = await supabase
        .from('school_shifts')
        .update(body)
        .eq('id', shiftId)
        .select()
        .single();

      if (!error && data) {
        return { success: true, data };
      }
      if (error) {
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao atualizar turno' };
    }

    return { success: false, error: 'Não foi possível atualizar o turno no banco de dados' };
  },

  /**
   * Delete a school shift
   */
  async deleteShift(shiftId: string): Promise<{ success: boolean; error?: string }> {
    // 1. Try Backend API
    try {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return { success: true };
      }
    } catch (e) {}

    // 2. Try Supabase
    try {
      const { error } = await supabase
        .from('school_shifts')
        .delete()
        .eq('id', shiftId);

      if (!error) return { success: true };
      return { success: false, error: error.message };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao excluir turno' };
    }
  },

  /**
   * Get Management Team Members for Organization
   */
  async getManagementTeam(organizationId?: string): Promise<ManagementTeamMember[]> {
    const orgId = resolveOrgId(organizationId);
    let rawList: ManagementTeamMember[] = [];

    // 1. Try Backend API
    try {
      const res = await fetch(`/api/organization/${orgId}/management-team`, {
        headers: { 'x-organization-id': orgId }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          rawList = json.data;
        }
      }
    } catch (e) {}

    // 2. Try Supabase school_staff canonical table
    if (rawList.length === 0) {
      try {
        const { data, error } = await supabase
          .from('school_staff')
          .select('*')
          .or(`organization_id.eq.${orgId},school_id.eq.${orgId}`)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          rawList = data.map((m: any) => ({
            id: m.id,
            organization_id: m.organization_id || orgId,
            school_id: m.school_id || orgId,
            name: m.full_name || m.name,
            role: m.role || 'Vice-Diretor(a)',
            custom_role_title: m.custom_role_title,
            email: m.email || '',
            phone: m.phone || '',
            is_active: m.is_active ?? true,
            created_at: m.created_at,
            updated_at: m.updated_at
          }));
        }
      } catch (e) {}
    }

    // 3. Try Supabase school_management_team table
    if (rawList.length === 0) {
      try {
        const { data, error } = await supabase
          .from('school_management_team')
          .select('*')
          .or(`organization_id.eq.${orgId},school_id.eq.${orgId}`)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          rawList = data as ManagementTeamMember[];
        }
      } catch (e) {}
    }

    // 4. Try reading from organization settings
    if (rawList.length === 0) {
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', orgId)
          .maybeSingle();

        if (orgData?.settings?.management_team && Array.isArray(orgData.settings.management_team) && orgData.settings.management_team.length > 0) {
          rawList = orgData.settings.management_team;
        }
      } catch (e) {}
    }

    // 4. Try LocalStorage
    if (rawList.length === 0) {
      const stored = localStorage.getItem(`classium_team_${orgId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) rawList = parsed;
        } catch (e) {}
      }
    }

    // Ensure UNIQUE IDs across all items so duplicates have distinct keys
    const seenIds = new Set<string>();
    const sanitizedList: ManagementTeamMember[] = rawList.map((item, idx) => {
      let baseId = item.id || `team-${idx}-${Date.now()}`;
      if (seenIds.has(baseId)) {
        baseId = `${baseId}-dup-${idx}`;
      }
      seenIds.add(baseId);
      return {
        ...item,
        id: baseId,
        organization_id: item.organization_id || orgId,
        school_id: item.school_id || orgId
      };
    });

    localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(sanitizedList));
    return sanitizedList;
  },

  /**
   * Add a Management Team Member
   */
  async addManagementTeamMember(organizationId: string, member: Partial<ManagementTeamMember>): Promise<{ success: boolean; data?: ManagementTeamMember; error?: string }> {
    const orgId = resolveOrgId(organizationId);
    const generatedId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : '11111111-1111-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    const memberId = member.id && isValidUUID(member.id) ? member.id : generatedId;

    const newMember: ManagementTeamMember = {
      id: memberId,
      organization_id: orgId,
      school_id: orgId,
      name: (member.name || '').trim(),
      role: member.role || 'Vice-Diretor(a)',
      custom_role_title: member.role === 'Outro' ? (member.custom_role_title || '').trim() : undefined,
      email: (member.email || '').trim(),
      phone: (member.phone || '').trim(),
      is_active: member.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Try Backend API
    try {
      const res = await fetch(`/api/organization/${orgId}/management-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify(newMember)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const current = await this.getManagementTeam(orgId);
          const updated = [...current.filter(m => m.id !== json.data.id), json.data];
          localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(updated));
          return { success: true, data: json.data };
        }
      }
    } catch (e) {}

    // 2. Try Supabase school_staff canonical table
    try {
      const { data, error } = await supabase
        .from('school_staff')
        .insert([{
          id: newMember.id,
          organization_id: orgId,
          full_name: newMember.name,
          role: newMember.role,
          email: newMember.email,
          phone: newMember.phone,
          created_at: newMember.created_at,
          updated_at: newMember.updated_at
        }])
        .select()
        .single();

      if (!error && data) {
        const current = await this.getManagementTeam(orgId);
        const updated = [...current.filter(m => m.id !== data.id), {
          ...newMember,
          id: data.id
        }];
        localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(updated));
        return { success: true, data: { ...newMember, id: data.id } };
      }
    } catch (e) {}

    // 3. Try Supabase school_management_team table
    try {
      const { data, error } = await supabase
        .from('school_management_team')
        .insert([newMember])
        .select()
        .single();

      if (!error && data) {
        const current = await this.getManagementTeam(orgId);
        const updated = [...current.filter(m => m.id !== data.id), data];
        localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(updated));
        return { success: true, data };
      }
    } catch (e) {}

    // 4. Fallback: Save inside organization settings
    try {
      const current = await this.getManagementTeam(orgId);
      const updated = [...current, newMember];
      localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(updated));

      const { data: orgData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .maybeSingle();

      const newSettings = {
        ...(orgData?.settings || {}),
        management_team: updated
      };

      await supabase
        .from('organizations')
        .update({ settings: newSettings, updated_at: new Date().toISOString() })
        .eq('id', orgId);

      return { success: true, data: newMember };
    } catch (e: any) {
      console.warn('[institutionService] Team fallback update warning:', e);
      return { success: true, data: newMember };
    }
  },

  /**
   * Update a Management Team Member
   */
  async updateManagementTeamMember(organizationId: string, memberId: string, updates: Partial<ManagementTeamMember>): Promise<{ success: boolean; data?: ManagementTeamMember; error?: string }> {
    const orgId = resolveOrgId(organizationId);
    const realMemberId = memberId.split('-dup-')[0];

    // 1. Try Backend API
    try {
      const res = await fetch(`/api/organization/${orgId}/management-team/${encodeURIComponent(realMemberId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const current = await this.getManagementTeam(orgId);
          const updated = current.map(m => (m.id === memberId || m.id === realMemberId) ? { ...m, ...json.data } : m);
          localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(updated));
          return { success: true, data: json.data };
        }
      }
    } catch (e) {}

    // 2. Try Supabase school_staff canonical table
    try {
      const staffUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.name) staffUpdates.full_name = updates.name;
      if (updates.role) staffUpdates.role = updates.role;
      if (updates.email !== undefined) staffUpdates.email = updates.email;
      if (updates.phone !== undefined) staffUpdates.phone = updates.phone;

      const { data: staffData } = await supabase
        .from('school_staff')
        .update(staffUpdates)
        .eq('id', realMemberId)
        .select()
        .maybeSingle();

      if (staffData) {
        const current = await this.getManagementTeam(orgId);
        const updated = current.map(m => (m.id === memberId || m.id === realMemberId) ? { ...m, ...updates, ...staffData, name: staffData.full_name || updates.name || m.name } : m);
        localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(updated));
        return { success: true, data: { ...updates, ...staffData, name: staffData.full_name || updates.name } as ManagementTeamMember };
      }
    } catch (e) {}

    // 3. Try Supabase school_management_team table
    try {
      const { data, error } = await supabase
        .from('school_management_team')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', realMemberId)
        .select()
        .single();

      if (!error && data) {
        const current = await this.getManagementTeam(orgId);
        const updated = current.map(m => (m.id === memberId || m.id === realMemberId) ? { ...m, ...data } : m);
        localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(updated));
        return { success: true, data };
      }
    } catch (e) {}

    // 4. Fallback: Save inside organization settings
    try {
      const current = await this.getManagementTeam(orgId);
      const updated = current.map(m => (m.id === memberId || m.id === realMemberId) ? { ...m, ...updates, updated_at: new Date().toISOString() } : m);
      localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(updated));

      const { data: orgData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .maybeSingle();

      const newSettings = {
        ...(orgData?.settings || {}),
        management_team: updated
      };

      await supabase
        .from('organizations')
        .update({ settings: newSettings, updated_at: new Date().toISOString() })
        .eq('id', orgId);

      const target = updated.find(m => m.id === memberId || m.id === realMemberId);
      return { success: true, data: target };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao atualizar membro' };
    }
  },

  /**
   * Delete a Management Team Member
   */
  async deleteManagementTeamMember(organizationId: string, memberId: string): Promise<{ success: boolean; error?: string }> {
    const orgId = resolveOrgId(organizationId);
    const realMemberId = memberId.split('-dup-')[0];

    // 1. Try Backend API
    try {
      const res = await fetch(`/api/organization/${orgId}/management-team/${encodeURIComponent(realMemberId)}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': orgId }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          // Success via API
        }
      }
    } catch (e) {}

    // 2. Direct Supabase delete from school_staff table
    try {
      await supabase
        .from('school_staff')
        .delete()
        .eq('id', realMemberId);
    } catch (e) {}

    // 3. Direct Supabase delete from school_management_team table
    try {
      await supabase
        .from('school_management_team')
        .delete()
        .eq('id', realMemberId);
    } catch (e) {}

    // 4. ALWAYS clean up from organizations.settings.management_team
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .maybeSingle();

      if (orgData?.settings?.management_team && Array.isArray(orgData.settings.management_team)) {
        const currentTeam = orgData.settings.management_team;
        const updatedSettingsTeam = currentTeam.filter((m: any) => m.id !== realMemberId && m.id !== memberId);

        if (currentTeam.length !== updatedSettingsTeam.length) {
          await supabase
            .from('organizations')
            .update({
              settings: { ...(orgData.settings || {}), management_team: updatedSettingsTeam },
              updated_at: new Date().toISOString()
            })
            .eq('id', orgId);
        }
      }
    } catch (e) {}

    // 4. Update LocalStorage cache
    try {
      const stored = localStorage.getItem(`classium_team_${orgId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((m: any) => m.id !== realMemberId && m.id !== memberId);
          localStorage.setItem(`classium_team_${orgId}`, JSON.stringify(filtered));
        }
      }
    } catch (e) {}

    return { success: true };
  }
};
