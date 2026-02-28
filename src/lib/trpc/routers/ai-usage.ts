import { z } from "zod";
import { router, adminProcedure, superAdminProcedure } from "../init";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const aiUsageRouter = router({
  overview: adminProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { from, to } = input;

      const { data: ledger } = await supabase
        .from("ai_usage_ledger")
        .select("project_id, tokens_input, tokens_output, cost_usd")
        .gte("created_at", from)
        .lte("created_at", to);

      let totalTokens = 0;
      let totalCost = 0;
      const orgCostMap: Record<string, number> = {};
      const userCostMap: Record<string, number> = {};

      const projectIds = [...new Set((ledger ?? []).map((r) => (r as { project_id: string }).project_id))];
      let projectToOrg: Record<string, string> = {};
      let projectToUser: Record<string, string> = {};
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, organization_id")
          .in("id", projectIds);
        for (const p of projects ?? []) {
          projectToOrg[(p as { id: string }).id] = (p as { organization_id: string }).organization_id;
        }
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, owner_id")
          .in("id", Object.values(projectToOrg));
        for (const o of orgs ?? []) {
          const oid = (o as { id: string }).id;
          const ownerId = (o as { owner_id: string }).owner_id;
          for (const [pid, orgId] of Object.entries(projectToOrg)) {
            if (orgId === oid) projectToUser[pid] = ownerId ?? "";
          }
        }
      }

      for (const r of ledger ?? []) {
        const tokens =
          Number((r as { tokens_input: number }).tokens_input ?? 0) +
          Number((r as { tokens_output: number }).tokens_output ?? 0);
        const cost = Number((r as { cost_usd: string }).cost_usd ?? 0);
        totalTokens += tokens;
        totalCost += cost;
        const pid = (r as { project_id: string }).project_id;
        const oid = projectToOrg[pid];
        const uid = projectToUser[pid];
        if (oid) orgCostMap[oid] = (orgCostMap[oid] ?? 0) + cost;
        if (uid) userCostMap[uid] = (userCostMap[uid] ?? 0) + cost;
      }

      const topOrgIds = Object.entries(orgCostMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id);
      const topUserIds = Object.entries(userCostMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id]) => id);

      let orgNameMap: Record<string, string> = {};
      let userNameMap: Record<string, string> = {};
      if (topOrgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", topOrgIds);
        for (const o of orgs ?? []) {
          orgNameMap[(o as { id: string }).id] = (o as { name: string }).name ?? "—";
        }
      }
      if (topUserIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email")
          .in("id", topUserIds);
        for (const u of users ?? []) {
          userNameMap[(u as { id: string }).id] = (u as { email: string }).email ?? "—";
        }
      }

      const topOrgs = Object.entries(orgCostMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id, cost]) => ({ organizationId: id, organizationName: orgNameMap[id] ?? id, cost }));
      const topUsers = Object.entries(userCostMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id, cost]) => ({ userId: id, userEmail: userNameMap[id] ?? id, cost }));

      const projectCount = Object.keys(orgCostMap).length || 1;
      const avgCostPerProject = totalCost / projectCount;

      const { count: jobCount } = await supabase
        .from("ai_usage_ledger")
        .select("id", { count: "exact", head: true })
        .gte("created_at", from)
        .lte("created_at", to);

      return {
        totalTokens,
        totalCost,
        totalJobs: jobCount ?? 0,
        avgCostPerProject,
        topOrgs,
        topUsers,
      };
    }),

  listLedger: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        model: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { page, pageSize, model, from, to } = input;
      const fromIdx = (page - 1) * pageSize;
      const toIdx = fromIdx + pageSize - 1;

      let query = supabase
        .from("ai_usage_ledger")
        .select("id, project_id, model, tokens_input, tokens_output, cost_usd, created_at", {
          count: "exact",
        });

      if (model) query = query.eq("model", model);
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to);

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(fromIdx, toIdx);

      if (error) throw error;

      const projectIds = [...new Set((data ?? []).map((r) => (r as { project_id: string }).project_id))];
      let projectMap: Record<string, { name: string; organization_id: string }> = {};
      let orgMap: Record<string, { name: string }> = {};
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name, organization_id")
          .in("id", projectIds);
        for (const p of projects ?? []) {
          projectMap[(p as { id: string }).id] = {
            name: (p as { name: string }).name,
            organization_id: (p as { organization_id: string }).organization_id,
          };
        }
        const orgIds = Object.values(projectMap).map((x) => x.organization_id);
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);
        for (const o of orgs ?? []) {
          orgMap[(o as { id: string }).id] = { name: (o as { name: string }).name };
        }
      }

      const orgIds = [...new Set(Object.values(projectMap).map((x) => x.organization_id))];
      let orgOwnerMap: Record<string, string> = {};
      if (orgIds.length > 0) {
        const { data: orgsWithOwner } = await supabase
          .from("organizations")
          .select("id, owner_id")
          .in("id", orgIds);
        for (const o of orgsWithOwner ?? []) {
          const oid = (o as { id: string }).id;
          const ownerId = (o as { owner_id: string }).owner_id;
          if (ownerId) orgOwnerMap[oid] = ownerId;
        }
      }

      const ownerIds = [...new Set(Object.values(orgOwnerMap))];
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

      const entries = (data ?? []).map((r) => {
        const pid = (r as { project_id: string }).project_id;
        const proj = projectMap[pid];
        const org = proj ? orgMap[proj.organization_id] : null;
        const ownerId = proj ? orgOwnerMap[proj.organization_id] : null;
        const owner = ownerId ? userMap[ownerId] : null;
        return {
          ...r,
          project: proj ? { id: pid, name: proj.name } : null,
          organization: org ? { name: org.name } : null,
          user: owner ? { id: ownerId, name: owner.name, email: owner.email } : null,
        };
      });

      return { data: entries, total: count ?? 0 };
    }),

  adjustCredits: superAdminProcedure
    .input(z.object({ projectId: z.string().uuid(), credits: z.number() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { data: existing } = await supabase
        .from("project_usage_limits")
        .select("id, used_ai_credits")
        .eq("project_id", input.projectId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("project_usage_limits")
          .update({ used_ai_credits: input.credits })
          .eq("project_id", input.projectId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_usage_limits").insert({
          project_id: input.projectId,
          used_ai_credits: input.credits,
          monthly_ai_credits: 100,
          reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (error) throw error;
      }
      return { success: true };
    }),

  blockAI: superAdminProcedure
    .input(z.object({ organizationId: z.string().uuid(), blocked: z.boolean() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { data: org } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", input.organizationId)
        .single();

      const settings = (org?.settings as Record<string, unknown>) ?? {};
      settings.ai_blocked = input.blocked;

      const { error } = await supabase
        .from("organizations")
        .update({ settings })
        .eq("id", input.organizationId);
      if (error) throw error;
      return { success: true };
    }),
});
