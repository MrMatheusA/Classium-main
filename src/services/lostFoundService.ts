import { supabase } from '../lib/supabase';
import { integrationHub } from '../lib/integrationHub';
import { resolveOrgId, NO_SCHOOL_ERROR, safeFileName, friendlyDbError, isUuid, todayLocalISO } from './tenant';

const BUCKET = 'lost_and_found_images';
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export interface LostAndFoundDbItem {
  id: string;
  name: string;
  title?: string;
  item_name?: string;
  category: string;
  description: string;
  location_found?: string;
  found_location?: string;
  location?: string;
  found_date?: string;
  date_found?: string;
  found_time?: string;
  status: 'disponivel' | 'reservado' | 'entregue' | 'arquivado' | 'available' | 'reserved' | 'returned' | 'discarded';
  raw_status?: string;
  photo_url?: string;
  image_url?: string;
  registered_by?: string;
  registered_by_name?: string;
  setor?: string;
  organization_id?: string;
  school_id?: string;
  claimed_by_name?: string;
  claimed_by_student_id?: string;
  claimed_at?: string;
  delivered_date?: string;
  delivered_by?: string;
  delivered_by_staff?: string;
  delivery_notes?: string;
  created_at?: string;
  updated_at?: string;
  reservation?: {
    id?: string;
    student_id?: string;
    responsible_name: string;
    student_name: string;
    student_grade?: string;
    responsible_phone?: string;
    reservation_date: string;
    reservation_time?: string;
    status: string;
  } | null;
}

/**
 * Mantido só para as telas que ainda importam estes nomes.
 * Não há mais fotos de exemplo: objeto sem foto aparece sem foto.
 */
export const DEFAULT_PHOTOS: Record<string, string | undefined> = {};
export const SAMPLE_LOST_FOUND_PHOTOS: Array<{ label: string; url: string; category: string }> = [];

type Result = { success: boolean; error?: string };
type DataResult = { success: boolean; data?: any; error?: string };

export function normalizeStatus(rawStatus?: string): 'disponivel' | 'reservado' | 'entregue' | 'arquivado' {
  if (!rawStatus) return 'disponivel';
  const st = rawStatus.toLowerCase().trim();
  if (st.includes('reser') || st.includes('aguardando') || st.includes('pendent')) return 'reservado';
  if (st.includes('entreg') || st.includes('confirm') || st.includes('returned') || st.includes('devolvido')) return 'entregue';
  if (st.includes('arq') || st.includes('discard') || st.includes('lixeira')) return 'arquivado';
  return 'disponivel';
}

export function parseClaimedName(claimedName?: string | null) {
  if (!claimedName) return { responsible: '', student: '', grade: '', phone: '' };

  let phone = '';
  let rest = claimedName;
  if (rest.includes(' - Tel: ')) {
    const parts = rest.split(' - Tel: ');
    rest = parts[0];
    phone = parts[1] || '';
  }

  let responsible = '';
  let studentWithGrade = rest;
  if (rest.includes(' - Solicitado por ')) {
    const parts = rest.split(' - Solicitado por ');
    studentWithGrade = parts[0];
    responsible = parts[1] || '';
  }

  let student = studentWithGrade;
  let grade = '';
  const match = studentWithGrade.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    student = match[1].trim();
    grade = match[2].trim();
  }

  return { responsible, student, grade, phone };
}

function toBrDate(raw?: string | null): string {
  if (!raw) return '';
  const datePart = raw.split('T')[0];
  const [y, m, d] = datePart.split('-');
  return y && m && d ? `${d}/${m}/${y}` : raw;
}

function toBrTime(raw?: string | null): string {
  if (!raw) return '';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function publish(event: Record<string, any>) {
  try {
    integrationHub.publishEvent(event as any);
  } catch (err) {
    console.warn('[LostAndFoundService] Aviso em tempo real não enviado:', err);
  }
}

export class LostAndFoundService {
  /**
   * Envia a foto para o espaço da escola. Se falhar, lança o erro: a tela avisa e
   * o objeto não é salvo com uma foto que não existe.
   */
  static async uploadPhoto(file: File, schoolId?: string): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Envie uma imagem (PNG, JPG ou WEBP).');
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error('A foto passa de 10 MB. Tire outra ou reduza o tamanho.');
    }

    const orgId = await resolveOrgId(schoolId);
    if (!orgId) throw new Error(NO_SCHOOL_ERROR);

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${orgId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeFileName(`objeto.${ext}`)}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível enviar a foto. Tente de novo.'));

    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /** Objetos da escola. Lança erro se a consulta falhar. */
  static async getItems(schoolIdOrOrgId?: string): Promise<LostAndFoundDbItem[]> {
    const orgId = await resolveOrgId(schoolIdOrOrgId && schoolIdOrOrgId !== 'all' ? schoolIdOrOrgId : undefined);
    if (!orgId) throw new Error(NO_SCHOOL_ERROR);

    const { data, error } = await supabase
      .from('lost_and_found_items')
      .select('*, lost_and_found_reservations (*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível carregar os objetos.'));
    return (data || []).map(LostAndFoundService.mapDbRowToItem);
  }

  static mapDbRowToItem(row: any): LostAndFoundDbItem {
    const title = row.title || row.name || row.item_name || 'Objeto sem nome';
    const normStatus = normalizeStatus(row.status);
    const photoUrl = row.photo_url || row.image_url || undefined;
    const location = row.location_found || row.found_location || row.location || '';

    const parsed = parseClaimedName(row.claimed_by_name);
    const res = Array.isArray(row.lost_and_found_reservations) && row.lost_and_found_reservations.length > 0
      ? row.lost_and_found_reservations[0]
      : (row.lost_and_found_reservations && !Array.isArray(row.lost_and_found_reservations) ? row.lost_and_found_reservations : null);

    const responsibleName = res?.responsible_name || parsed.responsible;
    const studentName = res?.student_name || parsed.student;
    const reservedAt = row.claimed_at || res?.reservation_date || null;

    const reservation = normStatus === 'reservado' || (res && res.status === 'pending')
      ? {
          id: res?.id,
          student_id: row.claimed_by_student_id || res?.student_id,
          responsible_name: responsibleName || '',
          student_name: studentName || '',
          student_grade: res?.student_grade || parsed.grade || '',
          responsible_phone: res?.responsible_phone || parsed.phone || '',
          reservation_date: toBrDate(reservedAt),
          reservation_time: toBrTime(reservedAt),
          status: res?.status || 'pending',
        }
      : null;

    const foundDate = toBrDate(row.date_found || row.found_date || row.created_at);

    return {
      id: row.id,
      name: title,
      title,
      item_name: title,
      category: row.category || 'Outros',
      description: row.description || '',
      location_found: location,
      found_location: location,
      location,
      setor: row.setor || '',
      found_date: foundDate,
      date_found: foundDate,
      found_time: row.found_time || toBrTime(row.created_at),
      status: normStatus,
      raw_status: row.status,
      photo_url: photoUrl,
      image_url: photoUrl,
      registered_by: row.registered_by || row.registered_by_name || '',
      registered_by_name: row.registered_by_name || row.registered_by || '',
      organization_id: row.organization_id,
      school_id: row.school_id || row.organization_id,
      claimed_by_name: row.claimed_by_name || undefined,
      claimed_by_student_id: row.claimed_by_student_id || undefined,
      claimed_at: row.claimed_at || undefined,
      delivered_by: row.delivered_by || row.delivered_by_staff || undefined,
      delivered_by_staff: row.delivered_by_staff || row.delivered_by || undefined,
      delivered_date: toBrDate(row.delivered_date) || undefined,
      delivery_notes: row.delivery_notes || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      reservation,
    };
  }

  /** Família pede a retirada. A checagem de vínculo com o estudante é feita no banco. */
  static async reserveItem(payload: {
    itemId: string;
    studentId: string;
    guardianProfileId?: string;
    responsibleName: string;
    studentName: string;
    studentGrade: string;
    responsiblePhone: string;
  }): Promise<Result> {
    if (!isUuid(payload.itemId)) return { success: false, error: 'Objeto inválido. Atualize a tela.' };

    const { data, error } = await supabase.rpc('reserve_lost_and_found_item_atomic', {
      p_item_id: payload.itemId,
      p_student_id: isUuid(payload.studentId) ? payload.studentId : null,
      p_guardian_profile_id: isUuid(payload.guardianProfileId) ? payload.guardianProfileId : null,
      p_responsible_name: payload.responsibleName,
      p_student_name: payload.studentName,
      p_student_grade: payload.studentGrade,
      p_responsible_phone: payload.responsiblePhone,
    });

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível reservar. Tente de novo.') };
    if (!data?.success) return { success: false, error: data?.error || 'Não foi possível reservar.' };

    publish({
      type: 'Reserved',
      moduleSource: 'Familia',
      targetScope: { targetType: 'all', targetName: 'Gestão escolar' },
      entity: 'achados_perdidos',
      action: 'Pedido de retirada',
      title: `Retirada pedida: ${payload.studentName}`,
      description: `${payload.responsibleName} pediu a retirada para ${payload.studentName}.`,
      user: { name: payload.responsibleName, role: 'Responsável' },
    });

    return { success: true };
  }

  /** Equipe confirma a entrega */
  static async deliverItem(id: string, staffName = '', deliveryNotes = ''): Promise<Result> {
    if (!staffName?.trim()) return { success: false, error: 'Informe quem entregou o objeto.' };

    const { data, error } = await supabase.rpc('deliver_lost_and_found_item_atomic', {
      p_item_id: id,
      p_staff_name: staffName.trim(),
      p_delivery_notes: deliveryNotes.trim() || null,
    });

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível confirmar a entrega.') };
    if (!data?.success) return { success: false, error: data?.error || 'Não foi possível confirmar a entrega.' };

    publish({
      type: 'Delivered',
      moduleSource: 'Gestor',
      targetScope: { targetType: 'all', targetName: 'Família e secretaria' },
      entity: 'achados_perdidos',
      action: 'Entrega confirmada',
      title: 'Objeto entregue',
      description: `Entregue por ${staffName.trim()}.`,
      user: { name: staffName.trim(), role: 'Gestão escolar' },
    });

    return { success: true };
  }

  /** Cancela a reserva e o objeto volta a ficar disponível */
  static async releaseReservation(id: string): Promise<Result> {
    const { data, error } = await supabase
      .from('lost_and_found_items')
      .update({
        status: 'disponivel',
        claimed_by_name: null,
        claimed_by_student_id: null,
        claimed_at: null,
        delivered_by: null,
        delivered_by_staff: null,
      })
      .eq('id', id)
      .select('id');

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível liberar a reserva.') };
    if (!data || data.length === 0) return { success: false, error: 'Objeto não encontrado ou sem permissão.' };

    const { error: delErr } = await supabase.from('lost_and_found_reservations').delete().eq('item_id', id);
    if (delErr) console.warn('[LostAndFoundService] Reserva antiga não removida:', delErr.message);

    publish({
      type: 'ItemUpdated',
      moduleSource: 'Gestor',
      targetScope: { targetType: 'all', targetName: 'Secretaria e família' },
      entity: 'achados_perdidos',
      action: 'Reserva cancelada',
      title: 'Objeto disponível de novo',
      description: 'A reserva foi cancelada e o objeto voltou para a lista.',
      user: { name: 'Secretaria', role: 'Gestão escolar' },
    });

    return { success: true };
  }

  static async archiveItem(id: string): Promise<Result> {
    const { data, error } = await supabase
      .from('lost_and_found_items')
      .update({ status: 'arquivado' })
      .eq('id', id)
      .select('id');

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível arquivar.') };
    if (!data || data.length === 0) return { success: false, error: 'Objeto não encontrado ou sem permissão.' };
    return { success: true };
  }

  static async addItem(itemData: {
    title: string;
    category: string;
    description?: string;
    locationFound?: string;
    setor?: string;
    photoUrl?: string;
    schoolId?: string;
    orgId?: string;
    registeredBy?: string;
  }): Promise<DataResult> {
    const orgId = await resolveOrgId(itemData.orgId || itemData.schoolId);
    if (!orgId) return { success: false, error: NO_SCHOOL_ERROR };
    if (!itemData.title?.trim()) return { success: false, error: 'Informe o nome do objeto.' };

    const today = todayLocalISO();
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const title = itemData.title.trim();
    const location = itemData.locationFound?.trim() || null;
    const photo = itemData.photoUrl && !itemData.photoUrl.startsWith('data:') ? itemData.photoUrl : null;
    const registeredBy = itemData.registeredBy?.trim() || null;

    const { data, error } = await supabase
      .from('lost_and_found_items')
      .insert([{
        organization_id: orgId,
        school_id: isUuid(itemData.schoolId) ? itemData.schoolId : orgId,
        name: title,
        title,
        item_name: title,
        category: itemData.category || 'Outros',
        description: itemData.description?.trim() || null,
        location_found: location,
        found_location: location,
        setor: itemData.setor?.trim() || null,
        found_date: today,
        date_found: today,
        found_time: nowTime,
        photo_url: photo,
        image_url: photo,
        status: 'disponivel',
        registered_by: registeredBy,
        registered_by_name: registeredBy,
      }])
      .select()
      .single();

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível cadastrar o objeto.') };

    publish({
      type: 'ItemCreated',
      moduleSource: 'Gestor',
      targetScope: { targetType: 'all', targetName: 'Toda a escola' },
      entity: 'achados_perdidos',
      action: 'Novo objeto',
      title,
      description: location ? `Encontrado em ${location}.` : 'Novo objeto na lista.',
      user: { name: registeredBy || 'Secretaria', role: 'Gestão escolar' },
    });

    return { success: true, data };
  }

  static async updateItem(id: string, itemData: {
    title?: string;
    category?: string;
    description?: string;
    locationFound?: string;
    setor?: string;
    photoUrl?: string;
    registeredBy?: string;
    status?: string;
  }): Promise<DataResult> {
    const payload: Record<string, any> = {};

    if (itemData.title?.trim()) {
      payload.title = itemData.title.trim();
      payload.name = payload.title;
      payload.item_name = payload.title;
    }
    if (itemData.category) payload.category = itemData.category;
    if (itemData.description !== undefined) payload.description = itemData.description.trim() || null;
    if (itemData.locationFound !== undefined) {
      payload.location_found = itemData.locationFound.trim() || null;
      payload.found_location = payload.location_found;
    }
    if (itemData.setor !== undefined) payload.setor = itemData.setor.trim() || null;
    if (itemData.photoUrl !== undefined && !itemData.photoUrl.startsWith('data:')) {
      payload.photo_url = itemData.photoUrl || null;
      payload.image_url = payload.photo_url;
    }
    if (itemData.registeredBy !== undefined) {
      payload.registered_by = itemData.registeredBy.trim() || null;
      payload.registered_by_name = payload.registered_by;
    }
    if (itemData.status) payload.status = itemData.status;

    if (Object.keys(payload).length === 0) return { success: true };

    const { data, error } = await supabase
      .from('lost_and_found_items')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível salvar as alterações.') };
    if (!data) return { success: false, error: 'Objeto não encontrado ou sem permissão.' };
    return { success: true, data };
  }

  static async deleteItem(id: string): Promise<Result> {
    const { data, error } = await supabase
      .from('lost_and_found_items')
      .delete()
      .eq('id', id)
      .select('id, photo_url');

    if (error) return { success: false, error: friendlyDbError(error.message, 'Não foi possível excluir.') };
    if (!data || data.length === 0) return { success: false, error: 'Objeto não encontrado ou sem permissão.' };

    // Remove a foto do espaço de arquivos (as reservas saem junto pelo banco)
    const url: string | undefined = data[0]?.photo_url;
    const marker = `/object/public/${BUCKET}/`;
    if (url && url.includes(marker)) {
      const path = decodeURIComponent(url.split(marker)[1].split('?')[0]);
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
      if (rmErr) console.warn('[LostAndFoundService] Foto não removida:', rmErr.message);
    }

    return { success: true };
  }
}