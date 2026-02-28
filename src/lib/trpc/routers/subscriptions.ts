import { z } from "zod";
import { router, financeAdminProcedure, superAdminProcedure } from "../init";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const subscriptionsRouter = router({
  list: financeAdminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { page, pageSize, status } = input;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("subscriptions")
        .select("id, organization_id, status, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end, cancel_at_period_end", {
          count: "exact",
        });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const orgIds = [...new Set((data ?? []).map((s) => (s as { organization_id: string }).organization_id))];
      let orgMap: Record<string, { name: string; plan: string }> = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name, plan")
          .in("id", orgIds);
        for (const o of orgs ?? []) {
          orgMap[(o as { id: string }).id] = {
            name: (o as { name: string }).name,
            plan: (o as { plan: string }).plan ?? "free",
          };
        }
      }

      const subs = (data ?? []).map((s) => ({
        ...s,
        organization: orgMap[(s as { organization_id: string }).organization_id] ?? null,
      }));

      return { data: subs, total: count ?? 0 };
    }),

  changePlan: superAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        plan: z.enum(["free", "pro", "enterprise"]).optional(),
        stripePriceId: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const payload: Record<string, unknown> = {};
      if (input.stripePriceId !== undefined) payload.stripe_price_id = input.stripePriceId;
      if (input.status !== undefined) payload.status = input.status;

      const { error } = await supabase
        .from("subscriptions")
        .update(payload)
        .eq("id", input.id);
      if (error) throw error;

      if (input.plan) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("organization_id")
          .eq("id", input.id)
          .single();
        if (sub) {
          await supabase
            .from("organizations")
            .update({ plan: input.plan })
            .eq("id", (sub as { organization_id: string }).organization_id);
        }
      }
      return { success: true };
    }),

  cancel: superAdminProcedure
    .input(z.object({ id: z.string().uuid(), cancelAtPeriodEnd: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const payload: Record<string, unknown> = {
        status: "canceled",
      };
      if (input.cancelAtPeriodEnd !== undefined) {
        payload.cancel_at_period_end = input.cancelAtPeriodEnd;
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(payload)
        .eq("id", input.id);
      if (error) throw error;
      return { success: true };
    }),

  pause: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "paused" })
        .eq("id", input.id);
      if (error) throw error;
      return { success: true };
    }),
});
