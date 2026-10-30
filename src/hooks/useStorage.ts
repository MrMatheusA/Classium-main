import { useState } from 'react';
import { storageService, UploadOptions } from '../services/StorageService';

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<any>(null);

  const uploadFile = async (options: Omit<UploadOptions, 'onProgress'>) => {
    setIsUploading(true);
    setError(null);
    setProgress(0);

    const result = await storageService.upload({
      ...options,
      onProgress: (p) => setProgress(p),
    });

    setIsUploading(false);
    if (result.error) {
      setError(result.error);
    }
    return result;
  };

  return { uploadFile, isUploading, progress, error };
}

export function useDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const getUrl = async (bucket: string, path: string, isPrivate = false) => {
    setIsDownloading(true);
    let url = '';
    if (isPrivate) {
      url = await storageService.getSignedUrl(bucket, path) || '';
    } else {
      url = storageService.getPublicUrl(bucket, path);
    }
    setIsDownloading(false);
    return url;
  };

  return { getUrl, isDownloading };
}

export function useDeleteFile() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteFile = async (bucket: string, path: string) => {
    setIsDeleting(true);
    const success = await storageService.delete(bucket, path);
    setIsDeleting(false);
    return success;
  };

  return { deleteFile, isDeleting };
}
