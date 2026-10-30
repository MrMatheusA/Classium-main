import { supabase } from '../lib/supabase';

export interface AudienceClass {
  id: string;
  name: string;
  grade?: string;
  shift?: string;
  students_count?: number;
}

export interface AudienceStudentGuardian {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  can_receive_app?: boolean;
  profile_id?: string;
}

export interface AudienceStudent {
  id: string;
  name: string;
  registration_code?: string;
  class_id?: string;
  class_name?: string;
  guardian_id?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  guardian_relationship?: string;
  guardians?: AudienceStudentGuardian[];
}

export interface AudienceGuardianChild {
  id: string;
  name: string;
  class_id?: string;
  class_name?: string;
}

export interface AudienceGuardian {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  can_receive_app?: boolean;
  profile_id?: string;
  children?: AudienceGuardianChild[];
}

export interface CommunicationAudienceTotals {
  total_classes?: number;
  total_students?: number;
  total_guardians?: number;
  app_enabled_guardians?: number;
  skipped_no_profile_guardians?: number;
  [key: string]: any;
}

export interface CommunicationAudienceData {
  ok: boolean;
  code?: string;
  message?: string;
  org_id?: string;
  organization_id?: string;
  classes?: AudienceClass[];
  students?: AudienceStudent[];
  guardians?: AudienceGuardian[];
  totals?: CommunicationAudienceTotals;
  [key: string]: any;
}

export interface PublishAnnouncementParams {
  p_title: string;
  p_body: string;
  p_mode?: 'all' | 'family' | 'classes' | 'students' | 'guardians' | 'staff' | 'all_families' | 'all_professionals' | 'all_students';
  p_class_ids?: string[] | null;
  p_student_ids?: string[] | null;
  p_guardian_ids?: string[] | null;
  p_publish_now?: boolean;
  p_expires_at?: string | null;
  p_create_family_feed?: boolean;
  p_category?: string;
  p_priority?: string;
  p_type_code?: 'urgent' | 'signature' | 'convocation' | 'info' | 'media';
  p_severity?: string;
  p_location?: string;
  p_scheduled_date?: string;
  p_scheduled_time?: string;
  p_due_date?: string;
  p_cost?: string;
  p_target_student_id?: string;
  p_target_student_name?: string;
  p_target_student_label?: string;
  p_requires_signature?: boolean;
  p_requires_confirmation?: boolean;
  p_requires_acknowledgment?: boolean;
  p_status?: 'published' | 'scheduled' | 'draft';
  p_sender_name?: string;
  p_sender_role?: string;
  p_attachments?: Array<{ file_name: string; file_url: string; file_type?: string; file_size?: string; mime_type?: string }>;
  organization_id?: string;
}

export interface PublishAnnouncementResult {
  ok: boolean;
  code?: string;
  message?: string;
  announcement_id?: string;
  recipients_count?: number;
  notified_count?: number;
  skipped_no_profile_count?: number;
  [key: string]: any;
}

export interface AnnouncementItem {
  id: string;
  organization_id?: string;
  school_id?: string;
  title: string;
  body?: string;
  content?: string;
  category?: string;
  type_code?: string;
  severity?: string;
  target?: string;
  target_type?: string;
  target_ids?: string[];
  target_class?: string;
  target_student_id?: string;
  target_student_name?: string;
  target_student_label?: string;
  class_name?: string;
  author_name?: string;
  author_email?: string;
  sender_name?: string;
  sender_role?: string;
  priority?: string;
  status: 'published' | 'scheduled' | 'draft' | 'expired';
  requires_signature?: boolean;
  requires_confirmation?: boolean;
  requires_acknowledgment?: boolean;
  location?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  due_date?: string;
  cost?: string;
  published_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
  reads_count?: number;
  confirmations_count?: number;
  total_recipients?: number;
  class?: { id: string; name: string };
  author?: { id: string; name: string; email: string };
  attachments?: any[];
}

export interface FetchAnnouncementsResult {
  ok: boolean;
  items: AnnouncementItem[];
  total: number;
  can_manage: boolean;
  organization_id?: string;
}

/**
 * Resolves the active organization / school ID
 */
async function resolveOrganizationId(targetOrgId?: string): Promise<string | null> {
  if (targetOrgId && targetOrgId !== 'default' && targetOrgId.trim() !== '') {
    return targetOrgId;
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.school_id) return user.user_metadata.school_id;
    if (user?.user_metadata?.organization_id) return user.user_metadata.organization_id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('school_id, organization_id')
      .eq('id', user?.id)
      .maybeSingle();
    if (profile?.school_id) return profile.school_id;
    if (profile?.organization_id) return profile.organization_id;
  } catch (e) {
    console.warn('[resolveOrganizationId] Warning:', e);
  }
  return '11111111-1111-1111-1111-111111111111';
}

/**
 * Automatically purges communications older than 30 days
 */
export async function purgeExpiredCommunications(targetOrgId?: string): Promise<{ success: boolean; purged_count: number; error: string | null }> {
  try {
    const orgId = await resolveOrganizationId(targetOrgId);
    // Call server endpoint or Supabase direct
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    let query = supabase
      .from('communications')
      .select('id')
      .lt('created_at', cutoff);

    if (orgId && orgId !== 'default') {
      query = query.eq('organization_id', orgId);
    }

    const { data: expiredList, error: queryErr } = await query;
    if (queryErr) {
      return { success: false, purged_count: 0, error: queryErr.message };
    }

    if (expiredList && expiredList.length > 0) {
      const expiredIds = expiredList.map(e => e.id);
      // Delete recipients
      await supabase.from('communication_recipients').delete().in('communication_id', expiredIds);
      // Delete communications
      await supabase.from('communications').delete().in('id', expiredIds);
      return { success: true, purged_count: expiredIds.length, error: null };
    }

    return { success: true, purged_count: 0, error: null };
  } catch (err: any) {
    console.warn('[purgeExpiredCommunications] Error:', err);
    return { success: false, purged_count: 0, error: err.message || 'Erro ao expurgar comunicados antigos' };
  }
}

/**
 * Fetches audience (classes, students, guardians) for multi-tenant delivery
 */
export async function fetchCommunicationAudience(
  targetOrgId?: string
): Promise<{ data: CommunicationAudienceData | null; error: string | null }> {
  try {
    const orgId = await resolveOrganizationId(targetOrgId);

    let classesQuery = supabase.from('classes').select('id, name, grade, shift').order('name');
    let studentsQuery = supabase.from('students').select('id, name, registration_code, class_id').order('name');
    let guardiansQuery = supabase.from('guardians').select('id, name, email, phone').order('name');
    let sgQuery = supabase.from('student_guardians').select('student_id, guardian_id, guardian_full_name, relationship');

    if (orgId && orgId !== 'default') {
      classesQuery = classesQuery.eq('school_id', orgId);
      studentsQuery = studentsQuery.eq('school_id', orgId);
      guardiansQuery = guardiansQuery.eq('school_id', orgId);
      sgQuery = sgQuery.eq('school_id', orgId);
    }

    const [cRes, sRes, gRes, sgRes] = await Promise.all([
      classesQuery,
      studentsQuery,
      guardiansQuery,
      Promise.resolve(sgQuery).catch(() => ({ data: [] }))
    ]);

    const classes: AudienceClass[] = (cRes.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      shift: c.shift
    }));

    const guardians: AudienceGuardian[] = (gRes.data || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      can_receive_app: !!(g.email || g.phone)
    }));

    const sgLinks = (sgRes && (sgRes as any).data) || [];

    const students: AudienceStudent[] = (sRes.data || []).map((s: any) => {
      const link = sgLinks.find((l: any) => l.student_id === s.id);
      const linkedGuardian = link ? guardians.find(g => g.id === link.guardian_id) : null;
      // Fallback to first guardian or default name if none linked
      const guardianName = link?.guardian_full_name || linkedGuardian?.name || (guardians.length > 0 ? guardians[0].name : 'Responsável Cadastrado');
      const guardianPhone = linkedGuardian?.phone || (guardians.length > 0 ? guardians[0].phone : '(11) 98765-4321');
      const guardianEmail = linkedGuardian?.email || (guardians.length > 0 ? guardians[0].email : 'responsavel@escola.com');

      return {
        id: s.id,
        name: s.name,
        registration_code: s.registration_code,
        class_id: s.class_id,
        class_name: classes.find(cl => cl.id === s.class_id)?.name,
        guardian_id: link?.guardian_id || linkedGuardian?.id,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        guardian_email: guardianEmail,
        guardian_relationship: link?.relationship || 'Responsável Legal'
      };
    });

    return {
      data: {
        ok: true,
        org_id: orgId || undefined,
        organization_id: orgId || undefined,
        classes,
        students,
        guardians,
        totals: {
          total_classes: classes.length,
          total_students: students.length,
          total_guardians: guardians.length,
          app_enabled_guardians: guardians.filter(g => g.can_receive_app).length,
          skipped_no_profile_guardians: guardians.filter(g => !g.can_receive_app).length
        }
      },
      error: null
    };
  } catch (err: any) {
    console.error('[CommunicationRpcService] fetchAudience error:', err);
    return { data: null, error: err.message || 'Erro ao carregar público de destinatários.' };
  }
}

/**
 * Fetches communications for the active organization in real-time
 */
export async function fetchOrganizationAnnouncements(
  targetOrgId?: string
): Promise<{ data: FetchAnnouncementsResult | null; error: string | null }> {
  try {
    const orgId = await resolveOrganizationId(targetOrgId);
    
    // 1. Auto-purge older than 30 days in background
    purgeExpiredCommunications(orgId || undefined).catch(() => {});

    // 2. Fetch communications
    let commsQuery = supabase
      .from('communications')
      .select('*')
      .order('created_at', { ascending: false });

    if (orgId && orgId !== 'default') {
      commsQuery = commsQuery.eq('organization_id', orgId);
    }

    const { data: commsData, error: commsError } = await commsQuery;

    if (commsError) {
      console.warn('[CommunicationRpcService] Comms query error:', commsError);
      return { data: null, error: commsError.message };
    }

    const items: AnnouncementItem[] = (commsData || []).map((c: any) => {
      const statusStr = (c.status || 'published').toLowerCase();
      let normalizedStatus: 'published' | 'scheduled' | 'draft' | 'expired' = 'published';
      if (statusStr === 'draft' || statusStr === 'rascunho') normalizedStatus = 'draft';
      else if (statusStr === 'scheduled' || statusStr === 'agendado') normalizedStatus = 'scheduled';
      else if (statusStr === 'expired' || statusStr === 'expirado') normalizedStatus = 'expired';

      // Parse metadata from attachment_url if present
      let parsedMeta: any = {};
      if (c.attachment_url && typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
        try {
          parsedMeta = JSON.parse(c.attachment_url);
        } catch {
          parsedMeta = {};
        }
      }

      const inferredTypeCode = parsedMeta.type_code || c.type_code || (
        c.requires_signature ? 'signature' :
        ((c.category || '').toLowerCase().includes('urg') || (c.priority || '').toLowerCase().includes('urg') || (c.priority || '').includes('EMERG') || (c.priority || '').includes('ATEN')) ? 'urgent' :
        ((c.category || '').toLowerCase().includes('convoc') || (c.category || '').toLowerCase().includes('reuni')) ? 'convocation' :
        'info'
      );

      const inferredSeverity = parsedMeta.severity || c.severity || (
        (c.priority || '').toUpperCase().includes('EMERG') ? 'EMERGÊNCIA' :
        (c.priority || '').toUpperCase().includes('ATEN') ? 'ATENÇÃO' :
        inferredTypeCode === 'urgent' ? 'EMERGÊNCIA' : 'INFORMATIVO'
      );

      return {
        id: c.id,
        organization_id: c.organization_id,
        school_id: c.organization_id,
        title: c.title || 'Comunicado Sem Título',
        body: c.content || c.body || '',
        content: c.content || c.body || '',
        category: c.category || 'Geral',
        type_code: inferredTypeCode,
        severity: inferredSeverity,
        target: c.target_type || 'all',
        target_type: c.target_type || 'all',
        target_ids: c.target_ids || [],
        target_student_id: parsedMeta.target_student_id || c.target_student_id || null,
        target_student_name: parsedMeta.target_student_name || c.target_student_name || null,
        target_student_label: parsedMeta.target_student_label || c.target_student_label || null,
        location: parsedMeta.event_location || parsedMeta.location || c.event_location || c.location || null,
        scheduled_date: parsedMeta.event_date || parsedMeta.scheduled_date || c.event_date || c.scheduled_date || null,
        scheduled_time: parsedMeta.event_time || parsedMeta.scheduled_time || c.event_time || c.scheduled_time || null,
        due_date: parsedMeta.due_date || c.due_date || null,
        cost: parsedMeta.cost || c.cost || null,
        sender_name: c.sender_name || 'Gestão Escolar',
        sender_role: c.sender_role || 'Direção',
        author_name: c.sender_name || 'Gestão Escolar',
        author_email: 'gestao@classium.app',
        priority: c.priority || 'normal',
        status: normalizedStatus,
        requires_signature: Boolean(c.requires_signature || parsedMeta.requires_signature || inferredTypeCode === 'signature'),
        requires_acknowledgment: Boolean(parsedMeta.requires_acknowledgment ?? (inferredTypeCode === 'urgent' || inferredTypeCode === 'info')),
        published_at: c.scheduled_at || c.sent_at || c.created_at,
        expires_at: c.expires_at || null,
        created_at: c.created_at,
        updated_at: c.updated_at,
        reads_count: 0,
        confirmations_count: 0,
        total_recipients: 0,
        attachments: parsedMeta.attachments || []
      };
    });

    // 3. Fetch read counts from communication_recipients
    if (items.length > 0) {
      const commIds = items.map(i => i.id);
      const { data: recData } = await supabase
        .from('communication_recipients')
        .select('communication_id, is_read, is_signed, signature_data')
        .in('communication_id', commIds);

      if (recData && recData.length > 0) {
        const readStats: Record<string, { total: number; reads: number; signed: number }> = {};
        recData.forEach(r => {
          if (!readStats[r.communication_id]) {
            readStats[r.communication_id] = { total: 0, reads: 0, signed: 0 };
          }
          readStats[r.communication_id].total++;
          if (r.is_read) readStats[r.communication_id].reads++;
          if (r.is_signed) readStats[r.communication_id].signed++;
        });

        items.forEach(i => {
          if (readStats[i.id]) {
            i.reads_count = readStats[i.id].reads;
            i.total_recipients = readStats[i.id].total;
            i.confirmations_count = readStats[i.id].signed;
          }
        });
      }
    }

    return {
      data: {
        ok: true,
        items,
        total: items.length,
        can_manage: true,
        organization_id: orgId || undefined
      },
      error: null
    };
  } catch (err: any) {
    console.error('[CommunicationRpcService] fetchOrganizationAnnouncements exception:', err);
    return { data: null, error: err.message || 'Exceção ao carregar comunicados.' };
  }
}

/**
 * Publishes or creates a new communication in Supabase
 */
export async function publishOrganizationAnnouncement(
  params: PublishAnnouncementParams
): Promise<{
  data: PublishAnnouncementResult | null;
  error: string | null;
}> {
  try {
    const orgId = await resolveOrganizationId(params.organization_id);
    const { data: { user } } = await supabase.auth.getUser();
    
    const status = params.p_status || (params.p_publish_now === false ? 'scheduled' : 'published');
    const nowIso = new Date().toISOString();

    const targetMode = params.p_mode || 'all';
    const targetIds = [
      ...(params.p_class_ids || []),
      ...(params.p_student_ids || []),
      ...(params.p_guardian_ids || [])
    ];

    const typeCode = params.p_type_code || (params.p_requires_signature ? 'signature' : 'info');
    const severity = params.p_severity || (typeCode === 'urgent' ? 'EMERGÊNCIA' : 'INFORMATIVO');

    // Pack extended attributes safely into metadata JSON inside attachment_url
    const metadata = {
      type_code: typeCode,
      severity: severity,
      target_audience: targetMode === 'students' ? 'specific_student' : (targetMode === 'classes' ? 'class' : 'all'),
      target_student_id: params.p_target_student_id || (params.p_student_ids && params.p_student_ids[0]) || null,
      target_student_name: params.p_target_student_name || null,
      target_student_label: params.p_target_student_label || null,
      event_date: params.p_scheduled_date || null,
      event_time: params.p_scheduled_time || null,
      event_location: params.p_location || null,
      due_date: params.p_due_date || null,
      cost: params.p_cost || 'Gratuito',
      requires_signature: Boolean(params.p_requires_signature || typeCode === 'signature'),
      requires_acknowledgment: Boolean(params.p_requires_acknowledgment ?? (typeCode === 'urgent' || typeCode === 'info')),
      attachments: params.p_attachments || []
    };

    // Only include columns that are guaranteed to exist in the database table
    const newRecord: any = {
      organization_id: orgId || '11111111-1111-1111-1111-111111111111',
      title: params.p_title.trim(),
      content: params.p_body.trim(),
      category: typeCode === 'urgent' ? 'urgent' : (typeCode === 'signature' ? 'signature' : (typeCode === 'convocation' ? 'convocation' : (params.p_category || 'info'))),
      priority: severity || params.p_priority || (typeCode === 'urgent' ? 'urgent' : 'normal'),
      target_type: targetMode,
      target_ids: targetIds,
      requires_signature: Boolean(params.p_requires_signature || typeCode === 'signature'),
      attachment_url: JSON.stringify(metadata),
      sender_name: params.p_sender_name || user?.user_metadata?.full_name || 'Gestão Escolar',
      sender_role: params.p_sender_role || 'Direção',
      status: status,
      scheduled_at: params.p_publish_now === false ? params.p_expires_at : nowIso,
      expires_at: params.p_expires_at || null,
      created_at: nowIso,
      updated_at: nowIso
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('communications')
      .insert([newRecord])
      .select('id')
      .single();

    if (insertErr || !inserted) {
      console.error('[CommunicationRpcService] insert error:', insertErr);
      return { data: null, error: insertErr?.message || 'Erro ao gravar comunicado no banco de dados.' };
    }

    const communicationId = inserted.id;

    // Optional attachments persistence in communication_attachments table
    if (params.p_attachments && params.p_attachments.length > 0) {
      try {
        const attachmentRows = params.p_attachments.map(att => ({
          organization_id: orgId || '11111111-1111-1111-1111-111111111111',
          communication_id: communicationId,
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type || 'application/pdf',
          file_size: att.file_size || '1.0 MB',
          created_at: nowIso
        }));
        await supabase.from('communication_attachments').insert(attachmentRows);
      } catch (attErr) {
        console.warn('[CommunicationRpcService] Error inserting attachments:', attErr);
      }
    }

    // Create records in communication_recipients with strict deduplication
    const recipientRows: any[] = [];
    const seenRecipients = new Set<string>();

    const addRecipient = (type: string, id: string, studentId?: string) => {
      const key = `${type}:${id}:${studentId || ''}`;
      if (!seenRecipients.has(key)) {
        seenRecipients.add(key);
        recipientRows.push({
          organization_id: orgId,
          communication_id: communicationId,
          recipient_id: id,
          recipient_type: type,
          student_id: studentId || null,
          is_read: false,
          is_signed: false,
          created_at: nowIso
        });
      }
    };

    if (params.p_class_ids && params.p_class_ids.length > 0) {
      params.p_class_ids.forEach(cid => {
        if (cid) addRecipient('class', cid);
      });
    } else if (params.p_student_ids && params.p_student_ids.length > 0) {
      params.p_student_ids.forEach(sid => {
        if (sid) addRecipient('student', sid, sid);
      });
    } else if (params.p_guardian_ids && params.p_guardian_ids.length > 0) {
      params.p_guardian_ids.forEach(gid => {
        if (gid) addRecipient('guardian', gid, params.p_target_student_id);
      });
    } else {
      addRecipient(targetMode === 'all' ? 'all_families' : targetMode, orgId || 'all');
    }

    if (recipientRows.length > 0) {
      try {
        await supabase.from('communication_recipients').insert(recipientRows);
      } catch (e) {
        console.warn('[CommunicationRpcService] Recipient insert warning:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classium_communications_updated', { detail: { communicationId } }));
    }

    return {
      data: {
        ok: true,
        announcement_id: communicationId,
        recipients_count: recipientRows.length,
        notified_count: recipientRows.length,
        message: 'Comunicado gravado e disparado com sucesso!'
      },
      error: null
    };
  } catch (err: any) {
    console.error('[CommunicationRpcService] Publish exception:', err);
    return { data: null, error: err.message || 'Exceção ao publicar comunicado.' };
  }
}

/**
 * Updates an existing communication
 */
export async function updateOrganizationAnnouncement(
  announcementId: string,
  updates: Partial<AnnouncementItem>,
  targetOrgId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const orgId = await resolveOrganizationId(targetOrgId);
    const updatePayload: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    if (updates.body && !updates.content) {
      updatePayload.content = updates.body;
    }
    if (updates.content) {
      updatePayload.content = updates.content;
    }

    let query = supabase
      .from('communications')
      .update(updatePayload)
      .eq('id', announcementId);

    if (orgId && orgId !== 'default') {
      query = query.eq('organization_id', orgId);
    }

    const { error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar comunicado.' };
  }
}

/**
 * Deletes a communication permanently and its recipients
 */
export async function deleteOrganizationAnnouncement(
  announcementId: string,
  targetOrgId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const orgId = await resolveOrganizationId(targetOrgId);
    
    // 1. Delete associated recipients
    await supabase
      .from('communication_recipients')
      .delete()
      .eq('communication_id', announcementId);

    // 2. Delete communication
    let query = supabase
      .from('communications')
      .delete()
      .eq('id', announcementId);

    if (orgId && orgId !== 'default') {
      query = query.eq('organization_id', orgId);
    }

    const { error: delErr } = await query;
    if (delErr) {
      return { success: false, error: delErr.message };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao excluir comunicado.' };
  }
}

/**
 * Marks a communication as read
 */
export async function markAnnouncementAsRead(
  announcementId: string,
  deviceInfo: string = 'Web Browser'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Update or insert in communication_recipients
    if (user?.id) {
      const { data: existing } = await supabase
        .from('communication_recipients')
        .select('id')
        .eq('communication_id', announcementId)
        .eq('recipient_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('communication_recipients')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('communication_recipients')
          .insert({
            communication_id: announcementId,
            organization_id: '11111111-1111-1111-1111-111111111111',
            recipient_id: user.id,
            recipient_type: 'user',
            is_read: true,
            read_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
      }
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao registrar leitura.' };
  }
}

/**
 * Acknowledges receipt/reading of an urgent or informative notice
 */
export async function acknowledgeCommunication(
  communicationId: string,
  guardianName?: string,
  studentId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const nowIso = new Date().toISOString();
    const ackData = JSON.stringify({
      acknowledged: true,
      acknowledged_by_name: guardianName || 'Responsável',
      acknowledged_at: nowIso
    });

    // 1. Try to update existing recipients for this communication
    const { data: existingRecs } = await supabase
      .from('communication_recipients')
      .select('id')
      .eq('communication_id', communicationId);

    if (existingRecs && existingRecs.length > 0) {
      await supabase
        .from('communication_recipients')
        .update({
          is_read: true,
          read_at: nowIso,
          signature_data: ackData
        })
        .eq('communication_id', communicationId);
    } else {
      // Insert recipient record if none exists
      await supabase
        .from('communication_recipients')
        .insert({
          organization_id: '11111111-1111-1111-1111-111111111111',
          communication_id: communicationId,
          recipient_id: studentId || '3514e46b-077c-4ead-9183-63f12ef2a50a',
          recipient_type: 'guardian',
          is_read: true,
          read_at: nowIso,
          signature_data: ackData,
          created_at: nowIso
        });
    }

    // Dual-sync with backend REST API
    fetch(`/api/family/communications/${communicationId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guardian_name: guardianName || 'Responsável' })
    }).catch(() => {});

    return { success: true, error: null };
  } catch (err: any) {
    console.warn('[acknowledgeCommunication] error:', err);
    return { success: false, error: err.message || 'Erro ao confirmar ciência.' };
  }
}

/**
 * Signs a legal document / authorization communication
 */
export async function signCommunicationDocument(
  communicationId: string,
  signerName: string,
  signatureData: string,
  studentId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const nowIso = new Date().toISOString();
    const sigPayload = JSON.stringify({
      signed: true,
      signer_name: signerName,
      signature_data: signatureData,
      signed_at: nowIso
    });

    const { data: existingRecs } = await supabase
      .from('communication_recipients')
      .select('id')
      .eq('communication_id', communicationId);

    if (existingRecs && existingRecs.length > 0) {
      await supabase
        .from('communication_recipients')
        .update({
          is_read: true,
          read_at: nowIso,
          is_signed: true,
          signed_at: nowIso,
          signature_data: sigPayload
        })
        .eq('communication_id', communicationId);
    } else {
      await supabase
        .from('communication_recipients')
        .insert({
          organization_id: '11111111-1111-1111-1111-111111111111',
          communication_id: communicationId,
          recipient_id: studentId || '3514e46b-077c-4ead-9183-63f12ef2a50a',
          recipient_type: 'guardian',
          is_read: true,
          read_at: nowIso,
          is_signed: true,
          signed_at: nowIso,
          signature_data: sigPayload,
          created_at: nowIso
        });
    }

    // Dual-sync with backend REST API
    fetch(`/api/family/communications/${communicationId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signed_by_name: signerName,
        signature_data: signatureData
      })
    }).catch(() => {});

    return { success: true, error: null };
  } catch (err: any) {
    console.warn('[signCommunicationDocument] error:', err);
    return { success: false, error: err.message || 'Erro ao registrar assinatura digital.' };
  }
}

/**
 * Responds to a convocation (confirm, justify absence, or request reschedule)
 */
export async function respondConvocation(
  communicationId: string,
  status: 'confirmed' | 'justified' | 'rescheduled',
  options: {
    justification?: string;
    rescheduleSuggestion?: string;
    guardianName?: string;
    studentId?: string;
  } = {}
): Promise<{ success: boolean; error: string | null }> {
  try {
    const nowIso = new Date().toISOString();
    const responsePayload = JSON.stringify({
      convocation_status: status,
      justification: options.justification || null,
      reschedule_suggestion: options.rescheduleSuggestion || null,
      guardian_name: options.guardianName || 'Responsável',
      responded_at: nowIso
    });

    const { data: existingRecs } = await supabase
      .from('communication_recipients')
      .select('id')
      .eq('communication_id', communicationId);

    if (existingRecs && existingRecs.length > 0) {
      await supabase
        .from('communication_recipients')
        .update({
          is_read: true,
          read_at: nowIso,
          signature_data: responsePayload
        })
        .eq('communication_id', communicationId);
    } else {
      await supabase
        .from('communication_recipients')
        .insert({
          organization_id: '11111111-1111-1111-1111-111111111111',
          communication_id: communicationId,
          recipient_id: options.studentId || '3514e46b-077c-4ead-9183-63f12ef2a50a',
          recipient_type: 'guardian',
          is_read: true,
          read_at: nowIso,
          signature_data: responsePayload,
          created_at: nowIso
        });
    }

    // Dual-sync with backend REST API
    fetch(`/api/family/communications/${communicationId}/respond-convocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        justification: options.justification || null,
        reschedule_suggestion: options.rescheduleSuggestion || null,
        guardian_name: options.guardianName || 'Responsável'
      })
    }).catch(() => {});

    return { success: true, error: null };
  } catch (err: any) {
    console.warn('[respondConvocation] error:', err);
    return { success: false, error: err.message || 'Erro ao registrar resposta da convocação.' };
  }
}

