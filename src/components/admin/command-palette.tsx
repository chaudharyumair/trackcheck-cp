"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  Cpu,
  DollarSign,
  CreditCard,
  ScrollText,
  Activity,
  ToggleLeft,
  Settings,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";

const adminPages = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/ai-usage", label: "AI Usage", icon: Cpu },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/audit", label: "Audit & Logs", icon: ScrollText },
  { href: "/system", label: "System Health", icon: Activity },
  { href: "/feature-flags", label: "Feature Flags", icon: ToggleLeft },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSelect(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Navigate">
      <CommandInput placeholder="Search pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Admin Pages">
          {adminPages.map((page) => {
            const Icon = page.icon;
            return (
              <CommandItem
                key={page.href}
                onSelect={() => handleSelect(page.href)}
              >
                <Icon className="mr-2 size-4" />
                {page.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
