import { useState } from 'react';
import {
  formatBytes,
  validateFile,
  KIND_LABEL,
  type AttachmentKind,
} from '../../../../server/src/uploads/fileRules';
import { trpc, type ApplicationDetail } from '../../trpc';
import { uploadAttachment } from '../../lib/upload';
import { useToast } from '../ui/toastContext';
import { ConfirmDialog } from '../ui/Modal';
import { FileDropZone } from './FileDropZone';
import { formatDate } from '../../lib/format';

type Slot = {
  kind: AttachmentKind;
  fileName: string | null;
  url: string | null;
  fileSize: number | null;
  uploadedAt: Date | null;
};

export function AttachmentSection({ app }: { app: ApplicationDetail }) {
  const slots: Slot[] = [
    {
      kind: 'cv',
      fileName: app.cvFileName,
      url: app.cvFileUrl,
      fileSize: app.cvFileSize,
      uploadedAt: app.cvUploadedAt,
    },
    {
      kind: 'coverLetter',
      fileName: app.coverLetterFileName,
      url: app.coverLetterUrl,
      fileSize: app.coverLetterFileSize,
      uploadedAt: app.coverLetterUploadedAt,
    },
  ];

  return (
    <section aria-label="Attachments" className="flex flex-col gap-sm">
      <h3 className="font-mono text-xs uppercase tracking-wide text-muted">
        Attachments
      </h3>
      {slots.map((slot) => (
        <AttachmentSlot key={slot.kind} applicationId={app.id} slot={slot} />
      ))}
    </section>
  );
}

function AttachmentSlot({
  applicationId,
  slot,
}: {
  applicationId: string;
  slot: Slot;
}) {
  const utils = trpc.useUtils();
  const toast = useToast();
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const label = KIND_LABEL[slot.kind];

  const refresh = async () => {
    await Promise.all([
      utils.applications.byId.invalidate({ id: applicationId }),
      utils.applications.list.invalidate(),
    ]);
  };

  const attach = trpc.applications.attachFile.useMutation({
    onSuccess: async (_r, vars) => {
      await refresh();
      toast.success(`Attached ${vars.fileName}`);
    },
    onError: (e) => toast.error(`Couldn’t save the attachment — ${e.message}`),
    onSettled: () => setProgress(null),
  });

  const remove = trpc.applications.removeFile.useMutation({
    onSuccess: async () => {
      await refresh();
      setConfirmOpen(false);
      toast.success(`Removed ${label.toLowerCase()}`);
    },
    onError: (e) => {
      setConfirmOpen(false);
      toast.error(`Couldn’t remove the file — ${e.message}`);
    },
  });

  const uploading = progress !== null || attach.isPending;

  async function handleFile(file: File) {
    // Check locally first so the exact size/type problem is reported instantly,
    // without spending a round trip. The server re-checks — this is convenience,
    // not the security boundary.
    const reason = validateFile({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });
    if (reason) {
      toast.error(reason);
      return;
    }

    setProgress(0);
    try {
      const uploaded = await uploadAttachment({
        file,
        applicationId,
        kind: slot.kind,
        onProgress: setProgress,
      });
      // Bytes are stored; now record the metadata through tRPC.
      attach.mutate({ applicationId, kind: slot.kind, ...uploaded });
    } catch (error) {
      setProgress(null);
      toast.error(
        error instanceof Error ? error.message : 'Upload failed. Try again.',
      );
    }
  }

  return (
    <div className="rounded-control border border-line bg-surface-2 p-sm">
      <div className="mb-xs flex items-center justify-between gap-sm">
        <span className="font-mono text-xs uppercase tracking-wide text-content">
          {label}
        </span>
        {slot.url && !uploading && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={remove.isPending}
            className="min-h-11 rounded-control px-sm text-xs text-status-rejected transition-colors duration-fast hover:brightness-110 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {slot.url && !uploading ? (
        <div className="flex flex-wrap items-center justify-between gap-xs">
          <div className="min-w-0">
            <a
              href={slot.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm text-signal underline underline-offset-4 transition-colors duration-fast hover:brightness-110"
            >
              {slot.fileName ?? 'View file'}
            </a>
            <p className="font-mono text-xs text-muted">
              {slot.fileSize != null ? formatBytes(slot.fileSize) : '—'}
              {slot.uploadedAt ? ` · ${formatDate(slot.uploadedAt)}` : ''}
            </p>
          </div>
          <a
            href={slot.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center rounded-control border border-line px-sm text-xs text-content transition-colors duration-fast hover:border-signal/50"
          >
            View
          </a>
        </div>
      ) : (
        <FileDropZone
          label={label}
          onFile={(f) => void handleFile(f)}
          busy={uploading}
          disabled={uploading}
          progress={progress ?? undefined}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => remove.mutate({ applicationId, kind: slot.kind })}
        title={`Remove ${label.toLowerCase()}`}
        message={`Remove ${slot.fileName ?? 'this file'}? It will be deleted from storage and can’t be undone.`}
        confirmLabel="Remove"
        loading={remove.isPending}
      />
    </div>
  );
}
