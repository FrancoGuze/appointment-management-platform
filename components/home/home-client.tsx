"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toastError, toastSuccess } from "@/src/lib/notify";
import { getErrorMessage, requireApiData } from "@/src/lib/api-client";
import { SlotCalendar } from "@/components/slot-calendar";
import { LoginForm } from "@/components/users/login-form";
import { UserNavbar } from "@/components/users/navbar";
import { SignupForm } from "@/components/users/signup-form";
import QueryRedirectHandler from "@/components/query-redirect-handler";
import {
  syncAuthUserFromServer,
  storeAuthUser,
  clearStoredAuthUser,
  type AuthUser,
} from "@/src/lib/client-auth";
import { formatUtcSlotDateLocal, formatUtcSlotTimeLocal } from "@/src/lib/datetime";
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

export default function HomeClient() {
  const router = useRouter();
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [pendingBookingSlotId, setPendingBookingSlotId] = useState<string | null>(null);
  const [bookingCandidateSlot, setBookingCandidateSlot] = useState<CalendarSlot | null>(null);
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
  const [postAuthRedirect, setPostAuthRedirect] = useState<string | null>(null);

  const loadSlots = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/slots", { method: "GET" });
      const payload = (await response.json()) as ApiListResponse<CalendarSlot[]>;
      const data = requireApiData(response, payload, "Could not load slots");
      setSlots(data);
    } catch (loadError) {
      const message = getErrorMessage(loadError, "Could not load slots");
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
      const data = requireApiData(
        response,
        payload,
        "Could not load appointments"
      );

      const nowMs = Date.now();
      const upcoming = data
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
      const message = getErrorMessage(loadError, "Could not load appointments");
      toastError(message);
      setNextAppointment(null);
    } finally {
      setIsLoadingNextAppointment(false);
    }
  }, [authUser]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth(): Promise<void> {
      const currentAuthUser = await syncAuthUserFromServer();

      if (!isMounted) {
        return;
      }

      setAuthUser(currentAuthUser);
      setIsHydrated(true);
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

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

  async function onBook(slotId: string, forceAuth?: boolean): Promise<void> {
    if (!authUser && !forceAuth) {
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
      requireApiData(response, payload, "Could not create appointment");

      toastSuccess("Appointment booked successfully");
      await loadSlots();
      await loadNextAppointment();
    } catch (bookError) {
      const message = getErrorMessage(bookError, "Could not create appointment");
      toastError(message);
    } finally {
      setIsBooking(false);
      setActiveSlotId(null);
    }
  }

  function onRequestBook(slotId: string): void {
    const slot = slots.find((currentSlot) => currentSlot.id === slotId);

    if (!slot) {
      toastError("Could not find the selected slot");
      return;
    }

    setBookingCandidateSlot(slot);
  }

  async function onConfirmBook(): Promise<void> {
    if (!bookingCandidateSlot) {
      return;
    }

    const slotId = bookingCandidateSlot.id;
    setBookingCandidateSlot(null);
    await onBook(slotId);
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
      const data = requireApiData(response, payload, "Could not sign in");

      setAuthUser(data);
      storeAuthUser(data);
      setLoginPassword("");
      toastSuccess("Login successful");
      setIsAuthModalOpen(false);

      if (postAuthRedirect) {
        router.push(postAuthRedirect);
        return;
      }

      if (pendingBookingSlotId) {
        const slotId = pendingBookingSlotId;
        setPendingBookingSlotId(null);
        await onBook(slotId, true);
      }
    } catch (loginError) {
      const message = getErrorMessage(loginError, "Could not sign in");
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
      const data = requireApiData(response, payload, "Could not sign up");

      setAuthUser(data);
      storeAuthUser(data);
      toastSuccess("Account created and session started");
      setLoginEmail(data.email);
      setLoginPassword("");
      setIsAuthModalOpen(false);
      setSignupFullName("");
      setSignupEmail("");
      setSignupPassword("");

      if (postAuthRedirect) {
        router.push(postAuthRedirect);
        return;
      }

      if (pendingBookingSlotId) {
        const slotId = pendingBookingSlotId;
        setPendingBookingSlotId(null);
        await onBook(slotId, true);
      }
    } catch (signupError) {
      const message = getErrorMessage(signupError, "Could not sign up");
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
    clearStoredAuthUser();
  }

  const handleRedirect = useCallback((redirect: string) => {
    setPostAuthRedirect(redirect);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <QueryRedirectHandler onRedirect={handleRedirect} />
      <h1 className="text-3xl font-semibold">Appointment booking System</h1>
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

      {isHydrated && authUser && nextAppointment ? (
        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Your next appointment</h2>
          {isLoadingNextAppointment ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          ) : (
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
                {formatUtcSlotTimeLocal(
                  nextAppointment.slot_date,
                  nextAppointment.end_time
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Appointment id: {nextAppointment.id}
              </p>
            </div>
          )}
        </section>
      ) : (
        <></>
      )}

      {isHydrated && isLoading ? <p>Loading calendar...</p> : null}

      {isHydrated && !isLoading && !slots.length ? <p>No slots available.</p> : null}

      {isHydrated && !isLoading && slots.length ? (
        <SlotCalendar
          slots={slots}
          isBooking={isBooking}
          activeSlotId={activeSlotId}
          isAuthenticated={Boolean(authUser)}
          onBookSlot={async (slotId) => {
            onRequestBook(slotId);
          }}
        />
      ) : null}

      {bookingCandidateSlot ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background p-4 shadow-lg">
            <h2 className="text-lg font-semibold">Confirm appointment</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatUtcSlotDateLocal(
                bookingCandidateSlot.slot_date,
                bookingCandidateSlot.start_time
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatUtcSlotTimeLocal(
                bookingCandidateSlot.slot_date,
                bookingCandidateSlot.start_time
              )}{" "}
              -{" "}
              {formatUtcSlotTimeLocal(
                bookingCandidateSlot.slot_date,
                bookingCandidateSlot.end_time
              )}
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setBookingCandidateSlot(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                onClick={() => void onConfirmBook()}
                disabled={isBooking}
              >
                {isBooking ? "Booking..." : "Confirm booking"}
              </button>
            </div>
          </div>
        </div>
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
                onSubmit={(event) => onLogin(event)}
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
                onSubmit={(event) => onSignup(event)}
              />
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
