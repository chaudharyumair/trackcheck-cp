import { z } from "zod";
import { router, adminProcedure, superAdminProcedure } from "../init";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const projectsRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        search: z.string().optional(),
        ga4Connected: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { page, pageSize, search, ga4Connected } = input;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("projects")
        .select("id, name, slug, domain, organization_id, ga4_property_id, created_at", {
          count: "exact",
        });

      if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      }
      if (ga4Connected === true) {
        query = query.not("ga4_property_id", "is", null);
      } else if (ga4Connected === false) {
        query = query.is("ga4_property_id", null);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const orgIds = [...new Set((data ?? []).map((p) => (p as { organization_id: string }).organization_id))];
      let orgMap: Record<string, unknown> = {};
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);
        for (const o of orgs ?? []) {
          orgMap[(o as { id: string }).id] = o;
        }
      }

      const projectIds = (data ?? []).map((p) => p.id);
      let eventCountMap: Record<string, number> = {};
      let flowCountMap: Record<string, number> = {};
      let screenCountMap: Record<string, number> = {};
      let aiCreditsMap: Record<string, number> = {};
      if (projectIds.length > 0) {
        const { data: eventCounts } = await supabase.from("events").select("project_id");
        for (const e of eventCounts ?? []) {
          const pid = (e as { project_id: string }).project_id;
          eventCountMap[pid] = (eventCountMap[pid] ?? 0) + 1;
        }
        const { data: flowCounts } = await supabase
          .from("tracking_sections")
          .select("project_id");
        for (const f of flowCounts ?? []) {
          const pid = (f as { project_id: string }).project_id;
          flowCountMap[pid] = (flowCountMap[pid] ?? 0) + 1;
        }
        const { data: limits } = await supabase
          .from("project_usage_limits")
          .select("project_id, used_ai_credits")
          .in("project_id", projectIds);
        for (const l of limits ?? []) {
          aiCreditsMap[(l as { project_id: string }).project_id] =
            Number((l as { used_ai_credits: number }).used_ai_credits ?? 0);
        }
        const sections = await supabase
          .from("tracking_sections")
          .select("id, project_id")
          .in("project_id", projectIds);
        const sectionIds = (sections.data ?? []).map((s) => s.id);
        if (sectionIds.length > 0) {
          const screens = await supabase
            .from("tracking_screens")
            .select("section_id")
            .in("section_id", sectionIds);
          const sectionIdToProjectId = Object.fromEntries(
            (sections.data ?? []).map((s) => [(s as { id: string }).id, (s as { project_id: string }).project_id])
          );
          for (const s of screens.data ?? []) {
            const pid = sectionIdToProjectId[(s as { section_id: string }).section_id];
            if (pid) screenCountMap[pid] = (screenCountMap[pid] ?? 0) + 1;
          }
        }
      }

      const projects = (data ?? []).map((p) => ({
        ...p,
        orgName: orgMap[(p as { organization_id: string }).organization_id]
          ? (orgMap[(p as { organization_id: string }).organization_id] as { name: string }).name
          : null,
        eventCount: eventCountMap[p.id] ?? 0,
        flowCount: flowCountMap[p.id] ?? 0,
        screenCount: screenCountMap[p.id] ?? 0,
        aiCredits: aiCreditsMap[p.id] ?? 0,
      }));

      return { data: projects, total: count ?? 0 };
    }),

  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", input.id)
        .single();

      if (error || !project) throw error;

      const [
        orgRes,
        eventsCountRes,
        flowsCountRes,
        screensCountRes,
        interactionsCountRes,
        aiUsageRes,
        ga4Res,
      ] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, slug, plan")
          .eq("id", (project as { organization_id: string }).organization_id)
          .single(),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("project_id", input.id),
        supabase
          .from("tracking_sections")
          .select("id", { count: "exact", head: true })
          .eq("project_id", input.id),
        supabase
          .from("tracking_screens")
          .select("id", { count: "exact", head: true })
          .in("section_id", []),
        supabase
          .from("tracking_interactions")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("ai_usage_ledger")
          .select("tokens_input, tokens_output, cost_usd")
          .eq("project_id", input.id),
        supabase
          .from("ga4_connections")
          .select("ga4_property_id, ga4_property_name")
          .eq("project_id", input.id)
          .is("revoked_at", null)
          .limit(1),
      ]);

      const sections = await supabase
        .from("tracking_sections")
        .select("id")
        .eq("project_id", input.id);
      const sectionIds = (sections.data ?? []).map((s) => s.id);
      let screensCount = 0;
      let interactionsCount = 0;
      if (sectionIds.length > 0) {
        const screens = await supabase
          .from("tracking_screens")
          .select("id")
          .in("section_id", sectionIds);
        screensCount = screens.data?.length ?? 0;
        const screenIds = (screens.data ?? []).map((s) => s.id);
        if (screenIds.length > 0) {
          const interactions = await supabase
            .from("tracking_interactions")
            .select("id")
            .in("screen_id", screenIds);
          interactionsCount = interactions.data?.length ?? 0;
        }
      }

      let totalAiCost = 0;
      let totalAiTokens = 0;
      for (const r of aiUsageRes.data ?? []) {
        totalAiCost += Number((r as { cost_usd: string }).cost_usd ?? 0);
        totalAiTokens +=
          Number((r as { tokens_input: number }).tokens_input ?? 0) +
          Number((r as { tokens_output: number }).tokens_output ?? 0);
      }

      return {
        ...project,
        organization: orgRes.data,
        eventCount: eventsCountRes.count ?? 0,
        flowCount: flowsCountRes.count ?? 0,
        screenCount: screensCount,
        interactionCount: interactionsCount,
        aiUsage: { totalCost: totalAiCost, totalTokens: totalAiTokens },
        ga4Connection: ga4Res.data?.[0] ?? null,
      };
    }),

  getEvents: adminProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("events")
        .select("id, event_name, lifecycle_status, verification_status, ga4_synced")
        .eq("project_id", input.projectId)
        .order("event_name");
      if (error) throw error;
      return data ?? [];
    }),

  resetCredits: superAdminProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("project_usage_limits")
        .update({ used_ai_credits: 0 })
        .eq("project_id", input.projectId);
      if (error) throw error;
      return { success: true };
    }),

  forceGa4Sync: superAdminProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("ga4_connections")
        .update({ sync_status: "pending", last_sync_at: null })
        .eq("project_id", input.projectId)
        .is("revoked_at", null);
      if (error) throw error;
      return { success: true };
    }),

  forceDriftDetection: superAdminProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async () => {
      return { success: true };
    }),
});
