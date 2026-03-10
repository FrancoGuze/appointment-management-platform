import { NextResponse } from "next/server";
import { ServiceError } from "@/src/services/errors";
import { signUpUser } from "@/src/services/users";
import { createSessionToken, USER_SESSION_COOKIE } from "@/src/lib/auth-session";

interface SignUpBody {
    email?: string;
    password?: string;
    full_name?: string;

}

export async function GET(): Promise<NextResponse> {
    return NextResponse.json(
        { message: "Users signup endpoint" },
        { status: 200 }
    );
}

export async function POST(req: Request): Promise<NextResponse> {
    const body = (await req.json()) as SignUpBody;
    const email = body.email?.trim();
    const password = body.password;
    const full_name = body.full_name?.trim();

    if (!email || !password || !full_name) {
        return NextResponse.json(
            { ok: false, error: "email, password and full_name are required" },
            { status: 400 }
        );
    }

    try {
        const data = await signUpUser({
            email,
            password,
            full_name
        });
        const response = NextResponse.json({ ok: true, data }, { status: 200 });
        const sessionToken = await createSessionToken(data.userId, data.role);

        response.cookies.set({
            name: USER_SESSION_COOKIE,
            value: sessionToken,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 6,
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
