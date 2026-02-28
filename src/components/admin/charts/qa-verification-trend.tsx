"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const mockData = [
  { month: "Jan", verified: 85, failed: 12 },
  { month: "Feb", verified: 92, failed: 8 },
  { month: "Mar", verified: 88, failed: 15 },
  { month: "Apr", verified: 95, failed: 6 },
  { month: "May", verified: 98, failed: 4 },
  { month: "Jun", verified: 94, failed: 7 },
  { month: "Jul", verified: 96, failed: 5 },
  { month: "Aug", verified: 99, failed: 3 },
  { month: "Sep", verified: 97, failed: 4 },
  { month: "Oct", verified: 98, failed: 3 },
  { month: "Nov", verified: 99, failed: 2 },
  { month: "Dec", verified: 100, failed: 1 },
];

interface QaVerificationTrendChartProps {
  data?: { month: string; verified: number; failed: number }[];
}

export function QaVerificationTrendChart({ data }: QaVerificationTrendChartProps) {
  const chartData = data ?? mockData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>QA Verification Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="verified"
                name="Verified"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ fill: "var(--chart-1)" }}
              />
              <Line
                type="monotone"
                dataKey="failed"
                name="Failed"
                stroke="var(--chart-5)"
                strokeWidth={2}
                dot={{ fill: "var(--chart-5)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
