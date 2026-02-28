"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, Shield, Info } from "lucide-react";

const ADMIN_ROLES = [
  {
    role: "super_admin",
    description: "Full platform control",
  },
  {
    role: "finance_admin",
    description: "Finance + revenue + subscriptions only",
  },
  {
    role: "support_admin",
    description: "User management + impersonation only",
  },
  {
    role: "read_only_admin",
    description: "Read-only dashboard access",
  },
];

export default function SettingsPage() {
  const env =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production"
      ? "Production"
      : "Development";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="size-6" />
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">Admin portal configuration</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="size-5" />
              <CardTitle>Portal Information</CardTitle>
            </div>
            <CardDescription>TrackCheck admin portal URLs and version</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Portal URL</span>
              <span className="font-mono text-sm">cp.trackcheck.io</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Main App URL</span>
              <span className="font-mono text-sm">app.trackcheck.io</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment</span>
              <Badge variant={env === "Production" ? "default" : "secondary"}>
                {env}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono text-sm">1.0.0</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="size-5" />
              <CardTitle>Admin Roles</CardTitle>
            </div>
            <CardDescription>
              Available admin roles and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ADMIN_ROLES.map((r) => (
                  <TableRow key={r.role}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {r.role}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
