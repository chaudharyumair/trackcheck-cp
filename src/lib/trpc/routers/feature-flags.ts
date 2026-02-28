import { z } from "zod";
import { router, adminProcedure, superAdminProcedure } from "../init";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const featureFlagsRouter = router({
  list: adminProcedure.query(async () => {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("id, key, label, description, enabled, scope, scope_id, created_at, updated_at");

    if (error) {
      return { data: [] };
    }
    return { data: data ?? [] };
  }),

  update: superAdminProcedure
    .input(z.object({ id: z.string().uuid(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase
        .from("feature_flags")
        .update({ enabled: input.enabled })
        .eq("id", input.id);
      if (error) throw error;
      return { success: true };
    }),

  create: superAdminProcedure
    .input(
      z.object({
        key: z.string(),
        label: z.string().optional(),
        description: z.string().optional(),
        enabled: z.boolean().default(true),
        scope: z.string().optional(),
        scopeId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase.from("feature_flags").insert({
        key: input.key,
        label: input.label ?? input.key,
        description: input.description ?? null,
        enabled: input.enabled,
        scope: input.scope ?? null,
        scope_id: input.scopeId ?? null,
      });
      if (error) throw error;
      return { success: true };
    }),
});
