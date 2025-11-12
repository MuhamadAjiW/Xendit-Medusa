import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
  Logger,
} from "@medusajs/framework/types";
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils";
import type {
  XenditProviderOptions,
  XenditInvoiceRequest,
  XenditInvoiceResponse,
  XenditInvoiceWebhookEvent,
  XenditInvoiceStatus,
  XenditRefundRequest,
  XenditRefundResponse,
  XenditError,
  XenditPaymentMethod,
} from "./types";

type InjectedDependencies = {
  logger: Logger;
};

class XenditProviderService extends AbstractPaymentProvider<XenditProviderOptions> {
  static identifier = "xendit";

  protected options_: XenditProviderOptions;
  protected readonly apiUrl = "https://api.xendit.co";
  protected logger_: Logger;

  constructor(container: InjectedDependencies, options: XenditProviderOptions) {
    super(container, options);

    this.logger_ = container.logger;
    this.options_ = options;

    // Validate required options
    if (!options.api_key) {
      throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "Xendit API key is required");
    }

    if (!options.default_country) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Xendit default_country is required. Provide an ISO 3166-1 alpha-2 country code (e.g., 'ID', 'PH', 'MY', 'TH')",
      );
    }

    this.logger_.info(
      `Xendit Payment Provider initialized for country: ${options.default_country}`,
    );
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.api_key) {
      throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "Xendit API key is required");
    }

    if (!options.default_country) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Xendit default_country is required. Provide an ISO 3166-1 alpha-2 country code (e.g., 'ID', 'PH', 'MY', 'TH')",
      );
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const invoiceId = input.data?.id as string;

    try {
      const invoice = await this.retrieveInvoice(invoiceId);

      return {
        status: this.mapInvoiceStatusToMedusa(invoice.status),
        data: invoice as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        status: PaymentSessionStatus.ERROR,
        data: {},
      };
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    try {
      const { amount, currency_code, context, data } = input;

      // Convert amount to number
      const amountValue = typeof amount === "string" ? Number.parseFloat(amount) : Number(amount);

      // Generate a unique external ID for idempotency
      // Format: medusa_<timestamp>_<random> for easy identification and uniqueness
      const externalId = `medusa_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Extract payment methods from context (optional - if not provided, all methods available)
      const paymentMethods = (data?.payment_methods as XenditPaymentMethod[]) || undefined;

      // Get redirect URLs from data or use defaults
      const successUrl =
        (data?.success_redirect_url as string) ||
        `${process.env.FRONTEND_URL || "http://localhost:8000"}/order/confirmed`;
      const failureUrl =
        (data?.failure_redirect_url as string) ||
        `${process.env.FRONTEND_URL || "http://localhost:8000"}/checkout?step=payment&status=failed`;

      // Build customer information from context
      const customer = context?.customer
        ? {
            given_names: context.customer.first_name || undefined,
            surname: context.customer.last_name || undefined,
            email: context.customer.email || undefined,
            mobile_number: context.customer.phone || undefined,
          }
        : undefined;

      // Build items array - simplified since we don't have detailed cart items in context
      const items = data?.items
        ? (data.items as Array<{
            name: string;
            quantity: number;
            price: number;
            category?: string;
          }>)
        : undefined;

      // Create Payment Link (Invoice) following Xendit Invoice API specification
      const invoiceRequest: XenditInvoiceRequest = {
        external_id: externalId,
        amount: amountValue,
        description: `Payment for ${context?.customer?.email || "customer"}`,
        invoice_duration: 86400, // 24 hours expiry
        currency: currency_code.toUpperCase(),
        customer,
        customer_notification_preference: {
          invoice_created: ["email"],
          invoice_paid: ["email"],
        },
        success_redirect_url: successUrl,
        failure_redirect_url: failureUrl,
        items,
        payment_methods: paymentMethods,
        should_send_email: !!customer?.email,
        locale: "en",
      };

      this.logger_.info(
        `Creating Xendit Payment Link: ${externalId}, amount: ${amountValue} ${currency_code}`,
      );

      const invoice = await this.createInvoice(invoiceRequest);

      // Store essential data for later use
      // This data will be available in subsequent method calls (authorize, capture, etc.)
      return {
        id: invoice.id,
        data: {
          id: invoice.id,
          external_id: invoice.external_id,
          status: invoice.status,
          invoice_url: invoice.invoice_url,
          amount: invoice.amount,
          currency: invoice.currency,
          expiry_date: invoice.expiry_date,
          created: invoice.created,
          description: invoice.description,
        },
      };
    } catch (error) {
      throw this.buildError("An error occurred in initiatePayment", error);
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    try {
      const invoiceId = input.data?.id as string;
      const invoice = await this.retrieveInvoice(invoiceId);

      return {
        status: this.mapInvoiceStatusToMedusa(invoice.status),
        data: {
          id: invoice.id,
          external_id: invoice.external_id,
          status: invoice.status,
          paid_amount: invoice.paid_amount,
          payment_id: invoice.payment_id,
          payment_method: invoice.payment_method,
          payment_channel: invoice.payment_channel,
        },
      };
    } catch (error) {
      throw this.buildError("An error occurred in authorizePayment", error);
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    try {
      const invoiceId = input.data?.id as string;
      const invoice = await this.retrieveInvoice(invoiceId);

      // For Payment Links, payment is automatically captured when status is PAID
      if (invoice.status === "PAID") {
        return {
          data: {
            id: invoice.id,
            external_id: invoice.external_id,
            status: invoice.status,
            paid_amount: invoice.paid_amount,
            payment_id: invoice.payment_id,
          },
        };
      }

      throw this.buildError(
        "Payment not ready for capture",
        new Error(`Invoice status: ${invoice.status}`),
      );
    } catch (error) {
      throw this.buildError("An error occurred in capturePayment", error);
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    try {
      const invoiceId = input.data?.id as string;
      const paymentId = input.data?.payment_id as string;
      const currency = input.data?.currency as string;

      // Convert amount to number
      const refundAmount =
        typeof input.amount === "string" ? Number.parseFloat(input.amount) : Number(input.amount);

      const refundRequest: XenditRefundRequest = {
        reference_id: `refund_${invoiceId}_${Date.now()}`,
        invoice_id: invoiceId,
        payment_id: paymentId,
        currency: currency || "IDR",
        amount: refundAmount,
        reason: "Customer requested refund",
        metadata: input.data?.metadata as Record<string, unknown>,
      };

      const refund = await this.createRefund(refundRequest);

      return {
        data: {
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          refund_id: refund.id,
        },
      };
    } catch (error) {
      throw this.buildError("An error occurred in refundPayment", error);
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    try {
      const invoiceId = input.data?.id as string;

      // Xendit invoices will auto-expire based on invoice_duration
      // We can also manually expire them by calling the expire endpoint
      const invoice = await this.expireInvoice(invoiceId);

      return {
        data: {
          id: invoice.id,
          external_id: invoice.external_id,
          status: invoice.status,
        },
      };
    } catch (error) {
      throw this.buildError("An error occurred in cancelPayment", error);
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const invoiceId = input.data?.id as string;
    const invoice = await this.retrieveInvoice(invoiceId);

    return {
      data: {
        id: invoice.id,
        external_id: invoice.external_id,
        status: invoice.status,
        amount: invoice.amount,
        paid_amount: invoice.paid_amount,
        currency: invoice.currency,
        invoice_url: invoice.invoice_url,
      },
    };
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    try {
      // Xendit payment requests cannot be updated once created
      // We need to create a new payment request
      return await this.initiatePayment(input);
    } catch (error) {
      throw this.buildError("An error occurred in updatePayment", error);
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return await this.cancelPayment(input);
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    const invoiceEvent = payload.data as XenditInvoiceWebhookEvent;

    this.logger_.info(`Processing Xendit Invoice webhook - Status: ${invoiceEvent.status}`);

    // Validate webhook data
    if (!invoiceEvent || !invoiceEvent.id || !invoiceEvent.status) {
      this.logger_.error("Invalid webhook payload structure");
      return {
        action: PaymentActions.NOT_SUPPORTED,
      };
    }

    // Map Xendit invoice status to Medusa payment actions
    switch (invoiceEvent.status) {
      case "PAID":
        // Invoice was successfully paid
        this.logger_.info(
          `Invoice paid: ${invoiceEvent.id} (External ID: ${invoiceEvent.external_id}), Payment ID: ${invoiceEvent.payment_id}`,
        );
        return {
          action: PaymentActions.AUTHORIZED,
          data: {
            session_id: invoiceEvent.id,
            amount: invoiceEvent.paid_amount || invoiceEvent.amount,
          },
        };

      case "EXPIRED":
        // Invoice expired without payment
        this.logger_.warn(
          `Invoice expired: ${invoiceEvent.id} (External ID: ${invoiceEvent.external_id})`,
        );
        return {
          action: PaymentActions.FAILED,
          data: {
            session_id: invoiceEvent.id,
            amount: invoiceEvent.amount,
          },
        };

      case "PENDING":
        // Invoice is still pending - this is informational
        this.logger_.info(
          `Invoice pending: ${invoiceEvent.id} (External ID: ${invoiceEvent.external_id})`,
        );
        return {
          action: PaymentActions.NOT_SUPPORTED,
        };

      default:
        this.logger_.warn(`Unsupported invoice status: ${invoiceEvent.status}`);
        return {
          action: PaymentActions.NOT_SUPPORTED,
        };
    }
  }

  // ====== Helper Methods ======

  /**
   * Get authorization headers for Xendit API requests
   * Xendit uses Basic Auth with API key as username and empty password
   * Reference: https://docs.xendit.co/docs/authentication
   */
  private getAuthHeaders(): Record<string, string> {
    const auth = Buffer.from(`${this.options_.api_key}:`).toString("base64");
    return {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      // Include idempotency key for retryable requests (recommended by Xendit)
      "x-api-version": "2022-07-31",
    };
  }

  /**
   * Handle Xendit API errors with proper error categorization
   * Reference: https://docs.xendit.co/docs/error-codes
   */
  private async handleApiError(response: Response): Promise<never> {
    let errorData: XenditError;

    // Check for rate limiting (HTTP 429)
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const rateLimit = response.headers.get("rate-limit-limit");
      const rateLimitRemaining = response.headers.get("rate-limit-remaining");
      const rateLimitReset = response.headers.get("rate-limit-reset");

      this.logger_.warn(
        `Xendit API rate limit exceeded. Limit: ${rateLimit}, Remaining: ${rateLimitRemaining}, Reset in: ${rateLimitReset}s, Retry after: ${retryAfter}s`,
      );

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Xendit API rate limit exceeded. Please retry after ${retryAfter} seconds.`,
      );
    }

    try {
      errorData = await response.json();
    } catch {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Xendit API error: ${response.statusText} (${response.status})`,
      );
    }

    const errorMessage = errorData.errors?.length
      ? errorData.errors.map((e) => e.message).join(", ")
      : errorData.message;

    this.logger_.error(
      `Xendit API Error [${errorData.error_code}]: ${errorMessage} (HTTP ${response.status})`,
    );

    // Map Xendit error codes to appropriate Medusa error types
    const errorType = this.mapXenditErrorToMedusaType(response.status, errorData.error_code);

    throw new MedusaError(errorType, `Xendit API error [${errorData.error_code}]: ${errorMessage}`);
  }

  /**
   * Map Xendit error codes to Medusa error types
   */
  private mapXenditErrorToMedusaType(statusCode: number, errorCode: string): string {
    // Authentication errors
    if (statusCode === 401 || errorCode === "API_VALIDATION_ERROR") {
      return MedusaError.Types.UNAUTHORIZED;
    }

    // Not found errors
    if (statusCode === 404) {
      return MedusaError.Types.NOT_FOUND;
    }

    // Validation errors
    if (statusCode === 400 || errorCode.includes("VALIDATION")) {
      return MedusaError.Types.INVALID_DATA;
    }

    // Server errors
    if (statusCode >= 500) {
      return MedusaError.Types.UNEXPECTED_STATE;
    }

    return MedusaError.Types.INVALID_DATA;
  }

  /**
   * Create a Payment Link (Invoice) in Xendit
   * Reference: https://docs.xendit.co/apidocs/en/payment-link
   */
  private async createInvoice(request: XenditInvoiceRequest): Promise<XenditInvoiceResponse> {
    this.logger_.info(`Creating Xendit Payment Link (Invoice): ${request.external_id}`);

    const response = await fetch(`${this.apiUrl}/v2/invoices`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const result: XenditInvoiceResponse = await response.json();
    this.logger_.info(
      `Payment Link created: ${result.id} (status: ${result.status}, URL: ${result.invoice_url})`,
    );
    return result;
  }

  /**
   * Retrieve an Invoice from Xendit
   */
  private async retrieveInvoice(invoiceId: string): Promise<XenditInvoiceResponse> {
    this.logger_.debug(`Retrieving invoice: ${invoiceId}`);

    const response = await fetch(`${this.apiUrl}/v2/invoices/${invoiceId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, `Invoice not found: ${invoiceId}`);
      }
      await this.handleApiError(response);
    }

    return await response.json();
  }

  /**
   * Create a refund in Xendit
   */
  private async createRefund(refundRequest: XenditRefundRequest): Promise<XenditRefundResponse> {
    this.logger_.info(`Creating refund: ${refundRequest.reference_id}`);

    const response = await fetch(`${this.apiUrl}/refunds`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(refundRequest),
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const result: XenditRefundResponse = await response.json();
    this.logger_.info(`Refund created: ${result.id} (status: ${result.status})`);
    return result;
  }

  /**
   * Expire (cancel) an invoice
   */
  private async expireInvoice(invoiceId: string): Promise<XenditInvoiceResponse> {
    this.logger_.info(`Expiring invoice: ${invoiceId}`);

    const response = await fetch(`${this.apiUrl}/v2/invoices/${invoiceId}/expire!`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const result: XenditInvoiceResponse = await response.json();
    this.logger_.info(`Invoice expired: ${result.id} (status: ${result.status})`);
    return result;
  }

  /**
   * Map Xendit Invoice status to Medusa PaymentSessionStatus
   */
  private mapInvoiceStatusToMedusa(status: XenditInvoiceStatus): PaymentSessionStatus {
    switch (status) {
      case "PAID":
        return PaymentSessionStatus.AUTHORIZED;
      case "PENDING":
        return PaymentSessionStatus.PENDING;
      case "EXPIRED":
        return PaymentSessionStatus.CANCELED;
      default:
        return PaymentSessionStatus.PENDING;
    }
  }

  protected buildError(message: string, error: Error | unknown): Error {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new MedusaError(MedusaError.Types.INVALID_DATA, `${message}: ${errorMessage}`);
  }
}

export default XenditProviderService;
