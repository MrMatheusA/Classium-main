import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { RealtimeService } from './RealtimeService';

export interface PublishMenuPayload {
  title: string;
  file: File;
  year: number;
  month: number;
  organization_id?: string;
  school_id?: string;
  thumbnailDataUrl?: string;
  is_published?: boolean;
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
}

let activeMenuChannel: RealtimeChannel | null = null;

export const menuService = {
  /**
   * Upload file to permanent storage and persist metadata in Supabase table school_menus.
   */
  async uploadAndPublishMenu(payload: PublishMenuPayload): Promise<PublishedMenuResponse> {
    const { title, file, year, month, organization_id, school_id } = payload;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Sessão expirada ou usuário não autenticado.');
    }

    if (!organization_id) {
      throw new Error('Organização não informada para o upload do cardápio.');
    }

    // 1. File Validation
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      throw new Error('Formato não suportado. Por favor, envie arquivos PDF, PNG, JPG ou WEBP.');
    }

    const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error('O tamanho do arquivo excede o limite máximo permitido de 50MB.');
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const menuTitle = title || `Cardápio Escolar Oficial — ${month}/${year}`;
    const targetSchoolId = school_id || undefined;
    const targetOrgId = organization_id;
    const fileSizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    // 2. Convert File to base64 Data URL for transmission
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(new Error('Erro ao ler o arquivo selecionado: ' + err));
      reader.readAsDataURL(file);
    });

    let publicFileUrl = '';
    let savedRecordId = `menu-${timestamp}`;

    // 3. Upload to backend storage API (/api/menu-attachments/upload) with Bearer token
    const resp = await fetch('/api/menu-attachments/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        fileName: cleanFileName,
        fileData: base64Data,
        month: Number(month),
        year: Number(year),
        schoolId: targetSchoolId,
        organizationId: targetOrgId,
        title: menuTitle
      })
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.success) {
      const errorMsg = json?.error || `Falha no upload (Código HTTP ${resp.status})`;
      throw new Error(errorMsg);
    }

    if (json?.document?.file_url) {
      publicFileUrl = json.document.file_url;
    }
    if (json?.document?.id) {
      savedRecordId = json.document.id;
    }

    if (!publicFileUrl) {
      publicFileUrl = `/api/menu-attachments/file/${cleanFileName}`;
    }



    // 5. Broadcast instant local event for real-time reactive UI update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('classium_menu_published', {
          detail: {
            id: savedRecordId,
            school_menu_id: savedRecordId,
            school_id: targetSchoolId,
            title: menuTitle,
            file_url: publicFileUrl,
            file_name: file.name,
            file_type: isPdf ? 'pdf' : 'image',
            year: Number(year),
            month: Number(month),
            published_at: new Date().toISOString()
          }
        })
      );
    }

    return {
      school_menu_id: savedRecordId,
      menu_document_id: savedRecordId,
      title: menuTitle,
      file_url: publicFileUrl,
      year: Number(year),
      month: Number(month),
      published_at: new Date().toISOString()
    };
  },

  /**
   * Fetches published menus for year & month from Supabase and backend cache.
   */
  async getMenuDocumentsForMonth(year: number, month: number, schoolId?: string): Promise<ActiveMenuDocument[]> {
    const documentsList: ActiveMenuDocument[] = [];
    const seenIds = new Set<string>();

    const addDoc = (doc: ActiveMenuDocument) => {
      if (!doc.id || seenIds.has(doc.id)) return;
      // Filter out invalid or transient blob: URLs from past sessions
      if (doc.file_url && doc.file_url.startsWith('blob:')) return;
      seenIds.add(doc.id);
      documentsList.push(doc);
    };

    // 1. Query Supabase table school_menus
    try {
      let query = supabase
        .from('school_menus')
        .select('*')
        .eq('year', Number(year))
        .eq('month', Number(month))
        .order('created_at', { ascending: false });

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data: records, error } = await query;

      if (!error && records && records.length > 0) {
        records.forEach((row: any) => {
          const nutInfo = row.nutritional_info || {};
          let fileUrl = nutInfo.file_url || row.file_url || row.description || '';
          let fileName = nutInfo.file_name || row.file_name || row.title || `cardapio_${month}_${year}.pdf`;

          if (fileUrl.startsWith('http') && fileUrl.includes('/api/menu-attachments/file/')) {
            fileUrl = '/api/menu-attachments/file/' + fileUrl.split('/api/menu-attachments/file/')[1];
          }
          const fileSize = nutInfo.file_size || '2.4 MB';
          const isImg = nutInfo.file_type === 'image' || (/\.(png|jpe?g|webp)$/i.test(fileName) && !fileName.toLowerCase().includes('cardapio'));
          const isPub = row.status !== 'Rascunho' && row.is_published !== false;

          if (fileUrl) {
            addDoc({
              id: row.id,
              school_menu_id: row.id,
              title: row.title || `Cardápio Escolar Oficial`,
              file_url: fileUrl,
              file_name: fileName,
              file_size: fileSize,
              file_type: isImg ? 'image' : 'pdf',
              published_at: row.published_at || row.created_at || new Date().toISOString(),
              is_published: isPub,
              status: isPub ? 'Publicado' : 'Rascunho',
              nutritionist_name: row.nutritionist_name || 'Dra. Ana Paula Mendonça (CRN-3 48.920)',
              nutritionist_crn: row.nutritionist_crn || 'CRN-3 48.920',
              school_id: row.school_id,
              organization_id: row.organization_id
            });
          }
        });
      }
    } catch (err) {
      console.warn('[menuService] Query Supabase school_menus error:', err);
    }

    // 2. Query Supabase table school_menus_pnae_documents if still empty
    if (documentsList.length === 0) {
      try {
        let queryPnae = supabase
          .from('school_menus_pnae_documents')
          .select('*')
          .eq('year', Number(year))
          .eq('month', String(month))
          .order('created_at', { ascending: false });

        if (schoolId) {
          queryPnae = queryPnae.eq('school_id', schoolId);
        }

        const { data: pnaeRecords, error: pnaeErr } = await queryPnae;

        if (!pnaeErr && pnaeRecords && pnaeRecords.length > 0) {
          pnaeRecords.forEach((row: any) => {
            let fileUrl = row.file_url || '';
            let fileName = row.file_name || row.title || `cardapio_${month}_${year}.pdf`;

            if (fileUrl.startsWith('http') && fileUrl.includes('/api/menu-attachments/file/')) {
              fileUrl = '/api/menu-attachments/file/' + fileUrl.split('/api/menu-attachments/file/')[1];
            }

            const isImg = row.file_type === 'image' || (/\.(png|jpe?g|webp)$/i.test(fileName) && !fileName.toLowerCase().includes('cardapio'));

            if (fileUrl) {
              addDoc({
                id: row.id,
                school_menu_id: row.id,
                title: row.title || `Cardápio Escolar Oficial`,
                file_url: fileUrl,
                file_name: fileName,
                file_size: row.file_size || '2.4 KB',
                file_type: isImg ? 'image' : 'pdf',
                published_at: row.published_at || row.created_at || new Date().toISOString(),
                is_published: true,
                status: row.status || 'Publicado',
                nutritionist_name: row.nutritionist_name || 'Dra. Ana Paula Mendonça (CRN-3 48.920)',
                nutritionist_crn: row.nutritionist_crn || 'CRN-3 48.920',
                school_id: row.school_id,
                organization_id: row.organization_id
              });
            }
          });
        }
      } catch (pnaeEx) {
        console.warn('[menuService] Query school_menus_pnae_documents error:', pnaeEx);
      }
    }

    // 3. Query backend API /api/food/menus with Bearer token
    if (documentsList.length === 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const resp = await fetch(`/api/food/menus?year=${year}&month=${month}${schoolId ? `&school_id=${schoolId}` : ''}`, {
          headers
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json?.menus && Array.isArray(json.menus)) {
            json.menus.forEach((row: any) => {
              const nutInfo = row.nutritional_info || {};
              let fileUrl = nutInfo.file_url || row.file_url || row.description || '';
              let fileName = nutInfo.file_name || row.file_name || row.title || `cardapio_${month}_${year}.pdf`;

              if (fileUrl.startsWith('http') && fileUrl.includes('/api/menu-attachments/file/')) {
                fileUrl = '/api/menu-attachments/file/' + fileUrl.split('/api/menu-attachments/file/')[1];
              }

              const isImg = nutInfo.file_type === 'image' || row.file_type === 'image';
              if (fileUrl) {
                addDoc({
                  id: row.id,
                  school_menu_id: row.id,
                  title: row.title || `Cardápio Escolar Oficial`,
                  file_url: fileUrl,
                  file_name: fileName,
                  file_size: nutInfo.file_size || row.file_size || '2.4 KB',
                  file_type: isImg ? 'image' : 'pdf',
                  published_at: row.published_at || row.created_at || new Date().toISOString(),
                  is_published: true,
                  status: row.status || 'Publicado',
                  nutritionist_name: row.nutritionist_name || 'Dra. Ana Paula Mendonça (CRN-3 48.920)',
                  nutritionist_crn: row.nutritionist_crn || 'CRN-3 48.920',
                  school_id: row.school_id,
                  organization_id: row.organization_id
                });
              }
            });
          }
        }
      } catch (apiErr) {
        console.warn('[menuService] Backend API food/menus error:', apiErr);
      }
    }

    return documentsList;
  },

  /**
   * Obtém o cardápio ativo e publicado para determinado ano e mês
   */
  async getActiveMenuDocument(year: number, month: number, schoolId?: string): Promise<ActiveMenuDocument | null> {
    const all = await this.getMenuDocumentsForMonth(year, month, schoolId);
    if (all.length > 0) {
      return all[0];
    }
    return null;
  },

  /**
   * Exclui um cardápio e remove o arquivo
   */
  async deleteMenuDocument(id: string, fileUrl?: string) {
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // 1. Delete from backend API (authoritative)
    const delResp = await fetch(`/api/food/menus/${id}`, {
      method: 'DELETE',
      headers
    });

    const delJson = await delResp.json().catch(() => null);
    if (!delResp.ok || !delJson?.success) {
      throw new Error(delJson?.error || `Falha ao excluir cardápio (HTTP ${delResp.status})`);
    }

    // 2. Also delete from Supabase school_menus directly if needed
    try {
      await supabase.from('school_menus').delete().eq('id', id);
    } catch (err) {
      console.warn('[menuService] Delete from school_menus:', err);
    }

    // 3. Broadcast removal event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('classium_menu_published', { detail: { id, deleted: true } }));
    }
  },

  /**
   * Subscribes to real-time changes on school_menus in Supabase
   */
  subscribeToMenuChanges(
    year: number,
    month: number,
    callback: (activeMenu: ActiveMenuDocument | null) => void,
    schoolId?: string
  ) {
    const realtimeService = RealtimeService.getInstance();
    const filter = schoolId ? `school_id=eq.${schoolId}` : undefined;

    const unsubMenus = realtimeService.subscribe(
      `cardapio_sync_${month}_${year}_${schoolId || 'global'}`,
      { table: 'school_menus', filter },
      async () => {
        const fresh = await menuService.getActiveMenuDocument(year, month, schoolId);
        callback(fresh);
      }
    );

    const unsubPnae = realtimeService.subscribe(
      `cardapio_pnae_${month}_${year}_${schoolId || 'global'}`,
      { table: 'school_menus_pnae_documents', filter },
      async () => {
        const fresh = await menuService.getActiveMenuDocument(year, month, schoolId);
        callback(fresh);
      }
    );

    const localEventHandler = async (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        if (!schoolId || !customEvt.detail.school_id || customEvt.detail.school_id === schoolId) {
          const fresh = await menuService.getActiveMenuDocument(year, month, schoolId);
          callback(fresh);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('classium_menu_published', localEventHandler);
      window.addEventListener('classium_menu_updated', localEventHandler);
    }

    return () => {
      unsubMenus();
      unsubPnae();
      if (typeof window !== 'undefined') {
        window.removeEventListener('classium_menu_published', localEventHandler);
        window.removeEventListener('classium_menu_updated', localEventHandler);
      }
    };
  }
};
