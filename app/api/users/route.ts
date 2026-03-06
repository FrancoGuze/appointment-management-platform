import { NextRequest, NextResponse } from "next/server";
import { ServiceError } from "@/src/services/errors";
import {
  getUserById,
  getUsers,
  type UserRole,
  updateUserRole,
} from "@/src/services/users";
import { USER_SESSION_COOKIE, verifySessionToken } from "@/src/lib/auth-session";

interface UpdateRoleBody {
  userId?: string;
  role?: UserRole;
}

async function getAuthenticatedUser(request: NextRequest) {
  const rawSessionToken = request.cookies.get(USER_SESSION_COOKIE)?.value?.trim();

  if (!rawSessionToken) {
    return null;
  }

  const session = await verifySessionToken(rawSessionToken);

  if (!session) {
    return null;
  }

  return getUserById(session.userId);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (authenticatedUser.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const data = await getUsers();
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as UpdateRoleBody;
  const userId = body.userId?.trim();
  const role = body.role;

  if (!userId || !role) {
    return NextResponse.json(
      { ok: false, error: "userId and role are required" },
      { status: 400 }
    );
  }

  if (role !== "client" && role !== "professional" && role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Invalid role value" },
      { status: 400 }
    );
  }

  try {
    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (authenticatedUser.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const data = await updateUserRole(userId, role);

    console.info(
      JSON.stringify({
        event: "role_updated",
        actorUserId: authenticatedUser.userId,
        targetUserId: data.userId,
        role: data.role,
        at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
