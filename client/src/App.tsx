import { trpc } from './trpc';
import { clearToken } from './lib/token';
import { AuthForm } from './components/AuthForm';
import { Board } from './components/board/Board';

// Auth gate. `auth.me` is the source of truth: logged out -> auth screen,
// logged in -> the board.
export default function App() {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();

  if (me.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="animate-pulse font-mono text-sm uppercase tracking-widest text-muted">
          Loading…
        </span>
      </div>
    );
  }

  if (!me.data) {
    return <AuthForm />;
  }

  const logout = () => {
    clearToken();
    utils.auth.me.setData(undefined, null);
    utils.applications.list.reset();
  };

  return <Board email={me.data.email} onLogout={logout} />;
}
