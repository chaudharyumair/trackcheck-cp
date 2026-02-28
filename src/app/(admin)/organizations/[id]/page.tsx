"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  UserMinus,
  Shield,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { safeFormatDate, formatNumber, formatPercent } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function PlanBadge({ plan }: { plan: string | null | undefined }) {
  if (!plan) return null;
  return (
    <Badge
      variant={plan === "enterprise" ? "default" : plan === "pro" ? "default" : "secondary"}
      className={plan === "enterprise" ? "bg-purple-600" : ""}
    >
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const isActive = status === "active" || status === "trialing";
  return (
    <Badge variant={isActive ? "default" : "secondary"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const [editName, setEditName] = useState("");
  const [changeRoleMember, setChangeRoleMember] = useState<{
    userId: string;
    currentRole: string;
  } | null>(null);
  const [newRole, setNewRole] = useState("");
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  const { data: org, isLoading } = trpc.organizations.get.useQuery({ id: orgId });
  const utils = trpc.useUtils();
  const updateMutation = trpc.organizations.update.useMutation({
    onSuccess: () => {
      toast.success("Organization updated");
      utils.organizations.get.invalidate({ id: orgId });
    },
    onError: (e) => toast.error(e.message),
  });
  const updateRoleMutation = trpc.organizations.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      setChangeRoleMember(null);
      utils.organizations.get.invalidate({ id: orgId });
    },
    onError: (e) => toast.error(e.message),
  });
  const removeMemberMutation = trpc.organizations.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      setRemoveMemberId(null);
      utils.organizations.get.invalidate({ id: orgId });
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (org?.name) setEditName((org as { name: string }).name);
  }, [org?.name]);

  const handleSaveName = () => {
    if (editName && editName !== (org as { name: string })?.name) {
      updateMutation.mutate({ id: orgId, name: editName });
    }
  };

  const handleChangeRole = () => {
    if (!changeRoleMember || !newRole) return;
    updateRoleMutation.mutate({
      organizationId: orgId,
      userId: changeRoleMember.userId,
      role: newRole,
    });
  };

  const handleRemoveMember = () => {
    if (!removeMemberId) return;
    removeMemberMutation.mutate({ organizationId: orgId, userId: removeMemberId });
  };

  if (isLoading || !org) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const o = org as {
    id: string;
    name: string;
    slug: string;
    plan: string;
    subscription_status?: string;
    stripe_customer_id?: string;
    created_at: string;
    updated_at: string;
    owner?: { email?: string; name?: string } | null;
    members: Array<{
      user_id: string;
      role: string;
      joined_at?: string;
      user?: { id: string; name?: string; email?: string } | null;
    }>;
    projects: Array<{
      id: string;
      name: string;
      slug: string;
      domain?: string;
      ga4_property_id?: string;
      eventCount?: number;
      flowCount?: number;
    }>;
    subscription?: Record<string, unknown> | null;
    aiUsage?: { totalCost: number };
    usageStats?: {
      totalAiCredits: number;
      totalEvents: number;
      verifiedEvents: number;
      verifiedPercent: number;
    };
  };

  const members = o.members ?? [];
  const projects = o.projects ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{o.name}</h1>
            <p className="text-muted-foreground">{o.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <PlanBadge plan={o.plan} />
            <StatusBadge status={o.subscription_status} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={handleSaveName}
                    />
                    <Button size="icon" variant="outline" onClick={handleSaveName}>
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <p className="rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
                    {o.slug}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <div>
                    <PlanBadge plan={o.plan} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subscription Status</Label>
                  <div>
                    <StatusBadge status={o.subscription_status} />
                  </div>
                </div>
                {o.stripe_customer_id && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Stripe Customer ID</Label>
                    <p className="font-mono text-sm text-muted-foreground">
                      {o.stripe_customer_id}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Created</Label>
                  <p className="text-sm">{safeFormatDate(o.created_at, "MMM d, yyyy")}</p>
                </div>
                <div className="space-y-2">
                  <Label>Updated</Label>
                  <p className="text-sm">{safeFormatDate(o.updated_at, "MMM d, yyyy")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No members</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined At</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => {
                      const user = m.user as { id: string; name?: string; email?: string } | undefined;
                      return (
                        <TableRow key={m.user_id}>
                          <TableCell>{user?.name ?? "—"}</TableCell>
                          <TableCell>{user?.email ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{m.role}</Badge>
                          </TableCell>
                          <TableCell>
                            {safeFormatDate(m.joined_at, "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    setChangeRoleMember({
                                      userId: m.user_id,
                                      currentRole: m.role,
                                    })
                                  }
                                >
                                  <Shield className="mr-2 size-4" />
                                  Change role
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setRemoveMemberId(m.user_id)}
                                >
                                  <UserMinus className="mr-2 size-4" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No projects</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>GA4 Connected</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Flows</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.domain ?? p.slug ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={p.ga4_property_id ? "default" : "secondary"}>
                            {p.ga4_property_id ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatNumber(p.eventCount ?? 0)}</TableCell>
                        <TableCell>{formatNumber(p.flowCount ?? 0)}</TableCell>
                        <TableCell>
                          <Button variant="link" size="sm" asChild>
                            <Link href={`/projects/${p.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">AI Credits Used</p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(o.usageStats?.totalAiCredits ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Event Count</p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(o.usageStats?.totalEvents ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Verified Events</p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(o.usageStats?.verifiedEvents ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Verified %</p>
                  <p className="text-2xl font-semibold">
                    {formatPercent(o.usageStats?.verifiedPercent ?? 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {o.subscription ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Subscription details (placeholder)
                  </p>
                  <pre className="rounded-md bg-muted p-4 text-xs overflow-auto">
                    {JSON.stringify(o.subscription, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-muted-foreground">No active subscription</p>
              )}
              <p className="text-sm text-muted-foreground">Payment info (placeholder)</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!changeRoleMember}
        onOpenChange={(o) => !o && setChangeRoleMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Select a new role for this member.</DialogDescription>
          </DialogHeader>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="engineer">Engineer</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleMember(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={!newRole || updateRoleMutation.isPending}
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeMemberId} onOpenChange={(o) => !o && setRemoveMemberId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from the organization?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveMemberId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={removeMemberMutation.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
