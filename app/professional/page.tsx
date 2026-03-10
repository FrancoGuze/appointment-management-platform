import { cookies } from "next/headers";
import { ProfessionalCharts } from "@/components/professional/professional-charts";
import type { ProfessionalStatsPoint } from "@/components/professional/professional-charts";
import { supabase } from "@/src/lib/supabase";
import { USER_SESSION_COOKIE, verifySessionToken } from "@/src/lib/auth-session";
import { getUserById } from "@/src/services/users";

type AppointmentStatus = "completed" | "cancelled";

function monthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function buildMonthBuckets(count: number): Array<{ key: string; label: string }> {
  const now = new Date();
  const buckets: Array<{ key: string; label: string }> = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({ key: monthKey(date), label: monthLabel(date) });
  }
  return buckets;
}

function monthKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return monthKey(date);
}

async function getProfessionalUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(USER_SESSION_COOKIE)?.value?.trim();
  if (!rawToken) {
    return null;
  }

  const session = await verifySessionToken(rawToken);
  if (!session) {
    return null;
  }

  const user = await getUserById(session.userId);
  if (!user || user.role !== "professional") {
    return null;
  }

  return user.userId;
}

async function loadProfessionalSeries(
  professionalId: string | null
): Promise<ProfessionalStatsPoint[]> {
  const buckets = buildMonthBuckets(6);
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 5, 1);
  fromDate.setHours(0, 0, 0, 0);
  const fromIso = fromDate.toISOString();

  const statsMap = new Map(
    buckets.map((bucket) => [
      bucket.key,
      { month: bucket.label, completed: 0, cancelled: 0, total: 0 },
    ])
  );

  if (!professionalId) {
    return buckets.map((bucket) => statsMap.get(bucket.key)!);
  }

  const { data: totalRows, error: totalError } = await supabase
    .schema("public")
    .from("appointments")
    .select("created_at")
    .eq("professional_id", professionalId)
    .gte("created_at", fromIso);

  if (!totalError) {
    for (const row of (totalRows ?? []) as Array<{ created_at: string | null }>) {
      const key = monthKeyFromIso(row.created_at);
      if (!key) {
        continue;
      }
      const bucket = statsMap.get(key);
      if (!bucket) {
        continue;
      }
      bucket.total += 1;
    }
  }

  const { data: statusRows, error: statusError } = await supabase
    .schema("public")
    .from("appointments")
    .select("status, updated_at, created_at")
    .eq("professional_id", professionalId)
    .in("status", ["completed", "cancelled"])
    .gte("updated_at", fromIso);

  const { data: fallbackRows, error: fallbackError } = await supabase
    .schema("public")
    .from("appointments")
    .select("status, updated_at, created_at")
    .eq("professional_id", professionalId)
    .in("status", ["completed", "cancelled"])
    .is("updated_at", null)
    .gte("created_at", fromIso);

  if (!statusError && !fallbackError) {
    const rows = [
      ...((statusRows ?? []) as Array<{
        status: AppointmentStatus;
        updated_at: string | null;
        created_at: string | null;
      }>),
      ...((fallbackRows ?? []) as Array<{
        status: AppointmentStatus;
        updated_at: string | null;
        created_at: string | null;
      }>),
    ];

    for (const row of rows) {
      const key = monthKeyFromIso(row.updated_at ?? row.created_at);
      if (!key) {
        continue;
      }
      const bucket = statsMap.get(key);
      if (!bucket) {
        continue;
      }
      if (row.status === "completed") {
        bucket.completed += 1;
      } else if (row.status === "cancelled") {
        bucket.cancelled += 1;
      }
    }
  }

  return buckets.map((bucket) => statsMap.get(bucket.key)!);
}

export default async function ProfessionalPage() {
  const professionalId = await getProfessionalUserId();
  const statsSeries = await loadProfessionalSeries(professionalId);
  return <ProfessionalCharts statsSeries={statsSeries} />;
}
