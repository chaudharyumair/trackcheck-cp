"use client";

import { useState, useEffect, useMemo } from "react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import {
  Cpu,
  DollarSign,
  BarChart3,
  Zap,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { KpiCard } from "@/components/admin/kpi-card";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { ExportButton } from "@/components/admin/export-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, safeFormatDate } from "@/lib/utils";
import { toast } from "sonner";

function truncateId(id: string, len = 8): string {
  if (!id || id.length <= len) return id;
  return `${id.slice(0, len)}…`;
}

export default function AiUsagePage() {
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)),
      to: endOfDay(today),
    };
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [model, setModel] = useState<string>("All");
  const [adjustProjectId, setAdjustProjectId] = useState("");
  const [adjustCredits, setAdjustCredits] = useState("");
  const [blockOrgId, setBlockOrgId] = useState("");
  const [blockOrgIdConfirm, setBlockOrgIdConfirm] = useState<string | null>(null);

  const debouncedModel = useMemo(() => {
    return model === "All" ? undefined : model || undefined;
  }, [model]);

  const fromStr = dateRange.from.toISOString();
  const toStr = dateRange.to.toISOString();

  const { data: overview, isLoading: overviewLoading } =
    trpc.aiUsage.overview.useQuery({ from: fromStr, to: toStr });

  const { data: ledgerData, isLoading: ledgerLoading } =
    trpc.aiUsage.listLedger.useQuery({
      page,
      pageSize,
      model: debouncedModel || undefined,
      from: fromStr,
      to: toStr,
    });

  const utils = trpc.useUtils();
  const adjustMutation = trpc.aiUsage.adjustCredits.useMutation({
    onSuccess: () => {
      toast.success("Credits adjusted");
      setAdjustProjectId("");
      setAdjustCredits("");
      utils.aiUsage.overview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const blockMutation = trpc.aiUsage.blockAI.useMutation({
    onSuccess: () => {
      toast.success("AI access updated");
      setBlockOrgId("");
      setBlockOrgIdConfirm(null);
      utils.aiUsage.overview.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const ledger = ledgerData?.data ?? [];
  const total = ledgerData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleAdjust = () => {
    const projectId = adjustProjectId.trim();
    const credits = parseInt(adjustCredits, 10);
    if (!projectId || isNaN(credits)) {
      toast.error("Enter valid project ID and credits");
      return;
    }
    adjustMutation.mutate({ projectId, credits });
  };

  const handleBlockConfirm = () => {
    if (blockOrgIdConfirm) {
      blockMutation.mutate({ organizationId: blockOrgIdConfirm, blocked: true });
    }
  };

  const exportData = ledger.map((r) => ({
    "Job ID": r.id,
    User: r.user ? `${r.user.name ?? r.user.email} (${r.user.id})` : "—",
    Model: r.model,
    "Tokens In": r.tokens_input,
    "Tokens Out": r.tokens_output,
    "Cost (USD)": r.cost_usd,
    Project: r.project?.name ?? "—",
    Date: safeFormatDate(r.created_at, "yyyy-MM-dd"),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Usage</h1>
          <p className="text-muted-foreground">
            Platform-level AI control center
          </p>
        </div>
        <DateRangePicker
          value={{ from: dateRange.from, to: dateRange.to }}
          onChange={(range) => setDateRange(range)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KpiCard
          title="Total Credits Consumed"
          value={formatNumber(overview?.totalTokens ?? 0)}
          icon={<Cpu />}
          loading={overviewLoading}
        />
        <KpiCard
          title="Total OpenAI Cost"
          value={formatCurrency(overview?.totalCost ?? 0)}
          icon={<DollarSign />}
          loading={overviewLoading}
        />
        <KpiCard
          title="Average Cost Per Project"
          value={formatCurrency(overview?.avgCostPerProject ?? 0)}
          icon={<BarChart3 />}
          loading={overviewLoading}
        />
        <KpiCard
          title="Total AI Jobs"
          value={formatNumber(overview?.totalJobs ?? 0)}
          icon={<Zap />}
          loading={overviewLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Organizations by AI Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (overview?.topOrgs ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data found
              </p>
            ) : (
              <ul className="space-y-2">
                {(overview?.topOrgs ?? []).map((o) => (
                  <li
                    key={o.organizationId}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="font-medium truncate">
                      {o.organizationName ?? o.organizationId}
                    </span>
                    <Badge variant="secondary">
                      {formatCurrency(o.cost)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Users by AI Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (overview?.topUsers ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No data found
              </p>
            ) : (
              <ul className="space-y-2">
                {(overview?.topUsers ?? []).map((u) => (
                  <li
                    key={u.userId}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="font-medium truncate text-sm">
                      {u.userEmail ?? u.userId}
                    </span>
                    <Badge variant="secondary">
                      {formatCurrency(u.cost)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Detailed Ledger</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                </SelectContent>
              </Select>
              <ExportButton data={exportData} filename="ai-usage-ledger" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ledgerLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No data found
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Tokens In</TableHead>
                    <TableHead>Tokens Out</TableHead>
                    <TableHead>Cost (USD)</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        {truncateId(r.id)}
                      </TableCell>
                      <TableCell>
                        {r.user ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium truncate max-w-[160px]">
                              {r.user.name ?? r.user.email}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {truncateId(r.user.id)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{r.model ?? "—"}</TableCell>
                      <TableCell>{formatNumber(r.tokens_input ?? 0)}</TableCell>
                      <TableCell>{formatNumber(r.tokens_output ?? 0)}</TableCell>
                      <TableCell>
                        {formatCurrency(Number(r.cost_usd ?? 0))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.project?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(r.created_at, "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t px-4 py-3 mt-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Credit Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Adjust Credits</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Project ID"
                value={adjustProjectId}
                onChange={(e) => setAdjustProjectId(e.target.value)}
                className="w-[200px]"
              />
              <Input
                type="number"
                placeholder="Credits"
                value={adjustCredits}
                onChange={(e) => setAdjustCredits(e.target.value)}
                className="w-[120px]"
              />
              <Button
                onClick={handleAdjust}
                disabled={adjustMutation.isPending}
              >
                Adjust
              </Button>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Block AI per Organization</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Organization ID"
                value={blockOrgId}
                onChange={(e) => setBlockOrgId(e.target.value)}
                className="w-[200px]"
              />
              <Button
                variant="destructive"
                onClick={() => {
                  if (blockOrgId.trim()) {
                    setBlockOrgIdConfirm(blockOrgId);
                  } else {
                    toast.error("Enter organization ID");
                  }
                }}
              >
                Block AI
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!blockOrgIdConfirm}
        onOpenChange={(open) => !open && setBlockOrgIdConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block AI for this organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent AI features from being used by this organization.
              You can unblock later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (blockOrgIdConfirm) {
                  blockMutation.mutate({
                    organizationId: blockOrgIdConfirm,
                    blocked: true,
                  });
                  setBlockOrgIdConfirm(null);
                  setBlockOrgId("");
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Block AI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
