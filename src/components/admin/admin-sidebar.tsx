"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { TrackCheckLogo } from "@/components/icons/trackcheck-logo";

type AdminRole = "super_admin" | "finance_admin" | "support_admin" | "read_only_admin";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AdminRole[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "finance_admin", "support_admin", "read_only_admin"] },
  { href: "/users", label: "Users", icon: Users, roles: ["super_admin", "support_admin", "read_only_admin"] },
  { href: "/organizations", label: "Organizations", icon: Building2, roles: ["super_admin", "read_only_admin"] },
  { href: "/projects", label: "Projects", icon: FolderKanban, roles: ["super_admin", "read_only_admin"] },
  { href: "/ai-usage", label: "AI Usage", icon: Cpu, roles: ["super_admin", "read_only_admin"] },
  { href: "/finance", label: "Finance", icon: DollarSign, roles: ["super_admin", "finance_admin", "read_only_admin"] },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard, roles: ["super_admin", "finance_admin", "read_only_admin"] },
  { href: "/audit", label: "Audit & Logs", icon: ScrollText, roles: ["super_admin", "read_only_admin"] },
  { href: "/system", label: "System Health", icon: Activity, roles: ["super_admin"] },
  { href: "/feature-flags", label: "Feature Flags", icon: ToggleLeft, roles: ["super_admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["super_admin"] },
];

interface AdminSidebarProps {
  userRole?: string;
}

export function AdminSidebar({ userRole = "super_admin" }: AdminSidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole as AdminRole)
  );

  return (
    <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <TrackCheckLogo className="h-7" />
        </Link>
        <span className="rounded bg-sidebar-primary/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sidebar-primary">
          CP
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
