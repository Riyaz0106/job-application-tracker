import { useState } from 'react';
import type { FormEvent } from 'react';
import { trpc } from '../trpc';
import { setToken } from '../lib/token';

// Combined login / register form. Ugly on purpose — real UI is Phase 5.
export function AuthForm() {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function onAuthed(token: string) {
    setToken(token);
    // Now authenticated: refetch identity (flips the gate to the dashboard) and
    // this user's applications.
    void utils.auth.me.invalidate();
    void utils.applications.list.invalidate();
  }

  const login = trpc.auth.login.useMutation({
    onSuccess: (data) => onAuthed(data.token),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: (data) => onAuthed(data.token),
  });

  const pending = login.isPending || register.isPending;
  const errorMessage = login.error?.message ?? register.error?.message;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const credentials = { email, password };
    if (mode === 'login') login.mutate(credentials);
    else register.mutate(credentials);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-8 text-slate-100">
      <h1 className="text-2xl font-bold text-sky-400">
        Job Application Tracker
      </h1>
      <form onSubmit={handleSubmit} className="flex w-72 flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded bg-slate-800 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-sky-500"
        />
        <input
          type="password"
          required
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded bg-slate-800 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          {pending ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
        className="text-xs text-slate-400 underline"
      >
        {mode === 'login'
          ? 'Need an account? Register'
          : 'Have an account? Log in'}
      </button>
      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
    </main>
  );
}
