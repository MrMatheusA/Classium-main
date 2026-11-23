import { supabase } from '../lib/supabase';
import { RealtimeService } from './RealtimeService';
import { resolveOrgId, NO_SCHOOL_ERROR, formatFileSize, safeFileName, friendlyDbError, isUuid } from './tenant';

const BUCKET = 'cardapios';
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export interface PublishMenuPayload {
  title: string;
  file: File;
  year: number;
  month: number;
  organization_id?: string;
  school_id?: string;
  thumbnailDataUrl?: string;
  is_published?: boolean;
  nutritionist_name?: string;
  nutritionist_crn?: string;
}

export interface PublishedMenuResponse {
  school_menu_id: string;
  menu_document_id: string;
  title: string;
  file_url: string;
  thumbnail_url?: string;
  year: number;
  month: number;
  published_at: string;
}

export interface ActiveMenuDocument {
  id: string;
  school_menu_id?: string;
  title: string;
  file_url: string;
  thumbnail_url?: string;
  file_name?: string;
  file_size?: string;
  file_type?: 'pdf' | 'image' | 'png' | 'jpg' | 'webp';
  published_at: string;
  is_published?: boolean;
  status?: string;
  nutritionist_name?: string;
  nutritionist_crn?: string;
  organization_id?: string;
  school_id?: string;
  orientation?: 'portrait' | 'landscape';
  storage_path?: string;
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isImageFile(file: File) {
  return /^image\/(png|jpe?g|webp)$/.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return null;
  const bin = atob(match[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

function mapRow(row: any): ActiveMenuDocument | null {
  const info = row.nutritional_info || {};
  const fileUrl: string = row.file_url || info.file_url || '';
  if (!fileUrl || fileUrl.startsWith('blob:')) return null;

  const fileName: string = row.file_name || info.file_name || '';
  const rawType: string = row.file_type || info.file_type || '';
  const isImage = rawType === 'image' || /\.(png|jpe?g|webp)$/i.test(fileName || fileUrl);
  const isPublished = row.is_published !== false && row.status !== 'Rascunho';

  return {
    id: row.id,
    school_menu_id: row.id,
    title: row.title || 'Cardápio',
    file_url: fileUrl,
    thumbnail_url: row.thumbnail_url || info.thumbnail_url || undefined,
    file_name: fileName || undefined,
    file_size: row.file_size || info.file_size || undefined,
    file_type: isImage ? 'image' : 'pdf',
    published_at: row.published_at || row.created_at,
    is_published: isPublished,
    status: isPublished ? 'Publicado' : 'Rascunho',
    nutritionist_name: row.nutritionist_name || undefined,
    nutritionist_crn: row.nutritionist_crn || undefined,
    organization_id: row.organization_id,
    school_id: row.school_id,
    orientation: row.orientation || undefined,
    storage_path: info.storage_path || undefined,
  };
}

export const menuService = {
  /**
   * Envia o arquivo para o espaço "cardapios" e registra o cardápio do mês.
   * Se o registro falhar, o arquivo enviado é removido.
   */
  async uploadAndPublishMenu(payload: PublishMenuPayload): Promise<PublishedMenuResponse> {
    const { title, file, year, month } = payload;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sua sessão expirou. Entre de novo.');

    const orgId = await resolveOrgId(payload.organization_id || payload.school_id);
    if (!orgId) throw new Error(NO_SCHOOL_ERROR);
    const schoolId = isUuid(payload.school_id) ? payload.school_id : orgId;

    const isPdf = isPdfFile(file);
    if (!isPdf && !isImageFile(file)) {
      throw new Error('Formato não aceito. Envie PDF, PNG, JPG ou WEBP.');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error('O arquivo passa de 50 MB. Reduza o tamanho e envie de novo.');
    }

    const monthStr = String(month).padStart(2, '0');
    const stamp = Date.now();
    const storagePath = `${orgId}/${year}-${monthStr}/${stamp}_${safeFileName(file.name)}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
    if (upErr) throw new Error(friendlyDbError(upErr.message, 'Não foi possível enviar o arquivo. Tente de novo.'));

    const fileUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;

    let thumbnailUrl: string | undefined;
    let thumbPath: string | undefined;
    if (payload.thumbnailDataUrl) {
      const blob = dataUrlToBlob(payload.thumbnailDataUrl);
      if (blob) {
        thumbPath = `${orgId}/${year}-${monthStr}/${stamp}_miniatura.png`;
        const { error: thumbErr } = await supabase.storage
          .from(BUCKET)
          .upload(thumbPath, blob, { cacheControl: '3600', upsert: true, contentType: blob.type });
        if (!thumbErr) thumbnailUrl = supabase.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;
        else thumbPath = undefined;
      }
    }

    const publishedAt = new Date().toISOString();
    const menuTitle = title?.trim() || `Cardápio ${monthStr}/${year}`;
    const fileSize = formatFileSize(file.size);
    const fileType = isPdf ? 'pdf' : 'image';
    const isPublished = payload.is_published !== false;

    const { data: row, error: insErr } = await supabase
      .from('school_menus')
      .insert([{
        organization_id: orgId,
        school_id: schoolId,
        title: menuTitle,
        year: Number(year),
        month: Number(month),
        date: `${year}-${monthStr}-01`,
        file_url: fileUrl,
        file_name: file.name,
        file_type: fileType,
        file_size: fileSize,
        thumbnail_url: thumbnailUrl ?? null,
        status: isPublished ? 'Publicado' : 'Rascunho',
        is_published: isPublished,
        published_at: publishedAt,
        nutritionist_name: payload.nutritionist_name?.trim() || null,
        nutritionist_crn: payload.nutritionist_crn?.trim() || null,
        nutritional_info: {
          file_url: fileUrl,
          file_name: file.name,
          file_size: fileSize,
          file_type: fileType,
          storage_path: storagePath,
          thumbnail_path: thumbPath ?? null,
        },
      }])
      .select('id')
      .single();

    if (insErr || !row) {
      await supabase.storage.from(BUCKET).remove([storagePath, ...(thumbPath ? [thumbPath] : [])]);
      throw new Error(friendlyDbError(insErr?.message, 'O arquivo foi enviado, mas o cardápio não foi registrado. Tente de novo.'));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classium_menu_published', {
        detail: { id: row.id, school_id: schoolId, year: Number(year), month: Number(month) },
      }));
    }

    return {
      school_menu_id: row.id,
      menu_document_id: row.id,
      title: menuTitle,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      year: Number(year),
      month: Number(month),
      published_at: publishedAt,
    };
  },

  /**
   * Cardápios do mês, do mais antigo para o mais recente. Lança erro se a consulta falhar, para a tela mostrar o aviso certo.
   */
  async getMenuDocumentsForMonth(year: number, month: number, schoolId?: string): Promise<ActiveMenuDocument[]> {
    const orgId = await resolveOrgId(schoolId);
    if (!orgId) throw new Error(NO_SCHOOL_ERROR);

    const { data, error } = await supabase
      .from('school_menus')
      .select('*')
      .or(`organization_id.eq.${orgId},school_id.eq.${orgId}`)
      .eq('year', Number(year))
      .eq('month', Number(month))
      .order('published_at', { ascending: true });

    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível carregar os cardápios.'));

    return ((data || []) as any[]).map(mapRow).filter((d): d is ActiveMenuDocument => d !== null);
  },

  /** Cardápio publicado mais recente do mês (para o portal da família) */
  async getActiveMenuDocument(year: number, month: number, schoolId?: string): Promise<ActiveMenuDocument | null> {
    const all = await this.getMenuDocumentsForMonth(year, month, schoolId);
    const published = all.filter(d => d.is_published);
    return published.length > 0 ? published[published.length - 1] : null;
  },

  /** Exclui o cardápio e os arquivos dele */
  async deleteMenuDocument(id: string, _fileUrl?: string) {
    if (!isUuid(id)) throw new Error('Cardápio inválido. Atualize a tela.');

    const { data: row } = await supabase
      .from('school_menus')
      .select('nutritional_info')
      .eq('id', id)
      .maybeSingle();

    const { data: deleted, error } = await supabase
      .from('school_menus')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) throw new Error(friendlyDbError(error.message, 'Não foi possível excluir o cardápio.'));
    if (!deleted || deleted.length === 0) {
      throw new Error('O cardápio não foi excluído. Verifique se você tem permissão ou atualize a tela.');
    }

    const info = (row as any)?.nutritional_info || {};
    const paths = [info.storage_path, info.thumbnail_path].filter(Boolean) as string[];
    if (paths.length > 0) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths);
      if (rmErr) console.warn('[menuService] Arquivo não removido do storage:', rmErr.message);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classium_menu_published', { detail: { id, deleted: true } }));
    }
  },

  /** Atualiza a tela quando um cardápio é publicado ou excluído */
  subscribeToMenuChanges(
    year: number,
    month: number,
    callback: (activeMenu: ActiveMenuDocument | null) => void,
    schoolId?: string
  ) {
    const realtimeService = RealtimeService.getInstance();
    const filter = isUuid(schoolId) ? `organization_id=eq.${schoolId}` : undefined;

    const refresh = async () => {
      try {
        callback(await menuService.getActiveMenuDocument(year, month, schoolId));
      } catch (err) {
        console.warn('[menuService] Falha ao atualizar cardápio:', err);
      }
    };

    const unsubMenus = realtimeService.subscribe(
      `cardapio_sync_${month}_${year}_${schoolId || 'escola'}`,
      { table: 'school_menus', filter },
      refresh
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('classium_menu_published', refresh);
      window.addEventListener('classium_menu_updated', refresh);
    }

    return () => {
      unsubMenus();
      if (typeof window !== 'undefined') {
        window.removeEventListener('classium_menu_published', refresh);
        window.removeEventListener('classium_menu_updated', refresh);
      }
    };
  },
};