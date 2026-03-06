import { NextResponse } from "next/server";
import { ServiceError } from "@/src/services/errors";
import { signUpUser } from "@/src/services/users";

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
