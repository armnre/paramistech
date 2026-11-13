// Standalone replacement for "zitejs/upload": stores files on the server (UPLOAD_DIR).
import { useCallback, useState } from 'react';

export function useUpload() {
  const [isUploading, setUploading] = useState(false);
  const upload = useCallback(async (file: File | Blob, filename?: string) => {
    setUploading(true);
    try {
      const name = filename || (file as File).name || 'file.bin';
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'x-filename': encodeURIComponent(name) }, body: file });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || 'آپلود ناموفق بود');
      return { url: json.url as string };
    } finally { setUploading(false); }
  }, []);
  return { upload, isUploading };
}
