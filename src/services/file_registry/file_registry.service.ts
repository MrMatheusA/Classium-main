import { BaseService } from '../shared/base.service';

export interface FileRegistry {
  id: string;
  bucket_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  school_id?: string;
  module?: string;
  uploaded_by?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
}

class FileRegistryService extends BaseService<FileRegistry> {
  constructor() {
    super('file_registry');
  }

  async markAsDeleted(bucketId: string, filePath: string) {
    try {
      const data = await this.getAll({ filters: { bucket_id: bucketId, file_path: filePath } });
      if (data && data.length > 0) {
        await this.update(data[0].id, { is_deleted: true, deleted_at: new Date().toISOString() });
      }
    } catch (e) {
      console.error('Error marking file as deleted', e);
    }
  }
}

export const fileRegistryService = new FileRegistryService();
