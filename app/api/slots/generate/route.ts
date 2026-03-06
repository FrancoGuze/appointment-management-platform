import { NextRequest, NextResponse } from "next/server";
import { ServiceError } from "@/src/services/errors";
import { generateSlotsFromTemplates } from "@/src/services/slots";

function parseDaysParam(request: NextRequest): number | undefined {
  const daysParam = request.nextUrl.searchParams.get("days");

  if (!daysParam) {
    return undefined;
  }

  const parsed = Number.parseInt(daysParam, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const daysAhead = parseDaysParam(request);
    const data = await generateSlotsFromTemplates({ daysAhead });
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
