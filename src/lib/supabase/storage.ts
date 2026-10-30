// CLASSIUM SUPABASE STORAGE SERVICE
// Managed Storage buckets for Photos, Logos, PDFs, Menus, Notices, and Official Documents.

import { getSupabase } from './client';
import { getSupabaseEnvConfig } from './config';

export type EducaBucketName = 
  | 'educa_fotos' 
  | 'educa_logos' 
  | 'educa_pdfs' 
  | 'educa_cardapios' 
  | 'educa_comunicados' 
  | 'educa_documentos';

export interface StorageUploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
  isSimulated?: boolean;
}

export class SupabaseStorageService {
  
  // Upload a file to a Supabase Storage bucket
  public async uploadFile(
    bucket: EducaBucketName, 
    filePath: string, 
    file: File | Blob,
    options: { contentType?: string; cacheControl?: string } = {}
  ): Promise<StorageUploadResult> {
    const config = getSupabaseEnvConfig();

    if (!config.isConfigured) {
      return {
        success: false,
        error: 'Supabase Storage não configurado ou indisponível.',
        isSimulated: false
      };
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          contentType: options.contentType || file.type,
          cacheControl: options.cacheControl || '3600'
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);

      return {
        success: true,
        path: data.path,
        publicUrl: publicData.publicUrl
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao realizar upload no Supabase Storage' };
    }
  }

  // Get public URL for an existing file
  public getPublicUrl(bucket: EducaBucketName, filePath: string): string {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured) {
      return `https://placeholder.supabase.co/storage/v1/object/public/${bucket}/${filePath}`;
    }

    const supabase = getSupabase();
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  // Remove a file from bucket
  public async deleteFile(bucket: EducaBucketName, filePath: string): Promise<{ success: boolean; error?: string }> {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured) return { success: false, error: 'Supabase Storage não configurado ou indisponível.' };

    try {
      const supabase = getSupabase();
      const { error } = await supabase.storage.from(bucket).remove([filePath]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao remover arquivo' };
    }
  }

  // List items inside bucket folder
  public async listFiles(bucket: EducaBucketName, path: string = '') {
    const config = getSupabaseEnvConfig();
    if (!config.isConfigured) return { data: [], error: null };

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage.from(bucket).list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
}

export const supabaseStorage = new SupabaseStorageService();
