export const USER_SESSION_STORAGE_KEY = "booking_user_session";

export interface AuthUser {
  userId: string;
  email: string;
}

interface UserProfile {
  userId: string;
  email: string;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
}

export function readStoredAuthUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(USER_SESSION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthUser;

    if (!parsed.userId || !parsed.email) {
      window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
    return null;
  }
}

export function storeAuthUser(authUser: AuthUser): void {
  window.localStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(authUser));
}

export function clearStoredAuthUser(): void {
  window.localStorage.removeItem(USER_SESSION_STORAGE_KEY);
}

export async function syncAuthUserFromServer(): Promise<AuthUser | null> {
  const cached = readStoredAuthUser();

  try {
    const response = await fetch("/api/users/me", { method: "GET" });

    if (response.status === 401) {
      clearStoredAuthUser();
      return null;
    }

    const payload = (await response.json()) as ApiResponse<UserProfile>;

    if (!response.ok || !payload.ok || !payload.data) {
      return cached;
    }

    const authUser: AuthUser = {
      userId: payload.data.userId,
      email: payload.data.email,
    };

    storeAuthUser(authUser);
    return authUser;
  } catch {
    return cached;
  }
}
