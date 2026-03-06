import { NextResponse } from "next/server";
import { ServiceError } from "@/src/services/errors";
import { loginUser } from "@/src/services/users";
import { createSessionToken, USER_SESSION_COOKIE } from "@/src/lib/auth-session";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, message: "Users login endpoint" });
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as LoginBody;
  const email = body.email?.trim();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "email and password are required" },
      { status: 400 }
    );
  }

  try {
    const data = await loginUser({ email, password });
    const response = NextResponse.json({ ok: true, data }, { status: 200 });
    const sessionToken = await createSessionToken(data.userId, data.role);

    response.cookies.set({
      name: USER_SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
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
