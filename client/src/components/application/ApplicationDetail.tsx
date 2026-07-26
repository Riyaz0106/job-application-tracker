import { useState, type ReactNode } from 'react';
import { trpc, type Application } from '../../trpc';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ErrorNote, MatchRing, Skeleton, StatusBadge } from '../ui/feedback';
import { InterviewSection } from './InterviewSection';
import { formatDate } from '../../lib/format';
import { useToast } from '../ui/toastContext';

// Right slide-over showing everything about one application + its interviews.
// The byId query is gated on `id` (hooks stay unconditional).
export function ApplicationDetail({
  id,
  onClose,
  onEdit,
}: {
  id: string | null;
  onClose: () => void;
  onEdit: (app: Application) => void;
}) {
  const utils = trpc.useUtils();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = trpc.applications.byId.useQuery(
    { id: id ?? '' },
    { enabled: id !== null },
  );
  const del = trpc.applications.delete.useMutation({
    onSuccess: (deleted) => {
      void utils.applications.list.invalidate();
      setConfirmOpen(false);
      onClose();
      toast.success(`Deleted ${deleted.company}`);
    },
    onError: () => {
      setConfirmOpen(false);
      toast.error(
        `Couldn’t delete ${query.data?.company ?? 'that application'} — try again.`,
      );
    },
  });
  const app = query.data;

  return (
    <Modal
      open={id !== null}
      onClose={onClose}
      title="Application"
      side="right"
    >
      {query.isLoading && <DetailSkeleton />}
      {query.isError && (
        <ErrorNote>
          Couldn’t load this application. Close and reopen it.
        </ErrorNote>
      )}

      {app && (
        <div className="flex flex-col gap-lg">
          <div>
            <div className="flex items-start justify-between gap-sm">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold text-content">
                  {app.company}
                </h3>
                <p className="truncate text-muted">{app.role}</p>
              </div>
              {app.matchScore != null && <MatchRing score={app.matchScore} />}
            </div>
            <div className="mt-sm">
              <StatusBadge status={app.status} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-sm">
            <Meta label="Applied" value={formatDate(app.appliedDate)} />
            <Meta label="Salary" value={app.salary || '—'} />
            <Meta label="Recruiter" value={app.recruiter || '—'} />
            <Meta label="Updated" value={formatDate(app.updatedAt)} />
          </dl>

          <Block label="Job description">{app.jobDescription}</Block>
          {app.notes && <Block label="Notes">{app.notes}</Block>}

          <InterviewSection applicationId={app.id} />

          <div className="flex justify-between gap-sm border-t border-line pt-lg">
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => onEdit(app)}>
              Edit application
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => app && del.mutate({ id: app.id })}
        title="Delete application"
        message={
          app
            ? `Delete ${app.company} — ${app.role}? This also removes its interview rounds and can’t be undone.`
            : ''
        }
        loading={del.isPending}
      />
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-2xs text-content">{value}</dd>
    </div>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2xs font-mono text-xs uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-content">
        {children}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
