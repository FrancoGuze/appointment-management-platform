export const USER_SESSION_STORAGE_KEY = "booking_user_session";

export interface AuthUser {
  userId: string;
  email: string;
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
