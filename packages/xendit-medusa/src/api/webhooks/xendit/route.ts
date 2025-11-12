import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { Logger } from "@medusajs/framework/types";

/**
 * Xendit Payment Link (Invoice) Webhook Handler
 *
 * This endpoint receives webhook notifications from Xendit when invoice status changes occur.
 *
 * Important: Configure this URL in your Xendit Dashboard:
 * https://your-domain.com/hooks/payment/xendit
 *
 * Supported Invoice Statuses:
 * - PAID: Invoice was successfully paid
 * - EXPIRED: Invoice expired without payment
 * - PENDING: Invoice is still pending (informational)
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
    const invoiceId = payload.id as string | undefined;
    const externalId = payload.external_id as string | undefined;
    const status = payload.status as string | undefined;

    // Log incoming webhook for debugging (without sensitive data)
    logger.info(
      `Xendit Invoice webhook received - Invoice ID: ${invoiceId || "N/A"}, External ID: ${externalId || "N/A"}, Status: ${status || "N/A"}`,
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
    if (!invoiceId || !status) {
      logger.error(
        "Xendit webhook rejected: invalid payload structure - missing invoice_id or status",
      );
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid webhook payload structure - missing required fields",
      });
      return;
    }

    // Log successful verification
    logger.info(
      `Xendit webhook verified - Invoice ID: ${invoiceId}, External ID: ${externalId}, Status: ${status}`,
    );

    // 3. QUICK ACKNOWLEDGMENT (Xendit best practice)
    // Respond immediately with 200 before processing any business logic
    // This prevents timeouts and allows Xendit's retry mechanism to work properly
    res.status(200).json({
      received: true,
      invoice_id: invoiceId,
      external_id: externalId,
      status: status,
      timestamp: new Date().toISOString(),
    });

    // 4. The webhook payload will be automatically processed by the
    // Xendit payment provider's getWebhookActionAndData() method
    // through Medusa's webhook processing system
    //
    // Medusa will handle:
    // - Idempotency checking (preventing duplicate processing)
    // - Payment/Invoice status updates
    // - Order completion (when status is PAID)
    // - Any custom webhook handlers/subscribers
    //
    // The invoice webhook will contain:
    // - id: Invoice ID
    // - external_id: Your external reference ID
    // - status: PAID, EXPIRED, or PENDING
    // - paid_amount: Amount paid (for PAID status)
    // - payment_method: Payment method used (e.g., EWALLET, BANK_TRANSFER)
    // - payment_channel: Specific channel (e.g., OVO, DANA, BCA)

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
