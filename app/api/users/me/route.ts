import { NextRequest, NextResponse } from "next/server";
import { ServiceError } from "@/src/services/errors";
import {
  getUserById,
  getUserProfileById,
  updateUserProfile,
} from "@/src/services/users";
import { USER_SESSION_COOKIE, verifySessionToken } from "@/src/lib/auth-session";

interface UpdateMeBody {
  email?: string;
  full_name?: string;
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
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await getUserProfileById(authenticatedUser.userId);

    if (!data) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as UpdateMeBody;
  const email = body.email?.trim();
  const fullName = body.full_name?.trim();

  if (!email && !fullName) {
    return NextResponse.json(
      { ok: false, error: "At least one field is required" },
      { status: 400 }
    );
  }

  try {
    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const data = await updateUserProfile({
      userId: authenticatedUser.userId,
      email,
      fullName,
    });

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
