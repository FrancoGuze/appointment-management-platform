import { NextRequest, NextResponse } from "next/server";
import { ServiceError } from "@/src/services/errors";
import { generateSlotsFromTemplates } from "@/src/services/slots";
import { validateCronBearerToken } from "@/src/lib/cron-auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const startedAt = Date.now();
    console.info(
      JSON.stringify({
        event: "slots_generate_started",
        at: new Date().toISOString(),
      })
    );

    const isAuthorized = validateCronBearerToken(
      request.headers.get("authorization")
    );

    if (!isAuthorized) {
      console.warn(
        JSON.stringify({
          event: "slots_generate_unauthorized",
          at: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await generateSlotsFromTemplates();
    console.info(
      JSON.stringify({
        event: "slots_generate_completed",
        durationMs: Date.now() - startedAt,
        summary: data,
        at: new Date().toISOString(),
      })
    );
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      console.error(
        JSON.stringify({
          event: "slots_generate_failed_service_error",
          message: error.message,
          statusCode: error.statusCode,
          at: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode }
      );
    }

    console.error(
      JSON.stringify({
        event: "slots_generate_failed_unexpected",
        at: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}
