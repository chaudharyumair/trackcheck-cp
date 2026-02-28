"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { safeFormatDate, formatNumber } from "@/lib/utils";
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
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [ga4Filter, setGa4Filter] = useState<string>("");
  const pageSize = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const ga4Connected =
    ga4Filter === "connected" ? true : ga4Filter === "not_connected" ? false : undefined;

  const { data, isLoading } = trpc.projects.list.useQuery({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    ga4Connected,
  });

  const projects = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const exportData = projects.map((p) => {
    const proj = p as {
      name: string;
      orgName?: string;
      domain?: string;
      ga4_property_id?: string;
      eventCount: number;
      flowCount: number;
      screenCount?: number;
      aiCredits?: number;
      created_at: string;
    };
    return {
      Name: proj.name,
      Organization: proj.orgName ?? "—",
      Domain: proj.domain ?? "—",
      "GA4 Connected": proj.ga4_property_id ? "Yes" : "No",
      Events: proj.eventCount,
      Flows: proj.flowCount,
      Screens: proj.screenCount ?? 0,
      "AI Credits": proj.aiCredits ?? 0,
      Created: proj.created_at,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-muted-foreground">Manage all platform projects</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={ga4Filter} onValueChange={setGa4Filter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="GA4 Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="not_connected">Not Connected</SelectItem>
            </SelectContent>
          </Select>
          <ExportButton data={exportData} filename="projects" />
        </div>
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <p>No projects found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>GA4</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Flows</TableHead>
                  <TableHead>Screens</TableHead>
                  <TableHead>AI Credits</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => {
                  const proj = p as {
                    id: string;
                    name: string;
                    orgName?: string;
                    domain?: string;
                    ga4_property_id?: string;
                    eventCount: number;
                    flowCount: number;
                    screenCount?: number;
                    aiCredits?: number;
                    created_at: string;
                  };
                  return (
                    <TableRow key={proj.id}>
                      <TableCell className="font-medium">{proj.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {proj.orgName ?? "—"}
                      </TableCell>
                      <TableCell>{proj.domain ?? proj.slug ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={proj.ga4_property_id ? "default" : "secondary"}
                        >
                          {proj.ga4_property_id ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatNumber(proj.eventCount)}</TableCell>
                      <TableCell>{formatNumber(proj.flowCount)}</TableCell>
                      <TableCell>{formatNumber(proj.screenCount ?? 0)}</TableCell>
                      <TableCell>{formatNumber(proj.aiCredits ?? 0)}</TableCell>
                      <TableCell>
                        {safeFormatDate(proj.created_at, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/projects/${proj.id}`}>
                            <Eye className="mr-1 size-4" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {total} project{total !== 1 ? "s" : ""} total
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
    </div>
  );
}
