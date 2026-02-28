"use client";

import { useState, useMemo } from "react";
import type { DateRange } from "react-day-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/react";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { ExportButton } from "@/components/admin/export-button";
import { safeFormatDate } from "@/lib/utils";
import { ScrollText, Filter } from "lucide-react";

const ENTITY_TYPES = [
  { value: "all", label: "All" },
  { value: "user", label: "User" },
  { value: "organization", label: "Organization" },
  { value: "project", label: "Project" },
  { value: "event", label: "Event" },
  { value: "system", label: "System" },
];

function truncateUuid(uuid: string | null | undefined, len = 8): string {
  if (!uuid || uuid.length <= len) return uuid ?? "—";
  return `${uuid.slice(0, len)}…`;
}

function normalizeAuditRow(row: Record<string, unknown>) {
  return {
    entityType: (row.entity_type ?? row.entityType ?? "—") as string,
    entityId: (row.entity_id ?? row.entityId ?? null) as string | null,
    action: (row.action ?? "—") as string,
    performedBy: (row.performed_by ?? row.userId ?? null) as string | null,
    organizationId: (row.organization_id ?? null) as string | null,
    createdAt: (row.created_at ?? row.createdAt ?? null) as string | null,
  };
}

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data, isLoading } = trpc.audit.list.useQuery({
    page,
    pageSize,
    entityType: entityTypeFilter || undefined,
    action: actionFilter || undefined,
    from: dateRange?.from?.toISOString(),
    to: dateRange?.to?.toISOString(),
  });

  const auditData = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const normalizedData = useMemo(
    () => auditData.map((r) => normalizeAuditRow(r as Record<string, unknown>)),
    [auditData]
  );

  const exportData = normalizedData.map((r) => ({
    entityType: r.entityType,
    entityId: r.entityId ?? "—",
    action: r.action,
    performedBy: truncateUuid(r.performedBy),
    organization: truncateUuid(r.organizationId),
    timestamp: safeFormatDate(r.createdAt, "yyyy-MM-dd HH:mm:ss"),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit & Logs</h1>
        <p className="text-muted-foreground">Platform activity audit trail</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <Select
            value={entityTypeFilter || "all"}
            onValueChange={(v) => setEntityTypeFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-[180px]"
          />
          <DateRangePicker
            value={dateRange}
            onChange={(range) =>
              setDateRange({ from: range.from, to: range.to })
            }
          />
          <ExportButton
            data={exportData}
            filename="audit-logs-export"
            columns={[
              { key: "entityType", label: "Entity Type" },
              { key: "entityId", label: "Entity ID" },
              { key: "action", label: "Action" },
              { key: "performedBy", label: "Performed By" },
              { key: "organization", label: "Organization" },
              { key: "timestamp", label: "Timestamp" },
            ]}
          />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-8 w-48" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalizedData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <ScrollText className="size-10 opacity-50" />
                          <p>No audit logs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    normalizedData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {row.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateUuid(row.entityId)}
                        </TableCell>
                        <TableCell>{row.action}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateUuid(row.performedBy)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateUuid(row.organizationId)}
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(row.createdAt, "MMM d, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-2">
                <p className="text-muted-foreground text-sm">
                  Page {page} of {totalPages} ({total} total)
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
            )}
          </>
        )}
      </Card>
    </div>
  );
}
