import { NextResponse } from "next/server";
import { ServiceError } from "@/src/services/errors";
import { getCalendarSlots } from "@/src/services/slots";

export async function GET(): Promise<NextResponse> {
  try {
    const data = await getCalendarSlots();
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
