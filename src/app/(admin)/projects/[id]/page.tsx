"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Radar,
  RotateCcw,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { safeFormatDate, formatNumber, formatPercent } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [forceGa4Open, setForceGa4Open] = useState(false);
  const [forceDriftOpen, setForceDriftOpen] = useState(false);
  const [resetCreditsOpen, setResetCreditsOpen] = useState(false);

  const { data: project, isLoading } = trpc.projects.get.useQuery({ id: projectId });
  const { data: events = [], isLoading: eventsLoading } =
    trpc.projects.getEvents.useQuery({ projectId });

  const utils = trpc.useUtils();
  const forceGa4Mutation = trpc.projects.forceGa4Sync.useMutation({
    onSuccess: () => {
      toast.success("GA4 sync triggered");
      setForceGa4Open(false);
      utils.projects.get.invalidate({ id: projectId });
    },
    onError: (e) => toast.error(e.message),
  });
  const forceDriftMutation = trpc.projects.forceDriftDetection.useMutation({
    onSuccess: () => {
      toast.success("Drift detection triggered");
      setForceDriftOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const resetCreditsMutation = trpc.projects.resetCredits.useMutation({
    onSuccess: () => {
      toast.success("Credits reset");
      setResetCreditsOpen(false);
      utils.projects.get.invalidate({ id: projectId });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !project) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const p = project as {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    ga4_property_id?: string;
    ga4_measurement_id?: string;
    organization?: { id: string; name: string; slug: string; plan: string } | null;
    eventCount: number;
    flowCount: number;
    screenCount: number;
    interactionCount: number;
    aiUsage?: { totalCost: number; totalTokens: number };
    ga4Connection?: { ga4_property_id: string; ga4_property_name?: string } | null;
  };

  const org = p.organization;
  const verifiedCount =
    (events as Array<{ verification_status?: string }>).filter(
      (e) => e.verification_status === "verified"
    ).length;
  const verifiedPercent =
    events.length > 0 ? (verifiedCount / events.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{p.name}</h1>
            <p className="text-muted-foreground">
              {org?.name ?? "—"} {org?.slug ?? ""}
            </p>
          </div>
          <Badge variant={p.ga4_property_id ? "default" : "secondary"}>
            {p.ga4_property_id ? "GA4 Connected" : "GA4 Not Connected"}
          </Badge>
          {p.domain && (
            <span className="text-sm text-muted-foreground">{p.domain}</span>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="flow-stats">Flow Stats</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
          <TabsTrigger value="admin-actions">Admin Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Project Name</p>
                  <p className="font-medium">{p.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Domain</p>
                  <p className="font-medium">{p.domain ?? p.slug ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-medium">
                    {org ? (
                      <Link
                        href={`/organizations/${org.id}`}
                        className="text-primary hover:underline"
                      >
                        {org.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <Badge variant="secondary">{org?.plan ?? "—"}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GA4 Property ID</p>
                  <p className="font-mono text-sm">
                    {p.ga4_property_id ?? p.ga4Connection?.ga4_property_id ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Measurement ID</p>
                  <p className="font-mono text-sm">{p.ga4_measurement_id ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow-stats" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Flows</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatNumber(p.flowCount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Screens</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatNumber(p.screenCount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Interactions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatNumber(p.interactionCount)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Verified %</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatPercent(verifiedPercent)}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : events.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No events</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Lifecycle</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>GA4 Synced</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(events as Array<{
                      id: string;
                      event_name: string;
                      lifecycle_status?: string;
                      verification_status?: string;
                      ga4_synced?: boolean;
                    }>).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.event_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {e.lifecycle_status ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              e.verification_status === "verified"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {e.verification_status ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {e.ga4_synced ? "Yes" : "No"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Credits Used</p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(p.aiUsage?.totalTokens ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">AI Jobs Executed</p>
                  <p className="text-2xl font-semibold">
                    {formatNumber(Math.ceil((p.aiUsage?.totalTokens ?? 0) / 1000))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin-actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={() => setForceGa4Open(true)}
              >
                <RefreshCw className="mr-2 size-4" />
                Force GA4 Sync
              </Button>
              <Button
                variant="outline"
                onClick={() => setForceDriftOpen(true)}
              >
                <Radar className="mr-2 size-4" />
                Force Drift Detection
              </Button>
              <Button
                variant="outline"
                onClick={() => setResetCreditsOpen(true)}
              >
                <RotateCcw className="mr-2 size-4" />
                Reset Credits
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={forceGa4Open} onOpenChange={setForceGa4Open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force GA4 Sync</DialogTitle>
            <DialogDescription>
              This will trigger a sync with Google Analytics 4 for this project. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceGa4Open(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => forceGa4Mutation.mutate({ projectId })}
              disabled={forceGa4Mutation.isPending}
            >
              Force Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={forceDriftOpen} onOpenChange={setForceDriftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Drift Detection</DialogTitle>
            <DialogDescription>
              This will trigger drift detection for this project. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceDriftOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => forceDriftMutation.mutate({ projectId })}
              disabled={forceDriftMutation.isPending}
            >
              Force Detection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetCreditsOpen} onOpenChange={setResetCreditsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Credits</DialogTitle>
            <DialogDescription>
              This will reset the AI credits used for this project to 0. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetCreditsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => resetCreditsMutation.mutate({ projectId })}
              disabled={resetCreditsMutation.isPending}
            >
              Reset Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
