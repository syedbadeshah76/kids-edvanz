import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueTrendPoint } from "@/types/revenue.types";

interface Props {
  data: RevenueTrendPoint[];
}

function formatINR(num: number): string {
  return `₹${Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function RevenueTrend({ data }: Props) {
  return (
    <div className="rounded-[20px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue Trend</h3>
      {!data || data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          No revenue trend data yet.
        </div>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="#F1F5F9"
                strokeDasharray="0"
                className="dark:stroke-slate-800"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#64748B", fontWeight: 500 }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#64748B" }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              />
              <Tooltip
                cursor={{ fill: "rgba(37, 99, 235, 0.05)" }}
                formatter={(value: number) => [formatINR(value), "Gross Revenue"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="revenue"
                fill="#2563EB"
                radius={[6, 6, 0, 0]}
                barSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default RevenueTrend;

