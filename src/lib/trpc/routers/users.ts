import { z } from "zod";
import { router, adminProcedure, superAdminProcedure, supportAdminProcedure } from "../init";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const usersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        search: z.string().optional(),
        status: z.enum(["active", "deactivated", "all"]).default("all"),
        role: z.string().optional(),
        sortBy: z.string().default("created_at"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { page, pageSize, search, status, role, sortBy, sortOrder } = input;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from("users").select("id, email, name, role, created_at, deleted_at, signup_source", {
        count: "exact",
      });

      if (search) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      }
      if (status === "active") {
        query = query.is("deleted_at", null);
      } else if (status === "deactivated") {
        query = query.not("deleted_at", "is", null);
      }
      if (role) {
        query = query.eq("role", role);
      }

      const { data, count, error } = await query
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(from, to);

      if (error) throw error;

      const userIds = (data ?? []).map((u) => u.id);
      let orgMemberships: Record<string, { organization_id: string; role: string }[]> = {};
      const orgIds = new Set<string>();
      if (userIds.length > 0) {
        const { data: memberships } = await supabase
          .from("organization_members")
          .select("user_id, organization_id, role")
          .in("user_id", userIds);
        for (const m of memberships ?? []) {
          const uid = (m as { user_id: string }).user_id;
          const oid = (m as { organization_id: string }).organization_id;
          const role = (m as { role: string }).role;
          if (!orgMemberships[uid]) orgMemberships[uid] = [];
          orgMemberships[uid].push({ organization_id: oid, role });
          if (oid) orgIds.add(oid);
        }
      }

      let orgMap: Record<string, string> = {};
      if (orgIds.size > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", Array.from(orgIds));
        for (const o of orgs ?? []) {
          orgMap[(o as { id: string }).id] = (o as { name: string }).name ?? "";
        }
      }

      const allOrgIds = Array.from(orgIds);
      let aiCreditsMap: Record<string, number> = {};
      if (allOrgIds.length > 0) {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, organization_id")
          .in("organization_id", allOrgIds);

        const projectIds = (projects ?? []).map((p) => (p as { id: string }).id);
        const projectToOrg: Record<string, string> = {};
        for (const p of projects ?? []) {
          projectToOrg[(p as { id: string }).id] = (p as { organization_id: string }).organization_id;
        }

        if (projectIds.length > 0) {
          const { data: limits } = await supabase
            .from("project_usage_limits")
            .select("project_id, used_ai_credits")
            .in("project_id", projectIds);

          const orgCredits: Record<string, number> = {};
          for (const l of limits ?? []) {
            const pid = (l as { project_id: string }).project_id;
            const credits = Number((l as { used_ai_credits: number }).used_ai_credits ?? 0);
            const oid = projectToOrg[pid];
            if (oid) orgCredits[oid] = (orgCredits[oid] ?? 0) + credits;
          }

          for (const uid of userIds) {
            const memberships = orgMemberships[uid] ?? [];
            let totalCredits = 0;
            for (const m of memberships) {
              totalCredits += orgCredits[m.organization_id] ?? 0;
            }
            aiCreditsMap[uid] = totalCredits;
          }
        }
      }

      // Fetch auth status (confirmed_at, invited_at) for invite detection
      let authStatusMap: Record<string, { confirmed_at: string | null; invited_at: string | null }> = {};
      if (userIds.length > 0) {
        for (const uid of userIds) {
          const { data: authData } = await supabase.auth.admin.getUserById(uid);
          if (authData?.user) {
            authStatusMap[uid] = {
              confirmed_at: authData.user.confirmed_at ?? null,
              invited_at: (authData.user as Record<string, unknown>).invited_at as string | null ?? null,
            };
          }
        }
      }

      const users = (data ?? []).map((u) => {
        const memberships = orgMemberships[u.id] ?? [];
        const firstOrg = memberships[0];
        const firstOrgName = firstOrg ? orgMap[firstOrg.organization_id] ?? null : null;
        const authStatus = authStatusMap[u.id];
        const isInvitedPending = authStatus?.invited_at && !authStatus?.confirmed_at;
        return {
          ...u,
          orgMemberships: memberships,
          firstOrgName,
          aiCredits: aiCreditsMap[u.id] ?? 0,
          signupSource: (u as Record<string, unknown>).signup_source as string | null ?? null,
          isInvitedPending: !!isInvitedPending,
        };
      });

      return { data: users, total: count ?? 0 };
    }),

  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", input.id)
        .single();

      if (error || !user) throw error;

      const [membershipsRes, projectMembersRes] = await Promise.all([
        supabase
          .from("organization_members")
          .select("organization_id, role, joined_at, organization:organizations(id, name, slug)")
          .eq("user_id", input.id),
        supabase
          .from("project_members")
          .select("project_id, project:projects(id, name, slug)")
          .eq("user_id", input.id),
      ]);

      const projectIds = (projectMembersRes.data ?? [])
        .map((p) => (p as { project_id: string }).project_id)
        .filter(Boolean);

      let totalTokens = 0;
      let totalCost = 0;
      const projectUsage: { projectId: string; projectName: string; tokens: number; cost: number }[] = [];

      if (projectIds.length > 0) {
        const { data: ledger } = await supabase
          .from("ai_usage_ledger")
          .select("project_id, tokens_input, tokens_output, cost_usd")
          .in("project_id", projectIds);

        const projectMap = new Map<string, string>();
        for (const p of projectMembersRes.data ?? []) {
          const pid = (p as { project_id: string }).project_id;
          const proj = (p as { project?: { id: string; name: string } }).project;
          projectMap.set(pid, proj?.name ?? pid);
        }

        const usageByProject: Record<string, { tokens: number; cost: number }> = {};
        for (const r of ledger ?? []) {
          const pid = (r as { project_id: string }).project_id;
          const tokens =
            Number((r as { tokens_input: number }).tokens_input ?? 0) +
            Number((r as { tokens_output: number }).tokens_output ?? 0);
          const cost = Number((r as { cost_usd: string }).cost_usd ?? 0);
          totalTokens += tokens;
          totalCost += cost;
          if (!usageByProject[pid]) usageByProject[pid] = { tokens: 0, cost: 0 };
          usageByProject[pid].tokens += tokens;
          usageByProject[pid].cost += cost;
        }
        for (const [pid, u] of Object.entries(usageByProject)) {
          projectUsage.push({
            projectId: pid,
            projectName: projectMap.get(pid) ?? pid,
            tokens: u.tokens,
            cost: u.cost,
          });
        }
      }

      return {
        ...user,
        orgMemberships: membershipsRes.data ?? [],
        projectMemberships: projectMembersRes.data ?? [],
        aiUsageStats: { totalTokens, totalCost, projectUsage },
      };
    }),

  create: superAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
        role: z.string().default("owner"),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { name: input.name || "" },
      });

      if (authError) throw new Error(authError.message);
      if (!authUser.user) throw new Error("Failed to create auth user");

      const { error: dbError } = await supabase.from("users").insert({
        id: authUser.user.id,
        email: input.email,
        name: input.name || null,
        role: input.role,
        signup_source: "admin_panel",
      });

      if (dbError) throw new Error(dbError.message);

      return { success: true, userId: authUser.user.id };
    }),

  update: superAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
        email: z.string().optional(),
        role: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { id, ...updates } = input;
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.role !== undefined) payload.role = updates.role;

      const { error } = await supabase.from("users").update(payload).eq("id", id);
      if (error) throw error;
      return { success: true };
    }),

  deactivate: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("users")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
      return { success: true };
    }),

  reactivate: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("users")
        .update({ deleted_at: null })
        .eq("id", input.id);
      if (error) throw error;
      return { success: true };
    }),

  impersonate: superAdminProcedure
    .input(z.object({ targetUserId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = createServiceRoleClient();

      const { data: targetUser, error: userError } = await supabase
        .from("users")
        .select("id, email, name")
        .eq("id", input.targetUserId)
        .single();

      if (userError || !targetUser) {
        throw new Error("Target user not found");
      }

      const targetEmail = (targetUser as { email: string }).email;
      const targetName = (targetUser as { name: string | null }).name;
      const tokenRaw = `imp_${ctx.authUser!.id}_${input.targetUserId}_${Date.now()}`;
      const expiredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await supabase.from("admin_impersonation_logs").insert({
        admin_user_id: ctx.authUser!.id,
        target_user_id: input.targetUserId,
        token_hash: tokenRaw,
        started_at: new Date().toISOString(),
        expired_at: expiredAt,
      });

      await supabase.from("audit_log").insert({
        entity_type: "user",
        entity_id: input.targetUserId,
        action: "impersonate",
        performed_by: ctx.authUser!.id,
        metadata: {
          target_email: targetEmail,
          target_name: targetName,
          expires_at: expiredAt,
        },
      });

      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:4000";

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        throw new Error(linkError?.message ?? "Failed to generate impersonation link");
      }

      const impersonateUrl = `${portalUrl}/api/admin/impersonate?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=magiclink&admin_id=${ctx.authUser!.id}`;

      return {
        success: true,
        message: `Impersonation session started for ${targetEmail}`,
        portalUrl: impersonateUrl,
        targetEmail,
        expiresAt: expiredAt,
        token: tokenRaw,
      };
    }),
});
