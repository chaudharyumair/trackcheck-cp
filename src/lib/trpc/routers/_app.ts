import { router } from "../init";
import { dashboardRouter } from "./dashboard";
import { usersRouter } from "./users";
import { organizationsRouter } from "./organizations";
import { projectsRouter } from "./projects";
import { aiUsageRouter } from "./ai-usage";
import { financeRouter } from "./finance";
import { subscriptionsRouter } from "./subscriptions";
import { auditRouter } from "./audit";
import { systemRouter } from "./system";
import { featureFlagsRouter } from "./feature-flags";

export const appRouter = router({
  dashboard: dashboardRouter,
  users: usersRouter,
  organizations: organizationsRouter,
  projects: projectsRouter,
  aiUsage: aiUsageRouter,
  finance: financeRouter,
  subscriptions: subscriptionsRouter,
  audit: auditRouter,
  system: systemRouter,
  featureFlags: featureFlagsRouter,
});

export type AppRouter = typeof appRouter;
