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
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const mockData = [
  { month: "Jan", revenue: 2400 },
  { month: "Feb", revenue: 3200 },
  { month: "Mar", revenue: 4100 },
  { month: "Apr", revenue: 4800 },
  { month: "May", revenue: 5600 },
  { month: "Jun", revenue: 6200 },
  { month: "Jul", revenue: 7100 },
  { month: "Aug", revenue: 7800 },
  { month: "Sep", revenue: 8500 },
  { month: "Oct", revenue: 9200 },
  { month: "Nov", revenue: 10100 },
  { month: "Dec", revenue: 11200 },
];

interface RevenueTrendChartProps {
  data?: { month: string; revenue: number }[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const chartData = data ?? mockData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis
                className="text-xs"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ fill: "var(--chart-1)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
