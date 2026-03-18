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

export interface ProfessionalStatsPoint {
  month: string;
  completed: number;
  cancelled: number;
  total: number;
}

interface ProfessionalChartsProps {
  statsSeries: ProfessionalStatsPoint[];
}

export function ProfessionalCharts({ statsSeries }: ProfessionalChartsProps) {
  const gridStroke = "var(--border)";
  const axisTick = { fill: "var(--muted-foreground)" };
  const axisLine = { stroke: "var(--border)" };

  return (
    <section className="grid gap-4">
      <article className="rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Appointments graph</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Completed, cancelled, and total appointments.
        </p>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={statsSeries}>
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
                stroke="var(--primary)"
                strokeWidth={2}
                name="Completed"
              />
              <Line
                type="monotone"
                dataKey="cancelled"
                stroke="var(--destructive)"
                strokeWidth={2}
                name="Cancelled"
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--accent-foreground)"
                strokeWidth={2}
                name="Total"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>
    </section>
  );
}
