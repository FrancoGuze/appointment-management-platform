"use client";

interface SignupFormProps {
  fullName: string;
  email: string;
  password: string;
  isSubmitting: boolean;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function SignupForm({
  fullName,
  email,
  password,
  isSubmitting,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: SignupFormProps) {
  return (
    <section className="w-full rounded-xl border p-4">
      <h2 className="mb-4 text-xl font-semibold">Create account</h2>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <label className="text-sm font-medium" htmlFor="signup-full-name">
          Full name
        </label>
        <input
          id="signup-full-name"
          type="text"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={fullName}
          onChange={(event) => onFullNameChange(event.target.value)}
          placeholder="Jane Doe"
          autoComplete="name"
        />
        <label className="text-sm font-medium" htmlFor="signup-email">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="name@email.com"
          autoComplete="email"
        />
        <label className="text-sm font-medium" htmlFor="signup-password">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Choose a password"
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Sign up"}
        </button>
      </form>
    </section>
  );
}
