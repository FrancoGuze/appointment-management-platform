import { jwtVerify, SignJWT } from "jose";
import type { UserRole } from "@/src/services/users";

export const USER_SESSION_COOKIE = "booking_user_session";

const SESSION_TTL_SECONDS = 60 * 60 * 6;

interface SessionPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret) {
    throw new Error("Missing AUTH_SESSION_SECRET");
  }

  return new TextEncoder().encode(secret);
}

function isUserRole(role: unknown): role is UserRole {
  return role === "client" || role === "professional" || role === "admin";
}

export async function createSessionToken(
  userId: string,
  role: UserRole
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });

    const userId = payload.userId;
    const role = payload.role;
    const exp = payload.exp;

    if (typeof userId !== "string" || typeof exp !== "number" || !isUserRole(role)) {
      return null;
    }

    return { userId, role, exp };
  } catch {
    return null;
  }
}
