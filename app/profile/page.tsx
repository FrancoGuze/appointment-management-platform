"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toastError, toastSuccess } from "@/src/lib/notify";
import { UserNavbar } from "@/components/users/navbar";
import {
  readStoredAuthUser,
  type AuthUser,
  USER_SESSION_STORAGE_KEY,
} from "@/src/lib/client-auth";

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface UserProfile {
  userId: string;
  email: string;
  fullName: string | null;
  createdAt: string | null;
}

export default function ProfilePage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const loadProfile = useCallback(async (): Promise<void> => {
    if (!authUser) {
      setProfile(null);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/users/me", { method: "GET" });
      const payload = (await response.json()) as ApiResponse<UserProfile>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not fetch profile");
      }

      setProfile(payload.data);
      setFullName(payload.data.fullName ?? "");
      setEmail(payload.data.email);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unexpected error";
      toastError(message);
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    setAuthUser(readStoredAuthUser());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function onLogout(): Promise<void> {
    try {
      await fetch("/api/users/logout", { method: "POST" });
    } catch {
      // Client cleanup still runs even if API call fails.
    }

    setAuthUser(null);
    setProfile(null);
    window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
  }

  async function onSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!fullName.trim() && !email.trim()) {
      toastError("At least one field is required");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
        }),
      });

      const payload = (await response.json()) as ApiResponse<UserProfile>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not update profile");
      }

      setProfile(payload.data);
      setEmail(payload.data.email);
      setFullName(payload.data.fullName ?? "");

      const updatedAuthUser: AuthUser = {
        userId: payload.data.userId,
        email: payload.data.email,
      };
      setAuthUser(updatedAuthUser);
      window.localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(updatedAuthUser));

      toastSuccess("Profile updated");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unexpected error";
      toastError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">User config</h1>

      {isHydrated ? (
        <UserNavbar
          authUser={authUser}
          onLogout={onLogout}
          onOpenAuth={() => {
            window.location.href = "/?auth=1&redirect=/profile";
          }}
        />
      ) : null}

      {!isHydrated ? <p>Loading session...</p> : null}

      {isHydrated && !authUser ? (
        <section className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            Login is required to manage your profile.
          </p>
          <Link
            href="/?auth=1&redirect=/profile"
            className="mt-3 inline-block rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Login / Sign up
          </Link>
        </section>
      ) : null}

      {isHydrated && authUser && isLoading ? <p>Loading profile...</p> : null}

      {isHydrated && authUser && !isLoading && profile ? (
        <section className="rounded-xl border p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Account created: {profile.createdAt ?? "Unknown"}
          </p>

          <form className="flex max-w-lg flex-col gap-3" onSubmit={(event) => void onSave(event)}>
            <label className="text-sm font-medium" htmlFor="profile-full-name">
              Full name
            </label>
            <input
              id="profile-full-name"
              type="text"
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your full name"
            />

            <label className="text-sm font-medium" htmlFor="profile-email">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@email.com"
            />

            <button
              type="submit"
              disabled={isSaving}
              className="mt-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>
      ) : null}
    </main>
  );
}

