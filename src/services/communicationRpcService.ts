import { supabase } from '../lib/supabase';
import { resolveOrgId, NO_SCHOOL_ERROR, friendlyDbError, isUuid } from './tenant';

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
  students_without_guardian?: number;
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
  /** Data e hora do envio agendado (ISO). Usado quando p_publish_now = false. */
  p_scheduled_at?: string | null;
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

type OpResult = { success: boolean; error: string | null };

interface GuardianRow {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  user_id?: string | null;
  profile_id?: string | null;
}

interface RecipientRow {
  organization_id: string;
  communication_id: string;
  recipient_id: string;
  recipient_type: string;
  student_id: string | null;
  guardian_id: string | null;
  profile_id: string | null;
  is_read: boolean;
  is_signed: boolean;
}

function guardianFromJoin(raw: any): GuardianRow | null {
  const g = Array.isArray(raw) ? raw[0] : raw;
  if (!g?.id) return null;
  return {
    id: g.id,
    name: g.full_name || g.name || '',
    email: g.email || undefined,
    phone: g.phone || undefined,
    user_id: g.user_id || null,
    profile_id: g.profile_id || null,
  };
}

/** Turmas, estudantes e responsáveis da escola, com os vínculos reais (sem nomes ou telefones inventados) */
export async function fetchCommunicationAudience(
  targetOrgId?: string
): Promise<{ data: CommunicationAudienceData | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(targetOrgId);
    if (!orgId) return { data: null, error: NO_SCHOOL_ERROR };

    const [cRes, sRes, gRes, lRes] = await Promise.all([
      supabase.from('classes').select('id, name, grade, shift').eq('organization_id', orgId).order('name'),
      supabase.from('students').select('id, full_name, name, registration_code, class_id, status').eq('organization_id', orgId).order('full_name'),
      supabase.from('guardians').select('id, full_name, name, email, phone, user_id, profile_id').eq('organization_id', orgId).order('full_name'),
      supabase.from('student_responsible_links').select('student_id, guardian_id, relationship, is_primary_contact').eq('organization_id', orgId),
    ]);

    const firstError = cRes.error || sRes.error || gRes.error;
    if (firstError) return { data: null, error: friendlyDbError(firstError.message, 'Não foi possível carregar turmas e famílias.') };

    const classes: AudienceClass[] = (cRes.data || []).map((c: any) => ({ id: c.id, name: c.name, grade: c.grade || undefined, shift: c.shift || undefined }));
    const classById = new Map(classes.map(c => [c.id, c]));

    const guardianById = new Map<string, GuardianRow>();
    (gRes.data || []).forEach((g: any) => {
      guardianById.set(g.id, {
        id: g.id,
        name: g.full_name || g.name || '',
        email: g.email || undefined,
        phone: g.phone || undefined,
        user_id: g.user_id,
        profile_id: g.profile_id,
      });
    });

    const linksByStudent = new Map<string, any[]>();
    const childrenByGuardian = new Map<string, string[]>();
    (lRes.data || []).forEach((l: any) => {
      if (!l.student_id || !l.guardian_id) return;
      linksByStudent.set(l.student_id, [...(linksByStudent.get(l.student_id) || []), l]);
      childrenByGuardian.set(l.guardian_id, [...(childrenByGuardian.get(l.guardian_id) || []), l.student_id]);
    });

    const studentRows = (sRes.data || []).filter((s: any) => !s.status || !['inativo', 'transferido', 'inactive'].includes(String(s.status).toLowerCase()));
    const studentById = new Map<string, any>(studentRows.map((s: any) => [s.id, s]));

    const students: AudienceStudent[] = studentRows.map((s: any) => {
      const links = (linksByStudent.get(s.id) || []).sort((a, b) => Number(b.is_primary_contact) - Number(a.is_primary_contact));
      const guardians: AudienceStudentGuardian[] = links
        .map(l => guardianById.get(l.guardian_id))
        .filter((g): g is GuardianRow => !!g)
        .map(g => ({ id: g.id, name: g.name, email: g.email, phone: g.phone, profile_id: g.profile_id || g.user_id || undefined, can_receive_app: !!(g.profile_id || g.user_id) }));
      const primary = guardians[0];

      return {
        id: s.id,
        name: s.full_name || s.name || '',
        registration_code: s.registration_code || undefined,
        class_id: s.class_id || undefined,
        class_name: s.class_id ? classById.get(s.class_id)?.name : undefined,
        guardian_id: primary?.id,
        guardian_name: primary?.name,
        guardian_phone: primary?.phone,
        guardian_email: primary?.email,
        guardian_relationship: links[0]?.relationship || undefined,
        guardians,
      };
    });

    classes.forEach(c => { c.students_count = students.filter(s => s.class_id === c.id).length; });

    const guardians: AudienceGuardian[] = Array.from(guardianById.values()).map(g => ({
      id: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      profile_id: g.profile_id || g.user_id || undefined,
      can_receive_app: !!(g.profile_id || g.user_id),
      children: (childrenByGuardian.get(g.id) || [])
        .map(id => studentById.get(id))
        .filter(Boolean)
        .map((s: any) => ({ id: s.id, name: s.full_name || s.name || '', class_id: s.class_id || undefined, class_name: s.class_id ? classById.get(s.class_id)?.name : undefined })),
    }));

    return {
      data: {
        ok: true,
        org_id: orgId,
        organization_id: orgId,
        classes,
        students,
        guardians,
        totals: {
          total_classes: classes.length,
          total_students: students.length,
          total_guardians: guardians.length,
          app_enabled_guardians: guardians.filter(g => g.can_receive_app).length,
          skipped_no_profile_guardians: guardians.filter(g => !g.can_receive_app).length,
          students_without_guardian: students.filter(s => !s.guardians || s.guardians.length === 0).length,
        },
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[CommunicationRpcService] fetchCommunicationAudience:', err);
    return { data: null, error: friendlyDbError(err?.message, 'Não foi possível carregar turmas e famílias.') };
  }
}

function parseMeta(c: any): Record<string, any> {
  if (c.metadata && typeof c.metadata === 'object' && Object.keys(c.metadata).length > 0) return c.metadata;
  if (typeof c.attachment_url === 'string' && c.attachment_url.startsWith('{')) {
    try { return JSON.parse(c.attachment_url); } catch { return {}; }
  }
  return {};
}

function mapCommunication(c: any): AnnouncementItem {
  const meta = parseMeta(c);
  const statusStr = String(c.status || 'published').toLowerCase();
  let status: AnnouncementItem['status'] = 'published';
  if (statusStr === 'draft' || statusStr === 'rascunho') status = 'draft';
  else if (statusStr === 'scheduled' || statusStr === 'agendado') status = 'scheduled';
  else if (statusStr === 'expired' || statusStr === 'expirado') status = 'expired';
  if (status === 'published' && c.expires_at && new Date(c.expires_at).getTime() < Date.now()) status = 'expired';

  const category = String(c.category || '').toLowerCase();
  const priority = String(c.priority || '').toUpperCase();
  const typeCode = meta.type_code || c.type_code || (
    c.requires_signature ? 'signature'
      : category.includes('urg') || priority.includes('EMERG') || priority.includes('URG') ? 'urgent'
      : category.includes('convoc') || category.includes('reuni') ? 'convocation'
      : 'info'
  );

  const severity = meta.severity || c.severity || (
    priority.includes('EMERG') ? 'EMERGÊNCIA' : priority.includes('ATEN') ? 'ATENÇÃO' : typeCode === 'urgent' ? 'EMERGÊNCIA' : 'INFORMATIVO'
  );

  return {
    id: c.id,
    organization_id: c.organization_id,
    school_id: c.organization_id,
    title: c.title || 'Comunicado sem título',
    body: c.content || c.body || '',
    content: c.content || c.body || '',
    category: c.category || undefined,
    type_code: typeCode,
    severity,
    target: c.target_type || c.target_mode || 'all',
    target_type: c.target_type || c.target_mode || 'all',
    target_ids: c.target_ids || [],
    target_student_id: meta.target_student_id || undefined,
    target_student_name: meta.target_student_name || undefined,
    target_student_label: meta.target_student_label || undefined,
    location: meta.event_location || meta.location || undefined,
    scheduled_date: meta.event_date || meta.scheduled_date || undefined,
    scheduled_time: meta.event_time || meta.scheduled_time || undefined,
    due_date: meta.due_date || undefined,
    cost: meta.cost || undefined,
    sender_name: c.sender_name || undefined,
    sender_role: c.sender_role || undefined,
    author_name: c.sender_name || undefined,
    priority: c.priority || 'normal',
    status,
    requires_signature: Boolean(c.requires_signature || meta.requires_signature),
    requires_acknowledgment: Boolean(c.requires_acknowledgment ?? meta.requires_acknowledgment),
    published_at: c.published_at || c.sent_at || c.scheduled_at || c.created_at,
    expires_at: c.expires_at || null,
    created_at: c.created_at,
    updated_at: c.updated_at,
    reads_count: 0,
    confirmations_count: 0,
    total_recipients: Number(c.recipients_count) || 0,
    attachments: Array.isArray(meta.attachments) ? meta.attachments : [],
  };
}

/** Lista os comunicados da escola com leituras e assinaturas reais */
export async function fetchOrganizationAnnouncements(
  targetOrgId?: string
): Promise<{ data: FetchAnnouncementsResult | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(targetOrgId);
    if (!orgId) return { data: null, error: NO_SCHOOL_ERROR };

    const { data: rows, error } = await supabase
      .from('communications')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: friendlyDbError(error.message, 'Não foi possível carregar os comunicados.') };

    const items: AnnouncementItem[] = ((rows || []) as any[]).map(mapCommunication);

    if (items.length > 0) {
      const { data: recData, error: recErr } = await supabase
        .from('communication_recipients')
        .select('communication_id, is_read, is_signed, acknowledged_at')
        .in('communication_id', items.map(i => i.id));

      if (recErr) {
        console.warn('[CommunicationRpcService] Leituras não carregadas:', recErr.message);
      } else {
        const stats = new Map<string, { total: number; reads: number; confirmed: number }>();
        (recData || []).forEach((r: any) => {
          const s = stats.get(r.communication_id) || { total: 0, reads: 0, confirmed: 0 };
          s.total++;
          if (r.is_read) s.reads++;
          if (r.is_signed || r.acknowledged_at) s.confirmed++;
          stats.set(r.communication_id, s);
        });
        items.forEach(i => {
          const s = stats.get(i.id);
          if (s) {
            i.total_recipients = s.total;
            i.reads_count = s.reads;
            i.confirmations_count = s.confirmed;
          }
        });
      }
    }

    const { data: canManage } = await supabase.rpc('is_org_staff', { p_org_id: orgId });

    return {
      data: { ok: true, items, total: items.length, can_manage: canManage === true, organization_id: orgId },
      error: null,
    };
  } catch (err: any) {
    console.error('[CommunicationRpcService] fetchOrganizationAnnouncements:', err);
    return { data: null, error: friendlyDbError(err?.message, 'Não foi possível carregar os comunicados.') };
  }
}

/** Monta a lista de quem recebe: um registro por responsável e estudante */
async function buildRecipients(orgId: string, communicationId: string, params: PublishAnnouncementParams): Promise<RecipientRow[]> {
  const mode = params.p_mode || 'all';
  const rows: RecipientRow[] = [];
  const seen = new Set<string>();

  const push = (type: string, recipientId: string, opts: { studentId?: string | null; guardianId?: string | null; profileId?: string | null }) => {
    const key = `${type}:${recipientId}:${opts.studentId || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      organization_id: orgId,
      communication_id: communicationId,
      recipient_id: recipientId,
      recipient_type: type,
      student_id: opts.studentId || null,
      guardian_id: opts.guardianId || null,
      profile_id: opts.profileId || null,
      is_read: false,
      is_signed: false,
    });
  };

  const wantsFamilies = !['staff', 'all_professionals'].includes(mode);
  const wantsStaff = ['all', 'staff', 'all_professionals'].includes(mode);

  if (wantsFamilies) {
    if (mode === 'guardians' && params.p_guardian_ids?.length) {
      const { data, error } = await supabase
        .from('guardians')
        .select('id, full_name, name, user_id, profile_id')
        .in('id', params.p_guardian_ids.filter(isUuid));
      if (error) throw new Error(friendlyDbError(error.message));
      const studentId = isUuid(params.p_target_student_id) ? params.p_target_student_id : null;
      (data || []).forEach((g: any) => push('guardian', g.id, { guardianId: g.id, profileId: g.profile_id || g.user_id, studentId }));
    } else {
      let studentIds: string[] | null = null;

      if (mode === 'classes' && params.p_class_ids?.length) {
        const { data, error } = await supabase
          .from('students')
          .select('id')
          .eq('organization_id', orgId)
          .in('class_id', params.p_class_ids.filter(isUuid));
        if (error) throw new Error(friendlyDbError(error.message));
        studentIds = (data || []).map((s: any) => s.id);
      } else if (mode === 'students' && params.p_student_ids?.length) {
        studentIds = params.p_student_ids.filter(isUuid);
      }

      let linkQuery = supabase
        .from('student_responsible_links')
        .select('student_id, guardian_id, guardians ( id, full_name, name, user_id, profile_id )')
        .eq('organization_id', orgId);
      if (studentIds) {
        if (studentIds.length === 0) return rows;
        linkQuery = linkQuery.in('student_id', studentIds);
      }

      const { data: links, error } = await linkQuery;
      if (error) throw new Error(friendlyDbError(error.message));

      (links || []).forEach((l: any) => {
        const g = guardianFromJoin(l.guardians);
        if (g) push('guardian', g.id, { guardianId: g.id, profileId: g.profile_id || g.user_id, studentId: l.student_id });
      });
    }
  }

  if (wantsStaff) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('organization_id', orgId)
      .eq('is_active', true);
    if (error) throw new Error(friendlyDbError(error.message));
    (data || [])
      .filter((m: any) => m.user_id && !['familia', 'família', 'responsavel', 'responsável', 'guardian', 'family', 'aluno', 'student'].includes(String(m.role || '').toLowerCase()))
      .forEach((m: any) => push('staff', m.user_id, { profileId: m.user_id }));
  }

  return rows;
}

/** Grava o comunicado e a lista de destinatários. Se a lista falhar, o comunicado é desfeito. */
export async function publishOrganizationAnnouncement(
  params: PublishAnnouncementParams
): Promise<{ data: PublishAnnouncementResult | null; error: string | null }> {
  try {
    const orgId = await resolveOrgId(params.organization_id);
    if (!orgId) return { data: null, error: NO_SCHOOL_ERROR };
    if (!params.p_title?.trim()) return { data: null, error: 'Informe o título do comunicado.' };
    if (!params.p_body?.trim()) return { data: null, error: 'Escreva a mensagem do comunicado.' };

    const { data: { user } } = await supabase.auth.getUser();

    const mode = params.p_mode || 'all';
    if (mode === 'classes' && !params.p_class_ids?.length) return { data: null, error: 'Escolha pelo menos uma turma.' };
    if (mode === 'students' && !params.p_student_ids?.length) return { data: null, error: 'Escolha pelo menos um estudante.' };
    if (mode === 'guardians' && !params.p_guardian_ids?.length) return { data: null, error: 'Escolha pelo menos um responsável.' };

    const scheduled = params.p_publish_now === false;
    const scheduledAt = scheduled ? (params.p_scheduled_at || null) : null;
    if (scheduled && !scheduledAt) return { data: null, error: 'Informe a data e a hora do envio agendado.' };

    const status = params.p_status || (scheduled ? 'scheduled' : 'published');
    const now = new Date().toISOString();
    const typeCode = params.p_type_code || (params.p_requires_signature ? 'signature' : 'info');
    const severity = params.p_severity || (typeCode === 'urgent' ? 'EMERGÊNCIA' : 'INFORMATIVO');
    const requiresSignature = Boolean(params.p_requires_signature || typeCode === 'signature');
    const requiresAck = Boolean(params.p_requires_acknowledgment ?? params.p_requires_confirmation ?? typeCode === 'urgent');

    const metadata = {
      type_code: typeCode,
      severity,
      target_student_id: params.p_target_student_id || null,
      target_student_name: params.p_target_student_name || null,
      target_student_label: params.p_target_student_label || null,
      event_date: params.p_scheduled_date || null,
      event_time: params.p_scheduled_time || null,
      event_location: params.p_location || null,
      due_date: params.p_due_date || null,
      cost: params.p_cost || null,
      requires_signature: requiresSignature,
      requires_acknowledgment: requiresAck,
      attachments: params.p_attachments || [],
    };

    const classIds = (params.p_class_ids || []).filter(isUuid);
    const studentIds = (params.p_student_ids || []).filter(isUuid);
    const guardianIds = (params.p_guardian_ids || []).filter(isUuid);

    const { data: inserted, error: insertErr } = await supabase
      .from('communications')
      .insert([{
        organization_id: orgId,
        title: params.p_title.trim(),
        content: params.p_body.trim(),
        category: typeCode === 'info' ? (params.p_category || 'info') : typeCode,
        priority: params.p_priority || severity,
        type_code: typeCode,
        severity,
        target_type: mode,
        target_mode: mode,
        target_ids: [...classIds, ...studentIds, ...guardianIds],
        class_ids: classIds,
        student_ids: studentIds,
        guardian_ids: guardianIds,
        requires_signature: requiresSignature,
        requires_acknowledgment: requiresAck,
        attachment_url: JSON.stringify(metadata),
        metadata,
        sender_name: params.p_sender_name || user?.user_metadata?.full_name || null,
        sender_role: params.p_sender_role || null,
        status,
        scheduled_at: scheduledAt,
        published_at: status === 'published' ? now : null,
        sent_at: status === 'published' ? now : null,
        expires_at: params.p_expires_at || null,
      }])
      .select('id')
      .single();

    if (insertErr || !inserted) {
      return { data: null, error: friendlyDbError(insertErr?.message, 'Não foi possível gravar o comunicado.') };
    }

    const communicationId = inserted.id;
    const rollback = async () => { await supabase.from('communications').delete().eq('id', communicationId); };

    let recipients: RecipientRow[];
    try {
      recipients = await buildRecipients(orgId, communicationId, params);
    } catch (err: any) {
      await rollback();
      return { data: null, error: err?.message || 'Não foi possível montar a lista de destinatários.' };
    }

    for (let i = 0; i < recipients.length; i += 500) {
      const { error: recErr } = await supabase.from('communication_recipients').insert(recipients.slice(i, i + 500));
      if (recErr) {
        await rollback();
        return { data: null, error: friendlyDbError(recErr.message, 'Não foi possível registrar os destinatários. O comunicado não foi enviado.') };
      }
    }

    if (params.p_attachments?.length) {
      const { error: attErr } = await supabase.from('communication_attachments').insert(
        params.p_attachments.map(att => ({
          organization_id: orgId,
          communication_id: communicationId,
          file_name: att.file_name,
          file_url: att.file_url,
          file_type: att.file_type || att.mime_type || null,
          file_size: att.file_size || null,
        }))
      );
      if (attErr) console.warn('[CommunicationRpcService] Anexos não registrados à parte:', attErr.message);
    }

    await supabase.from('communications').update({ recipients_count: recipients.length }).eq('id', communicationId);

    const withApp = recipients.filter(r => r.profile_id).length;
    const withoutApp = recipients.length - withApp;

    let message: string;
    if (recipients.length === 0) {
      message = 'Comunicado salvo, mas ninguém foi encontrado para receber. Confira se os estudantes têm responsáveis vinculados.';
    } else if (status === 'scheduled') {
      message = `Comunicado agendado para ${recipients.length} destinatário(s).`;
    } else if (withoutApp > 0) {
      message = `Comunicado enviado para ${recipients.length} destinatário(s). ${withoutApp} ainda não têm acesso ao aplicativo.`;
    } else {
      message = `Comunicado enviado para ${recipients.length} destinatário(s).`;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classium_communications_updated', { detail: { communicationId } }));
    }

    return {
      data: {
        ok: true,
        announcement_id: communicationId,
        recipients_count: recipients.length,
        notified_count: withApp,
        skipped_no_profile_count: withoutApp,
        message,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[CommunicationRpcService] publishOrganizationAnnouncement:', err);
    return { data: null, error: friendlyDbError(err?.message, 'Não foi possível publicar o comunicado.') };
  }
}

/** Atualiza só os campos que existem na tabela */
export async function updateOrganizationAnnouncement(
  announcementId: string,
  updates: Partial<AnnouncementItem>,
  targetOrgId?: string
): Promise<OpResult> {
  try {
    const orgId = await resolveOrgId(targetOrgId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };

    const payload: Record<string, any> = {};
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.content !== undefined || updates.body !== undefined) payload.content = (updates.content ?? updates.body ?? '').trim();
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.severity !== undefined) payload.severity = updates.severity;
    if (updates.type_code !== undefined) payload.type_code = updates.type_code;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.expires_at !== undefined) payload.expires_at = updates.expires_at;
    if (updates.requires_signature !== undefined) payload.requires_signature = updates.requires_signature;
    if (updates.requires_acknowledgment !== undefined) payload.requires_acknowledgment = updates.requires_acknowledgment;
    if (updates.sender_name !== undefined) payload.sender_name = updates.sender_name;
    if (updates.sender_role !== undefined) payload.sender_role = updates.sender_role;

    if (Object.keys(payload).length === 0) return { success: true, error: null };

    const { data, error } = await supabase
      .from('communications')
      .update(payload)
      .eq('id', announcementId)
      .eq('organization_id', orgId)
      .select('id');

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível salvar o comunicado.') };
    if (!data || data.length === 0) return { success: false, error: 'Comunicado não encontrado ou sem permissão.' };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: friendlyDbError(err?.message, 'Não foi possível salvar o comunicado.') };
  }
}

export async function deleteOrganizationAnnouncement(announcementId: string, targetOrgId?: string): Promise<OpResult> {
  try {
    const orgId = await resolveOrgId(targetOrgId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };

    await supabase.from('communication_recipients').delete().eq('communication_id', announcementId);

    const { data, error } = await supabase
      .from('communications')
      .delete()
      .eq('id', announcementId)
      .eq('organization_id', orgId)
      .select('id');

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível excluir o comunicado.') };
    if (!data || data.length === 0) return { success: false, error: 'Comunicado não encontrado ou sem permissão.' };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: friendlyDbError(err?.message, 'Não foi possível excluir o comunicado.') };
  }
}

/**
 * Apaga comunicados com mais de 30 dias. Só roda quando a gestão pede
 * (antes rodava sozinho toda vez que a lista abria).
 */
export async function purgeExpiredCommunications(
  targetOrgId?: string
): Promise<{ success: boolean; purged_count: number; error: string | null }> {
  try {
    const orgId = await resolveOrgId(targetOrgId);
    if (!orgId) return { success: false, purged_count: 0, error: NO_SCHOOL_ERROR };

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: old, error: qErr } = await supabase
      .from('communications')
      .select('id')
      .eq('organization_id', orgId)
      .lt('created_at', cutoff);

    if (qErr) return { success: false, purged_count: 0, error: friendlyDbError(qErr.message) };
    const ids = (old || []).map((r: any) => r.id);
    if (ids.length === 0) return { success: true, purged_count: 0, error: null };

    await supabase.from('communication_recipients').delete().in('communication_id', ids);
    const { data: deleted, error: delErr } = await supabase
      .from('communications')
      .delete()
      .in('id', ids)
      .select('id');

    if (delErr) return { success: false, purged_count: 0, error: friendlyDbError(delErr.message, 'Não foi possível apagar os comunicados antigos.') };
    return { success: true, purged_count: deleted?.length || 0, error: null };
  } catch (err: any) {
    return { success: false, purged_count: 0, error: friendlyDbError(err?.message) };
  }
}

/* ------------------------------------------------------------------ */
/* Lado da família: leitura, ciência, assinatura e resposta            */
/* ------------------------------------------------------------------ */

/**
 * Atualiza só os registros do próprio usuário para este comunicado.
 * Se ele não estava na lista (comunicado geral), cria o registro dele.
 */
async function updateMyReceipt(communicationId: string, changes: Record<string, any>, studentId?: string): Promise<OpResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { success: false, error: 'Sua sessão expirou. Entre de novo.' };

  const { data: myGuardians } = await supabase
    .from('guardians')
    .select('id')
    .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`);
  const guardianIds = (myGuardians || []).map((g: any) => g.id);

  const ors = [`recipient_id.eq.${user.id}`, `profile_id.eq.${user.id}`];
  if (guardianIds.length > 0) ors.push(`guardian_id.in.(${guardianIds.join(',')})`);

  let query = supabase
    .from('communication_recipients')
    .update(changes)
    .eq('communication_id', communicationId)
    .or(ors.join(','));
  if (isUuid(studentId)) query = query.eq('student_id', studentId);

  const { data: updated, error } = await query.select('id');
  if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível registrar sua resposta.') };
  if (updated && updated.length > 0) return { success: true, error: null };

  const { data: comm, error: commErr } = await supabase
    .from('communications')
    .select('organization_id')
    .eq('id', communicationId)
    .maybeSingle();
  if (commErr || !comm) return { success: false, error: 'Comunicado não encontrado.' };

  const { error: insErr } = await supabase.from('communication_recipients').insert({
    organization_id: comm.organization_id,
    communication_id: communicationId,
    recipient_id: user.id,
    recipient_type: 'guardian',
    profile_id: user.id,
    guardian_id: guardianIds[0] || null,
    student_id: isUuid(studentId) ? studentId : null,
    ...changes,
  });
  if (insErr) return { success: false, error: friendlyDbError(insErr.message, 'Não foi possível registrar sua resposta.') };
  return { success: true, error: null };
}

export async function markAnnouncementAsRead(announcementId: string, _deviceInfo = 'Navegador'): Promise<OpResult> {
  return updateMyReceipt(announcementId, { is_read: true, read_at: new Date().toISOString() });
}

export async function acknowledgeCommunication(communicationId: string, guardianName?: string, studentId?: string): Promise<OpResult> {
  const now = new Date().toISOString();
  return updateMyReceipt(communicationId, {
    is_read: true,
    read_at: now,
    acknowledged_at: now,
    signature_data: JSON.stringify({ acknowledged: true, acknowledged_by_name: guardianName || null, acknowledged_at: now }),
  }, studentId);
}

export async function signCommunicationDocument(
  communicationId: string,
  signerName: string,
  signatureData: string,
  studentId?: string
): Promise<OpResult> {
  if (!signerName?.trim()) return { success: false, error: 'Informe o nome de quem está assinando.' };
  if (!signatureData) return { success: false, error: 'Faça a assinatura antes de enviar.' };

  const now = new Date().toISOString();
  return updateMyReceipt(communicationId, {
    is_read: true,
    read_at: now,
    is_signed: true,
    signed_at: now,
    signature_data: JSON.stringify({ signed: true, signer_name: signerName.trim(), signature_data: signatureData, signed_at: now }),
  }, studentId);
}

export async function respondConvocation(
  communicationId: string,
  status: 'confirmed' | 'justified' | 'rescheduled',
  options: { justification?: string; rescheduleSuggestion?: string; guardianName?: string; studentId?: string } = {}
): Promise<OpResult> {
  if (status === 'justified' && !options.justification?.trim()) {
    return { success: false, error: 'Escreva o motivo da ausência.' };
  }
  if (status === 'rescheduled' && !options.rescheduleSuggestion?.trim()) {
    return { success: false, error: 'Sugira uma nova data ou horário.' };
  }

  const now = new Date().toISOString();
  return updateMyReceipt(communicationId, {
    is_read: true,
    read_at: now,
    acknowledged_at: status === 'confirmed' ? now : null,
    signature_data: JSON.stringify({
      convocation_status: status,
      justification: options.justification?.trim() || null,
      reschedule_suggestion: options.rescheduleSuggestion?.trim() || null,
      guardian_name: options.guardianName || null,
      responded_at: now,
    }),
  }, options.studentId);
}