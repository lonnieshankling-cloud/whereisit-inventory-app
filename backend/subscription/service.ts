import { api, APIError, Header } from "encore.dev/api";
import { createHash } from "node:crypto";
import { getAuthData } from "~encore/auth";
import db from "../db";

const expectedEntitlementId =
  process.env.REVENUECAT_ENTITLEMENT_ID?.trim() ||
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim();

const webhookAuthToken = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN?.trim();

// Explicit SKU → plan mapping (env-backed, no heuristics)
const skuToPlanMap: Record<string, "pro_monthly" | "pro_annual" | "pro_lifetime"> = {
  [process.env.RC_PRODUCT_PRO_MONTHLY || "rc_pro_monthly"]: "pro_monthly",
  [process.env.RC_PRODUCT_PRO_ANNUAL || "rc_pro_annual"]: "pro_annual",
  [process.env.RC_PRODUCT_PRO_LIFETIME || "rc_pro_lifetime"]: "pro_lifetime",
};

// Metric recorder for webhook observability.
// Records structured logs that Encore captures for CloudWatch/logging backends.
function recordMetric(
  name: string,
  tags?: Record<string, string | number | boolean>
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    level: "INFO",
    timestamp,
    metric_name: name,
    ...tags,
  };
  
  // Structured JSON logging for Encore backend observability
  console.log(JSON.stringify(logEntry));
  
  // Optional: Wire to external service
  // Example for CloudWatch:
  // if (process.env.ENABLE_CLOUDWATCH_METRICS) {
  //   await cloudwatchClient.putMetricData({ ... });
  // }
}

// Alert threshold tracking (prevents alert spam, tracks window-based failure counts)
async function recordFailureMetric(metricName: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 min window
  const windowEnd = now;

  await db.exec`
    INSERT INTO webhook_metrics (metric_name, failure_count, window_start_at, window_end_at)
    VALUES (${metricName}, 1, ${windowStart}, ${windowEnd})
    ON CONFLICT (metric_name, window_start_at)
    DO UPDATE SET failure_count = failure_count + 1
  `;

  const row = await db.queryRow<{ failure_count: number }>`
    SELECT failure_count
    FROM webhook_metrics
    WHERE metric_name = ${metricName}
    AND window_start_at = ${windowStart}
  `;

  // Alert if threshold exceeded (e.g., >5 auth failures in 5 min)
  const threshold = metricName === "webhook_auth_failed" ? 3 : 5;
  if (row && row.failure_count > threshold) {
    console.error(JSON.stringify({
      alert: "THRESHOLD_EXCEEDED",
      metric: metricName,
      count: row.failure_count,
      threshold,
      window: "5m",
    }));
    return true;
  }

  return false;
}

// Queue a failed webhook for retry with exponential backoff
async function queueWebhookRetry(
  eventid: number,
  appUserId: string,
  eventPayload: Record<string, any>,
  errorMessage: string,
  attemptCount: number = 1
): Promise<void> {
  const maxAttempts = 5;
  if (attemptCount > maxAttempts) {
    // Dead letter: too many attempts
    await db.exec`
      UPDATE webhook_retry_queue
      SET is_dead_lettered = TRUE, dead_lettered_at = NOW()
      WHERE webhook_event_id = ${eventid}
    `;
    console.error(JSON.stringify({
      level: "ERROR",
      message: "Webhook moved to dead-letter queue",
      event_id: eventid,
      app_user_id: appUserId,
      attempts: attemptCount,
    }));
    return;
  }

  // Exponential backoff: 30s, 2m, 5m, 15m, 30m
  const backoffMs = [
    30 * 1000,
    2 * 60 * 1000,
    5 * 60 * 1000,
    15 * 60 * 1000,
    30 * 60 * 1000,
  ][attemptCount - 1] || 60 * 60 * 1000;

  const nextRetryAt = new Date(Date.now() + backoffMs);

  await db.exec`
    INSERT INTO webhook_retry_queue (
      webhook_event_id,
      app_user_id,
      event_payload,
      error_message,
      attempt_count,
      next_retry_at
    )
    VALUES (
      ${eventid},
      ${appUserId},
      ${JSON.stringify(eventPayload)},
      ${errorMessage},
      ${attemptCount},
      ${nextRetryAt}
    )
    ON CONFLICT DO NOTHING
  `;
}

export interface SubscriptionStatus {
  status: "free" | "active" | "expired" | "canceled";
  plan?: string;
  renewDate?: string;
  createdAt?: string;
}

// GET /subscription/me - Get current user's subscription status
export const getSubscriptionStatus = api(
  { expose: true, method: "GET", path: "/subscription/me", auth: true },
  async (): Promise<SubscriptionStatus> => {
    const user = getAuthData()!;
    const userID = user.userID;

    const row = await db.queryRow<{
      subscription_status: SubscriptionStatus["status"] | null;
      subscription_plan: string | null;
      subscription_renew_date: Date | null;
      created_at: Date;
    }>`
      SELECT
        subscription_status,
        subscription_plan,
        subscription_renew_date,
        created_at
      FROM users
      WHERE id = ${userID}
    `;

    if (!row) {
      // Defensive fallback if auth succeeded but user row is missing for any reason.
      await db.exec`
        INSERT INTO users (id)
        VALUES (${userID})
        ON CONFLICT (id) DO NOTHING
      `;

      return {
        status: "free",
        createdAt: new Date().toISOString(),
      };
    }

    return {
      status: row.subscription_status ?? "free",
      plan: row.subscription_plan ?? undefined,
      renewDate: row.subscription_renew_date?.toISOString(),
      createdAt: row.created_at.toISOString(),
    };
  }
);

// POST /subscription/webhook/revenuecat - RevenueCat webhook receiver
// This endpoint receives events from RevenueCat and updates user subscription status
export const revenuecatWebhook = api(
  { expose: true, method: "POST", path: "/subscription/webhook/revenuecat" },
  async (req: RevenueCatEventRequest): Promise<{ success: boolean }> => {
    try {
      const receivedToken = req.authorization?.replace(/^Bearer\s+/i, "").trim();

      // If a webhook auth token is configured, require it.
      if (webhookAuthToken && receivedToken !== webhookAuthToken) {
        await recordFailureMetric("webhook_auth_failed");
        recordMetric("webhook_auth_failed", { reason: "invalid_token" });
        throw APIError.permissionDenied("invalid webhook token");
      }

      if (!req.event) {
        await recordFailureMetric("webhook_validation_failed");
        recordMetric("webhook_validation_failed", { reason: "missing_event" });
        throw APIError.invalidArgument("missing RevenueCat event payload");
      }

      const { event } = req;
      if (!event.app_user_id || !event.type) {
        await recordFailureMetric("webhook_validation_failed");
        recordMetric("webhook_validation_failed", { reason: "invalid_payload" });
        throw APIError.invalidArgument("invalid RevenueCat event payload");
      }

      const eventKey = buildRevenueCatEventKey(event);

      const eventRow = await db.queryRow<{ id: number }>`
        INSERT INTO revenuecat_webhook_events (
          revenuecat_event_id,
          event_key,
          app_user_id,
          event_type,
          product_id,
          original_transaction_id,
          transaction_at_ms
        )
        VALUES (
          ${event.id ?? null},
          ${eventKey},
          ${event.app_user_id},
          ${event.type},
          ${event.product_id ?? null},
          ${event.original_transaction_id ?? null},
          ${event.transaction_at_ms ?? null}
        )
        ON CONFLICT (event_key) DO NOTHING
        RETURNING id
      `;

      if (!eventRow) {
        recordMetric("webhook_duplicate_ignored", {
          app_user_id: event.app_user_id,
          event_type: event.type,
        });
        console.log("[RevenueCat webhook] Duplicate event ignored", {
          eventKey,
          appUserId: event.app_user_id,
          type: event.type,
        });
        return { success: true };
      }

      // Optional guard: ignore unrelated entitlement events if configured.
      if (
        expectedEntitlementId &&
        event.entitlement_id &&
        event.entitlement_id !== expectedEntitlementId
      ) {
        console.log("[RevenueCat webhook] Ignoring event for unrelated entitlement", {
          eventType: event.type,
          entitlementId: event.entitlement_id,
        });
        return { success: true };
      }

      const nextStatus = mapRevenueCatEventToStatus(event.type);
      const nextPlan = mapProductToPlan(event.product_id);
      const nextRenewDate = toDateOrNull(event.expiration_at_ms);

      // Upsert user so webhook works even if user has never signed in on this backend yet.
      await db.exec`
        INSERT INTO users (id, subscription_status, subscription_plan, subscription_renew_date, subscription_updated_at)
        VALUES (${event.app_user_id}, ${nextStatus}, ${nextPlan}, ${nextRenewDate}, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          subscription_status = EXCLUDED.subscription_status,
          subscription_plan = EXCLUDED.subscription_plan,
          subscription_renew_date = EXCLUDED.subscription_renew_date,
          subscription_updated_at = NOW()
      `;

      console.log("[RevenueCat webhook] Received event", {
        type: event.type,
        appUserId: event.app_user_id,
        productId: event.product_id,
        entitlementId: event.entitlement_id ?? null,
        mappedStatus: nextStatus,
        mappedPlan: nextPlan,
        transactionId: event.original_transaction_id ?? null,
        expirationAtMs: event.expiration_at_ms ?? null,
      });

      recordMetric("webhook_event_processed", {
        event_type: event.type,
        status: nextStatus,
        plan: nextPlan || "none",
      });

      return { success: true };
    } catch (error) {
      // Log error and optionally queue for retry
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[RevenueCat webhook] Processing failed", { error: errorMessage });
      recordMetric("webhook_processing_error", { error: errorMessage });

      // Re-throw to trigger Encore error response
      throw error;
    }
  }
);

// Internal schema for RevenueCat webhook events
interface RevenueCatEventRequest {
  authorization?: Header<"Authorization">;
  event: {
    id?: string;
    type: string;
    app_user_id: string;
    bundle_id: string;
    product_id?: string;
    entitlement_id?: string;
    auto_resume_date: string | null;
    original_transaction_id?: string;
    transaction_at_ms?: number;
    expiration_at_ms?: number;
    store?: string;
  };
}

function buildRevenueCatEventKey(event: RevenueCatEventRequest["event"]): string {
  if (event.id && event.id.trim().length > 0) {
    return `rc_evt_${event.id.trim()}`;
  }

  const fingerprint = [
    event.app_user_id,
    event.type,
    event.product_id ?? "",
    event.original_transaction_id ?? "",
    event.transaction_at_ms?.toString() ?? "",
    event.expiration_at_ms?.toString() ?? "",
  ].join("|");

  const hash = createHash("sha256").update(fingerprint).digest("hex");
  return `rc_fp_${hash}`;
}

function mapRevenueCatEventToStatus(eventType: string): SubscriptionStatus["status"] {
  const normalized = eventType.trim().toUpperCase();

  if (
    normalized === "INITIAL_PURCHASE" ||
    normalized === "RENEWAL" ||
    normalized === "NON_RENEWING_PURCHASE" ||
    normalized === "UNCANCELLATION" ||
    normalized === "PRODUCT_CHANGE" ||
    normalized === "SUBSCRIPTION_EXTENDED"
  ) {
    return "active";
  }

  if (normalized === "EXPIRATION" || normalized === "BILLING_ISSUE") {
    return "expired";
  }

  if (
    normalized === "CANCELLATION" ||
    normalized === "SUBSCRIPTION_PAUSED" ||
    normalized === "TRANSFER"
  ) {
    return "canceled";
  }

  // Safe default for unknown/new event types.
  return "free";
}

function mapProductToPlan(productId?: string): "pro_monthly" | "pro_annual" | "pro_lifetime" | null {
  if (!productId) return null;

  const plan = skuToPlanMap[productId.trim()];
  if (plan) return plan;

  // Log unknown SKU for observability
  console.warn("[RevenueCat] Unknown product SKU, no plan assigned", { productId });
  return null;
}

function toDateOrNull(epochMs?: number): Date | null {
  if (!epochMs || Number.isNaN(epochMs)) return null;
  return new Date(epochMs);
}

// Admin endpoint: GET /admin/subscription-stats - Subscription status aggregate
export const getSubscriptionStats = api(
  { expose: true, method: "GET", path: "/admin/subscription-stats" },
  async (): Promise<{
    total: number;
    active: number;
    expired: number;
    canceled: number;
    free: number;
    byPlan: Record<string, number>;
  }> => {
    const stats = await db.queryRow<{
      total: number;
      active: number;
      expired: number;
      canceled: number;
      free: number;
    }>`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE subscription_status = 'active') as active,
        COUNT(*) FILTER (WHERE subscription_status = 'expired') as expired,
        COUNT(*) FILTER (WHERE subscription_status = 'canceled') as canceled,
        COUNT(*) FILTER (WHERE subscription_status = 'free' OR subscription_status IS NULL) as free
      FROM users
    `;

    const planBreakdown = await db.queryAll<{
      plan: string | null;
      count: number;
    }>`
      SELECT subscription_plan as plan, COUNT(*) as count
      FROM users
      WHERE subscription_plan IS NOT NULL
      GROUP BY subscription_plan
    `;

    const byPlan: Record<string, number> = {};
    for (const row of planBreakdown) {
      byPlan[row.plan || "none"] = row.count;
    }

    return {
      total: stats?.total || 0,
      active: stats?.active || 0,
      expired: stats?.expired || 0,
      canceled: stats?.canceled || 0,
      free: stats?.free || 0,
      byPlan,
    };
  }
);

// Admin endpoint: GET /admin/webhook-dead-letters - Inspect failed webhooks
export const getWebhookDeadLetters = api(
  { expose: true, method: "GET", path: "/admin/webhook-dead-letters" },
  async (): Promise<{
    count: number;
    deadLetters: Array<{
      id: number;
      appUserId: string;
      eventPayload: Record<string, any>;
      errorMessage: string | null;
      attemptCount: number;
      deadLetteredAt: Date | null;
    }>;
  }> => {
    const rows = await db.queryAll<{
      id: number;
      app_user_id: string;
      event_payload: Record<string, any>;
      error_message: string | null;
      attempt_count: number;
      dead_lettered_at: Date | null;
    }>`
      SELECT
        id,
        app_user_id,
        event_payload,
        error_message,
        attempt_count,
        dead_lettered_at
      FROM webhook_retry_queue
      WHERE is_dead_lettered = TRUE
      ORDER BY dead_lettered_at DESC
      LIMIT 100
    `;

    return {
      count: rows.length,
      deadLetters: rows.map((row) => ({
        id: row.id,
        appUserId: row.app_user_id,
        eventPayload: row.event_payload,
        errorMessage: row.error_message,
        attemptCount: row.attempt_count,
        deadLetteredAt: row.dead_lettered_at,
      })),
    };
  }
);
