import { supabase } from '../../lib/supabase';
import { RealtimeService } from '../RealtimeService';

const realtimeService = RealtimeService.getInstance();

export interface PedagogicalReportRecord {
  id: string;
  organization_id: string;
  student_id: string;
  student_name: string;
  student_class: string;
  student_age?: number;
  student_registration?: string;
  attendance_rate?: string;
  
  teacher_id?: string;
  teacher_name?: string;
  
  pedagogue_id?: string;
  pedagogue_name?: string;
  director_name?: string;
  
  title: string;
  report_type: string;
  purpose: string;
  specialist_target?: string;
  
  report_content: string;
  structured_content?: any;
  
  status: 'rascunho' | 'pending_review' | 'em_revisao' | 'approved' | 'rejected' | 'archived';
  comments?: string;
  version?: string;
  
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
}

class PedagogicalReportsService {
  /**
   * Fetch all pedagogical reports for the organization with optional status filtering
   */
  async getReports(params: {
    organizationId: string;
    status?: string;
    studentId?: string;
    teacherId?: string;
    search?: string;
  }): Promise<{ reports: PedagogicalReportRecord[]; error?: string }> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('organization_id', params.organizationId || '11111111-1111-1111-1111-111111111111');
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params.studentId) queryParams.append('student_id', params.studentId);
      if (params.teacherId) queryParams.append('teacher_id', params.teacherId);
      if (params.search) queryParams.append('search', params.search);

      const res = await fetch(`/api/pedagogical-reports?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          return { reports: data.items };
        }
      }
    } catch (apiErr) {
      console.warn('[PedagogicalReportsService] Server fetch failed, attempting Supabase direct query:', apiErr);
    }

    // Direct Supabase query fallback
    try {
      let query = supabase
        .from('pedagogical_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (params.organizationId) {
        query = query.eq('organization_id', params.organizationId);
      }
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }
      if (params.studentId) {
        query = query.eq('student_id', params.studentId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return { reports: data as PedagogicalReportRecord[] };
      }
    } catch (sbErr) {
      console.warn('[PedagogicalReportsService] Supabase query error:', sbErr);
    }

    return { reports: [] };
  }

  /**
   * Create or Save a new pedagogical report
   */
  async createReport(payload: Partial<PedagogicalReportRecord>): Promise<{ report?: PedagogicalReportRecord; success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/pedagogical-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.report) {
          return { report: json.report, success: true };
        }
      }
    } catch (apiErr) {
      console.warn('[PedagogicalReportsService] API save error, trying direct Supabase:', apiErr);
    }

    try {
      const { data, error } = await supabase
        .from('pedagogical_reports')
        .insert([{
          ...payload,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (!error && data) {
        return { report: data as PedagogicalReportRecord, success: true };
      }
      return { success: false, error: error?.message };
    } catch (sbErr: any) {
      return { success: false, error: sbErr.message };
    }
  }

  /**
   * Update an existing report
   */
  async updateReport(id: string, payload: Partial<PedagogicalReportRecord>): Promise<{ report?: PedagogicalReportRecord; success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/pedagogical-reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.report) {
          return { report: json.report, success: true };
        }
      }
    } catch (apiErr) {
      console.warn('[PedagogicalReportsService] API update error, trying Supabase direct:', apiErr);
    }

    try {
      const { data, error } = await supabase
        .from('pedagogical_reports')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return { report: data as PedagogicalReportRecord, success: true };
      }
      return { success: false, error: error?.message };
    } catch (sbErr: any) {
      return { success: false, error: sbErr.message };
    }
  }

  /**
   * Submit to Pedagoga (sets status to 'pending_review' or 'em_revisao')
   */
  async submitToPedagoga(id: string, payload?: Partial<PedagogicalReportRecord>): Promise<{ success: boolean; error?: string }> {
    const updateData: Partial<PedagogicalReportRecord> = {
      ...(payload || {}),
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return this.updateReport(id, updateData);
  }

  /**
   * Review Report by Pedagoga (Aprovar / Rejeitar com comentários)
   */
  async reviewReport(
    id: string, 
    reviewData: { 
      status: 'approved' | 'rejected'; 
      comments?: string; 
      pedagogueName?: string; 
      pedagogueId?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/pedagogical-reports/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return { success: true };
      }
    } catch (apiErr) {
      console.warn('[PedagogicalReportsService] API review error, trying direct Supabase update:', apiErr);
    }

    try {
      const { error } = await supabase
        .from('pedagogical_reports')
        .update({
          status: reviewData.status,
          comments: reviewData.comments || null,
          pedagogue_name: reviewData.pedagogueName || 'Coordenação Pedagógica',
          pedagogue_id: reviewData.pedagogueId || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (!error) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('classium_reports_updated', { detail: { id, status: reviewData.status } }));
          window.dispatchEvent(new CustomEvent('classium_pedagogico_updated'));
        }
        return { success: true };
      }
      return { success: false, error: error?.message };
    } catch (sbErr: any) {
      return { success: false, error: sbErr.message };
    }
  }

  /**
   * Subscribe to pedagogical reports changes with centralized RealtimeService
   */
  subscribeToReports(organizationId: string, callback: () => void): () => void {
    return realtimeService.subscribe(
      `pedagogical_reports_${organizationId || 'global'}`,
      {
        table: 'pedagogical_reports',
        filter: organizationId ? `organization_id=eq.${organizationId}` : undefined
      },
      () => {
        callback();
      }
    );
  }
}

export const pedagogicalReportsService = new PedagogicalReportsService();
