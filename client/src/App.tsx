import { trpc } from './trpc';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';

// Auth gate. `auth.me` is the single source of truth: it returns the user
// (derived from the verified JWT) or null. Logged out -> login/register form;
// logged in -> the applications dashboard.
export default function App() {
  const me = trpc.auth.me.useQuery();

  if (me.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
        Loading…
      </main>
    );
  }

  if (!me.data) {
    return <AuthForm />;
  }

  return <Dashboard email={me.data.email} />;
}
