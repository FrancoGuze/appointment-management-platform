"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toastError, toastSuccess } from "@/src/lib/notify";
import { SlotCalendar } from "@/components/slot-calendar";
import { LoginForm } from "@/components/users/login-form";
import { UserNavbar } from "@/components/users/navbar";
import { SignupForm } from "@/components/users/signup-form";
import {
  readStoredAuthUser,
  type AuthUser,
  USER_SESSION_STORAGE_KEY,
} from "@/src/lib/client-auth";
import { formatUtcSlotDateLocal, formatUtcSlotTimeLocal } from "@/src/lib/datetime";
import type { CalendarSlot } from "@/src/services/slots";
import { toast } from "sonner";

interface ApiListResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface Appointment {
  id: string;
  slot_id: string;
  user_id: string;
  slot_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

interface AppointmentResponse {
  ok: boolean;
  data?: Appointment;
  error?: string;
}

interface LoginResponse {
  ok: boolean;
  data?: AuthUser;
  error?: string;
}

interface SignupResponse {
  ok: boolean;
  data?: AuthUser;
  error?: string;
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [pendingBookingSlotId, setPendingBookingSlotId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalView, setAuthModalView] = useState<"login" | "signup">("login");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [isLoadingNextAppointment, setIsLoadingNextAppointment] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [signupFullName, setSignupFullName] = useState<string>("");
  const [signupEmail, setSignupEmail] = useState<string>("");
  const [signupPassword, setSignupPassword] = useState<string>("");

  const loadSlots = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/slots", { method: "GET" });
      const payload = (await response.json()) as ApiListResponse<CalendarSlot[]>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not fetch slots");
      }

      setSlots(payload.data);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unexpected error";
      toastError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNextAppointment = useCallback(async (): Promise<void> => {
    if (!authUser) {
      setNextAppointment(null);
      setIsLoadingNextAppointment(false);
      return;
    }

    setIsLoadingNextAppointment(true);

    try {
      const response = await fetch("/api/appointments", { method: "GET" });
      const payload = (await response.json()) as ApiListResponse<Appointment[]>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not fetch appointments");
      }

      const nowMs = Date.now();
      const upcoming = payload.data
        .filter(
          (appointment) =>
            appointment.status === "scheduled" &&
            Boolean(appointment.slot_date) &&
            Boolean(appointment.start_time)
        )
        .map((appointment) => {
          const timestamp = Date.parse(
            `${appointment.slot_date}T${appointment.start_time}Z`
          );
          return { appointment, timestamp };
        })
        .filter((item) => Number.isFinite(item.timestamp) && item.timestamp >= nowMs)
        .sort((a, b) => a.timestamp - b.timestamp);

      setNextAppointment(upcoming[0]?.appointment ?? null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unexpected error";
      toastError(message);
      setNextAppointment(null);
    } finally {
      setIsLoadingNextAppointment(false);
    }
  }, [authUser]);

  useEffect(() => {
    setAuthUser(readStoredAuthUser());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || authUser) {
      return;
    }

    const authQuery = searchParams.get("auth");
    if (authQuery === "1") {
      setAuthModalView("login");
      setIsAuthModalOpen(true);
    }
  }, [authUser, isHydrated, searchParams]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void loadSlots();
  }, [isHydrated, loadSlots]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void loadNextAppointment();
  }, [authUser, isHydrated, loadNextAppointment]);

  async function onBook(slotId: string): Promise<void> {
    if (!authUser) {
      setPendingBookingSlotId(slotId);
      setAuthModalView("login");
      setIsAuthModalOpen(true);
      toastError("You must be logged in to book an appointment");
      return;
    }

    setIsBooking(true);
    setActiveSlotId(slotId);

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

      toastSuccess("Appointment booked successfully");
      await loadSlots();
      await loadNextAppointment();
    } catch (bookError) {
      const message = bookError instanceof Error ? bookError.message : "Unexpected error";
      toastError(message);
    } finally {
      setIsBooking(false);
      setActiveSlotId(null);
    }
  }

  async function onLogin(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!loginEmail.trim() || !loginPassword) {
      toastError("Email and password are required");
      return;
    }

    setIsLoggingIn(true);

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
      toastSuccess("Login successful");
      setIsAuthModalOpen(false);

      const redirectPath = new URLSearchParams(window.location.search).get("redirect");
      if (redirectPath && redirectPath.startsWith("/")) {
        router.push(redirectPath);
        return;
      }

      if (pendingBookingSlotId) {
        const slotId = pendingBookingSlotId;
        setPendingBookingSlotId(null);
        await onBook(slotId);
      }
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Unexpected error";
      toastError(message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function onSignup(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!signupFullName.trim() || !signupEmail.trim() || !signupPassword) {
      toastError("full_name, email and password are required");
      return;
    }

    setIsSigningUp(true);

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

      setAuthUser(payload.data);
      window.localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(payload.data));
      toastSuccess("Account created and session started");
      setLoginEmail(payload.data.email);
      setLoginPassword("");
      setIsAuthModalOpen(false);
      setSignupFullName("");
      setSignupEmail("");
      setSignupPassword("");

      const redirectPath = new URLSearchParams(window.location.search).get("redirect");
      if (redirectPath && redirectPath.startsWith("/")) {
        router.push(redirectPath);
        return;
      }

      if (pendingBookingSlotId) {
        const slotId = pendingBookingSlotId;
        setPendingBookingSlotId(null);
        await onBook(slotId);
      }
    } catch (signupError) {
      const message = signupError instanceof Error ? signupError.message : "Unexpected error";
      toastError(message);
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
    setNextAppointment(null);
    setPendingBookingSlotId(null);
    setLoginPassword("");
    toastSuccess("Session closed");
    window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Appointment booking System</h1>
<button onClick={()=> toast.success("aaaaaaaa")}>ACA</button>
<button onClick={()=> toast.error("aaaaaaaa")}>ACA</button>
      {!isHydrated ? <p>Loading session...</p> : null}

      {isHydrated ? (
        <UserNavbar
          authUser={authUser}
          onLogout={onLogout}
          onOpenAuth={() => {
            setAuthModalView("login");
            setIsAuthModalOpen(true);
          }}
        />
      ) : null}

      {isHydrated && authUser ? (
        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Your next appointment</h2>
          {isLoadingNextAppointment ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          ) : nextAppointment ? (
            <div className="mt-2 text-sm">
              <p>
                {formatUtcSlotDateLocal(
                  nextAppointment.slot_date,
                  nextAppointment.start_time
                )}
              </p>
              <p className="text-muted-foreground">
                {formatUtcSlotTimeLocal(
                  nextAppointment.slot_date,
                  nextAppointment.start_time
                )}{" "}
                -{" "}
                {formatUtcSlotTimeLocal(nextAppointment.slot_date, nextAppointment.end_time)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Appointment id: {nextAppointment.id}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No upcoming appointments.
            </p>
          )}
        </section>
      ) : null}

      {isHydrated && isLoading ? <p>Loading calendar...</p> : null}

      {isHydrated && !isLoading && !slots.length ? <p>No slots available.</p> : null}

      {isHydrated && !isLoading && slots.length ? (
        <SlotCalendar
          slots={slots}
          isBooking={isBooking}
          activeSlotId={activeSlotId}
          onBookSlot={onBook}
        />
      ) : null}

      {isAuthModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl border bg-background p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {authModalView === "login" ? "Login" : "Create account"}
              </h2>
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-sm hover:bg-muted"
                onClick={() => setIsAuthModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                className={[
                  "rounded-md border px-3 py-1 text-sm",
                  authModalView === "login" ? "bg-muted" : "hover:bg-muted",
                ].join(" ")}
                onClick={() => setAuthModalView("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={[
                  "rounded-md border px-3 py-1 text-sm",
                  authModalView === "signup" ? "bg-muted" : "hover:bg-muted",
                ].join(" ")}
                onClick={() => setAuthModalView("signup")}
              >
                Sign up
              </button>
            </div>

            {authModalView === "login" ? (
              <LoginForm
                email={loginEmail}
                password={loginPassword}
                isSubmitting={isLoggingIn}
                onEmailChange={setLoginEmail}
                onPasswordChange={setLoginPassword}
                onSubmit={(event) => void onLogin(event)}
              />
            ) : (
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
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

