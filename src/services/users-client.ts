import type { AuthUser } from "@/src/lib/client-auth";
import { requestApi } from "@/src/services/api-client";

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  return requestApi<AuthUser>(
    "/api/users/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    "Could not sign in"
  );
}

export async function signupUser(
  fullName: string,
  email: string,
  password: string
): Promise<AuthUser> {
  return requestApi<AuthUser>(
    "/api/users/signup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, email, password }),
    },
    "Could not sign up"
  );
}

export async function logoutUser(): Promise<void> {
  await fetch("/api/users/logout", { method: "POST" });
}
