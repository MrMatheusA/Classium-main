import { SupabaseClient } from '@supabase/supabase-js';

export interface SchoolInfo {
  school_id: string;
  school_name: string;
  school_logo?: string;
  school_unit?: string;
}

export class SchoolContextService {
  private supabase: SupabaseClient;
  private sessionCache: Map<string, any>;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.sessionCache = new Map<string, any>();
  }

  /**
   * Get current school based on user session / guardian links
   */
  public async getCurrentSchool(authUserId: string, requestedSchoolId?: string): Promise<SchoolInfo | null> {
    try {
      const cacheKey = `current_school_${authUserId}_${requestedSchoolId || 'default'}`;
      if (this.sessionCache.has(cacheKey)) {
        return this.sessionCache.get(cacheKey) as SchoolInfo;
      }

      const schools = await this.getSchoolsFromGuardian(authUserId);
      if (!schools || schools.length === 0) {
        console.warn(`[SchoolContextService] No schools found for user ${authUserId}`);
        return null;
      }

      let selectedSchool = schools[0];
      if (requestedSchoolId) {
        const found = schools.find(s => s.school_id === requestedSchoolId);
        if (found) {
          selectedSchool = found;
        } else {
          throw new Error('AccessDenied: School not linked to guardian');
        }
      }

      this.sessionCache.set(cacheKey, selectedSchool);
      return selectedSchool;
    } catch (error: any) {
      console.error('[SchoolContextService] Error in getCurrentSchool:', error.message || error);
      throw error;
    }
  }

  /**
   * Get all schools where the guardian has linked students
   */
  public async getSchoolsFromGuardian(authUserId: string): Promise<SchoolInfo[]> {
    try {
      // 1. Find guardian or profile associated with authUserId
      const profileId = await this.resolveProfileId(authUserId);
      if (!profileId) {
        return [];
      }

      // 2. Find students linked to this guardian via student_guardians
      const { data: links, error: linkError } = await this.supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', profileId);

      if (linkError) {
        throw new Error(`Error fetching student_guardians: ${linkError.message}`);
      }

      if (!links || links.length === 0) {
        return [];
      }

      const studentIds = links.map((l: { student_id: string }) => l.student_id);

      // 3. Find students and their respective school_ids
      const { data: students, error: studentError } = await this.supabase
        .from('students')
        .select('school_id')
        .in('id', studentIds);

      if (studentError) {
        throw new Error(`Error fetching students: ${studentError.message}`);
      }

      if (!students || students.length === 0) {
        return [];
      }

      const schoolIds = Array.from(new Set(students.map((s: { school_id: string }) => s.school_id)));

      // 4. Fetch schools info
      const { data: schools, error: schoolError } = await this.supabase
        .from('schools')
        .select('id, name, logo, unit')
        .in('id', schoolIds);

      if (schoolError) {
        throw new Error(`Error fetching schools: ${schoolError.message}`);
      }

      if (!schools || schools.length === 0) {
        return [];
      }

      return schools.map((sch: any) => ({
        school_id: sch.id,
        school_name: sch.name,
        school_logo: sch.logo || '',
        school_unit: sch.unit || '',
      }));
    } catch (error: any) {
      console.error('[SchoolContextService] Error in getSchoolsFromGuardian:', error.message || error);
      return [];
    }
  }

  /**
   * Get all children/students linked to the guardian
   */
  public async getStudentsFromGuardian(authUserId: string): Promise<any[]> {
    try {
      const profileId = await this.resolveProfileId(authUserId);
      if (!profileId) return [];

      const { data: links, error: linkError } = await this.supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', profileId);

      if (linkError || !links || links.length === 0) {
        return [];
      }

      const studentIds = links.map((l: { student_id: string }) => l.student_id);

      const { data: students, error: studentError } = await this.supabase
        .from('students')
        .select('*')
        .in('id', studentIds);

      if (studentError) {
        throw new Error(`Error fetching students: ${studentError.message}`);
      }

      return students || [];
    } catch (error: any) {
      console.error('[SchoolContextService] Error in getStudentsFromGuardian:', error.message || error);
      return [];
    }
  }

  /**
   * Select current school or return ordered list for frontend selection
   */
  public async selectCurrentSchool(authUserId: string): Promise<{ single: boolean; schools: SchoolInfo[]; current?: SchoolInfo }> {
    const schools = await this.getSchoolsFromGuardian(authUserId);
    if (schools.length === 1) {
      return { single: true, schools, current: schools[0] };
    }
    return { single: false, schools, current: schools[0] };
  }

  /**
   * Validate if guardian profile has access to school_id via linked students
   */
  public async validateSchoolAccess(profileId: string, schoolId: string): Promise<boolean> {
    try {
      const { data: links, error: linkError } = await this.supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', profileId);

      if (linkError || !links || links.length === 0) {
        return false;
      }

      const studentIds = links.map((l: { student_id: string }) => l.student_id);

      const { data: students, error: studentError } = await this.supabase
        .from('students')
        .select('id')
        .in('id', studentIds)
        .eq('school_id', schoolId)
        .limit(1);

      if (studentError || !students || students.length === 0) {
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('[SchoolContextService] Error in validateSchoolAccess:', error.message || error);
      return false;
    }
  }

  /**
   * Helper to resolve profile_id from auth_user_id
   */
  private async resolveProfileId(authUserId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_accounts')
        .select('profile_id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error || !data) {
        // Fallback: assume authUserId is profileId if no mapping table found
        return authUserId;
      }

      return data.profile_id as string;
    } catch {
      return authUserId;
    }
  }
}
