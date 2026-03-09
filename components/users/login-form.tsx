"use client";

interface LoginFormProps {
  email: string;
  password: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function LoginForm({
  email,
  password,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <section className="w-full rounded-xl border p-4">
      <h2 className="mb-4 text-xl font-semibold">Login</h2>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <label className="text-sm font-medium" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="name@email.com"
          autoComplete="email"
        />
        <label className="text-sm font-medium" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Log in..." : "Log in"}
        </button>
      </form>
    </section>
  );
}
