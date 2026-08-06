import { getToken } from './token';
import type { AttachmentKind } from '../../../server/src/uploads/fileRules';

export type UploadedFile = {
  fileName: string;
  url: string;
  publicId: string;
  fileSize: number;
};

// XMLHttpRequest rather than fetch: fetch has no upload-progress events, and a
// multi-megabyte upload with no feedback feels broken. Everything else in the
// app still goes through tRPC — this is the one binary path.
export function uploadAttachment(opts: {
  file: File;
  applicationId: string;
  kind: AttachmentKind;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', opts.file);

    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `/api/uploads/${encodeURIComponent(opts.applicationId)}/${opts.kind}`,
    );
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        opts.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText) as unknown;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadedFile);
        return;
      }
      const message =
        body && typeof body === 'object' && 'error' in body
          ? String((body as { error: unknown }).error)
          : `Upload failed (${xhr.status}). Try again.`;
      reject(new Error(message));
    });

    xhr.addEventListener('error', () =>
      reject(new Error('Network error — check your connection and try again.')),
    );
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));

    opts.signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(form);
  });
}
