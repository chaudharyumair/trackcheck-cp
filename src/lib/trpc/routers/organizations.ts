import { z } from "zod";
import { router, adminProcedure, superAdminProcedure } from "../init";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const organizationsRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        search: z.string().optional(),
        plan: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { page, pageSize, search, plan } = input;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("organizations")
        .select("id, name, slug, plan, owner_id, subscription_status, stripe_customer_id, created_at, deleted_at", {
          count: "exact",
        });

      if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      }
      if (plan) {
        query = query.eq("plan", plan);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const orgIds = (data ?? []).map((o) => o.id);
      let ownerMap: Record<string, unknown> = {};
      let memberCountMap: Record<string, number> = {};
      let projectCountMap: Record<string, number> = {};

      if (orgIds.length > 0) {
        const ownerIds = (data ?? []).map((o) => (o as { owner_id: string }).owner_id).filter(Boolean);
        if (ownerIds.length > 0) {
          const { data: owners } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", ownerIds);
          for (const o of owners ?? []) {
            ownerMap[(o as { id: string }).id] = o;
          }
        }
        const { data: memberCounts } = await supabase
          .from("organization_members")
          .select("organization_id");
        for (const m of memberCounts ?? []) {
          const oid = (m as { organization_id: string }).organization_id;
          memberCountMap[oid] = (memberCountMap[oid] ?? 0) + 1;
        }
        const { data: projectCounts } = await supabase
          .from("projects")
          .select("organization_id");
        for (const p of projectCounts ?? []) {
          const oid = (p as { organization_id: string }).organization_id;
          projectCountMap[oid] = (projectCountMap[oid] ?? 0) + 1;
        }
      }

      const orgs = (data ?? []).map((o) => ({
        ...o,
        owner: (o as { owner_id: string }).owner_id
          ? ownerMap[(o as { owner_id: string }).owner_id]
          : null,
        memberCount: memberCountMap[o.id] ?? 0,
        projectCount: projectCountMap[o.id] ?? 0,
      }));

      return { data: orgs, total: count ?? 0 };
    }),

  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { data: org, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", input.id)
        .single();

      if (error || !org) throw error;

      const [ownerRes, membersRes, projectsRes, subRes] = await Promise.all([
        supabase.from("users").select("id, name, email").eq("id", (org as { owner_id: string }).owner_id).single(),
        supabase
          .from("organization_members")
          .select("user_id, role, joined_at, user:users(id, name, email)")
          .eq("organization_id", input.id),
        supabase.from("projects").select("id, name, slug, domain, ga4_property_id").eq("organization_id", input.id),
        supabase.from("subscriptions").select("*").eq("organization_id", input.id).single(),
      ]);

      const projectIds = (projectsRes.data ?? []).map((p) => (p as { id: string }).id);
      let totalAiCost = 0;
      let eventCountMap: Record<string, number> = {};
      let flowCountMap: Record<string, number> = {};
      let totalEvents = 0;
      let verifiedEvents = 0;
      let totalAiCredits = 0;
      if (projectIds.length > 0) {
        const [aiRes, eventCounts, flowCounts, eventsForQa, usageLimits] = await Promise.all([
          supabase.from("ai_usage_ledger").select("cost_usd, project_id").in("project_id", projectIds),
          supabase.from("events").select("project_id"),
          supabase.from("tracking_sections").select("project_id"),
          supabase.from("events").select("verification_status").in("project_id", projectIds),
          supabase.from("project_usage_limits").select("used_ai_credits").in("project_id", projectIds),
        ]);
        for (const r of aiRes.data ?? []) {
          totalAiCost += Number((r as { cost_usd: string }).cost_usd ?? 0);
        }
        for (const u of usageLimits.data ?? []) {
          totalAiCredits += Number((u as { used_ai_credits: number }).used_ai_credits ?? 0);
        }
        for (const e of eventCounts.data ?? []) {
          const pid = (e as { project_id: string }).project_id;
          eventCountMap[pid] = (eventCountMap[pid] ?? 0) + 1;
        }
        for (const f of flowCounts.data ?? []) {
          const pid = (f as { project_id: string }).project_id;
          flowCountMap[pid] = (flowCountMap[pid] ?? 0) + 1;
        }
        totalEvents = eventsForQa.data?.length ?? 0;
        verifiedEvents =
          eventsForQa.data?.filter((e) => (e as { verification_status: string }).verification_status === "verified")
            .length ?? 0;
      }

      const projectsWithCounts = (projectsRes.data ?? []).map((p) => ({
        ...p,
        eventCount: eventCountMap[(p as { id: string }).id] ?? 0,
        flowCount: flowCountMap[(p as { id: string }).id] ?? 0,
      }));

      return {
        ...org,
        owner: ownerRes.data,
        members: membersRes.data ?? [],
        projects: projectsWithCounts,
        subscription: subRes.data,
        aiUsage: { totalCost: totalAiCost },
        usageStats: {
          totalAiCredits,
          totalEvents,
          verifiedEvents,
          verifiedPercent: totalEvents > 0 ? (verifiedEvents / totalEvents) * 100 : 0,
        },
      };
    }),

  update: superAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
        slug: z.string().optional(),
        plan: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { id, ...updates } = input;
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.slug !== undefined) payload.slug = updates.slug;
      if (updates.plan !== undefined) payload.plan = updates.plan;

      const { error } = await supabase.from("organizations").update(payload).eq("id", id);
      if (error) throw error;
      return { success: true };
    }),

  changePlan: superAdminProcedure
    .input(z.object({ id: z.string().uuid(), plan: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("organizations")
        .update({ plan: input.plan })
        .eq("id", input.id);
      if (error) throw error;
      return { success: true };
    }),

  suspend: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("organizations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
      return { success: true };
    }),

  updateMemberRole: superAdminProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("organization_members")
        .update({ role: input.role })
        .eq("organization_id", input.organizationId)
        .eq("user_id", input.userId);
      if (error) throw error;
      return { success: true };
    }),

  removeMember: superAdminProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("organization_id", input.organizationId)
        .eq("user_id", input.userId);
      if (error) throw error;
      return { success: true };
    }),
});
