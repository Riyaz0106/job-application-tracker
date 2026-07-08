import { trpc } from './trpc';

// Minimal Phase 3 proof-of-life: prove the type-safe round trip works.
// Real UI is Phase 5 — this is deliberately ugly.
export default function App() {
  const utils = trpc.useUtils();

  // Fully typed from the server's AppRouter — `applications.data` is
  // Application[] with no hand-written types.
  const applications = trpc.applications.list.useQuery();

  const createApplication = trpc.applications.create.useMutation({
    onSuccess: () => {
      // Invalidate the list so React Query refetches and the new row appears.
      void utils.applications.list.invalidate();
    },
  });

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-slate-100">
      <h1 className="mb-4 text-2xl font-bold text-sky-400">
        Job Application Tracker
      </h1>

      <button
        type="button"
        className="mb-6 rounded bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
        disabled={createApplication.isPending}
        onClick={() =>
          createApplication.mutate({
            company: 'Test Co',
            role: 'Test Role',
            jobDescription: 'Placeholder job description.',
          })
        }
      >
        {createApplication.isPending ? 'Adding…' : 'Add test application'}
      </button>

      {applications.isLoading ? (
        <p className="text-slate-400">Loading…</p>
      ) : applications.data && applications.data.length > 0 ? (
        <ul className="space-y-2">
          {applications.data.map((app) => (
            <li
              key={app.id}
              className="rounded border border-slate-700 bg-slate-800 p-3"
            >
              <span className="font-medium">{app.company}</span>
              <span className="text-slate-400"> — {app.role}</span>
              <span className="ml-2 rounded bg-slate-700 px-2 py-0.5 text-xs">
                {app.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-400">No applications yet.</p>
      )}

      {applications.isError && (
        <p className="mt-4 text-red-400">Error: {applications.error.message}</p>
      )}
    </main>
  );
}
