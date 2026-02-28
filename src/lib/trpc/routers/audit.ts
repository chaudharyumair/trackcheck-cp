import { z } from "zod";
import { router, adminProcedure } from "../init";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const auditRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        entityType: z.string().optional(),
        userId: z.string().uuid().optional(),
        action: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const supabase = createServiceRoleClient();
      const { page, pageSize, entityType, userId, action, from, to } = input;
      const fromIdx = (page - 1) * pageSize;
      const toIdx = fromIdx + pageSize - 1;

      const { data: auditData, error: auditError } = await supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .range(fromIdx, toIdx);

      if (auditError || !auditData || auditData.length === 0) {
        const { data: eventHistoryData, count } = await supabase
          .from("event_history")
          .select("id, event_id, changed_by, change_type, previous_value, new_value, created_at", {
            count: "exact",
          })
          .order("created_at", { ascending: false })
          .range(fromIdx, toIdx);

        if (userId) {
          const filtered = (eventHistoryData ?? []).filter(
            (e) => (e as { changed_by: string }).changed_by === userId
          );
          return {
            data: filtered.map((e) => ({
              id: (e as { id: string }).id,
              entityType: "event",
              entityId: (e as { event_id: string }).event_id,
              userId: (e as { changed_by: string }).changed_by,
              action: (e as { change_type: string }).change_type,
              previousValue: (e as { previous_value: unknown }).previous_value,
              newValue: (e as { new_value: unknown }).new_value,
              createdAt: (e as { created_at: string }).created_at,
            })),
            total: count ?? 0,
          };
        }

        return {
          data: (eventHistoryData ?? []).map((e) => ({
            id: (e as { id: string }).id,
            entityType: "event",
            entityId: (e as { event_id: string }).event_id,
            userId: (e as { changed_by: string }).changed_by,
            action: (e as { change_type: string }).change_type,
            previousValue: (e as { previous_value: unknown }).previous_value,
            newValue: (e as { new_value: unknown }).new_value,
            createdAt: (e as { created_at: string }).created_at,
          })),
          total: count ?? 0,
        };
      }

      let query = supabase.from("audit_log").select("*", { count: "exact" });
      if (entityType) query = query.eq("entity_type", entityType);
      if (userId) query = query.eq("performed_by", userId);
      if (action) query = query.eq("action", action);
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to);

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(fromIdx, toIdx);

      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    }),
});
