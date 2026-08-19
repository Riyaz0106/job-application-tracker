import { useEffect, useState, type DragEvent, type FormEvent } from 'react';
import {
  extensionOf,
  formatBytes,
  validateFile,
  MAX_FILE_BYTES,
  MAX_SIZE_LABEL,
  type AttachmentKind,
} from '../../../../server/src/uploads/fileRules';
import { trpc, type Application } from '../../trpc';
import { uploadAttachment } from '../../lib/upload';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ErrorNote } from '../ui/feedback';
import { Field, Select, TextArea, TextInput } from '../ui/fields';
import { FileDropZone } from './FileDropZone';
import {
  deriveDefaultStatus,
  STATUS_ORDER,
  STATUS_LABEL,
  type Status,
} from '../../lib/status';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatSalary,
  parseSalary,
  placeholderFor,
  validateSalary,
  type CurrencyCode,
} from '../../lib/salary';
import { toDateInputValue } from '../../lib/format';
import { useToast } from '../ui/toastContext';

type FormState = {
  company: string;
  role: string;
  jobDescription: string;
  status: Status;
  appliedDate: string;
  salary: string;
  currency: CurrencyCode;
  recruiter: string;
  notes: string;
};

// Files chosen before the application exists. Held as File objects in memory
// until there's an id to attach them to.
type StagedFiles = Partial<Record<AttachmentKind, File>>;

// How each kind reads inside a sentence ("the CV didn't upload").
const KIND_IN_SENTENCE: Record<AttachmentKind, string> = {
  cv: 'CV',
  coverLetter: 'cover letter',
};

function initialState(app?: Application): FormState {
  const salary = parseSalary(app?.salary);
  return {
    company: app?.company ?? '',
    role: app?.role ?? '',
    jobDescription: app?.jobDescription ?? '',
    status: app?.status ?? 'DRAFTING',
    // Blank on create so "have you actually applied?" is a real signal for the
    // derived status (see deriveDefaultStatus) rather than always pre-answered.
    appliedDate: app ? toDateInputValue(app.appliedDate) : '',
    salary: app ? salary.amount : '',
    currency: app ? salary.currency : DEFAULT_CURRENCY,
    recruiter: app?.recruiter ?? '',
    notes: app?.notes ?? '',
  };
}

// Create/edit form. `application` undefined = create. Inline per-field validation
// runs on submit; server errors surface in a banner. Buttons disable while saving.
export function ApplicationForm({
  open,
  onClose,
  application,
  onOpenDetail,
}: {
  open: boolean;
  onClose: () => void;
  application?: Application;
  // Called when a created application needs the user's attention — currently
  // when an attachment failed to upload and they need the retry path.
  onOpenDetail?: (applicationId: string) => void;
}) {
  const utils = trpc.useUtils();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(application));
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  // Tracks whether the user has picked a status themselves. Once true, their
  // choice wins for the rest of this dialog and is never re-derived.
  const [statusPicked, setStatusPicked] = useState(false);
  const [staged, setStaged] = useState<StagedFiles>({});
  const [uploadProgress, setUploadProgress] = useState<
    Partial<Record<AttachmentKind, number>>
  >({});
  const [uploading, setUploading] = useState(false);
  const isEdit = Boolean(application);

  // On create the status field follows field completeness live, so the default
  // is visible as you type. On edit (or after an explicit pick) it's yours.
  const effectiveStatus: Status =
    isEdit || statusPicked ? form.status : deriveDefaultStatus(form);

  const create = trpc.applications.create.useMutation();
  const attach = trpc.applications.attachFile.useMutation();
  const update = trpc.applications.update.useMutation({
    onSuccess: (saved) => {
      toast.success(`Saved ${saved.company}`);
      void utils.applications.list.invalidate();
      if (application)
        void utils.applications.byId.invalidate({ id: application.id });
      onClose();
    },
    onError: () =>
      toast.error(
        `Couldn’t save ${form.company.trim() || 'the application'} — check the fields and try again.`,
      ),
  });

  const busy = create.isPending || update.isPending || uploading;
  const serverError = create.error?.message ?? update.error?.message;

  // Reset fresh each time the dialog opens or targets a different application.
  useEffect(() => {
    if (open) {
      setForm(initialState(application));
      setErrors({});
      setStatusPicked(false);
      setStaged({});
      setUploadProgress({});
      setUploading(false);
      create.reset();
      update.reset();
    }
    // create/update are stable react-query handles; excluded intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, application]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  // Staged attachments -----------------------------------------------------
  function stageFile(kind: AttachmentKind, file: File) {
    // Reject at selection time, not at submit — nobody should fill in a whole
    // form before being told their 10MB file was never going to work.
    const reason = validateFile({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });
    if (reason) {
      toast.error(reason);
      return;
    }
    setStaged((s) => ({ ...s, [kind]: file }));
  }

  function unstageFile(kind: AttachmentKind) {
    setStaged((s) => {
      const next = { ...s };
      delete next[kind];
      return next;
    });
  }

  // Job description .txt import -------------------------------------------
  async function importJobDescription(file: File) {
    if (extensionOf(file.name) !== '.txt') {
      toast.error(
        `“${file.name}” isn’t a .txt file — import plain text, or paste the description instead.`,
      );
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(
        `File is ${formatBytes(file.size)} — the limit is ${MAX_SIZE_LABEL}.`,
      );
      return;
    }
    try {
      set('jobDescription', await file.text());
      toast.success(`Imported ${file.name}`);
    } catch {
      toast.error(`Couldn’t read ${file.name} — try pasting the text instead.`);
    }
  }

  // Submit -----------------------------------------------------------------
  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.company.trim()) next.company = 'Company is required.';
    if (!form.role.trim()) next.role = 'Role is required.';
    if (!form.jobDescription.trim())
      next.jobDescription =
        'Paste the job description — you’ll match against it later.';
    const salaryError = validateSalary(form.salary);
    if (salaryError) next.salary = salaryError;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildPayload() {
    return {
      company: form.company.trim(),
      role: form.role.trim(),
      jobDescription: form.jobDescription.trim(),
      status: effectiveStatus,
      salary: formatSalary(form.currency, form.salary),
      recruiter: form.recruiter.trim(),
      notes: form.notes.trim(),
      appliedDate: form.appliedDate
        ? new Date(`${form.appliedDate}T00:00:00`)
        : undefined,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (application) {
      update.mutate({ id: application.id, data: buildPayload() });
      return;
    }

    // Create, then upload anything staged against the brand-new id.
    let created: Application;
    try {
      created = await create.mutateAsync(buildPayload());
    } catch {
      toast.error(
        `Couldn’t add ${form.company.trim() || 'the application'} — check the fields and try again.`,
      );
      return;
    }

    const kinds = Object.keys(staged) as AttachmentKind[];
    const failed: AttachmentKind[] = [];
    if (kinds.length > 0) {
      setUploading(true);
      for (const kind of kinds) {
        const file = staged[kind];
        if (!file) continue;
        try {
          const uploaded = await uploadAttachment({
            file,
            applicationId: created.id,
            kind,
            onProgress: (percent) =>
              setUploadProgress((p) => ({ ...p, [kind]: percent })),
          });
          await attach.mutateAsync({
            applicationId: created.id,
            kind,
            ...uploaded,
          });
        } catch {
          failed.push(kind);
        }
      }
      setUploading(false);
    }

    await utils.applications.list.invalidate();

    if (failed.length > 0) {
      // The application is deliberately NOT rolled back: the typed-in details
      // are worth far more than the attachment, and re-entering them would be
      // the harsher failure. One toast for all failures, then open the detail
      // view so the retry path is already in front of them.
      const names = failed.map((k) => KIND_IN_SENTENCE[k]).join(' and ');
      const it = failed.length > 1 ? 'them' : 'it';
      toast.error(
        `Application created, but the ${names} didn’t upload — try attaching ${it} from the detail view.`,
      );
      onOpenDetail?.(created.id);
    } else {
      toast.success(`Added ${created.company}`);
    }
    onClose();
  }

  const submitLabel = isEdit
    ? 'Save changes'
    : uploading
      ? 'Uploading files…'
      : 'Create application';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit application' : 'New application'}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-md"
        noValidate
      >
        {serverError && <ErrorNote>{serverError}</ErrorNote>}

        <Field label="Company" htmlFor="f-company" error={errors.company}>
          <TextInput
            id="f-company"
            value={form.company}
            onChange={(e) => set('company', e.target.value)}
            aria-invalid={Boolean(errors.company)}
            aria-describedby={errors.company ? 'f-company-error' : undefined}
            autoFocus
          />
        </Field>

        <Field label="Role" htmlFor="f-role" error={errors.role}>
          <TextInput
            id="f-role"
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? 'f-role-error' : undefined}
          />
        </Field>

        <Field
          label="Job description"
          htmlFor="f-jd"
          error={errors.jobDescription}
          hint="Type or paste it here, or drop a .txt file below."
        >
          {/* Wrapping both means a file dropped anywhere in this area imports —
              including on the textarea, where the browser would otherwise just
              navigate away to the file. */}
          <div
            onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void importJobDescription(file);
            }}
            className="flex flex-col gap-xs"
          >
            <TextArea
              id="f-jd"
              rows={5}
              value={form.jobDescription}
              onChange={(e) => set('jobDescription', e.target.value)}
              aria-invalid={Boolean(errors.jobDescription)}
              aria-describedby={
                errors.jobDescription ? 'f-jd-error' : undefined
              }
            />
            <FileDropZone
              label="job description"
              prompt="Or drop a .txt job description here, or"
              accept=".txt,text/plain"
              hint={`TXT only · max ${MAX_SIZE_LABEL} · fills the box above`}
              onFile={(file) => void importJobDescription(file)}
            />
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Field
            label="Status"
            htmlFor="f-status"
            hint={
              isEdit || statusPicked
                ? undefined
                : 'Set from the fields above. Pick one to override.'
            }
          >
            <Select
              id="f-status"
              value={effectiveStatus}
              onChange={(e) => {
                setStatusPicked(true);
                set('status', e.target.value as Status);
              }}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Applied date" htmlFor="f-date">
            <TextInput
              id="f-date"
              type="date"
              value={form.appliedDate}
              onChange={(e) => set('appliedDate', e.target.value)}
            />
          </Field>
          <Field label="Salary" htmlFor="f-salary" error={errors.salary}>
            <div className="flex gap-xs">
              <div className="w-24 shrink-0">
                <Select
                  id="f-currency"
                  aria-label="Salary currency"
                  value={form.currency}
                  onChange={(e) =>
                    set('currency', e.target.value as CurrencyCode)
                  }
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </Select>
              </div>
              <TextInput
                id="f-salary"
                value={form.salary}
                placeholder={placeholderFor(form.currency)}
                onChange={(e) => set('salary', e.target.value)}
                aria-invalid={Boolean(errors.salary)}
                aria-describedby={errors.salary ? 'f-salary-error' : undefined}
              />
            </div>
          </Field>
          <Field label="Recruiter" htmlFor="f-recruiter">
            <TextInput
              id="f-recruiter"
              value={form.recruiter}
              onChange={(e) => set('recruiter', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Notes" htmlFor="f-notes">
          <TextArea
            id="f-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>

        {/* Attachments are staged only while creating. Once the application
            exists the detail slide-over owns them, so there's one place that
            can replace or delete a stored file. */}
        {!isEdit && (
          <fieldset className="flex flex-col gap-sm">
            <legend className="mb-2xs font-mono text-xs uppercase tracking-wide text-muted">
              Attachments (optional)
            </legend>
            {(['cv', 'coverLetter'] as const).map((kind) => (
              <StagedAttachment
                key={kind}
                kind={kind}
                file={staged[kind]}
                progress={uploadProgress[kind]}
                uploading={uploading}
                onStage={(file) => stageFile(kind, file)}
                onRemove={() => unstageFile(kind)}
              />
            ))}
          </fieldset>
        )}

        <div className="mt-sm flex justify-end gap-sm">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// One staged slot: a drop zone until a file is chosen, then a summary row with
// its size and a way to drop it again before submitting.
function StagedAttachment({
  kind,
  file,
  progress,
  uploading,
  onStage,
  onRemove,
}: {
  kind: AttachmentKind;
  file: File | undefined;
  progress: number | undefined;
  uploading: boolean;
  onStage: (file: File) => void;
  onRemove: () => void;
}) {
  const label = kind === 'cv' ? 'CV' : 'Cover letter';

  if (!file) {
    return <FileDropZone label={label} onFile={onStage} disabled={uploading} />;
  }

  return (
    <div className="rounded-control border border-line bg-surface-2 p-sm">
      <div className="flex items-center justify-between gap-sm">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="truncate text-sm text-content">{file.name}</p>
          <p className="font-mono text-xs text-muted">
            {formatBytes(file.size)}
            {uploading
              ? ` · uploading ${progress ?? 0}%`
              : ' · ready to upload'}
          </p>
        </div>
        {!uploading && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove staged ${label}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:text-content"
          >
            ✕
          </button>
        )}
      </div>
      {uploading && (
        <div
          className="mt-xs h-1 overflow-hidden rounded-pill bg-surface"
          role="progressbar"
          aria-valuenow={progress ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Uploading ${label}`}
        >
          <div
            className="h-full bg-signal transition-[width] duration-fast ease-out"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      )}
    </div>
  );
}
