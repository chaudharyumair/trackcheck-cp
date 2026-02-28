"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { safeFormatDate, safeFormatDistance } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Shield, Mail, Calendar, Cpu } from "lucide-react";

const profileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  role: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type OrgMembership = {
  organization_id: string;
  role: string;
  joined_at?: string | null;
  organization?: { id: string; name: string; slug?: string } | null;
};

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const { data: user, isLoading, error } = trpc.users.get.useQuery(
    { id: userId },
    { enabled: !!userId }
  );

  const utils = trpc.useUtils();
  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.get.invalidate({ id: userId });
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(e.message),
  });
  const deactivateMutation = trpc.users.deactivate.useMutation({
    onSuccess: () => {
      utils.users.get.invalidate({ id: userId });
      toast.success("User deactivated");
    },
    onError: (e) => toast.error(e.message),
  });
  const reactivateMutation = trpc.users.reactivate.useMutation({
    onSuccess: () => {
      utils.users.get.invalidate({ id: userId });
      toast.success("User reactivated");
    },
    onError: (e) => toast.error(e.message),
  });
  const impersonateMutation = trpc.users.impersonate.useMutation({
    onSuccess: () => toast.success("Impersonation logged"),
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "member",
    },
    values: user
      ? {
          name: user.name ?? "",
          email: user.email ?? "",
          role: user.role ?? "member",
        }
      : undefined,
  });

  const onSubmit = (values: ProfileFormValues) => {
    updateMutation.mutate({
      id: userId,
      name: values.name,
      email: values.email || undefined,
      role: values.role,
    });
  };

  const orgMemberships = (user?.orgMemberships ?? []) as OrgMembership[];
  const aiStats = user?.aiUsageStats as
    | { totalTokens: number; totalCost: number; projectUsage?: { projectId: string; projectName: string; tokens: number; cost: number }[] }
    | undefined;

  const getOrgName = (m: OrgMembership) =>
    (m.organization as { name?: string } | null)?.name ?? m.organization_id;
  const getJoinedAt = (m: OrgMembership) =>
    m.joined_at ? safeFormatDate(m.joined_at, "MMM d, yyyy") : "—";

  if (error) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">Error loading user: {error.message}</p>
        <Button variant="outline" asChild>
          <Link href="/users">← Back to Users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/users">
              <ArrowLeft className="mr-2 size-4" />
              Back to Users
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
      ) : !user ? (
        <p className="text-muted-foreground">User not found.</p>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{user.name ?? "Unnamed User"}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="size-4" />
                {user.email}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Shield className="size-3" />
                  {user.role ?? "member"}
                </Badge>
                {user.deleted_at ? (
                  <Badge variant="destructive">Deactivated</Badge>
                ) : (
                  <Badge className="bg-green-600/20 text-green-700 dark:text-green-400">
                    Active
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => impersonateMutation.mutate({ targetUserId: userId })}
            >
              Impersonate
            </Button>
          </div>

          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        {...form.register("name")}
                        placeholder="User name"
                      />
                      {form.formState.errors.name && (
                        <p className="text-destructive text-sm">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="user@example.com"
                      />
                      {form.formState.errors.email && (
                        <p className="text-destructive text-sm">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={form.watch("role")}
                        onValueChange={(v) => form.setValue("role", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!user.deleted_at}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            reactivateMutation.mutate({ id: userId });
                          } else {
                            deactivateMutation.mutate({ id: userId });
                          }
                        }}
                      />
                      <Label>Account active</Label>
                    </div>
                    <Separator />
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="organizations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Memberships</CardTitle>
                </CardHeader>
                <CardContent>
                  {orgMemberships.length === 0 ? (
                    <p className="text-muted-foreground">No organization memberships.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Org Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined At</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orgMemberships.map((m) => (
                          <TableRow key={m.organization_id}>
                            <TableCell>{getOrgName(m)}</TableCell>
                            <TableCell>{m.role}</TableCell>
                            <TableCell>{getJoinedAt(m)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  toast.info("Remove from org not yet implemented")
                                }
                              >
                                Remove
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

            <TabsContent value="ai-usage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="size-4" />
                    AI Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-muted-foreground text-sm">
                        Total credits used
                      </p>
                      <p className="text-2xl font-semibold">
                        {aiStats?.totalTokens ?? 0}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        tokens
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-muted-foreground text-sm">
                        Total cost
                      </p>
                      <p className="text-2xl font-semibold">
                        ${(aiStats?.totalCost ?? 0).toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="mb-2 font-medium">Per-project usage</h4>
                    {!aiStats?.projectUsage?.length ? (
                      <p className="text-muted-foreground">No AI usage recorded.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Tokens</TableHead>
                            <TableHead>Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {aiStats.projectUsage.map((p) => (
                            <TableRow key={p.projectId}>
                              <TableCell>{p.projectName}</TableCell>
                              <TableCell>{p.tokens}</TableCell>
                              <TableCell>${p.cost.toFixed(4)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between border-b pb-2">
                      <span className="text-muted-foreground">Account created</span>
                      <span>{safeFormatDate(user.created_at, "MMM d, yyyy")}</span>
                    </li>
                    <li className="flex items-center justify-between border-b pb-2">
                      <span className="text-muted-foreground">Last updated</span>
                      <span>
                        {safeFormatDistance(user.updated_at)}
                      </span>
                    </li>
                    {user.deleted_at && (
                      <li className="flex items-center justify-between border-b pb-2">
                        <span className="text-muted-foreground">Deactivated at</span>
                        <span>{safeFormatDate(user.deleted_at, "MMM d, yyyy")}</span>
                      </li>
                    )}
                  </ul>
                  <p className="text-muted-foreground mt-4 text-sm">
                    Last login, events created, and QA actions will appear here when
                    available.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
