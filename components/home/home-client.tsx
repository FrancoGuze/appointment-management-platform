"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SlotCalendar } from "@/components/calendar/slot-calendar";
import { AuthModal, type AuthModalView } from "@/components/home/auth-modal";
import { BookingModal } from "@/components/home/booking-modal";
import { NextAppointmentCard } from "@/components/home/next-appointment-card";
import QueryRedirectHandler from "@/components/query-redirect-handler";
import { UserNavbar } from "@/components/users/navbar";
import { getErrorMessage } from "@/src/lib/api-client";
import {
  clearStoredAuthUser,
  storeAuthUser,
  syncAuthUserFromServer,
  type AuthUser,
} from "@/src/lib/client-auth";
import { toastError, toastSuccess } from "@/src/lib/notify";
import { type Appointment, createAppointment, fetchAppointments } from "@/src/services/appointments-client";
import type { CalendarSlot } from "@/src/services/slots";
import { fetchSlots } from "@/src/services/slots-client";
import { loginUser, logoutUser, signupUser } from "@/src/services/users-client";

interface AuthModalState {
  isOpen: boolean;
  view: AuthModalView;
}

interface LoginFormState {
  email: string;
  password: string;
}

interface SignupFormState {
  fullName: string;
  email: string;
  password: string;
}

function pickNextAppointment(appointments: Appointment[]): Appointment | null {
  const nowMs = Date.now();
  const upcoming = appointments
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

  return upcoming[0]?.appointment ?? null;
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
  const [authModal, setAuthModal] = useState<AuthModalState>({
    isOpen: false,
    view: "login",
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [isLoadingNextAppointment, setIsLoadingNextAppointment] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState<SignupFormState>({
    fullName: "",
    email: "",
    password: "",
  });
  const [postAuthRedirect, setPostAuthRedirect] = useState<string | null>(null);

  const loadSlots = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const data = await fetchSlots();
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
      const data = await fetchAppointments();
      setNextAppointment(pickNextAppointment(data));
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
      setAuthModal({ isOpen: true, view: "login" });
      toastError("You must be logged in to book an appointment");
      return;
    }

    setIsBooking(true);
    setActiveSlotId(slotId);

    try {
      await createAppointment(slotId);

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

    if (!loginForm.email.trim() || !loginForm.password) {
      toastError("Email and password are required");
      return;
    }

    setIsLoggingIn(true);

    try {
      const data = await loginUser(loginForm.email.trim(), loginForm.password);

      setAuthUser(data);
      storeAuthUser(data);
      setLoginForm((prev) => ({ ...prev, password: "" }));
      toastSuccess("Login successful");
      setAuthModal((prev) => ({ ...prev, isOpen: false }));

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

    if (!signupForm.fullName.trim() || !signupForm.email.trim() || !signupForm.password) {
      toastError("full_name, email and password are required");
      return;
    }

    setIsSigningUp(true);

    try {
      const data = await signupUser(
        signupForm.fullName.trim(),
        signupForm.email.trim(),
        signupForm.password
      );

      setAuthUser(data);
      storeAuthUser(data);
      toastSuccess("Account created and session started");
      setLoginForm((prev) => ({ ...prev, email: data.email, password: "" }));
      setAuthModal((prev) => ({ ...prev, isOpen: false }));
      setSignupForm({ fullName: "", email: "", password: "" });

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
      await logoutUser();
    } catch {
      // Client cleanup still runs even if API call fails.
    }

    setAuthUser(null);
    setNextAppointment(null);
    setPendingBookingSlotId(null);
    setLoginForm((prev) => ({ ...prev, password: "" }));
    toastSuccess("Session closed");
    clearStoredAuthUser();
  }

  const handleRedirect = useCallback((redirect: string) => {
    setPostAuthRedirect(redirect);
  }, []);

  const openAuthModal = useCallback((view: AuthModalView) => {
    setAuthModal({ isOpen: true, view });
  }, []);

  const handleAuthViewChange = useCallback((view: AuthModalView) => {
    setAuthModal((prev) => ({ ...prev, view }));
  }, []);

  const handleLoginChange = useCallback((field: "email" | "password", value: string) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSignupChange = useCallback(
    (field: "fullName" | "email" | "password", value: string) => {
      setSignupForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

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
            openAuthModal("login");
          }}
        />
      ) : null}

      {isHydrated && authUser && nextAppointment ? (
        <NextAppointmentCard
          appointment={nextAppointment}
          isLoading={isLoadingNextAppointment}
        />
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

      <BookingModal
        slot={bookingCandidateSlot}
        isBooking={isBooking}
        onCancel={() => setBookingCandidateSlot(null)}
        onConfirm={() => void onConfirmBook()}
      />

      <AuthModal
        isOpen={authModal.isOpen}
        view={authModal.view}
        isLoggingIn={isLoggingIn}
        isSigningUp={isSigningUp}
        loginValues={loginForm}
        signupValues={signupForm}
        onClose={() => setAuthModal((prev) => ({ ...prev, isOpen: false }))}
        onViewChange={handleAuthViewChange}
        onLoginChange={handleLoginChange}
        onSignupChange={handleSignupChange}
        onLoginSubmit={onLogin}
        onSignupSubmit={onSignup}
      />
    </main>
  );
}
