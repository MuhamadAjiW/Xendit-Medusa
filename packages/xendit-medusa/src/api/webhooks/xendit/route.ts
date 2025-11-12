import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { Logger } from "@medusajs/framework/types";

/**
 * Xendit Webhook Handler
 *
 * This endpoint receives webhook notifications from Xendit when payment status changes occur.
 *
 * Important: Configure this URL in your Xendit Dashboard:
 * https://your-domain.com/hooks/payment/xendit
 *
 * Supported Events:
 * - payment.capture: Payment was successfully captured
 * - payment.failed: Payment failed
 *
 * Security Best Practices (from Xendit):
 * - Webhook signature verification using x-callback-token header
 * - Only POST requests are accepted
 * - Validates required fields in payload
 * - Quick acknowledgment (respond with 2xx before processing)
 * - Idempotency handling (check for duplicate webhooks)
 * - Server-side processing only (never expose to client)
 *
 * Reference: https://docs.xendit.co/docs/handling-webhooks
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const logger: Logger = req.scope.resolve("logger");

  try {
    const payload = req.body as Record<string, unknown>;
    const payloadData = payload.data as Record<string, unknown> | undefined;
    const paymentId = payloadData?.id as string | undefined;
    const paymentRequestId = payloadData?.payment_request_id as string | undefined;

    // Log incoming webhook for debugging (without sensitive data)
    logger.info(
      `Xendit webhook received - Event: ${payload.event}, Payment Request ID: ${paymentRequestId || "N/A"}`,
    );

    // 1. Verify webhook signature (STRONGLY RECOMMENDED by Xendit)
    // This prevents man-in-the-middle attacks and ensures webhook authenticity
    const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
    if (webhookToken) {
      const callbackToken = req.headers["x-callback-token"] as string;

      if (!callbackToken) {
        logger.warn("Xendit webhook rejected: missing x-callback-token header");
        res.status(401).json({
          error: "Unauthorized",
          message: "Missing webhook verification token",
        });
        return;
      }

      if (callbackToken !== webhookToken) {
        logger.warn("Xendit webhook rejected: invalid signature (token mismatch)");
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid webhook verification token",
        });
        return;
      }
    } else {
      logger.warn(
        "⚠️  SECURITY WARNING: XENDIT_WEBHOOK_TOKEN not configured - webhook signature verification skipped. " +
          "This is not recommended for production. Set XENDIT_WEBHOOK_TOKEN in your environment variables.",
      );
    }

    // 2. Validate required payload fields
    if (!payload.event || !payload.data) {
      logger.error("Xendit webhook rejected: invalid payload structure");
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid webhook payload structure",
      });
      return;
    }

    // 3. Validate payment identifiers for idempotency
    if (!paymentId || !paymentRequestId) {
      logger.error("Xendit webhook rejected: missing payment identifiers");
      res.status(400).json({
        error: "Bad Request",
        message: "Missing payment_id or payment_request_id",
      });
      return;
    }

    // Log successful verification
    logger.info(
      `Xendit webhook verified - Event: ${payload.event}, Payment ID: ${paymentId}, Request ID: ${paymentRequestId}`,
    );

    // 4. QUICK ACKNOWLEDGMENT (Xendit best practice)
    // Respond immediately with 200 before processing any business logic
    // This prevents timeouts and allows Xendit's retry mechanism to work properly
    res.status(200).json({
      received: true,
      event: payload.event,
      payment_id: paymentId,
      timestamp: new Date().toISOString(),
    });

    // 5. The webhook payload will be automatically processed by the
    // Xendit payment provider's getWebhookActionAndData() method
    // through Medusa's webhook processing system
    //
    // Medusa will handle:
    // - Idempotency checking (preventing duplicate processing)
    // - Payment status updates
    // - Order completion
    // - Any custom webhook handlers/subscribers

    // Note: Any additional processing should be done asynchronously
    // after the response has been sent, either through:
    // - Medusa subscribers
    // - Workflow hooks
    // - Message queues
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      `Error processing Xendit webhook: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ""}`,
    );

    // Return 500 to trigger Xendit's automatic retry mechanism
    // Xendit will retry up to 6 times with exponential backoff over 24 hours
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to process webhook",
    });
  }
}

/**
 * Health check endpoint for webhook
 * Returns 405 Method Not Allowed for non-POST requests
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.status(405).json({
    error: "Method Not Allowed",
    message: "This endpoint only accepts POST requests from Xendit webhooks",
  });
}
