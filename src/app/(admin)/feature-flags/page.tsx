"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import { ToggleLeft, Plus } from "lucide-react";
import { safeFormatDate } from "@/lib/utils";

type FlagRow = {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
  enabled: boolean;
  scope: string | null;
  created_at: string;
  updated_at?: string;
};

export default function FeatureFlagsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState("");
  const [createLabel, setCreateLabel] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createEnabled, setCreateEnabled] = useState(false);
  const [createScope, setCreateScope] = useState("global");

  const { data: flagsData, isLoading, refetch } = trpc.featureFlags.list.useQuery();
  const utils = trpc.useUtils();
  const createMutation = trpc.featureFlags.create.useMutation({
    onSuccess: () => {
      utils.featureFlags.list.invalidate();
      refetch();
      setCreateOpen(false);
      resetCreateForm();
      toast.success("Feature flag created");
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.featureFlags.update.useMutation({
    onSuccess: () => {
      utils.featureFlags.list.invalidate();
      refetch();
      toast.success("Feature flag updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const flags = (flagsData?.data ?? []) as FlagRow[];

  function resetCreateForm() {
    setCreateKey("");
    setCreateLabel("");
    setCreateDescription("");
    setCreateEnabled(false);
    setCreateScope("global");
  }

  function handleCreate() {
    const key = createKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) {
      toast.error("Key is required");
      return;
    }
    createMutation.mutate({
      key,
      label: createLabel.trim() || undefined,
      description: createDescription.trim() || undefined,
      enabled: createEnabled,
      scope: createScope,
    });
  }

  function getScopeBadgeVariant(scope: string | null) {
    if (!scope || scope === "global") return "secondary";
    if (scope === "org") return "default";
    if (scope === "project") return "outline";
    return "secondary";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feature Flags</h1>
          <p className="text-muted-foreground">
            Manage platform feature toggles
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Create Flag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Feature Flag</DialogTitle>
              <DialogDescription>
                Add a new feature flag to control platform behavior
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-key">Key</Label>
                <Input
                  id="create-key"
                  placeholder="snake_case_key"
                  value={createKey}
                  onChange={(e) => setCreateKey(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Use snake_case (e.g. enable_new_dashboard)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-label">Label</Label>
                <Input
                  id="create-label"
                  placeholder="Display label"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  placeholder="What does this flag control?"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="create-enabled">Enabled</Label>
                <Switch
                  id="create-enabled"
                  checked={createEnabled}
                  onCheckedChange={setCreateEnabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-scope">Scope</Label>
                <Select
                  value={createScope}
                  onValueChange={setCreateScope}
                >
                  <SelectTrigger id="create-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">global</SelectItem>
                    <SelectItem value="org">org</SelectItem>
                    <SelectItem value="project">project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <ToggleLeft className="size-10 opacity-50" />
                        <p>No feature flags yet</p>
                        <p className="text-sm">
                          Create your first flag to get started
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  flags.map((flag) => (
                    <TableRow key={flag.id}>
                      <TableCell className="font-mono text-sm">
                        {flag.key}
                      </TableCell>
                      <TableCell>{flag.label ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {flag.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getScopeBadgeVariant(flag.scope)}
                          className={
                            flag.scope === "org"
                              ? "bg-blue-600/20 text-blue-700 dark:text-blue-400"
                              : flag.scope === "project"
                                ? "bg-purple-600/20 text-purple-700 dark:text-purple-400"
                                : ""
                          }
                        >
                          {flag.scope ?? "global"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={!!flag.enabled}
                          onCheckedChange={(checked) =>
                            updateMutation.mutate({
                              id: flag.id,
                              enabled: checked,
                            })
                          }
                          disabled={updateMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {safeFormatDate(
                          flag.updated_at ?? flag.created_at,
                          "MMM d, yyyy"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
