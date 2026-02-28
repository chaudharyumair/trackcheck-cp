import { initTRPC, TRPCError } from "@trpc/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ZodError } from "zod";

const ADMIN_ROLES = [
  "super_admin",
  "finance_admin",
  "support_admin",
  "read_only_admin",
] as const;

interface DbUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
  organization_id: string | null;
  onboarding_completed_at: string | null;
  onboarding_step: string | null;
  onboarding_data: Record<string, unknown> | null;
  user_role: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function normalizeUser(row: DbUser) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    organizationId: row.organization_id,
    onboardingCompletedAt: row.onboarding_completed_at,
    onboardingStep: row.onboarding_step,
    onboardingData: row.onboarding_data,
    userRole: row.user_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function createContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dbUser: ReturnType<typeof normalizeUser> | null = null;

  if (user) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data && !error) {
      dbUser = normalizeUser(data as DbUser);
    }
  }

  return {
    supabase,
    user: dbUser,
    authUser: user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const adminProcedure = publicProcedure.use(
  async function isAdmin({ ctx, next }) {
    if (!ctx.user || !ctx.authUser) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const role = ctx.user.role;
    if (!role || !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        authUser: ctx.authUser,
        adminRole: role,
      },
    });
  }
);

export const superAdminProcedure = adminProcedure.use(
  async function isSuperAdmin({ ctx, next }) {
    if (ctx.adminRole !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Super admin access required" });
    }
    return next({ ctx });
  }
);

export const financeAdminProcedure = adminProcedure.use(
  async function isFinanceAdmin({ ctx, next }) {
    if (ctx.adminRole !== "super_admin" && ctx.adminRole !== "finance_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Finance admin access required" });
    }
    return next({ ctx });
  }
);

export const supportAdminProcedure = adminProcedure.use(
  async function isSupportAdmin({ ctx, next }) {
    if (ctx.adminRole !== "super_admin" && ctx.adminRole !== "support_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Support admin access required" });
    }
    return next({ ctx });
  }
);
