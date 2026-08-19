// Upload rules — the single source of truth, imported by the server route AND by
// the client (so the message you see before uploading is the same one the server
// would give you).
//
// IMPORTANT: this module must stay dependency-free (no node: imports, no env, no
// secrets). The client bundles it directly; anything else added here would ship
// to the browser.

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export type AttachmentKind = 'cv' | 'coverLetter';

export const ATTACHMENT_KINDS: readonly AttachmentKind[] = [
  'cv',
  'coverLetter',
];

export const KIND_LABEL: Record<AttachmentKind, string> = {
  cv: 'CV',
  coverLetter: 'Cover letter',
};

// Extension -> the MIME types a browser may legitimately report for it.
// Both are checked: an extension is trivially renamed, and a Content-Type is
// client-supplied too, so neither alone is trustworthy — requiring them to AGREE
// raises the bar. (The real containment is that files are stored as Cloudinary
// `raw` resources, never executed, behind a size cap and an ownership check.)
//
// `application/octet-stream` is tolerated for .docx/.xlsx only: Windows and
// several browsers genuinely report that for Office files, and rejecting it
// would fail legitimate uploads. PDFs and plain text are reported reliably.
const OCTET = 'application/octet-stream';

export const ACCEPTED_TYPES: Record<string, readonly string[]> = {
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    OCTET,
  ],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    OCTET,
  ],
  '.txt': ['text/plain'],
};

export const ACCEPTED_EXTENSIONS = Object.keys(ACCEPTED_TYPES);

// For the file picker's `accept` attribute.
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(',');

export const WRONG_TYPE_MESSAGE = 'PDF, DOCX, XLSX and TXT only.';

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  const mb = bytes / (1024 * 1024);
  // One decimal below 10MB so "5.4MB" reads precisely against a 5MB limit, but
  // no pointless ".0" — the cap should read "5MB", not "5.0MB".
  const shown =
    mb < 10 ? mb.toFixed(1).replace(/\.0$/, '') : String(Math.round(mb));
  return `${shown}MB`;
}

export const MAX_SIZE_LABEL = formatBytes(MAX_FILE_BYTES);

// Returns a human-facing reason the file is unacceptable, or null if it's fine.
// Says what is wrong AND what would be right.
export function validateFile(input: {
  fileName: string;
  mimeType: string;
  size: number;
}): string | null {
  const ext = extensionOf(input.fileName);
  const allowedMimes = ACCEPTED_TYPES[ext];
  if (!allowedMimes) {
    return `${ext ? `“${ext}” files aren’t supported` : 'That file has no extension'} — ${WRONG_TYPE_MESSAGE}`;
  }
  // Strip any ";charset=..." parameter before comparing.
  const mime = input.mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!allowedMimes.includes(mime)) {
    return `That file says it is “${mime || 'unknown'}”, which doesn’t match a ${ext} file — ${WRONG_TYPE_MESSAGE}`;
  }
  if (input.size > MAX_FILE_BYTES) {
    return `File is ${formatBytes(input.size)} — the limit is ${MAX_SIZE_LABEL}.`;
  }
  if (input.size === 0) {
    return 'That file is empty — pick a file with content.';
  }
  return null;
}
