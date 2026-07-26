import { useState, type FormEvent } from 'react';
import { trpc, type Interview } from '../../trpc';
import { Button } from '../ui/Button';
import { ErrorNote, Skeleton } from '../ui/feedback';
import { Field, TextArea, TextInput } from '../ui/fields';
import { formatDate, toDateInputValue } from '../../lib/format';

// Add/edit interview rounds for an application. Uses its own list query so CRUD
// invalidation is local. Round + date are required; notes optional.
export function InterviewSection({ applicationId }: { applicationId: string }) {
  const utils = trpc.useUtils();
  const interviews = trpc.interviews.listByApplication.useQuery({
    applicationId,
  });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refetch = () =>
    utils.interviews.listByApplication.invalidate({ applicationId });

  const create = trpc.interviews.create.useMutation({
    onSuccess: async () => {
      await refetch();
      setAdding(false);
    },
  });
  const update = trpc.interviews.update.useMutation({
    onSuccess: async () => {
      await refetch();
      setEditingId(null);
    },
  });
  const remove = trpc.interviews.delete.useMutation({ onSuccess: refetch });

  return (
    <section aria-label="Interviews" className="flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-wide text-muted">
          Interviews
        </h3>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
              create.reset();
            }}
            className="min-h-11 rounded-control px-sm text-sm text-signal transition-colors duration-fast hover:brightness-110"
          >
            + Add round
          </button>
        )}
      </div>

      {interviews.isLoading && <Skeleton className="h-16 w-full" />}
      {interviews.isError && (
        <ErrorNote>
          Couldn’t load interviews. Reopen this application to retry.
        </ErrorNote>
      )}

      {adding && (
        <InterviewFields
          submitLabel="Add"
          pending={create.isPending}
          error={create.error?.message}
          onCancel={() => setAdding(false)}
          onSubmit={(values) => create.mutate({ applicationId, ...values })}
        />
      )}

      <ul className="flex flex-col gap-xs">
        {interviews.data?.map((iv) =>
          editingId === iv.id ? (
            <li key={iv.id}>
              <InterviewFields
                initial={iv}
                submitLabel="Save"
                pending={update.isPending}
                error={update.error?.message}
                onCancel={() => setEditingId(null)}
                onSubmit={(values) =>
                  update.mutate({ id: iv.id, data: values })
                }
              />
            </li>
          ) : (
            <li
              key={iv.id}
              className="rounded-control border border-line bg-surface-2 p-sm"
            >
              <div className="flex items-start justify-between gap-sm">
                <div className="min-w-0">
                  <p className="font-medium text-content">{iv.round}</p>
                  <p className="font-mono text-xs text-muted">
                    {formatDate(iv.date)}
                  </p>
                  {iv.notes && (
                    <p className="mt-2xs text-sm text-muted">{iv.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(iv.id);
                      setAdding(false);
                      update.reset();
                    }}
                    className="min-h-11 rounded-control px-sm text-xs text-muted transition-colors duration-fast hover:text-content"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate({ id: iv.id })}
                    disabled={remove.isPending}
                    className="min-h-11 rounded-control px-sm text-xs text-status-rejected transition-colors duration-fast hover:brightness-110 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ),
        )}
      </ul>

      {!adding && interviews.data && interviews.data.length === 0 && (
        <p className="text-sm text-muted">
          No interviews logged yet. Add each round as you schedule it.
        </p>
      )}
    </section>
  );
}

function InterviewFields({
  initial,
  onSubmit,
  onCancel,
  pending,
  error,
  submitLabel,
}: {
  initial?: Interview;
  onSubmit: (values: { round: string; date: Date; notes: string }) => void;
  onCancel: () => void;
  pending: boolean;
  error?: string;
  submitLabel: string;
}) {
  const [round, setRound] = useState(initial?.round ?? '');
  const [date, setDate] = useState(toDateInputValue(initial?.date));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [fieldError, setFieldError] = useState<{
    round?: string;
    date?: string;
  }>({});

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: { round?: string; date?: string } = {};
    if (!round.trim()) next.round = 'Round name is required.';
    if (!date) next.date = 'Pick a date.';
    setFieldError(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({
      round: round.trim(),
      date: new Date(`${date}T00:00:00`),
      notes: notes.trim(),
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-sm rounded-control border border-signal/30 bg-surface-2 p-sm"
    >
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
        <Field label="Round" htmlFor="iv-round" error={fieldError.round}>
          <TextInput
            id="iv-round"
            value={round}
            placeholder="e.g. System design"
            onChange={(e) => setRound(e.target.value)}
            aria-invalid={Boolean(fieldError.round)}
            autoFocus
          />
        </Field>
        <Field label="Date" htmlFor="iv-date" error={fieldError.date}>
          <TextInput
            id="iv-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={Boolean(fieldError.date)}
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor="iv-notes">
        <TextArea
          id="iv-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-sm">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
