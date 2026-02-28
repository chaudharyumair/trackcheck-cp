"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { trpc } from "@/lib/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExportButton } from "@/components/admin/export-button";
import { safeFormatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Eye,
  Edit,
  UserX,
  UserCheck,
  Key,
  Copy,
  Users2,
  Plus,
} from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  created_at: string;
  deleted_at: string | null;
  firstOrgName: string | null;
  aiCredits: number;
  signupSource: string | null;
  isInvitedPending: boolean;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function truncateUuid(uuid: string, len = 8): string {
  if (!uuid || uuid.length <= len) return uuid;
  return `${uuid.slice(0, len)}…`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
}

function getRoleBadgeVariant(role: string | null): "default" | "secondary" | "outline" {
  if (!role) return "secondary";
  const r = role.toLowerCase();
  if (r === "super_admin" || r === "admin") return "default";
  return "secondary";
}

function formatSource(source: string | null): string {
  if (!source) return "—";
  const map: Record<string, string> = {
    landing_page: "Landing Page",
    extension: "Extension",
    admin_panel: "Admin Panel",
    google: "Google OAuth",
    invitation: "Invitation",
  };
  return map[source] ?? source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function CreateUserDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("owner");

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      setOpen(false);
      setEmail("");
      setPassword("");
      setName("");
      setRole("owner");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 size-4" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new platform user. They will be able to sign in immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cu-name">Name</Label>
            <Input id="cu-name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-email">Email *</Label>
            <Input id="cu-email" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-password">Password *</Label>
            <Input id="cu-password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="cu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="finance_admin">Finance Admin</SelectItem>
                <SelectItem value="support_admin">Support Admin</SelectItem>
                <SelectItem value="read_only_admin">Read-Only Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => createMutation.mutate({ email, password, name: name || undefined, role })} disabled={!email || !password || createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "deactivated">("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = trpc.users.list.useQuery({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status,
    sortBy,
    sortOrder,
  });

  const utils = trpc.useUtils();
  const deactivateMutation = trpc.users.deactivate.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      setDeactivateUserId(null);
      toast.success("User deactivated");
    },
    onError: (e) => toast.error(e.message),
  });
  const reactivateMutation = trpc.users.reactivate.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("User reactivated");
    },
    onError: (e) => toast.error(e.message),
  });
  const impersonateMutation = trpc.users.impersonate.useMutation({
    onSuccess: (result) => {
      toast.success(`Impersonating ${result.targetEmail}`);
      window.open(result.portalUrl, "_blank", "noopener,noreferrer");
    },
    onError: (e) => toast.error(e.message),
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleDeactivate = useCallback(() => {
    if (deactivateUserId) {
      deactivateMutation.mutate({ id: deactivateUserId });
    }
  }, [deactivateUserId, deactivateMutation]);

  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs">{truncateUuid(id)}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-6 w-6"
              onClick={() => copyToClipboard(id)}
            >
              <Copy className="size-3" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => row.original.name ?? "—",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email ?? "—",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={getRoleBadgeVariant(row.original.role)}>
          {row.original.role ?? "—"}
        </Badge>
      ),
    },
    {
      id: "organization",
      header: "Organization",
      cell: ({ row }) => row.original.firstOrgName ?? "—",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        if (row.original.deleted_at) {
          return <Badge variant="destructive">Deactivated</Badge>;
        }
        if (row.original.isInvitedPending) {
          return <Badge className="bg-yellow-600/20 text-yellow-700 dark:text-yellow-400">Invited: Pending</Badge>;
        }
        return <Badge className="bg-green-600/20 text-green-700 dark:text-green-400">Active</Badge>;
      },
    },
    {
      id: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatSource(row.original.signupSource)}
        </span>
      ),
    },
    {
      id: "aiCredits",
      header: "AI Credits",
      cell: ({ row }) => row.original.aiCredits ?? 0,
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => safeFormatDate(row.original.created_at, "MMM d, yyyy"),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const u = row.original;
        const isDeactivated = !!u.deleted_at;
        return (
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link href={`/users/${u.id}`}>
                    <Eye className="size-3.5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link href={`/users/${u.id}`}>
                    <Edit className="size-3.5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={impersonateMutation.isPending}
                  onClick={() => {
                    if (confirm("Impersonate this user? This will be logged.")) {
                      impersonateMutation.mutate({ targetUserId: u.id });
                    }
                  }}
                >
                  <Users2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Impersonate</TooltipContent>
            </Tooltip>
            {isDeactivated ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-green-600 hover:text-green-700"
                    onClick={() => reactivateMutation.mutate({ id: u.id })}
                  >
                    <UserCheck className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reactivate</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeactivateUserId(u.id)}
                  >
                    <UserX className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Deactivate</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => toast.info("Reset password not yet implemented")}
                >
                  <Key className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset Password</TooltipContent>
            </Tooltip>
          </div>
        );
      },
      meta: { sticky: true },
    },
  ];

  const table = useReactTable({
    data: users as UserRow[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const exportData = users.map((u) => ({
    id: u.id,
    name: u.name ?? "—",
    email: u.email,
    role: u.role ?? "—",
    organization: u.firstOrgName ?? "—",
    status: u.deleted_at ? "Deactivated" : u.isInvitedPending ? "Invited: Pending" : "Active",
    source: formatSource(u.signupSource),
    ai_credits: u.aiCredits ?? 0,
    created_at: safeFormatDate(u.created_at, "yyyy-MM-dd"),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
        <CreateUserDialog onSuccess={() => utils.users.list.invalidate()} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as "all" | "active" | "deactivated")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>
          <ExportButton
            data={exportData}
            filename="users-export"
            columns={[
              { key: "id", label: "ID" },
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role" },
              { key: "organization", label: "Organization" },
              { key: "status", label: "Status" },
              { key: "source", label: "Source" },
              { key: "ai_credits", label: "AI Credits" },
              { key: "created_at", label: "Created" },
            ]}
          />
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isSticky = (header.column.columnDef.meta as { sticky?: boolean })?.sticky;
                      return (
                        <TableHead
                          key={header.id}
                          className={isSticky ? "sticky right-0 bg-background shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]" : ""}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => {
                        const isSticky = (cell.column.columnDef.meta as { sticky?: boolean })?.sticky;
                        return (
                          <TableCell
                            key={cell.id}
                            className={isSticky ? "sticky right-0 bg-background shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]" : ""}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t px-4 py-2">
              <p className="text-muted-foreground text-sm">
                {total} user{total !== 1 ? "s" : ""} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={!!deactivateUserId} onOpenChange={(open) => !open && setDeactivateUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the user. They will no longer be able to sign in.
              You can reactivate them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
