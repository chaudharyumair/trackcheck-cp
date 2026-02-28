"use client";

import { useState } from "react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { KpiCard } from "@/components/admin/kpi-card";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { ExportButton } from "@/components/admin/export-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, safeFormatDate } from "@/lib/utils";

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const s = status.toLowerCase();
  if (s === "paid" || s === "active") {
    return (
      <Badge className="bg-green-600/20 text-green-700 dark:text-green-400">
        {status}
      </Badge>
    );
  }
  if (s === "failed" || s === "canceled") {
    return (
      <Badge className="bg-red-600/20 text-red-700 dark:text-red-400">
        {status}
      </Badge>
    );
  }
  if (s === "refunded" || s === "past_due") {
    return (
      <Badge className="bg-yellow-600/20 text-yellow-700 dark:text-yellow-400">
        {status}
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

export default function FinancePage() {
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)),
      to: endOfDay(today),
    };
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<string>("All");

  const fromStr = dateRange.from.toISOString();
  const toStr = dateRange.to.toISOString();
  const statusFilter = status === "All" ? undefined : status;

  const { data: overview, isLoading: overviewLoading } =
    trpc.finance.overview.useQuery();

  const { data: paymentsData, isLoading: paymentsLoading } =
    trpc.finance.listPayments.useQuery({
      page,
      pageSize,
      status: statusFilter,
      from: fromStr,
      to: toStr,
    });

  const { data: renewalsData, isLoading: renewalsLoading } =
    trpc.finance.upcomingRenewals.useQuery();

  const payments = paymentsData?.data ?? [];
  const total = paymentsData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const renewals = renewalsData?.data ?? [];

  const exportData = payments.map((p) => ({
    "Payment ID": p.id,
    User: p.user ? `${p.user.name ?? p.user.email}` : "—",
    Organization: p.organizationName ?? "—",
    Plan: p.plan ?? "—",
    "Invoice Amount": `$${p.invoiceAmount}`,
    Status: p.status ?? "—",
    "Renewal Date": safeFormatDate(p.renewalDate, "yyyy-MM-dd"),
    Date: safeFormatDate(p.created_at, "yyyy-MM-dd"),
    "Stripe ID": p.stripe_subscription_id ?? "—",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finance</h1>
          <p className="text-muted-foreground">
            Revenue and payment overview
          </p>
        </div>
        <DateRangePicker
          value={{ from: dateRange.from, to: dateRange.to }}
          onChange={(range) => setDateRange(range)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title="MRR"
          value={formatCurrency(overview?.mrr ?? 0)}
          icon={<DollarSign />}
          loading={overviewLoading}
        />
        <KpiCard
          title="ARR"
          value={formatCurrency(overview?.arr ?? 0)}
          icon={<TrendingUp />}
          loading={overviewLoading}
        />
        <KpiCard
          title="Churn Rate"
          value={formatPercent(overview?.churnRate ?? 0)}
          icon={<TrendingDown />}
          loading={overviewLoading}
        />
        <KpiCard
          title="LTV"
          value={formatCurrency(overview?.ltv ?? 0)}
          icon={<DollarSign />}
          loading={overviewLoading}
        />
        <KpiCard
          title="Active Subscriptions"
          value={String(overview?.activeSubscriptions ?? 0)}
          icon={<CreditCard />}
          loading={overviewLoading}
        />
        <KpiCard
          title="Past Due"
          value={String(overview?.pastDue ?? 0)}
          icon={<AlertCircle />}
          loading={overviewLoading}
        />
      </div>

      {/* Upcoming Renewals */}
      {renewals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5" />
              Upcoming Renewals (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renewalsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Renewal Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.organizationName}</TableCell>
                      <TableCell className="text-sm">
                        {r.user ? (r.user.name ?? r.user.email) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.plan}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(r.invoiceAmount)}</TableCell>
                      <TableCell>{safeFormatDate(r.renewalDate, "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        {r.cancelAtPeriodEnd ? (
                          <Badge className="bg-yellow-600/20 text-yellow-700 dark:text-yellow-400">Cancels at renewal</Badge>
                        ) : (
                          <Badge className="bg-green-600/20 text-green-700 dark:text-green-400">Auto-renews</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <div className="rounded-md border">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          <ExportButton data={exportData} filename="payments" />
        </div>

        {paymentsLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <p>No data found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Stripe ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      {p.id.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      {p.user ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[140px]">
                            {p.user.name ?? p.user.email}
                          </span>
                          {p.user.name && (
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {p.user.email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{p.organizationName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.plan ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(p.invoiceAmount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {safeFormatDate(p.renewalDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {safeFormatDate(p.created_at, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.stripe_subscription_id ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {total} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
