import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  unique,
  index,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const aiJobTypeEnum = pgEnum("ai_job_type", [
  "flow_analyze",
  "parameter_suggest",
  "rule_check",
]);

export const aiJobStatusEnum = pgEnum("ai_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).unique().notNull(),
    ownerId: uuid("owner_id"),
    plan: varchar("plan", { length: 50 }).default("free"),
    subscriptionStatus: varchar("subscription_status", { length: 50 }).default("inactive"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
    settings: jsonb("settings")
      .$type<{
        namingConvention?: "snake_case" | "camelCase" | "PascalCase";
        requireApproval?: boolean;
        slackWebhook?: string;
        defaultMarket?: string;
      }>()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    slugIdx: index("idx_organizations_slug").on(table.slug),
    stripeCustomerIdx: index("idx_organizations_stripe_customer_id").on(table.stripeCustomerId),
  })
);

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // Supabase Auth user ID
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    role: varchar("role", { length: 50 }).default("member"),
    organizationId: uuid("organization_id").references(() => organizations.id),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    onboardingStep: varchar("onboarding_step", { length: 50 }),
    onboardingData: jsonb("onboarding_data")
      .$type<{
        userRole?: string;
        customRole?: string;
        workspaceMode?: "organization" | "solo";
        orgId?: string;
        projectId?: string;
        projectName?: string;
        websiteUrl?: string;
        productMaturity?: "idea" | "development" | "live";
        productCategory?: string;
        productDescription?: string;
        aiAnalysis?: Record<string, unknown>;
        intelligenceConfig?: Record<string, unknown>;
        ga4Connected?: boolean;
        flowCreated?: boolean;
      }>()
      .default({}),
    userRole: varchar("user_role", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index("idx_users_email").on(table.email),
    organizationIdx: index("idx_users_organization_id").on(table.organizationId),
  })
);

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .unique()
      .notNull(),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique().notNull(),
    stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("idx_subscriptions_organization_id").on(table.organizationId),
    stripeSubscriptionIdx: index("idx_subscriptions_stripe_subscription_id").on(
      table.stripeSubscriptionId
    ),
  })
);

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    domain: varchar("domain", { length: 255 }),
    market: varchar("market", { length: 100 }),
    ga4PropertyId: varchar("ga4_property_id", { length: 255 }),
    ga4MeasurementId: varchar("ga4_measurement_id", { length: 255 }),
    settings: jsonb("settings")
      .$type<{
        autoValidate?: boolean;
        sendAlerts?: boolean;
        alertChannels?: string[];
      }>()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    organizationIdx: index("idx_projects_organization_id").on(table.organizationId),
    slugOrganizationIdx: index("idx_projects_slug_organization_id").on(
      table.slug,
      table.organizationId
    ),
  })
);

// ============================================================================
// EVENTS
// ============================================================================

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    eventName: varchar("event_name", { length: 255 }).notNull(),
    description: text("description"),
    triggerDescription: text("trigger_description"),
    lifecycleStatus: varchar("lifecycle_status", { length: 50 }).default("suggested"),
    ownerId: uuid("owner_id").references(() => users.id),
    linkedTicket: varchar("linked_ticket", { length: 255 }),
    category: varchar("category", { length: 100 }),
    isConversion: boolean("is_conversion").default(false),
    ga4Synced: boolean("ga4_synced").default(false),
    version: integer("version").default(1),
    metadata: jsonb("metadata")
      .$type<{
        tags?: string[];
        similarEvents?: string[];
        lastValidated?: string;
        ga4LastSeen?: string;
      }>()
      .default({}),
    // AI Verification fields
    verificationStatus: varchar("verification_status", { length: 50 }).default("unverified"),
    aiVerificationResult: jsonb("ai_verification_result").$type<{
      status: "verified" | "warning" | "error";
      confidence: number;
      issues: { severity: string; field: string; issue: string; recommendation: string }[];
      verification: string;
      suggestedFix?: string;
      provider: string;
    }>(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    verifiedBy: varchar("verified_by", { length: 50 }),
    source: varchar("source", { length: 50 }),
    // Event classification
    eventType: varchar("event_type", { length: 50 }).default("custom"), // 'default' for GA4 standard events, 'custom' for custom events
    disposition: varchar("disposition", { length: 50 }).default("unverified"), // 'verified', 'unverified', 'needs_review', 'detected_unverified', 'drifted'
    // Approval workflow
    approvalStatus: varchar("approval_status", { length: 50 }), // 'pending_review', 'approved', 'rejected'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("idx_events_project_id").on(table.projectId),
    lifecycleIdx: index("idx_events_lifecycle_status").on(table.lifecycleStatus),
    ownerIdx: index("idx_events_owner_id").on(table.ownerId),
    eventNameIdx: index("idx_events_event_name").on(table.eventName),
    uniqueEventName: unique("unique_project_event_name").on(table.projectId, table.eventName),
    verificationStatusIdx: index("idx_events_verification_status").on(table.verificationStatus),
    eventTypeIdx: index("idx_events_event_type").on(table.eventType),
    dispositionIdx: index("idx_events_disposition").on(table.disposition),
    approvalStatusIdx: index("idx_events_approval_status").on(table.approvalStatus),
  })
);

// ============================================================================
// PARAMETERS
// ============================================================================

export const parameters = pgTable(
  "parameters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    parameterName: varchar("parameter_name", { length: 255 }).notNull(),
    dataType: varchar("data_type", { length: 50 }).notNull(),
    description: text("description"),
    exampleValue: text("example_value"),
    isGlobal: boolean("is_global").default(false),
    validationRules: jsonb("validation_rules")
      .$type<{
        required?: boolean;
        min?: number;
        max?: number;
        regex?: string;
        enum?: string[];
      }>()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    organizationIdx: index("idx_parameters_organization_id").on(table.organizationId),
    parameterNameIdx: index("idx_parameters_parameter_name").on(table.parameterName),
    isGlobalIdx: index("idx_parameters_is_global").on(table.isGlobal),
    uniqueParameterName: unique("unique_organization_parameter_name").on(
      table.organizationId,
      table.parameterName
    ),
  })
);

// ============================================================================
// EVENT_PARAMETERS (Many-to-Many)
// ============================================================================

export const eventParameters = pgTable(
  "event_parameters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    parameterId: uuid("parameter_id")
      .references(() => parameters.id, { onDelete: "cascade" })
      .notNull(),
    isRequired: boolean("is_required").default(false),
    defaultValue: text("default_value"),
    order: integer("order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: index("idx_event_parameters_event_id").on(table.eventId),
    parameterIdx: index("idx_event_parameters_parameter_id").on(table.parameterId),
    uniqueEventParameter: unique("unique_event_parameter").on(table.eventId, table.parameterId),
  })
);

// ============================================================================
// EVENT_HISTORY (Audit Trail)
// ============================================================================

export const eventHistory = pgTable(
  "event_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    changedBy: uuid("changed_by")
      .references(() => users.id)
      .notNull(),
    changeType: varchar("change_type", { length: 50 }).notNull(),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: index("idx_event_history_event_id").on(table.eventId),
    createdAtIdx: index("idx_event_history_created_at").on(table.createdAt),
  })
);

// ============================================================================
// API_KEYS (SDK Authentication)
// ============================================================================

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: text("key_prefix").notNull(),
    name: varchar("name", { length: 255 }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    keyHashIdx: index("idx_api_keys_key_hash").on(table.keyHash),
    projectIdx: index("idx_api_keys_project_id").on(table.projectId),
  })
);

// ============================================================================
// GA4_CONNECTIONS (Google Analytics OAuth)
// ============================================================================

export const ga4Connections = pgTable(
  "ga4_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    googleEmail: varchar("google_email", { length: 255 }).notNull(),
    ga4PropertyId: varchar("ga4_property_id", { length: 255 }).notNull(),
    ga4PropertyName: varchar("ga4_property_name", { length: 255 }),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    scopes: jsonb("scopes").$type<string[]>().default([]),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    syncStatus: varchar("sync_status", { length: 50 }).default("pending"),
    syncError: text("sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    organizationIdx: index("idx_ga4_connections_organization_id").on(table.organizationId),
    projectIdx: index("idx_ga4_connections_project_id").on(table.projectId),
  })
);

// ============================================================================
// VALIDATION_SESSIONS (Phase 2)
// ============================================================================

export const validationSessions = pgTable(
  "validation_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    status: varchar("status", { length: 50 }).default("in_progress"),
    startUrl: text("start_url"),
    totalEventsCaptured: integer("total_events_captured").default(0),
    totalErrors: integer("total_errors").default(0),
    totalWarnings: integer("total_warnings").default(0),
    sessionMetadata: jsonb("session_metadata")
      .$type<{
        userAgent?: string;
        screenWidth?: number;
        screenHeight?: number;
      }>()
      .default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("idx_validation_sessions_project_id").on(table.projectId),
    userIdx: index("idx_validation_sessions_user_id").on(table.userId),
    startedAtIdx: index("idx_validation_sessions_started_at").on(table.startedAt),
  })
);

// ============================================================================
// VALIDATION_EVENTS (Phase 2)
// ============================================================================

export const validationEvents = pgTable(
  "validation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .references(() => validationSessions.id, { onDelete: "cascade" })
      .notNull(),
    eventId: uuid("event_id").references(() => events.id),
    capturedEventName: varchar("captured_event_name", { length: 255 }).notNull(),
    capturedParameters: jsonb("captured_parameters").notNull(),
    validationResult: varchar("validation_result", { length: 50 }).notNull(),
    errorDetails: jsonb("error_details")
      .$type<{
        errors?: { field: string; message: string }[];
        warnings?: { field: string; message: string }[];
      }>()
      .default({}),
    domSelector: text("dom_selector"),
    boundingBox: jsonb("bounding_box").$type<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>(),
    pageUrl: text("page_url"),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    // AI Verification fields
    aiVerificationResult: jsonb("ai_verification_result").$type<{
      status: "verified" | "warning" | "error";
      confidence: number;
      issues: { severity: string; field: string; issue: string; recommendation: string }[];
      verification: string;
      suggestedFix?: string;
      provider: string;
    }>(),
    screenshotUrl: text("screenshot_url"),
    aiProvider: varchar("ai_provider", { length: 50 }),
  },
  (table) => ({
    sessionIdx: index("idx_validation_events_session_id").on(table.sessionId),
    eventIdx: index("idx_validation_events_event_id").on(table.eventId),
    validationResultIdx: index("idx_validation_events_validation_result").on(
      table.validationResult
    ),
  })
);

// ============================================================================
// JOURNEY_MAPS (Phase 3)
// ============================================================================

export const journeyMaps = pgTable(
  "journey_maps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id)
      .notNull(),
    validationSessionId: uuid("validation_session_id").references(() => validationSessions.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    screenshotUrls: jsonb("screenshot_urls").$type<string[]>().notNull().default([]),
    hotspots: jsonb("hotspots")
      .$type<
        {
          screenshotIndex: number;
          eventId: string;
          boundingBox: { x: number; y: number; width: number; height: number };
          validationStatus: string;
        }[]
      >()
      .notNull()
      .default([]),
    journeyMetadata: jsonb("journey_metadata").default({}),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("idx_journey_maps_project_id").on(table.projectId),
    validationSessionIdx: index("idx_journey_maps_validation_session_id").on(
      table.validationSessionId
    ),
  })
);

// ============================================================================
// HYGIENE_REPORTS
// ============================================================================

export const hygieneReports = pgTable(
  "hygiene_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id)
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id),
    reportType: varchar("report_type", { length: 50 }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    metrics: jsonb("metrics")
      .$type<{
        totalEvents: number;
        verifiedEvents: number;
        suggestedEvents: number;
        deprecatedEvents: number;
        rogueEventsDetected: number;
        parameterReuseRate: number;
        hygieneScore: number;
        ga4DriftCount?: number;
      }>()
      .notNull(),
    recommendations: jsonb("recommendations").default({}),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("idx_hygiene_reports_organization_id").on(table.organizationId),
    projectIdx: index("idx_hygiene_reports_project_id").on(table.projectId),
    periodEndIdx: index("idx_hygiene_reports_period_end").on(table.periodEnd),
  })
);

// ============================================================================
// SCAN_REPORTS (AI Scan Reports)
// ============================================================================

export const scanReports = pgTable(
  "scan_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id),
    status: varchar("status", { length: 50 }).default("completed"),
    scanType: varchar("scan_type", { length: 50 }).default("full_website"),
    scanStartUrl: text("scan_start_url"),
    duration: integer("duration"), // seconds
    pagesScanned: integer("pages_scanned").default(0),
    pagesScrolled: integer("pages_scrolled").default(0),
    elementsClicked: integer("elements_clicked").default(0),
    popupsHandled: integer("popups_handled").default(0),
    totalEventsRecorded: integer("total_events_recorded").default(0),
    eventsVerified: integer("events_verified").default(0),
    eventsUnverified: integer("events_unverified").default(0),
    missingEvents: integer("missing_events").default(0),
    // Detailed data as JSONB
    events: jsonb("events")
      .$type<
        Array<{
          eventName: string;
          description: string;
          screen: string;
          verified: boolean;
          parameters: Record<string, unknown>;
          timestamp: number;
        }>
      >()
      .default([]),
    pageStats: jsonb("page_stats")
      .$type<
        Array<{
          url: string;
          pathname: string;
          eventsRecorded: number;
          eventNames: string[];
          elementsClicked: number;
          popupsHandled: number;
          scrollCompleted: boolean;
        }>
      >()
      .default([]),
    unverifiedReasons: jsonb("unverified_reasons")
      .$type<
        Array<{
          eventName: string;
          reason: string;
          details: string;
          missingParams?: string[];
          pageUrl: string;
        }>
      >()
      .default([]),
    missingEventNames: jsonb("missing_event_names").$type<string[]>().default([]),
    scanTimestamp: timestamp("scan_timestamp", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("idx_scan_reports_project_id").on(table.projectId),
    userIdx: index("idx_scan_reports_user_id").on(table.userId),
    createdAtIdx: index("idx_scan_reports_created_at").on(table.createdAt),
  })
);

// ============================================================================
// TRACKING SECTIONS (Mindmap hierarchy: top-level flows)
// ============================================================================

export const trackingSections = pgTable(
  "tracking_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    url: varchar("url", { length: 500 }),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("idx_tracking_sections_project_id").on(table.projectId),
    displayOrderIdx: index("idx_tracking_sections_display_order").on(
      table.projectId,
      table.displayOrder
    ),
    uniqueSectionName: unique("unique_project_section_name").on(table.projectId, table.name),
  })
);

// ============================================================================
// TRACKING SCREENS (Screens/pages within a section)
// ============================================================================

export const trackingScreens = pgTable(
  "tracking_screens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .references(() => trackingSections.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    routePattern: varchar("route_pattern", { length: 500 }),
    description: text("description"),
    screenshotUrl: text("screenshot_url"),
    figmaUrl: text("figma_url"),
    aiAnalysisSummary: jsonb("ai_analysis_summary").$type<{
      interactions?: Array<{
        interaction_name: string;
        interaction_type: string;
        recommended_event_name: string;
        event_description: string;
        parameters: Array<{
          name: string;
          data_type: string;
          description: string;
          required: boolean;
          example_value?: string;
        }>;
        confidence: number;
      }>;
      analyzed_at?: string;
      model?: string;
    }>(),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    sectionIdx: index("idx_tracking_screens_section_id").on(table.sectionId),
    displayOrderIdx: index("idx_tracking_screens_display_order").on(
      table.sectionId,
      table.displayOrder
    ),
  })
);

// ============================================================================
// TRACKING INTERACTIONS (User actions on a screen)
// ============================================================================

export const trackingInteractions = pgTable(
  "tracking_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    screenId: uuid("screen_id")
      .references(() => trackingScreens.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    interactionType: varchar("interaction_type", { length: 50 }).default("click").notNull(),
    uiSelector: text("ui_selector"),
    description: text("description"),
    displayOrder: integer("display_order").default(0).notNull(),
    // QA Verification fields
    qaStatus: varchar("qa_status", { length: 50 }).default("not_verified").notNull(),
    qaVerifiedBy: uuid("qa_verified_by").references(() => users.id),
    qaVerifiedAt: timestamp("qa_verified_at", { withTimezone: true }),
    qaNotes: text("qa_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    screenIdx: index("idx_tracking_interactions_screen_id").on(table.screenId),
    displayOrderIdx: index("idx_tracking_interactions_display_order").on(
      table.screenId,
      table.displayOrder
    ),
    qaStatusIdx: index("idx_tracking_interactions_qa_status").on(table.qaStatus),
  })
);

// ============================================================================
// INTERACTION_EVENTS (Junction: links interactions to events, many-to-many)
// ============================================================================

export const interactionEvents = pgTable(
  "interaction_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interactionId: uuid("interaction_id")
      .references(() => trackingInteractions.id, { onDelete: "cascade" })
      .notNull(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    interactionIdx: index("idx_interaction_events_interaction_id").on(table.interactionId),
    eventIdx: index("idx_interaction_events_event_id").on(table.eventId),
    uniqueInteractionEvent: unique("unique_interaction_event").on(
      table.interactionId,
      table.eventId
    ),
  })
);

// ============================================================================
// ORGANIZATION_MEMBERS (replaces users.organization_id + users.role)
// ============================================================================

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 50 }).notNull().default("engineer"),
    customRoleName: varchar("custom_role_name", { length: 100 }),
    permissions: jsonb("permissions").$type<string[]>(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("idx_org_members_organization_id").on(table.organizationId),
    userIdx: index("idx_org_members_user_id").on(table.userId),
    roleIdx: index("idx_org_members_role").on(table.role),
    uniqueMember: unique("unique_org_member").on(table.organizationId, table.userId),
  })
);

// ============================================================================
// PROJECT_MEMBERS (project-level access control)
// ============================================================================

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    addedBy: uuid("added_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("idx_project_members_project_id").on(table.projectId),
    userIdx: index("idx_project_members_user_id").on(table.userId),
    uniqueProjectMember: unique("unique_project_member").on(table.projectId, table.userId),
  })
);

// ============================================================================
// INVITATIONS (pending invitations with 7-day expiry)
// ============================================================================

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("engineer"),
    customRoleName: varchar("custom_role_name", { length: 100 }),
    permissions: jsonb("permissions").$type<string[]>(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    invitedBy: uuid("invited_by")
      .references(() => users.id)
      .notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("idx_invitations_organization_id").on(table.organizationId),
    emailIdx: index("idx_invitations_email").on(table.email),
    tokenIdx: index("idx_invitations_token").on(table.token),
    statusIdx: index("idx_invitations_status").on(table.status),
  })
);

// ============================================================================
// COMMENTS (generic comments for all entity types)
// ============================================================================

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    content: text("content").notNull(),
    parentId: uuid("parent_id"),
    mentions: jsonb("mentions").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    entityIdx: index("idx_comments_entity").on(table.entityType, table.entityId),
    userIdx: index("idx_comments_user_id").on(table.userId),
    parentIdx: index("idx_comments_parent_id").on(table.parentId),
  })
);

// ============================================================================
// EVENT_APPROVALS (tracks review requests + decisions)
// ============================================================================

export const eventApprovals = pgTable(
  "event_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    requestedBy: uuid("requested_by")
      .references(() => users.id)
      .notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    status: varchar("status", { length: 50 }).notNull().default("pending_review"),
    feedback: text("feedback"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => ({
    eventIdx: index("idx_event_approvals_event_id").on(table.eventId),
    requestedByIdx: index("idx_event_approvals_requested_by").on(table.requestedBy),
    statusIdx: index("idx_event_approvals_status").on(table.status),
  })
);

// ============================================================================
// PROJECT AI CONTEXT (AI Memory)
// ============================================================================

export const projectAiContext = pgTable(
  "project_ai_context",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    liveEventsSnapshot: jsonb("live_events_snapshot").$type<
      Array<{
        event_name: string;
        platform?: string;
        event_count?: number;
        parameters?: string[];
        first_seen?: string;
        last_seen?: string;
      }>
    >(),
    parameterLibrarySnapshot: jsonb("parameter_library_snapshot").$type<
      Array<{
        name: string;
        data_type: string;
        description?: string;
        usage_count?: number;
      }>
    >(),
    rulesSnapshot: jsonb("rules_snapshot").$type<{
      event_naming_pattern?: string;
      mandatory_parameters?: string[];
      require_page_view_on_load?: boolean;
      boolean_prefix?: string;
      numeric_suffix?: string;
    }>(),
    aiSummary: text("ai_summary"),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("idx_project_ai_context_project_id").on(table.projectId),
  })
);

// ============================================================================
// AI JOBS (Background Job Queue)
// ============================================================================

export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    jobType: aiJobTypeEnum("job_type").notNull(),
    payload: jsonb("payload").notNull(),
    result: jsonb("result"),
    status: aiJobStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    lastError: text("last_error"),
    priority: integer("priority").default(5).notNull(),
    costEstimateUsd: numeric("cost_estimate_usd", { precision: 10, scale: 6 }),
    tokensInput: integer("tokens_input"),
    tokensOutput: integer("tokens_output"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    projectIdx: index("idx_ai_jobs_project_id").on(table.projectId),
    userIdx: index("idx_ai_jobs_user_id").on(table.userId),
    statusIdx: index("idx_ai_jobs_status").on(table.status),
    priorityIdx: index("idx_ai_jobs_priority_created").on(table.priority, table.createdAt),
  })
);

// ============================================================================
// AI USAGE LEDGER (Cost & Token Tracking)
// ============================================================================

export const aiUsageLedger = pgTable(
  "ai_usage_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    jobId: uuid("job_id").references(() => aiJobs.id, { onDelete: "set null" }),
    model: text("model").notNull(),
    tokensInput: integer("tokens_input").default(0).notNull(),
    tokensOutput: integer("tokens_output").default(0).notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).default("0").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("idx_ai_usage_ledger_project_id").on(table.projectId),
    jobIdx: index("idx_ai_usage_ledger_job_id").on(table.jobId),
    createdAtIdx: index("idx_ai_usage_ledger_created_at").on(table.createdAt),
  })
);

// ============================================================================
// PROJECT USAGE LIMITS (AI Credit Quota)
// ============================================================================

export const projectUsageLimits = pgTable(
  "project_usage_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    planType: varchar("plan_type", { length: 50 }).default("free").notNull(),
    monthlyAiCredits: integer("monthly_ai_credits").default(10).notNull(),
    usedAiCredits: integer("used_ai_credits").default(0).notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("idx_project_usage_limits_project_id").on(table.projectId),
    resetAtIdx: index("idx_project_usage_limits_reset_at").on(table.resetAt),
  })
);

// ============================================================================
// PROJECT TRACKING RULES (SOP Engine)
// ============================================================================

export const projectTrackingRules = pgTable(
  "project_tracking_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    namingConvention: varchar("naming_convention", { length: 50 }).default("snake_case").notNull(),
    mandatoryParameters: jsonb("mandatory_parameters").$type<string[]>().default([]),
    requirePageViewOnLoad: boolean("require_page_view_on_load").default(true).notNull(),
    booleanPrefix: varchar("boolean_prefix", { length: 20 }).default("is_"),
    numericSuffix: varchar("numeric_suffix", { length: 20 }).default("_id"),
    requireLifecycleApprovals: boolean("require_lifecycle_approvals").default(false).notNull(),
    customRules: jsonb("custom_rules").$type<
      Array<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
      }>
    >().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("idx_project_tracking_rules_project_id").on(table.projectId),
  })
);

// ============================================================================
// AI RATE LIMITS (Per-user rate limiting)
// ============================================================================

export const aiRateLimits = pgTable(
  "ai_rate_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).defaultNow().notNull(),
    requestCount: integer("request_count").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userProjectIdx: index("idx_ai_rate_limits_user_project").on(table.userId, table.projectId),
    windowIdx: index("idx_ai_rate_limits_window").on(table.windowStart),
  })
);

// ============================================================================
// FEATURE FLAGS (Admin Portal)
// ============================================================================

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 100 }).unique().notNull(),
    label: varchar("label", { length: 255 }),
    description: text("description"),
    enabled: boolean("enabled").default(false),
    scope: varchar("scope", { length: 50 }).default("global"),
    scopeId: uuid("scope_id"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    keyIdx: index("idx_feature_flags_key").on(table.key),
    scopeIdx: index("idx_feature_flags_scope").on(table.scope, table.scopeId),
  })
);

// ============================================================================
// ADMIN IMPERSONATION LOGS
// ============================================================================

export const adminImpersonationLogs = pgTable(
  "admin_impersonation_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: uuid("admin_user_id").references(() => users.id).notNull(),
    targetUserId: uuid("target_user_id").references(() => users.id).notNull(),
    tokenHash: text("token_hash").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    adminIdx: index("idx_admin_impersonation_admin").on(table.adminUserId),
    targetIdx: index("idx_admin_impersonation_target").on(table.targetUserId),
  })
);

// ============================================================================
// AUDIT LOG (Global)
// ============================================================================

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    action: varchar("action", { length: 100 }).notNull(),
    performedBy: uuid("performed_by").references(() => users.id),
    organizationId: uuid("organization_id"),
    projectId: uuid("project_id"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("idx_audit_log_entity").on(table.entityType, table.entityId),
    performedByIdx: index("idx_audit_log_performed_by").on(table.performedBy),
    createdAtIdx: index("idx_audit_log_created_at").on(table.createdAt),
    orgIdx: index("idx_audit_log_org").on(table.organizationId),
  })
);

// ============================================================================
// PLATFORM METRICS DAILY
// ============================================================================

export const platformMetricsDaily = pgTable(
  "platform_metrics_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: timestamp("date", { mode: "date" }).notNull().unique(),
    totalUsers: integer("total_users"),
    newUsers: integer("new_users"),
    activeUsers: integer("active_users"),
    totalOrgs: integer("total_orgs"),
    totalProjects: integer("total_projects"),
    totalEvents: integer("total_events"),
    liveEvents: integer("live_events"),
    totalFlows: integer("total_flows"),
    totalScreens: integer("total_screens"),
    totalInteractions: integer("total_interactions"),
    aiCreditsUsed: integer("ai_credits_used"),
    aiCostUsd: numeric("ai_cost_usd", { precision: 10, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    dateIdx: index("idx_platform_metrics_date").on(table.date),
  })
);

// ============================================================================
// REVENUE SUMMARY DAILY
// ============================================================================

export const revenueSummaryDaily = pgTable(
  "revenue_summary_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: timestamp("date", { mode: "date" }).notNull().unique(),
    mrr: numeric("mrr", { precision: 12, scale: 2 }),
    arr: numeric("arr", { precision: 12, scale: 2 }),
    totalRevenue: numeric("total_revenue", { precision: 12, scale: 2 }),
    activeSubscriptions: integer("active_subscriptions"),
    churnedSubscriptions: integer("churned_subscriptions"),
    newSubscriptions: integer("new_subscriptions"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    dateIdx: index("idx_revenue_summary_date").on(table.date),
  })
);

// ============================================================================
// SYSTEM HEALTH METRICS
// ============================================================================

export const systemHealthMetrics = pgTable(
  "system_health_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    metricType: varchar("metric_type", { length: 50 }).notNull(),
    value: numeric("value", { precision: 12, scale: 4 }),
    metadata: jsonb("metadata").default({}),
  },
  (table) => ({
    timestampIdx: index("idx_system_health_timestamp").on(table.timestamp),
    typeIdx: index("idx_system_health_type").on(table.metricType),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  events: many(events),
  validationSessions: many(validationSessions),
  organizationMemberships: many(organizationMembers),
  projectMemberships: many(projectMembers),
  adminImpersonationLogsAsAdmin: many(adminImpersonationLogs, {
    relationName: "adminUser",
  }),
  adminImpersonationLogsAsTarget: many(adminImpersonationLogs, {
    relationName: "targetUser",
  }),
  auditLogsAsPerformer: many(auditLog),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  members: many(users),
  organizationMembers: many(organizationMembers),
  projects: many(projects),
  parameters: many(parameters),
  subscription: one(subscriptions),
  ga4Connections: many(ga4Connections),
  invitations: many(invitations),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  events: many(events),
  apiKeys: many(apiKeys),
  ga4Connections: many(ga4Connections),
  validationSessions: many(validationSessions),
  journeyMaps: many(journeyMaps),
  scanReports: many(scanReports),
  trackingSections: many(trackingSections),
  projectMembers: many(projectMembers),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  project: one(projects, {
    fields: [events.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [events.ownerId],
    references: [users.id],
  }),
  eventParameters: many(eventParameters),
  history: many(eventHistory),
  validationEvents: many(validationEvents),
  interactionEvents: many(interactionEvents),
  approvals: many(eventApprovals),
}));

export const parametersRelations = relations(parameters, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [parameters.organizationId],
    references: [organizations.id],
  }),
  eventParameters: many(eventParameters),
}));

export const eventParametersRelations = relations(eventParameters, ({ one }) => ({
  event: one(events, {
    fields: [eventParameters.eventId],
    references: [events.id],
  }),
  parameter: one(parameters, {
    fields: [eventParameters.parameterId],
    references: [parameters.id],
  }),
}));

export const eventHistoryRelations = relations(eventHistory, ({ one }) => ({
  event: one(events, {
    fields: [eventHistory.eventId],
    references: [events.id],
  }),
  changedByUser: one(users, {
    fields: [eventHistory.changedBy],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  project: one(projects, {
    fields: [apiKeys.projectId],
    references: [projects.id],
  }),
}));

export const ga4ConnectionsRelations = relations(ga4Connections, ({ one }) => ({
  organization: one(organizations, {
    fields: [ga4Connections.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [ga4Connections.projectId],
    references: [projects.id],
  }),
}));

export const validationSessionsRelations = relations(validationSessions, ({ one, many }) => ({
  project: one(projects, {
    fields: [validationSessions.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [validationSessions.userId],
    references: [users.id],
  }),
  validationEvents: many(validationEvents),
}));

export const validationEventsRelations = relations(validationEvents, ({ one }) => ({
  session: one(validationSessions, {
    fields: [validationEvents.sessionId],
    references: [validationSessions.id],
  }),
  event: one(events, {
    fields: [validationEvents.eventId],
    references: [events.id],
  }),
}));

export const journeyMapsRelations = relations(journeyMaps, ({ one }) => ({
  project: one(projects, {
    fields: [journeyMaps.projectId],
    references: [projects.id],
  }),
  validationSession: one(validationSessions, {
    fields: [journeyMaps.validationSessionId],
    references: [validationSessions.id],
  }),
  creator: one(users, {
    fields: [journeyMaps.createdBy],
    references: [users.id],
  }),
}));

export const hygieneReportsRelations = relations(hygieneReports, ({ one }) => ({
  organization: one(organizations, {
    fields: [hygieneReports.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [hygieneReports.projectId],
    references: [projects.id],
  }),
}));

export const scanReportsRelations = relations(scanReports, ({ one }) => ({
  project: one(projects, {
    fields: [scanReports.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [scanReports.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TRACKING MINDMAP RELATIONS
// ============================================================================

export const trackingSectionsRelations = relations(trackingSections, ({ one, many }) => ({
  project: one(projects, {
    fields: [trackingSections.projectId],
    references: [projects.id],
  }),
  screens: many(trackingScreens),
}));

export const trackingScreensRelations = relations(trackingScreens, ({ one, many }) => ({
  section: one(trackingSections, {
    fields: [trackingScreens.sectionId],
    references: [trackingSections.id],
  }),
  interactions: many(trackingInteractions),
}));

export const trackingInteractionsRelations = relations(trackingInteractions, ({ one, many }) => ({
  screen: one(trackingScreens, {
    fields: [trackingInteractions.screenId],
    references: [trackingScreens.id],
  }),
  interactionEvents: many(interactionEvents),
}));

export const interactionEventsRelations = relations(interactionEvents, ({ one }) => ({
  interaction: one(trackingInteractions, {
    fields: [interactionEvents.interactionId],
    references: [trackingInteractions.id],
  }),
  event: one(events, {
    fields: [interactionEvents.eventId],
    references: [events.id],
  }),
}));

// ============================================================================
// TEAMS & ROLES RELATIONS
// ============================================================================

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [organizationMembers.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
  addedByUser: one(users, {
    fields: [projectMembers.addedBy],
    references: [users.id],
    relationName: "addedBy",
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [invitations.projectId],
    references: [projects.id],
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
}));

export const eventApprovalsRelations = relations(eventApprovals, ({ one }) => ({
  event: one(events, {
    fields: [eventApprovals.eventId],
    references: [events.id],
  }),
  requester: one(users, {
    fields: [eventApprovals.requestedBy],
    references: [users.id],
    relationName: "requester",
  }),
  reviewer: one(users, {
    fields: [eventApprovals.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
}));

// ============================================================================
// AI TABLES RELATIONS
// ============================================================================

export const projectAiContextRelations = relations(projectAiContext, ({ one }) => ({
  project: one(projects, {
    fields: [projectAiContext.projectId],
    references: [projects.id],
  }),
}));

export const aiJobsRelations = relations(aiJobs, ({ one }) => ({
  project: one(projects, {
    fields: [aiJobs.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [aiJobs.userId],
    references: [users.id],
  }),
}));

export const aiUsageLedgerRelations = relations(aiUsageLedger, ({ one }) => ({
  project: one(projects, {
    fields: [aiUsageLedger.projectId],
    references: [projects.id],
  }),
  job: one(aiJobs, {
    fields: [aiUsageLedger.jobId],
    references: [aiJobs.id],
  }),
}));

export const projectUsageLimitsRelations = relations(projectUsageLimits, ({ one }) => ({
  project: one(projects, {
    fields: [projectUsageLimits.projectId],
    references: [projects.id],
  }),
}));

export const projectTrackingRulesRelations = relations(projectTrackingRules, ({ one }) => ({
  project: one(projects, {
    fields: [projectTrackingRules.projectId],
    references: [projects.id],
  }),
}));

export const aiRateLimitsRelations = relations(aiRateLimits, ({ one }) => ({
  user: one(users, {
    fields: [aiRateLimits.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [aiRateLimits.projectId],
    references: [projects.id],
  }),
}));

// ============================================================================
// ADMIN TABLES RELATIONS
// ============================================================================

export const adminImpersonationLogsRelations = relations(adminImpersonationLogs, ({ one }) => ({
  adminUser: one(users, {
    fields: [adminImpersonationLogs.adminUserId],
    references: [users.id],
    relationName: "adminUser",
  }),
  targetUser: one(users, {
    fields: [adminImpersonationLogs.targetUserId],
    references: [users.id],
    relationName: "targetUser",
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  performedByUser: one(users, {
    fields: [auditLog.performedBy],
    references: [users.id],
  }),
}));
