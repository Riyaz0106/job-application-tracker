import { useEffect, useState, type FormEvent } from 'react';
import { trpc, type Application } from '../../trpc';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ErrorNote } from '../ui/feedback';
import { Field, Select, TextArea, TextInput } from '../ui/fields';
import { STATUS_ORDER, STATUS_LABEL, type Status } from '../../lib/status';
import { toDateInputValue } from '../../lib/format';

type FormState = {
  company: string;
  role: string;
  jobDescription: string;
  status: Status;
  appliedDate: string;
  salary: string;
  recruiter: string;
  notes: string;
};

function initialState(app?: Application): FormState {
  return {
    company: app?.company ?? '',
    role: app?.role ?? '',
    jobDescription: app?.jobDescription ?? '',
    status: app?.status ?? 'APPLIED',
    appliedDate: toDateInputValue(app?.appliedDate ?? new Date()),
    salary: app?.salary ?? '',
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
}: {
  open: boolean;
  onClose: () => void;
  application?: Application;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<FormState>(() => initialState(application));
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const isEdit = Boolean(application);

  const onSuccess = () => {
    void utils.applications.list.invalidate();
    if (application)
      void utils.applications.byId.invalidate({ id: application.id });
    onClose();
  };
  const create = trpc.applications.create.useMutation({ onSuccess });
  const update = trpc.applications.update.useMutation({ onSuccess });
  const pending = create.isPending || update.isPending;
  const serverError = create.error?.message ?? update.error?.message;

  // Reset fresh each time the dialog opens or targets a different application.
  useEffect(() => {
    if (open) {
      setForm(initialState(application));
      setErrors({});
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.company.trim()) next.company = 'Company is required.';
    if (!form.role.trim()) next.role = 'Role is required.';
    if (!form.jobDescription.trim())
      next.jobDescription =
        'Paste the job description — you’ll match against it later.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      company: form.company.trim(),
      role: form.role.trim(),
      jobDescription: form.jobDescription.trim(),
      status: form.status,
      salary: form.salary.trim(),
      recruiter: form.recruiter.trim(),
      notes: form.notes.trim(),
      appliedDate: form.appliedDate
        ? new Date(`${form.appliedDate}T00:00:00`)
        : undefined,
    };

    if (application) update.mutate({ id: application.id, data: payload });
    else create.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit application' : 'New application'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-md" noValidate>
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
        >
          <TextArea
            id="f-jd"
            rows={5}
            value={form.jobDescription}
            onChange={(e) => set('jobDescription', e.target.value)}
            aria-invalid={Boolean(errors.jobDescription)}
            aria-describedby={errors.jobDescription ? 'f-jd-error' : undefined}
          />
        </Field>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Field label="Status" htmlFor="f-status">
            <Select
              id="f-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as Status)}
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
          <Field label="Salary" htmlFor="f-salary">
            <TextInput
              id="f-salary"
              value={form.salary}
              placeholder="e.g. £90k–110k"
              onChange={(e) => set('salary', e.target.value)}
            />
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

        <div className="mt-sm flex justify-end gap-sm">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create application'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
