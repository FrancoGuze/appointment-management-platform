"use client";

import { LoginForm } from "@/components/users/login-form";
import { SignupForm } from "@/components/users/signup-form";

export type AuthModalView = "login" | "signup";

interface AuthModalProps {
  isOpen: boolean;
  view: AuthModalView;
  isLoggingIn: boolean;
  isSigningUp: boolean;
  loginValues: {
    email: string;
    password: string;
  };
  signupValues: {
    fullName: string;
    email: string;
    password: string;
  };
  onClose: () => void;
  onViewChange: (view: AuthModalView) => void;
  onLoginChange: (field: "email" | "password", value: string) => void;
  onSignupChange: (field: "fullName" | "email" | "password", value: string) => void;
  onLoginSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSignupSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function AuthModal({
  isOpen,
  view,
  isLoggingIn,
  isSigningUp,
  loginValues,
  signupValues,
  onClose,
  onViewChange,
  onLoginChange,
  onSignupChange,
  onLoginSubmit,
  onSignupSubmit,
}: AuthModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl border bg-background p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {view === "login" ? "Login" : "Create account"}
          </h2>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className={[
              "rounded-md border px-3 py-1 text-sm",
              view === "login" ? "bg-muted" : "hover:bg-muted",
            ].join(" ")}
            onClick={() => onViewChange("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={[
              "rounded-md border px-3 py-1 text-sm",
              view === "signup" ? "bg-muted" : "hover:bg-muted",
            ].join(" ")}
            onClick={() => onViewChange("signup")}
          >
            Sign up
          </button>
        </div>

        {view === "login" ? (
          <LoginForm
            email={loginValues.email}
            password={loginValues.password}
            isSubmitting={isLoggingIn}
            onEmailChange={(value) => onLoginChange("email", value)}
            onPasswordChange={(value) => onLoginChange("password", value)}
            onSubmit={onLoginSubmit}
          />
        ) : (
          <SignupForm
            fullName={signupValues.fullName}
            email={signupValues.email}
            password={signupValues.password}
            isSubmitting={isSigningUp}
            onFullNameChange={(value) => onSignupChange("fullName", value)}
            onEmailChange={(value) => onSignupChange("email", value)}
            onPasswordChange={(value) => onSignupChange("password", value)}
            onSubmit={onSignupSubmit}
          />
        )}
      </div>
    </div>
  );
}
