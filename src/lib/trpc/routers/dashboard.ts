import { z } from "zod";
import { router, adminProcedure } from "../init";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dashboardRouter = router({
  getStats: adminProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { from, to } = input;

      const [
        usersRes,
        newUsersRes,
        activeUsersRes,
        deactivatedUsersRes,
        orgsRes,
        activeOrgsRes,
        freePlanRes,
        proPlanRes,
        enterprisePlanRes,
        projectsRes,
        projectsWithGa4Res,
        eventsRes,
        liveEventsRes,
        flowsRes,
        screensRes,
        interactionsRes,
        aiCreditsRes,
        aiCostRes,
        subscriptionsRes,
        activeSubsRes,
      ] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .gte("created_at", from)
          .lte("created_at", to),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .not("deleted_at", "is", null),
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("plan", "free"),
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("plan", "pro"),
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("plan", "enterprise"),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .not("ga4_property_id", "is", null),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("lifecycle_status", "live"),
        supabase
          .from("tracking_sections")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("tracking_screens")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("tracking_interactions")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("ai_usage_ledger")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("ai_usage_ledger")
          .select("cost_usd")
          .gte("created_at", from)
          .lte("created_at", to),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      let totalAiCost = 0;
      if (aiCostRes.data) {
        totalAiCost = aiCostRes.data.reduce(
          (sum, r) => sum + Number((r as { cost_usd: string })?.cost_usd ?? 0),
          0
        );
      }

      return {
        totalUsers: usersRes.count ?? 0,
        newUsers: newUsersRes.count ?? 0,
        activeUsers: activeUsersRes.count ?? 0,
        deactivatedUsers: deactivatedUsersRes.count ?? 0,
        totalOrgs: orgsRes.count ?? 0,
        activeOrgs: activeOrgsRes.count ?? 0,
        planBreakdown: {
          free: freePlanRes.count ?? 0,
          pro: proPlanRes.count ?? 0,
          enterprise: enterprisePlanRes.count ?? 0,
        },
        totalProjects: projectsRes.count ?? 0,
        projectsWithGa4: projectsWithGa4Res.count ?? 0,
        totalEvents: eventsRes.count ?? 0,
        liveEvents: liveEventsRes.count ?? 0,
        totalFlows: flowsRes.count ?? 0,
        totalScreens: screensRes.count ?? 0,
        totalInteractions: interactionsRes.count ?? 0,
        totalAiCreditsUsed: aiCreditsRes.count ?? 0,
        totalAiCost,
        totalRevenue: 0,
        activeSubscriptions: activeSubsRes.count ?? 0,
      };
    }),
  getChartData: adminProcedure.query(async () => {
    const supabase = createServiceRoleClient();

    const { data: allUsers } = await supabase
      .from("users")
      .select("created_at")
      .order("created_at", { ascending: true });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const userGrowth: { month: string; users: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = (allUsers ?? []).filter(u => new Date((u as { created_at: string }).created_at) <= endOfMonth).length;
      userGrowth.push({ month: monthNames[d.getMonth()], users: count });
    }

    // AI usage - daily for last 7 days
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const aiUsageByDay: { day: string; credits: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const { count } = await supabase
        .from("ai_usage_ledger")
        .select("id", { count: "exact", head: true })
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString());

      aiUsageByDay.push({ day: dayNames[dayStart.getDay()], credits: count ?? 0 });
    }

    // Events verified vs failed - monthly for last 12 months
    const eventTrend: { month: string; verified: number; failed: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = d.toISOString();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { count: liveCount } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("lifecycle_status", "live")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      const { count: totalCount } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      eventTrend.push({
        month: monthNames[d.getMonth()],
        verified: liveCount ?? 0,
        failed: (totalCount ?? 0) - (liveCount ?? 0),
      });
    }

    return {
      userGrowth,
      aiUsageByDay,
      eventTrend,
    };
  }),
});
