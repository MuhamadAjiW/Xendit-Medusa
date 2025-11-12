import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { Logger } from "@medusajs/framework/types";
import type XenditProviderService from "../../../../providers/xendit/service";

/**
 * Xendit Payment Simulation Endpoint (TEST MODE ONLY)
 *
 * This endpoint allows you to manually simulate a payment completion
 * for testing purposes without needing webhooks to reach localhost.
 *
 * WARNING: This endpoint only works when test_mode is enabled in your config
 * and should NEVER be exposed in production!
 *
 * Usage:
 * POST /admin/xendit/simulate
 * Body: { "invoice_id": "your_invoice_id" }
 *
 * Example with curl:
 * ```bash
 * curl -X POST http://localhost:9000/admin/xendit/simulate \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
 *   -d '{"invoice_id": "64f9a8e23c1d2e4b5a6f7890"}'
 * ```
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const logger: Logger = req.scope.resolve("logger");

  try {
    const { invoice_id } = req.body as { invoice_id?: string };

    if (!invoice_id) {
      res.status(400).json({
        error: "Bad Request",
        message: "invoice_id is required in request body",
      });
      return;
    }

    // Get the provider service instance directly
    // Medusa registers payment providers with the prefix "pp_"
    const xenditService = req.scope.resolve<XenditProviderService>("pp_xendit");

    // Check if test mode is enabled
    if (!xenditService.isInTestMode()) {
      res.status(403).json({
        error: "Forbidden",
        message:
          "Payment simulation is only available in test mode. Set test_mode: true in your Xendit provider config.",
      });
      return;
    }

    logger.info(`[TEST MODE] Simulating payment for invoice: ${invoice_id}`);

    // Simulate the payment
    const simulatedInvoice = await xenditService.simulatePayment(invoice_id);

    res.status(200).json({
      success: true,
      message: "Payment simulated successfully",
      data: {
        invoice_id: simulatedInvoice.id,
        external_id: simulatedInvoice.external_id,
        status: simulatedInvoice.status,
        paid_amount: simulatedInvoice.paid_amount,
        payment_method: simulatedInvoice.payment_method,
        payment_channel: simulatedInvoice.payment_channel,
      },
      note: "This is a simulated payment for testing. In production, you would receive a webhook from Xendit.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Payment simulation failed: ${errorMessage}`);

    res.status(500).json({
      error: "Internal Server Error",
      message: `Failed to simulate payment: ${errorMessage}`,
    });
  }
}

/**
 * GET endpoint to check if simulation is available
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    const xenditService = req.scope.resolve<XenditProviderService>("pp_xendit");
    const isTestMode = xenditService.isInTestMode();

    res.status(200).json({
      test_mode_enabled: isTestMode,
      simulation_available: isTestMode,
      message: isTestMode
        ? "Payment simulation is available. Use POST /admin/xendit/simulate with invoice_id to simulate payments."
        : "Payment simulation is not available. Enable test_mode in your Xendit provider config.",
      usage: {
        endpoint: "POST /admin/xendit/simulate",
        body: {
          invoice_id: "your_xendit_invoice_id",
        },
      },
    });
  } catch (error) {
    res.status(200).json({
      test_mode_enabled: false,
      simulation_available: false,
      message: "Xendit provider not configured or not available",
    });
  }
}
