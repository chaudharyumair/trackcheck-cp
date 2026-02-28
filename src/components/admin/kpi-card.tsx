"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  loading?: boolean;
}

export function KpiCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  loading = false,
}: KpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{title}</p>
              {icon && (
                <div className="text-muted-foreground [&_svg]:size-4">
                  {icon}
                </div>
              )}
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            {change && (
              <p
                className={cn(
                  "mt-1 text-xs",
                  changeType === "positive" && "text-green-600 dark:text-green-400",
                  changeType === "negative" && "text-red-600 dark:text-red-400",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
