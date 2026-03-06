import { NextResponse } from "next/server";
import { USER_SESSION_COOKIE } from "@/src/lib/auth-session";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true }, { status: 200 });

  response.cookies.set({
    name: USER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
