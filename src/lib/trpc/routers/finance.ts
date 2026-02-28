import { z } from "zod";
import { router, financeAdminProcedure } from "../init";
import { createServiceRoleClient } from "@/lib/supabase/server";

const PLAN_PRICES: Record<string, number> = {
  pro: 49,
  enterprise: 199,
  free: 0,
};

export const financeRouter = router({
  overview: financeAdminProcedure
    .input(z.object({ from: z.string().optional(), to: z.string().optional() }).optional())
    .query(async () => {
      const supabase = createServiceRoleClient();

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, status, stripe_price_id, current_period_start, current_period_end, organization_id");

      const activeSubs = (subs ?? []).filter((s) => (s as { status: string }).status === "active");
      const activeCount = activeSubs.length;
      const pastDueCount = (subs ?? []).filter((s) => (s as { status: string }).status === "past_due").length;

      const orgIds = [...new Set(activeSubs.map((s) => (s as { organization_id: string }).organization_id))];
      let orgPlanMap: Record<string, string> = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, plan")
          .in("id", orgIds);
        for (const o of orgs ?? []) {
          orgPlanMap[(o as { id: string }).id] = (o as { plan: string }).plan ?? "free";
        }
      }

      let mrr = 0;
      for (const s of activeSubs) {
        const orgId = (s as { organization_id: string }).organization_id;
        const plan = orgPlanMap[orgId] ?? "free";
        mrr += PLAN_PRICES[plan] ?? 0;
      }

      const arr = mrr * 12;
      const churnRate = 0;
      const ltv = activeCount > 0 ? mrr / Math.max(churnRate, 0.01) : 0;

      return {
        mrr,
        arr,
        churnRate,
        ltv,
        activeSubscriptions: activeCount,
        pastDue: pastDueCount,
        totalSubscriptions: subs?.length ?? 0,
      };
    }),

  listPayments: financeAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        status: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { page, pageSize, status, from, to } = input;
      const fromIdx = (page - 1) * pageSize;
      const toIdx = fromIdx + pageSize - 1;

      let query = supabase
        .from("subscriptions")
        .select("id, organization_id, status, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end, cancel_at_period_end, created_at", {
          count: "exact",
        });

      if (status) query = query.eq("status", status);
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to);

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(fromIdx, toIdx);

      if (error) throw error;

      const orgIds = [...new Set((data ?? []).map((s) => (s as { organization_id: string }).organization_id))];
      let orgMap: Record<string, { name: string; plan: string; owner_id: string | null }> = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name, plan, owner_id")
          .in("id", orgIds);
        for (const o of orgs ?? []) {
          orgMap[(o as { id: string }).id] = {
            name: (o as { name: string }).name,
            plan: (o as { plan: string }).plan ?? "free",
            owner_id: (o as { owner_id: string | null }).owner_id,
          };
        }
      }

      const ownerIds = [...new Set(Object.values(orgMap).map((o) => o.owner_id).filter(Boolean))] as string[];
      let userMap: Record<string, { name: string | null; email: string }> = {};
      if (ownerIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", ownerIds);
        for (const u of users ?? []) {
          userMap[(u as { id: string }).id] = {
            name: (u as { name: string | null }).name,
            email: (u as { email: string }).email,
          };
        }
      }

      const payments = (data ?? []).map((s) => {
        const orgId = (s as { organization_id: string }).organization_id;
        const org = orgMap[orgId];
        const owner = org?.owner_id ? userMap[org.owner_id] : null;
        const plan = org?.plan ?? "free";
        const invoiceAmount = PLAN_PRICES[plan] ?? 0;
        return {
          ...s,
          organizationName: org?.name ?? null,
          plan,
          invoiceAmount,
          renewalDate: (s as { current_period_end: string }).current_period_end,
          cancelAtPeriodEnd: (s as { cancel_at_period_end: boolean }).cancel_at_period_end ?? false,
          user: owner ? { id: org!.owner_id, name: owner.name, email: owner.email } : null,
        };
      });

      return { data: payments, total: count ?? 0 };
    }),

  upcomingRenewals: financeAdminProcedure.query(async () => {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, organization_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id")
      .eq("status", "active")
      .gte("current_period_end", now)
      .lte("current_period_end", thirtyDaysFromNow)
      .order("current_period_end", { ascending: true });

    if (error) throw error;

    const orgIds = [...new Set((data ?? []).map((s) => (s as { organization_id: string }).organization_id))];
    let orgMap: Record<string, { name: string; plan: string; owner_id: string | null }> = {};
    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, plan, owner_id")
        .in("id", orgIds);
      for (const o of orgs ?? []) {
        orgMap[(o as { id: string }).id] = {
          name: (o as { name: string }).name,
          plan: (o as { plan: string }).plan ?? "free",
          owner_id: (o as { owner_id: string | null }).owner_id,
        };
      }
    }

    const ownerIds = [...new Set(Object.values(orgMap).map((o) => o.owner_id).filter(Boolean))] as string[];
    let userMap: Record<string, { name: string | null; email: string }> = {};
    if (ownerIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", ownerIds);
      for (const u of users ?? []) {
        userMap[(u as { id: string }).id] = {
          name: (u as { name: string | null }).name,
          email: (u as { email: string }).email,
        };
      }
    }

    const renewals = (data ?? []).map((s) => {
      const orgId = (s as { organization_id: string }).organization_id;
      const org = orgMap[orgId];
      const owner = org?.owner_id ? userMap[org.owner_id] : null;
      const plan = org?.plan ?? "free";
      return {
        id: (s as { id: string }).id,
        organizationName: org?.name ?? "—",
        plan,
        renewalDate: (s as { current_period_end: string }).current_period_end,
        cancelAtPeriodEnd: (s as { cancel_at_period_end: boolean }).cancel_at_period_end ?? false,
        invoiceAmount: PLAN_PRICES[plan] ?? 0,
        user: owner ? { name: owner.name, email: owner.email } : null,
      };
    });

    return { data: renewals };
  }),
});
