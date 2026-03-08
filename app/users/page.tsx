"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SlotCalendar } from "@/components/slot-calendar";
import { LoginForm } from "@/components/users/login-form";
import { SignupForm } from "@/components/users/signup-form";
import type { CalendarSlot } from "@/src/services/slots";

interface ApiListResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface Appointment {
  id: string;
  slot_id: string;
  user_id: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  created_at: string;
}

interface AppointmentResponse {
  ok: boolean;
  data?: Appointment;
  error?: string;
}

interface AuthUser {
  userId: string;
  email: string;
}

interface LoginResponse {
  ok: boolean;
  data?: AuthUser;
  error?: string;
}

interface SignupResponse {
  ok: boolean;
  data?: { userId: string; email: string };
  error?: string;
}

const USER_SESSION_STORAGE_KEY = "booking_user_session";

export default function UsersPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [signupFullName, setSignupFullName] = useState<string>("");
  const [signupEmail, setSignupEmail] = useState<string>("");
  const [signupPassword, setSignupPassword] = useState<string>("");

  const loadSlots = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/slots", { method: "GET" });
      const payload = (await response.json()) as ApiListResponse<CalendarSlot[]>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not fetch slots");
      }

      setSlots(payload.data);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const storedSession = window.localStorage.getItem(USER_SESSION_STORAGE_KEY);

      if (storedSession) {
        const parsedUser = JSON.parse(storedSession) as AuthUser;
        if (parsedUser.userId && parsedUser.email) {
          setAuthUser(parsedUser);
        }
      }
    } catch {
      window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!authUser) {
      setSlots([]);
      setIsLoading(false);
      return;
    }

    void loadSlots();
  }, [authUser, loadSlots]);

  const hasSlots = slots.length > 0;

  async function onLogin(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!loginEmail.trim() || !loginPassword) {
      setError("Email and password are required");
      return;
    }

    setIsLoggingIn(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not log in");
      }

      setAuthUser(payload.data);
      window.localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(payload.data));
      setLoginPassword("");
      setSuccess("Login successful");

      const redirectPath = new URLSearchParams(window.location.search).get("redirect");
      if (redirectPath && redirectPath.startsWith("/")) {
        router.push(redirectPath);
      }
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function onSignup(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!signupFullName.trim() || !signupEmail.trim() || !signupPassword) {
      setError("full_name, email and password are required");
      return;
    }

    setIsSigningUp(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: signupFullName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
        }),
      });

      const payload = (await response.json()) as SignupResponse;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not create account");
      }

      setSuccess("Account created. You can sign in now.");
      setLoginEmail(signupEmail.trim());
      setSignupFullName("");
      setSignupEmail("");
      setSignupPassword("");
    } catch (signupError) {
      const message = signupError instanceof Error ? signupError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsSigningUp(false);
    }
  }

  async function onLogout(): Promise<void> {
    try {
      await fetch("/api/users/logout", { method: "POST" });
    } catch {
      // Client cleanup still runs even if API call fails.
    }

    setAuthUser(null);
    setLoginPassword("");
    setSlots([]);
    setError("");
    setSuccess("Session closed");
    window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
  }

  async function onBook(slotId: string): Promise<void> {
    if (!authUser) {
      setError("You must be logged in to book an appointment");
      return;
    }

    setIsBooking(true);
    setActiveSlotId(slotId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });

      const payload = (await response.json()) as AppointmentResponse;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not create appointment");
      }

      setSuccess("Appointment booked successfully");
      await loadSlots();
    } catch (bookError) {
      const message = bookError instanceof Error ? bookError.message : "Unexpected error";
      setError(message);
    } finally {
      setIsBooking(false);
      setActiveSlotId(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Users portal</h1>

      {!isHydrated ? <p>Loading session...</p> : null}

      {isHydrated && !authUser ? (
        <section className="grid gap-4 md:grid-cols-2">
          <SignupForm
            fullName={signupFullName}
            email={signupEmail}
            password={signupPassword}
            isSubmitting={isSigningUp}
            onFullNameChange={setSignupFullName}
            onEmailChange={setSignupEmail}
            onPasswordChange={setSignupPassword}
            onSubmit={(event) => void onSignup(event)}
          />
          <LoginForm
            email={loginEmail}
            password={loginPassword}
            isSubmitting={isLoggingIn}
            onEmailChange={setLoginEmail}
            onPasswordChange={setLoginPassword}
            onSubmit={(event) => void onLogin(event)}
          />
        </section>
      ) : null}

      {isHydrated && authUser ? (
        <section className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-medium">{authUser.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Logout
          </button>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}

      {isHydrated && authUser && isLoading ? <p>Loading calendar...</p> : null}

      {isHydrated && authUser && !isLoading && !hasSlots ? <p>No slots available.</p> : null}

      {isHydrated && authUser && !isLoading && hasSlots ? (
        <SlotCalendar
          slots={slots}
          isBooking={isBooking}
          activeSlotId={activeSlotId}
          onBookSlot={onBook}
        />
      ) : null}
    </main>
  );
}
