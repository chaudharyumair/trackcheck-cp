"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  CreditCard,
  Ban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { safeFormatDate, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { ExportButton } from "@/components/admin/export-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";

function PlanBadge({ plan }: { plan: string | null | undefined }) {
  if (!plan) return <span className="text-muted-foreground">—</span>;
  const variant =
    plan === "enterprise"
      ? "default"
      : plan === "pro"
        ? "default"
        : "secondary";
  return (
    <Badge variant={variant} className={plan === "enterprise" ? "bg-purple-600 hover:bg-purple-700" : ""}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const isActive = status === "active" || status === "trialing";
  return (
    <Badge variant={isActive ? "default" : "secondary"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState<string>("all");
  const [changePlanOrgId, setChangePlanOrgId] = useState<string | null>(null);
  const [changePlanValue, setChangePlanValue] = useState<string>("");
  const [suspendOrgId, setSuspendOrgId] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = trpc.organizations.list.useQuery({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    plan: plan === "all" ? undefined : plan,
  });

  const changePlanMutation = trpc.organizations.changePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated");
      setChangePlanOrgId(null);
      setChangePlanValue("");
    },
    onError: (e) => toast.error(e.message),
  });

  const suspendMutation = trpc.organizations.suspend.useMutation({
    onSuccess: () => {
      toast.success("Organization suspended");
      setSuspendOrgId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleChangePlan = () => {
    if (!changePlanOrgId || !changePlanValue) return;
    changePlanMutation.mutate({ id: changePlanOrgId, plan: changePlanValue });
  };

  const handleSuspend = () => {
    if (!suspendOrgId) return;
    suspendMutation.mutate({ id: suspendOrgId });
  };

  const orgs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const exportData = orgs.map((o) => ({
    Name: (o as { name: string }).name,
    Slug: (o as { slug: string }).slug,
    Owner: (o as { owner?: { email?: string } }).owner?.email ?? "—",
    Plan: (o as { plan: string }).plan ?? "—",
    Status: (o as { subscription_status?: string }).subscription_status ?? "—",
    Users: (o as { memberCount: number }).memberCount,
    Projects: (o as { projectCount: number }).projectCount,
    Created: (o as { created_at: string }).created_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <p className="text-muted-foreground">Manage all platform organizations</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <ExportButton data={exportData} filename="organizations" />
        </div>
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <p>No organizations found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => {
                  const o = org as {
                    id: string;
                    name: string;
                    slug: string;
                    plan: string;
                    subscription_status?: string;
                    owner?: { email?: string; name?: string } | null;
                    memberCount: number;
                    projectCount: number;
                    created_at: string;
                  };
                  const ownerDisplay = o.owner?.email ?? o.owner?.name ?? "—";
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{o.slug}</code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{ownerDisplay}</TableCell>
                      <TableCell>
                        <PlanBadge plan={o.plan} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.subscription_status} />
                      </TableCell>
                      <TableCell>{formatNumber(o.memberCount)}</TableCell>
                      <TableCell>{formatNumber(o.projectCount)}</TableCell>
                      <TableCell>{safeFormatDate(o.created_at, "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/organizations/${o.id}`}>
                                <Eye className="mr-2 size-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/organizations/${o.id}`}>
                                <Pencil className="mr-2 size-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChangePlanOrgId(o.id)}>
                              <CreditCard className="mr-2 size-4" />
                              Change Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setSuspendOrgId(o.id)}
                            >
                              <Ban className="mr-2 size-4" />
                              Suspend
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
                {total} organization{total !== 1 ? "s" : ""} total
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

      <Dialog open={!!changePlanOrgId} onOpenChange={(o) => !o && setChangePlanOrgId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>Select a new plan for this organization.</DialogDescription>
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
            <Button variant="outline" onClick={() => setChangePlanOrgId(null)}>
              Cancel
            </Button>
            <Button onClick={handleChangePlan} disabled={!changePlanValue || changePlanMutation.isPending}>
              Change Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!suspendOrgId} onOpenChange={(o) => !o && setSuspendOrgId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend this organization? This will soft-delete the organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOrgId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={suspendMutation.isPending}>
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
