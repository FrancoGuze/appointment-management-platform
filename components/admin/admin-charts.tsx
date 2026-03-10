"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AppointmentSeriesPoint {
  month: string;
  completed: number;
  cancelled: number;
}

export interface NewUsersSeriesPoint {
  month: string;
  users: number;
}

interface AdminChartsProps {
  appointmentSeries: AppointmentSeriesPoint[];
  newUsersSeries: NewUsersSeriesPoint[];
}

export function AdminCharts({ appointmentSeries, newUsersSeries }: AdminChartsProps) {
  const gridStroke = "var(--border)";
  const axisTick = { fill: "var(--muted-foreground)" };
  const axisLine = { stroke: "var(--border)" };

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Appointments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Completed vs cancelled by month.
        </p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={appointmentSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" tick={axisTick} axisLine={axisLine} />
              <YAxis tick={axisTick} axisLine={axisLine} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
                labelStyle={{ color: "var(--foreground)" }}
                itemStyle={{ color: "var(--foreground)" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="var(--chart-green)"
                strokeWidth={2}
                name="Completed"
              />
              <Line
                type="monotone"
                dataKey="cancelled"
                stroke="var(--chart-red)"
                strokeWidth={2}
                name="Cancelled"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">New users</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          New registrations per month.
        </p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={newUsersSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" tick={axisTick} axisLine={axisLine} />
              <YAxis tick={axisTick} axisLine={axisLine} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
                labelStyle={{ color: "var(--foreground)" }}
                itemStyle={{ color: "var(--foreground)" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                stroke="var(--accent-foreground)"
                strokeWidth={2}
                name="New users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
