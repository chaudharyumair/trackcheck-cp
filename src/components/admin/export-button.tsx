"use client";

import { Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { key: string; label: string }[];
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const resolvedColumns =
    columns ??
    (data.length > 0
      ? Object.keys(data[0]).map((key) => ({ key, label: key }))
      : []);

  function exportToCSV() {
    const headers = resolvedColumns.map((c) => c.label).join(",");
    const rows = data.map((row) =>
      resolvedColumns
        .map((c) => {
          const val = row[c.key];
          const str = val == null ? "" : String(val);
          return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportToJSON() {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportToPDF() {
    const doc = new jsPDF();
    const headers = resolvedColumns.map((c) => c.label);
    const body = data.map((row) =>
      resolvedColumns.map((c) => {
        const val = row[c.key];
        return val == null ? "" : String(val);
      })
    );

    autoTable(doc, {
      head: [headers],
      body,
      theme: "striped",
    });

    doc.save(`${filename}.pdf`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 size-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>Export as JSON</DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>Export as PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
