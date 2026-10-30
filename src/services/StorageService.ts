import { supabase } from '../lib/supabase';
import { fileRegistryService } from './file_registry/file_registry.service.ts';

export interface UploadOptions {
  bucket: 'educamais-public' | 'educamais-private' | 'educamais-profiles';
  folder: string; // ex: 'students', 'finance'
  schoolId?: string; // Para compor o path: schoolId/folder/filename
  file: File;
  onProgress?: (progress: number) => void;
}

export interface FileMetadata {
  id: string;
  bucket_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  school_id?: string;
  module?: string;
  uploaded_by?: string;
}

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Faz o upload do arquivo para o bucket do Supabase
   */
  public async upload(options: UploadOptions): Promise<{ path: string; url: string; error?: any }> {
    const { bucket, folder, schoolId, file, onProgress } = options;

    const fileExt = file.name.split('.').pop();
    const uniqueName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    
    // Constrói o path: schoolId/folder/uniqueName (se houver schoolId)
    const filePath = schoolId ? `${schoolId}/${folder}/${uniqueName}` : `${folder}/${uniqueName}`;

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          // Nota: o onProgress real precisa da API xhr ou usar a biblioteca tus-js-client para uploads resumíveis
          // Para o wrapper padrão do supabase-js não há um callback nativo de progresso na v2 de forma simples,
          // recomendando-se usar TUS para arquivos grandes.
        });

      if (error) throw error;

      // Se for public, já pega a URL
      let url = '';
      if (bucket === 'educamais-public' || bucket === 'educamais-profiles') {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        url = publicUrlData.publicUrl;
      }

      // Registra no banco (file_registry)
      await this.registerFile({
        bucket_id: bucket,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        school_id: schoolId,
        module: folder,
      });

      return { path: filePath, url };
    } catch (error) {
      console.error('[StorageService] Upload Error:', error);
      return { path: '', url: '', error };
    }
  }

  /**
   * Obtém URL assinada para arquivos privados
   */
  public async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) {
      console.error('[StorageService] Signed URL Error:', error);
      return null;
    }
    return data.signedUrl;
  }

  /**
   * Obtém URL pública para arquivos
   */
  public getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Deleta (logic deletion)
   */
  public async delete(bucket: string, path: string): Promise<boolean> {
    try {
      // 1. Marca como deletado no banco (Lógico)
      await fileRegistryService.markAsDeleted(bucket, path);
      const dbError = null;

      if (dbError) throw dbError;

      // 2. Opcional: Deletar fisicamente do bucket agora ou deixar um cronjob limpar
      // await supabase.storage.from(bucket).remove([path]);

      return true;
    } catch (error) {
      console.error('[StorageService] Delete Error:', error);
      return false;
    }
  }

  private async registerFile(metadata: Partial<FileMetadata>) {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    const error = null;
    await fileRegistryService.create({
      bucket_id: metadata.bucket_id,
      file_path: metadata.file_path,
      file_name: metadata.file_name,
      file_size: metadata.file_size,
      mime_type: metadata.mime_type,
      school_id: metadata.school_id,
      module: metadata.module,
      uploaded_by: userId
    });

    if (error) console.error('[StorageService] File Registry Error:', error);
  }
}

export const storageService = StorageService.getInstance();
