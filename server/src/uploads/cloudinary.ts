import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { extensionOf, type AttachmentKind } from './fileRules';

// The ONLY module that touches Cloudinary credentials. It runs in the Node
// process; nothing here is importable from the client (the client talks to our
// own /api/uploads route instead). Keeping the secret here is what makes the
// upload trustworthy: a browser-side "unsigned preset" upload would have to
// publish the cloud name and preset, letting anyone upload to the account.

let configured = false;

function configure(): void {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in server/.env.',
    );
  }
  if (configured) return;
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true, // always hand back https URLs
  });
  configured = true;
}

export type UploadedFile = {
  fileName: string;
  url: string;
  publicId: string;
  fileSize: number;
};

// Strip anything that would make a messy public_id, keep it recognisable.
function slugify(fileName: string): string {
  const ext = extensionOf(fileName);
  return (
    fileName
      .slice(0, fileName.length - ext.length)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'file'
  );
}

export async function uploadAttachment(opts: {
  buffer: Buffer;
  fileName: string;
  userId: string;
  applicationId: string;
  kind: AttachmentKind;
}): Promise<UploadedFile> {
  configure();
  const ext = extensionOf(opts.fileName);
  // resource_type 'raw' — these are documents, not images. Cloudinary stores and
  // serves them as-is and never executes them. The path is namespaced per user
  // and application so the storage layout mirrors the ownership model.
  const publicId = `job-tracker/${opts.userId}/${opts.applicationId}/${opts.kind}-${Date.now()}-${slugify(opts.fileName)}${ext}`;

  const result = await new Promise<{ secure_url: string; bytes: number }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'raw', public_id: publicId, overwrite: true },
        (error, uploaded) => {
          if (error) return reject(new Error(error.message));
          if (!uploaded)
            return reject(new Error('Cloudinary returned no result'));
          resolve({ secure_url: uploaded.secure_url, bytes: uploaded.bytes });
        },
      );
      stream.end(opts.buffer);
    },
  );

  return {
    fileName: opts.fileName,
    url: result.secure_url,
    publicId,
    fileSize: result.bytes,
  };
}

// Removes the stored file. Called when an attachment is removed AND when one is
// replaced, so storage never accumulates files the database no longer points at.
export async function destroyAttachment(publicId: string): Promise<void> {
  configure();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}

// How long a download link stays usable. Long enough to click and for the file
// to finish downloading; short enough that a copied URL isn't a lasting leak.
const DOWNLOAD_TTL_SECONDS = 300;

// Mints a short-lived, signed download URL for a stored file.
//
// These files are CVs — personal data — so they are NOT publicly readable: a
// plain delivery URL returns 401 for `raw` resources, and that's the behaviour
// we want to keep. Instead the server signs a URL on demand, only after it has
// checked that the caller owns the application (see applications.fileUrl). The
// signature is computed here with the API secret, which never leaves this process.
export function signedDownloadUrl(publicId: string): string {
  configure();
  return cloudinary.utils.private_download_url(publicId, '', {
    resource_type: 'raw',
    type: 'upload',
    expires_at: Math.floor(Date.now() / 1000) + DOWNLOAD_TTL_SECONDS,
  });
}
