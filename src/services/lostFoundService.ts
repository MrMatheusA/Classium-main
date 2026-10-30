import { supabase } from '../lib/supabase';
import { integrationHub } from '../lib/integrationHub';

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

export const DEFAULT_PHOTOS: Record<string, string> = {
  'Vestuário': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600',
  'Garrafas/Utensílios': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600',
  'Material Escolar': 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=600',
  'Acessórios/Eletrônicos': 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=600',
  'Outros': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600'
};

export const SAMPLE_LOST_FOUND_PHOTOS = [
  { label: 'Casaco Azul Moletom', url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600', category: 'Vestuário' },
  { label: 'Garrafa Térmica Inox', url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600', category: 'Garrafas/Utensílios' },
  { label: 'Estojo Escolar', url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=600', category: 'Material Escolar' },
  { label: 'Lancheira Térmica', url: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&q=80&w=600', category: 'Garrafas/Utensílios' },
  { label: 'Mochila com Alça', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600', category: 'Material Escolar' },
  { label: 'Óculos de Sol / Armação', url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=600', category: 'Acessórios/Eletrônicos' }
];

export function normalizeStatus(rawStatus?: string): 'disponivel' | 'reservado' | 'entregue' | 'arquivado' {
  if (!rawStatus) return 'disponivel';
  const st = rawStatus.toLowerCase().trim();
  if (st.includes('reser') || st.includes('aguardando') || st.includes('pendent')) {
    return 'reservado';
  }
  if (st.includes('entreg') || st.includes('confirm') || st.includes('returned') || st.includes('devolvido')) {
    return 'entregue';
  }
  if (st.includes('arq') || st.includes('discard') || st.includes('lixeira')) {
    return 'arquivado';
  }
  return 'disponivel';
}

export function parseClaimedName(claimedName?: string | null) {
  if (!claimedName) return { responsible: '', student: '', grade: '', phone: '' };

  let phone = '';
  let cleanClaim = claimedName;
  if (cleanClaim.includes(' - Tel: ')) {
    const parts = cleanClaim.split(' - Tel: ');
    cleanClaim = parts[0];
    phone = parts[1] || '';
  }

  let responsible = '';
  let studentWithGrade = cleanClaim;
  if (cleanClaim.includes(' - Solicitado por ')) {
    const parts = cleanClaim.split(' - Solicitado por ');
    studentWithGrade = parts[0];
    responsible = parts[1] || '';
  } else {
    responsible = 'Responsável Legal';
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

export class LostAndFoundService {
  /**
   * Upload image to Supabase Storage bucket 'lost_and_found_images' with base64 fallback
   */
  static async uploadPhoto(file: File, schoolId?: string): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Apenas arquivos de imagem (PNG, JPG, WEBP) são permitidos para fotos de objetos.');
    }
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      throw new Error('O tamanho da foto excede o limite máximo permitido de 10MB.');
    }

    try {
      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const sanitizedSchoolId = (schoolId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${sanitizedSchoolId}/lost_item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      // 1. Try Supabase Storage upload
      const { data, error } = await supabase.storage
        .from('lost_and_found_images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('lost_and_found_images')
          .getPublicUrl(fileName);
        
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }

      // 2. Try secondary public bucket if first fails
      const { data: altData, error: altError } = await supabase.storage
        .from('educamais-public')
        .upload(`lost_found/${fileName}`, file, { upsert: true });

      if (!altError && altData) {
        const { data: altUrl } = supabase.storage.from('educamais-public').getPublicUrl(`lost_found/${fileName}`);
        if (altUrl?.publicUrl) return altUrl.publicUrl;
      }
    } catch (err) {
      console.warn('[LostAndFoundService.uploadPhoto] Storage upload warning, converting to data URL:', err);
    }

    // 3. Fallback to base64 Data URL for guaranteed resilience
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * List items with school_id isolation directly from Supabase, with automatic REST fallback
   */
  static async getItems(schoolIdOrOrgId?: string): Promise<LostAndFoundDbItem[]> {
    const targetSchoolId = schoolIdOrOrgId && schoolIdOrOrgId !== 'all' ? schoolIdOrOrgId : null;

    if (!targetSchoolId) {
      console.warn('[LostAndFoundService] Nenhum school_id especificado. Retornando lista vazia por segurança.');
      return [];
    }

    try {
      // 1. Direct table query via Supabase client with strict school_id filter
      const { data, error } = await supabase
        .from('lost_and_found_items')
        .select(`
          *,
          lost_and_found_reservations (*)
        `)
        .or(`organization_id.eq.${targetSchoolId},school_id.eq.${targetSchoolId}`)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map(this.mapDbRowToItem);
      }

      if (error) {
        console.warn('[LostAndFoundService] Direct Supabase query warning:', error.message);
      }

      // 2. Fallback to server REST API endpoint with strict school_id parameter
      const res = await fetch(`/api/lost-and-found/items?school_id=${encodeURIComponent(targetSchoolId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          return json.items.map(this.mapDbRowToItem);
        }
      }

      return [];
    } catch (err) {
      console.error('[LostAndFoundService] Error fetching items:', err);
      return [];
    }
  }

  /**
   * Helper to map any database row to uniform LostAndFoundDbItem
   */
  static mapDbRowToItem(row: any): LostAndFoundDbItem {
    const title = row.title || row.name || row.item_name || 'Objeto Encontrado';
    const category = row.category || 'Outros';
    const rawStatus = row.status || 'Disponível';
    const normStatus = normalizeStatus(rawStatus);

    const defaultPhoto = DEFAULT_PHOTOS[category] || DEFAULT_PHOTOS['Outros'];
    const photoUrl = row.photo_url || row.image_url || defaultPhoto;

    const parsedClaim = parseClaimedName(row.claimed_by_name);

    const res = Array.isArray(row.lost_and_found_reservations) && row.lost_and_found_reservations.length > 0
      ? row.lost_and_found_reservations[0]
      : null;

    const respName = res?.responsible_name || parsedClaim.responsible;
    const studName = res?.student_name || parsedClaim.student;
    const studGrade = res?.student_grade || parsedClaim.grade;
    const respPhone = res?.responsible_phone || parsedClaim.phone;

    const rawDate = row.date_found || row.found_date || row.created_at;
    let formattedDate = 'Recente';
    if (rawDate) {
      try {
        if (rawDate.includes('-')) {
          const [y, m, d] = rawDate.split('T')[0].split('-');
          formattedDate = `${d}/${m}/${y}`;
        } else {
          formattedDate = rawDate;
        }
      } catch {
        formattedDate = rawDate;
      }
    }

    const reservationObj = (normStatus === 'reservado' || (respName && studName)) ? {
      id: res?.id || `res-${row.id}`,
      student_id: row.claimed_by_student_id || res?.student_id,
      responsible_name: respName || 'Responsável Legal',
      student_name: studName || 'Aluno',
      student_grade: studGrade || '',
      responsible_phone: respPhone || '',
      reservation_date: row.claimed_at ? new Date(row.claimed_at).toLocaleDateString('pt-BR') : (res?.reservation_date ? new Date(res.reservation_date).toLocaleDateString('pt-BR') : formattedDate),
      reservation_time: row.claimed_at ? new Date(row.claimed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : (res?.reservation_date ? new Date(res.reservation_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '10:30'),
      status: 'pending'
    } : null;

    return {
      id: row.id,
      name: title,
      title: title,
      item_name: title,
      category: category,
      description: row.description || 'Sem descrição cadastrada.',
      location_found: row.location_found || row.found_location || row.location || 'Pátio Central',
      found_location: row.location_found || row.found_location || row.location || 'Pátio Central',
      location: row.location_found || row.found_location || row.location || 'Pátio Central',
      setor: row.setor || 'Geral',
      found_date: formattedDate,
      date_found: formattedDate,
      found_time: row.found_time || (row.created_at ? new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '10:00'),
      status: normStatus,
      raw_status: rawStatus,
      photo_url: photoUrl,
      image_url: photoUrl,
      registered_by: row.registered_by || row.registered_by_name || 'Inspetor de Pátio / Secretaria',
      registered_by_name: row.registered_by || row.registered_by_name || 'Inspetor de Pátio / Secretaria',
      organization_id: row.organization_id || row.school_id || '',
      school_id: row.school_id || row.organization_id || '',
      claimed_by_name: row.claimed_by_name,
      claimed_by_student_id: row.claimed_by_student_id,
      claimed_at: row.claimed_at,
      delivered_by: row.delivered_by || row.delivered_by_staff,
      delivered_by_staff: row.delivered_by_staff || row.delivered_by || 'Secretaria Responsável',
      delivered_date: row.delivered_date || (row.updated_at ? new Date(row.updated_at).toLocaleDateString('pt-BR') : ''),
      delivery_notes: row.delivery_notes || 'Retirado na Secretaria',
      created_at: row.created_at,
      updated_at: row.updated_at,
      reservation: reservationObj
    };
  }

  /**
   * Reserve an item (Family -> Gestor synchronization)
   */
  static async reserveItem(payload: {
    itemId: string;
    studentId: string;
    guardianProfileId?: string;
    responsibleName: string;
    studentName: string;
    studentGrade: string;
    responsiblePhone: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const claimString = `${payload.studentName} (${payload.studentGrade || ''}) - Solicitado por ${payload.responsibleName}${payload.responsiblePhone ? ` - Tel: ${payload.responsiblePhone}` : ''}`;

      // 1. Try RPC atomic call first
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('reserve_lost_and_found_item_atomic', {
          p_item_id: payload.itemId,
          p_student_id: payload.studentId || null,
          p_guardian_profile_id: payload.guardianProfileId || null,
          p_responsible_name: payload.responsibleName,
          p_student_name: payload.studentName,
          p_student_grade: payload.studentGrade,
          p_responsible_phone: payload.responsiblePhone
        });

        if (!rpcError && rpcData?.success) {
          // Success via RPC
        } else {
          throw new Error(rpcError?.message || 'RPC fallback needed');
        }
      } catch {
        // Direct Supabase table update fallback
        await supabase
          .from('lost_and_found_items')
          .update({
            status: 'reservado',
            claimed_by_student_id: payload.studentId,
            claimed_by_name: claimString,
            claimed_at: now,
            updated_at: now
          })
          .eq('id', payload.itemId);

        await supabase
          .from('lost_and_found_reservations')
          .upsert({
            item_id: payload.itemId,
            student_id: payload.studentId,
            guardian_profile_id: payload.guardianProfileId || null,
            responsible_name: payload.responsibleName,
            student_name: payload.studentName,
            student_grade: payload.studentGrade,
            responsible_phone: payload.responsiblePhone,
            status: 'pending',
            reservation_date: now
          }, { onConflict: 'item_id' });
      }

      // 2. REST API dual-sync
      await fetch(`/api/family/lost-and-found/claim/${payload.itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: payload.studentId,
          student_name: payload.studentName,
          student_grade: payload.studentGrade,
          responsible_name: payload.responsibleName,
          responsible_phone: payload.responsiblePhone
        })
      }).catch(() => {});

      // 3. Publish Realtime Hub Event
      integrationHub.publishEvent({
        type: 'Reserved',
        moduleSource: 'Familia',
        targetScope: { targetType: 'all', targetName: 'Gestão Escolar' },
        entity: 'achados_perdidos',
        action: 'Solicitação de Retirada pela Família',
        title: `Reserva Solicitada: ${payload.studentName}`,
        description: `Responsável ${payload.responsibleName} solicitou a retirada para ${payload.studentName} (${payload.studentGrade}).`,
        user: { name: payload.responsibleName, role: 'Responsável Legal', ip: '200.180.22.15' }
      });

      return { success: true };
    } catch (err: any) {
      console.error('[LostAndFoundService.reserveItem] Error:', err);
      return { success: false, error: err?.message || 'Falha ao reservar item.' };
    }
  }

  /**
   * Confirm delivery (Gestor -> Família synchronization)
   */
  static async deliverItem(
    id: string, 
    staffName: string = 'Secretaria Responsável', 
    deliveryNotes: string = 'Entrega presencial confirmada mediante documento de identificação.'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const todayISO = now.split('T')[0];

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('deliver_lost_and_found_item_atomic', {
          p_item_id: id,
          p_staff_name: staffName,
          p_delivery_notes: deliveryNotes
        });

        if (rpcError || !rpcData?.success) {
          throw new Error('RPC deliver fallback');
        }
      } catch {
        await supabase
          .from('lost_and_found_items')
          .update({
            status: 'entregue',
            delivered_date: todayISO,
            delivered_by: staffName,
            delivered_by_staff: staffName,
            delivery_notes: deliveryNotes,
            updated_at: now
          })
          .eq('id', id);

        await supabase
          .from('lost_and_found_reservations')
          .update({
            status: 'confirmed',
            pickup_date: now,
            picked_up_by_name: staffName,
            updated_at: now
          })
          .eq('item_id', id);
      }

      // REST dual-sync
      await fetch(`/api/lost-and-found/items/${id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivered_by: staffName,
          delivery_notes: deliveryNotes
        })
      }).catch(() => {});

      integrationHub.publishEvent({
        type: 'Delivered',
        moduleSource: 'Gestor',
        targetScope: { targetType: 'all', targetName: 'Família & Secretaria' },
        entity: 'achados_perdidos',
        action: 'Entrega de Objeto Confirmada',
        title: 'Objeto Devolvido com Sucesso',
        description: `Objeto entregue por ${staffName}. Status atualizado para Entregue em tempo real.`,
        user: { name: staffName, role: 'Gestão Escolar', ip: '189.120.44.10' }
      });

      return { success: true };
    } catch (err: any) {
      console.error('[LostAndFoundService.deliverItem] Error:', err);
      return { success: false, error: err?.message || 'Falha ao confirmar entrega.' };
    }
  }

  /**
   * Reject / Cancel reservation (returns item to Disponível)
   */
  static async releaseReservation(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();

      await supabase
        .from('lost_and_found_items')
        .update({
          status: 'disponivel',
          claimed_by_name: null,
          claimed_by_student_id: null,
          claimed_at: null,
          delivered_by: null,
          delivered_by_staff: null,
          updated_at: now
        })
        .eq('id', id);

      try {
        await supabase
          .from('lost_and_found_reservations')
          .delete()
          .eq('item_id', id);
      } catch {}

      // REST dual-sync
      await fetch(`/api/lost-and-found/items/${id}/reject`, {
        method: 'POST'
      }).catch(() => {});

      integrationHub.publishEvent({
        type: 'ItemUpdated',
        moduleSource: 'Gestor',
        targetScope: { targetType: 'all', targetName: 'Secretaria & Família' },
        entity: 'achados_perdidos',
        action: 'Reserva Cancelada / Objeto Disponível',
        title: 'Objeto Liberado para o Catálogo',
        description: 'A reserva foi liberada e o item voltou a ficar disponível na secretaria.',
        user: { name: 'Secretaria Escolar', role: 'Gestão Escolar', ip: '189.120.44.10' }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Falha ao liberar reserva.' };
    }
  }

  /**
   * Archive an item
   */
  static async archiveItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('lost_and_found_items')
        .update({ status: 'arquivado', updated_at: now })
        .eq('id', id);

      await fetch(`/api/lost-and-found/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'arquivado' })
      }).catch(() => {});

      integrationHub.publishEvent({
        type: 'ItemDeleted',
        moduleSource: 'Gestor',
        targetScope: { targetType: 'all', targetName: 'Gestão Escolar' },
        entity: 'achados_perdidos',
        action: 'Objeto Arquivado',
        title: 'Item Arquivado no Histórico',
        description: 'Objeto transferido para o arquivo permanente.',
        user: { name: 'Operador Gestor', role: 'Gestão Escolar', ip: '189.120.44.10' }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Add a new item (Gestor -> Família synchronization)
   */
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
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const schoolId = itemData.schoolId || itemData.orgId;
      if (!schoolId) {
        return { success: false, error: 'Não é possível cadastrar item sem uma unidade escolar selecionada.' };
      }
      const todayISO = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const defaultPhoto = DEFAULT_PHOTOS[itemData.category] || DEFAULT_PHOTOS['Outros'];
      const finalPhoto = itemData.photoUrl || defaultPhoto;

      const payload = {
        organization_id: schoolId,
        school_id: schoolId,
        name: itemData.title,
        title: itemData.title,
        item_name: itemData.title,
        category: itemData.category,
        description: itemData.description || 'Sem observações adicionais.',
        location_found: itemData.locationFound || 'Pátio Central',
        found_location: itemData.locationFound || 'Pátio Central',
        setor: itemData.setor || 'Geral',
        found_date: todayISO,
        date_found: todayISO,
        found_time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        photo_url: finalPhoto,
        image_url: finalPhoto,
        status: 'disponivel',
        registered_by: itemData.registeredBy || 'Inspetor de Pátio / Secretaria',
        registered_by_name: itemData.registeredBy || 'Inspetor de Pátio / Secretaria',
        created_at: now,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('lost_and_found_items')
        .insert([payload])
        .select()
        .single();

      if (error) {
        // Fallback REST
        const res = await fetch('/api/lost-and-found/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const resJson = await res.json();
        if (resJson.success) {
          return { success: true, data: resJson.item };
        }
        return { success: false, error: error.message };
      }

      integrationHub.publishEvent({
        type: 'ItemCreated',
        moduleSource: 'Gestor',
        targetScope: { targetType: 'all', targetName: 'Toda a Comunidade' },
        entity: 'achados_perdidos',
        action: 'Novo Objeto Cadastrado',
        title: itemData.title,
        description: `Item catalogado em ${itemData.locationFound || 'Pátio Central'}. Sincronizado instantaneamente no Portal da Família.`,
        user: { name: itemData.registeredBy || 'Inspetor Gestor', role: 'Gestão Escolar', ip: '189.120.44.10' }
      });

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Update an existing item
   */
  static async updateItem(id: string, itemData: {
    title?: string;
    category?: string;
    description?: string;
    locationFound?: string;
    setor?: string;
    photoUrl?: string;
    registeredBy?: string;
    status?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const now = new Date().toISOString();
      const payload: any = { updated_at: now };

      if (itemData.title) {
        payload.title = itemData.title;
        payload.name = itemData.title;
        payload.item_name = itemData.title;
      }
      if (itemData.category) payload.category = itemData.category;
      if (itemData.description !== undefined) payload.description = itemData.description;
      if (itemData.locationFound) {
        payload.location_found = itemData.locationFound;
        payload.found_location = itemData.locationFound;
      }
      if (itemData.setor) payload.setor = itemData.setor;
      if (itemData.photoUrl) {
        payload.photo_url = itemData.photoUrl;
        payload.image_url = itemData.photoUrl;
      }
      if (itemData.registeredBy) {
        payload.registered_by = itemData.registeredBy;
        payload.registered_by_name = itemData.registeredBy;
      }
      if (itemData.status) payload.status = itemData.status;

      const { data, error } = await supabase
        .from('lost_and_found_items')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const res = await fetch(`/api/lost-and-found/items/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const resJson = await res.json();
        if (resJson.success) return { success: true, data: resJson.item };
        return { success: false, error: error.message };
      }

      integrationHub.publishEvent({
        type: 'ItemUpdated',
        moduleSource: 'Gestor',
        targetScope: { targetType: 'all', targetName: 'Toda a Comunidade' },
        entity: 'achados_perdidos',
        action: 'Objeto Atualizado',
        title: itemData.title || 'Objeto Atualizado',
        description: 'Informações do objeto foram atualizadas e sincronizadas.',
        user: { name: 'Gestão Escolar', role: 'Gestão Escolar', ip: '189.120.44.10' }
      });

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Delete an item
   */
  static async deleteItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase.from('lost_and_found_reservations').delete().eq('item_id', id);
      await supabase.from('lost_and_found_items').delete().eq('id', id);

      await fetch(`/api/lost-and-found/items/${id}`, {
        method: 'DELETE'
      }).catch(() => {});

      integrationHub.publishEvent({
        type: 'ItemDeleted',
        moduleSource: 'Gestor',
        targetScope: { targetType: 'all', targetName: 'Gestão Escolar' },
        entity: 'achados_perdidos',
        action: 'Objeto Excluído do Sistema',
        title: 'Objeto Removido',
        description: 'O item foi excluído do catálogo de achados e perdidos.',
        user: { name: 'Operador Gestor', role: 'Gestão Escolar', ip: '189.120.44.10' }
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }
}
