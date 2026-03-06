import { NextRequest, NextResponse } from "next/server";
import {
  assignProfessionalToAppointment,
  updateAppointmentStatus,
  createAppointment,
  getAppointmentById,
  getAppointments,
  getAppointmentsByProfessionalId,
  getAppointmentsByUserId,
} from "@/src/services/appointments";
import { ServiceError } from "@/src/services/errors";
import { USER_SESSION_COOKIE, verifySessionToken } from "@/src/lib/auth-session";
import { getUserById } from "@/src/services/users";

interface CreateAppointmentBody {
  slotId?: string;
  notes?: string;
}

interface CancelAppointmentBody {
  appointmentId?: string;
  status?: "scheduled" | "completed" | "cancelled" | "no_show";
  professionalId?: string | null;
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

  const authenticatedUser = await getUserById(session.userId);

  if (!authenticatedUser) {
    return null;
  }

  return authenticatedUser;
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

    const data =
      authenticatedUser.role === "admin"
        ? await getAppointments()
        : authenticatedUser.role === "professional"
          ? await getAppointmentsByProfessionalId(authenticatedUser.userId)
        : await getAppointmentsByUserId(authenticatedUser.userId);

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as CreateAppointmentBody;
  const slotId = body.slotId?.trim();

  if (!slotId) {
    return NextResponse.json(
      { ok: false, error: "slotId is required" },
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

    const data = await createAppointment({
      slotId,
      userId: authenticatedUser.userId,
      notes: body.notes,
    });

    console.info(
      JSON.stringify({
        event: "booking_created",
        userId: authenticatedUser.userId,
        role: authenticatedUser.role,
        appointmentId: data.id,
        slotId: data.slot_id,
        at: new Date().toISOString(),
      })
    );

    return NextResponse.json({ ok: true, data }, { status: 201 });
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
  const body = (await request.json()) as CancelAppointmentBody;
  const appointmentId = body.appointmentId?.trim();
  const status = body.status;
  const professionalId = body.professionalId === null ? null : body.professionalId?.trim();

  if (!appointmentId) {
    return NextResponse.json(
      { ok: false, error: "appointmentId is required" },
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

    const existingAppointment = await getAppointmentById(appointmentId);

    if (!existingAppointment) {
      return NextResponse.json(
        { ok: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (professionalId !== undefined) {
      if (authenticatedUser.role !== "admin") {
        return NextResponse.json(
          { ok: false, error: "Only admins can assign professionals" },
          { status: 403 }
        );
      }

      const data = await assignProfessionalToAppointment(appointmentId, professionalId);

      console.info(
        JSON.stringify({
          event: "booking_professional_assigned",
          userId: authenticatedUser.userId,
          role: authenticatedUser.role,
          appointmentId: data.id,
          professionalId: data.professional_id,
          at: new Date().toISOString(),
        })
      );

      return NextResponse.json({ ok: true, data }, { status: 200 });
    }

    if (authenticatedUser.role === "client" && existingAppointment.user_id !== authenticatedUser.userId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (authenticatedUser.role === "professional") {
      if (existingAppointment.professional_id !== authenticatedUser.userId) {
        return NextResponse.json(
          { ok: false, error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    let targetStatus: "scheduled" | "completed" | "cancelled" | "no_show" = "cancelled";

    if (status) {
      targetStatus = status;
    }

    if (authenticatedUser.role === "client" && targetStatus !== "cancelled") {
      return NextResponse.json(
        { ok: false, error: "Clients can only cancel appointments" },
        { status: 403 }
      );
    }

    if (
      authenticatedUser.role === "professional" &&
      targetStatus !== "completed" &&
      targetStatus !== "no_show" &&
      targetStatus !== "cancelled"
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid status transition for professional" },
        { status: 403 }
      );
    }

    const data = await updateAppointmentStatus(appointmentId, targetStatus);

    console.info(
      JSON.stringify({
        event: "booking_status_updated",
        userId: authenticatedUser.userId,
        role: authenticatedUser.role,
        appointmentId: data.id,
        slotId: data.slot_id,
        status: data.status,
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
