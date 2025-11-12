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
 * Security:
 * - Webhook signature verification using x-callback-token header
 * - Only POST requests are accepted
 * - Validates required fields in payload
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const logger: Logger = req.scope.resolve("logger");

  try {
    const payload = req.body as Record<string, unknown>;
    const payloadData = payload.data as Record<string, unknown> | undefined;

    // Log incoming webhook for debugging
    logger.info(
      `Xendit webhook received - Event: ${payload.event}, Payment ID: ${payloadData?.id || "N/A"}`,
    );

    // Verify webhook signature
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
        logger.warn(
          `Xendit webhook rejected: invalid signature (received: ${callbackToken?.substring(0, 10)}...)`,
        );
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid webhook verification token",
        });
        return;
      }
    } else {
      logger.warn("Xendit webhook token not configured - signature verification skipped");
    }

    // Validate required payload fields
    if (!payload.event || !payload.data) {
      logger.error("Xendit webhook rejected: invalid payload structure");
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid webhook payload structure",
      });
      return;
    }

    // Log successful verification
    logger.info(
      `Xendit webhook verified - Event: ${payload.event}, Payment ID: ${payloadData?.id || "N/A"}`,
    );

    // The webhook payload will be automatically processed by the
    // Xendit payment provider's getWebhookActionAndData() method
    // through Medusa's webhook processing system

    // Respond immediately to Xendit (they expect quick acknowledgment)
    res.status(200).json({
      received: true,
      event: payload.event,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      `Error processing Xendit webhook: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ""}`,
    );

    // Return 500 to trigger Xendit retry mechanism
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
