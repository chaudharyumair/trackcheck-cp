import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { CommandPalette } from "@/components/admin/command-palette";
import { NavigationProgress } from "@/components/navigation-progress";

const ADMIN_ROLES = [
  "super_admin",
  "finance_admin",
  "support_admin",
  "read_only_admin",
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role, email, name")
    .eq("id", user.id)
    .single();

  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role || "")) {
    redirect("/login?error=unauthorized");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <AdminSidebar userRole={dbUser.role ?? "read_only_admin"} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar
          userEmail={user.email ?? ""}
          userRole={dbUser.role ?? ""}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-[1600px] p-6">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
