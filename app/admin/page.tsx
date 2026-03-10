import { AdminCharts } from "@/components/admin/admin-charts";
import type {
  AppointmentSeriesPoint,
  NewUsersSeriesPoint,
} from "@/components/admin/admin-charts";
import { supabase } from "@/src/lib/supabase";

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

async function loadAdminSeries(): Promise<{
  appointmentSeries: AppointmentSeriesPoint[];
  newUsersSeries: NewUsersSeriesPoint[];
}> {
  const buckets = buildMonthBuckets(6);
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 5, 1);
  fromDate.setHours(0, 0, 0, 0);
  const fromIso = fromDate.toISOString();

  const appointmentMap = new Map(
    buckets.map((bucket) => [
      bucket.key,
      { month: bucket.label, completed: 0, cancelled: 0 },
    ])
  );

  const usersMap = new Map(
    buckets.map((bucket) => [bucket.key, { month: bucket.label, users: 0 }])
  );

  const { data: appointmentsPrimary, error: appointmentsError } = await supabase
    .schema("public")
    .from("appointments")
    .select("status, updated_at, created_at")
    .in("status", ["completed", "cancelled"])
    .gte("updated_at", fromIso);

  const { data: appointmentsFallback, error: fallbackError } = await supabase
    .schema("public")
    .from("appointments")
    .select("status, updated_at, created_at")
    .in("status", ["completed", "cancelled"])
    .is("updated_at", null)
    .gte("created_at", fromIso);

  if (!appointmentsError && !fallbackError) {
    const rows = [
      ...((appointmentsPrimary ?? []) as Array<{
        status: AppointmentStatus;
        updated_at: string | null;
        created_at: string | null;
      }>),
      ...((appointmentsFallback ?? []) as Array<{
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
      const bucket = appointmentMap.get(key);
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

  const { data: users, error: usersError } = await supabase
    .schema("public")
    .from("users")
    .select("created_at")
    .gte("created_at", fromIso);

  if (!usersError) {
    for (const row of (users ?? []) as Array<{ created_at: string | null }>) {
      const key = monthKeyFromIso(row.created_at);
      if (!key) {
        continue;
      }
      const bucket = usersMap.get(key);
      if (!bucket) {
        continue;
      }
      bucket.users += 1;
    }
  }

  return {
    appointmentSeries: buckets.map((bucket) => appointmentMap.get(bucket.key)!),
    newUsersSeries: buckets.map((bucket) => usersMap.get(bucket.key)!),
  };
}

export default async function AdminPage() {
  return <AdminCharts {...(await loadAdminSeries())} />;
}
