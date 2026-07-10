import { trpc } from '../trpc';
import { clearToken } from '../lib/token';

// Logged-in view: the current user's applications + an "add" button + logout.
export function Dashboard({ email }: { email: string }) {
  const utils = trpc.useUtils();
  const applications = trpc.applications.list.useQuery();
  const createApplication = trpc.applications.create.useMutation({
    onSuccess: () => {
      void utils.applications.list.invalidate();
    },
  });

  function handleLogout() {
    clearToken();
    // Flip the gate back to the login screen immediately (auth.me -> null) and
    // drop this user's cached data so nothing leaks into the next session.
    utils.auth.me.setData(undefined, null);
    utils.applications.list.reset();
  }

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sky-400">
          Job Application Tracker
        </h1>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span>{email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600"
          >
            Log out
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={createApplication.isPending}
        onClick={() =>
          createApplication.mutate({
            company: 'Test Co',
            role: 'Test Role',
            jobDescription: 'Placeholder job description.',
          })
        }
        className="mb-6 rounded bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
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
