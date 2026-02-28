"use client";

import { useState } from "react";
import {
  CreditCard,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Pause,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { ExportButton } from "@/components/admin/export-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { safeFormatDate } from "@/lib/utils";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const s = status.toLowerCase();
  if (s === "active") {
    return (
      <Badge className="bg-green-600/20 text-green-700 dark:text-green-400">
        {status}
      </Badge>
    );
  }
  if (s === "past_due") {
    return (
      <Badge className="bg-yellow-600/20 text-yellow-700 dark:text-yellow-400">
        {status}
      </Badge>
    );
  }
  if (s === "canceled") {
    return (
      <Badge className="bg-red-600/20 text-red-700 dark:text-red-400">
        {status}
      </Badge>
    );
  }
  if (s === "trialing") {
    return (
      <Badge className="bg-blue-600/20 text-blue-700 dark:text-blue-400">
        {status}
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function PlanBadge({ plan }: { plan: string | null | undefined }) {
  if (!plan) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="secondary">
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

export default function SubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [changePlanSubId, setChangePlanSubId] = useState<string | null>(null);
  const [changePlanValue, setChangePlanValue] = useState<string>("");
  const [cancelSubId, setCancelSubId] = useState<string | null>(null);

  const { data, isLoading } = trpc.subscriptions.list.useQuery({
    page,
    pageSize,
  });

  const utils = trpc.useUtils();
  const changePlanMutation = trpc.subscriptions.changePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated");
      setChangePlanSubId(null);
      setChangePlanValue("");
      utils.subscriptions.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.subscriptions.cancel.useMutation({
    onSuccess: () => {
      toast.success("Subscription canceled");
      setCancelSubId(null);
      utils.subscriptions.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const pauseMutation = trpc.subscriptions.pause.useMutation({
    onSuccess: () => {
      toast.success("Subscription paused");
      utils.subscriptions.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const subs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleChangePlan = () => {
    if (!changePlanSubId || !changePlanValue) return;
    changePlanMutation.mutate({ id: changePlanSubId, plan: changePlanValue as "free" | "pro" | "enterprise" });
  };

  const handleCancel = () => {
    if (!cancelSubId) return;
    cancelMutation.mutate({ id: cancelSubId });
  };

  const exportData = subs.map((s) => ({
    Organization: (s as { organization?: { name?: string } }).organization?.name ?? "—",
    Plan: (s as { organization?: { plan?: string } }).organization?.plan ?? "—",
    Status: s.status ?? "—",
    "Current Period End": safeFormatDate(s.current_period_end, "yyyy-MM-dd"),
    "Cancel at Period End": s.cancel_at_period_end ? "Yes" : "No",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage subscription plans
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ExportButton data={exportData} filename="subscriptions" />
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <p>No data found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Period End</TableHead>
                  <TableHead>Cancel at Period End</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((s) => {
                  const sub = s as {
                    id: string;
                    status: string;
                    current_period_end: string;
                    cancel_at_period_end: boolean;
                    organization?: { name: string; plan: string } | null;
                  };
                  const org = sub.organization;
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        {org?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <PlanBadge plan={org?.plan} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(sub.current_period_end, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {sub.cancel_at_period_end ? "Yes" : "No"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setChangePlanSubId(sub.id)}>
                              <CreditCard className="mr-2 size-4" />
                              Change Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setCancelSubId(sub.id)}
                            >
                              <XCircle className="mr-2 size-4" />
                              Cancel
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => pauseMutation.mutate({ id: sub.id })}
                            >
                              <Pause className="mr-2 size-4" />
                              Pause
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      <Dialog open={!!changePlanSubId} onOpenChange={(o) => !o && setChangePlanSubId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Select a new plan for this subscription.
            </DialogDescription>
          </DialogHeader>
          <Select value={changePlanValue} onValueChange={setChangePlanValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanSubId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!changePlanValue || changePlanMutation.isPending}
            >
              Change Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelSubId} onOpenChange={(o) => !o && setCancelSubId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the subscription. The organization will lose access to paid features.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
