import { NextRequest, NextResponse } from "next/server";
import { ServiceError } from "@/src/services/errors";
import { regenerateSlotsFromTemplates } from "@/src/services/slots";
import { validateCronBearerToken } from "@/src/lib/cron-auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const isAuthorized = validateCronBearerToken(
      request.headers.get("authorization")
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await regenerateSlotsFromTemplates();
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
