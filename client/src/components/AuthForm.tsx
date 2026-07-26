import { useState, type FormEvent } from 'react';
import { trpc } from '../trpc';
import { setToken } from '../lib/token';
import { Button } from './ui/Button';
import { ErrorNote } from './ui/feedback';
import { Field, TextInput } from './ui/fields';

// Login / register. Client-side validation surfaces inline; server errors
// (bad credentials, duplicate email, weak password) show in the banner.
export function AuthForm() {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const onAuthed = (token: string) => {
    setToken(token);
    void utils.auth.me.invalidate();
    void utils.applications.list.invalidate();
  };
  const login = trpc.auth.login.useMutation({
    onSuccess: (data) => onAuthed(data.token),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: (data) => onAuthed(data.token),
  });
  const pending = login.isPending || register.isPending;
  const serverError = login.error?.message ?? register.error?.message;

  function switchMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setErrors({});
    login.reset();
    register.reset();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = 'Enter a valid email address.';
    if (password.length < 8)
      next.password = 'Password must be at least 8 characters.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const credentials = { email, password };
    if (mode === 'login') login.mutate(credentials);
    else register.mutate(credentials);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-lg">
      <div className="w-full max-w-sm">
        <div className="mb-xl flex items-center gap-xs">
          <span className="text-signal" aria-hidden>
            ◆
          </span>
          <span className="font-mono text-sm uppercase tracking-widest text-content">
            Pipeline
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-content">
          {mode === 'login' ? 'Log in' : 'Create your account'}
        </h1>
        <p className="mt-2xs text-sm text-muted">Your job search, one board.</p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-lg flex flex-col gap-md"
        >
          {serverError && <ErrorNote>{serverError}</ErrorNote>}

          <Field label="Email" htmlFor="email" error={errors.email}>
            <TextInput
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((x) => ({ ...x, email: undefined }));
              }}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              autoFocus
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            error={errors.password}
            hint={mode === 'register' ? 'At least 8 characters.' : undefined}
          >
            <TextInput
              id="password"
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((x) => ({ ...x, password: undefined }));
              }}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
          </Field>

          <Button type="submit" loading={pending} className="mt-2xs">
            {mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="mt-md min-h-11 text-sm text-muted underline underline-offset-4 transition-colors duration-fast hover:text-content"
        >
          {mode === 'login'
            ? 'Need an account? Register'
            : 'Have an account? Log in'}
        </button>
      </div>
    </main>
  );
}
