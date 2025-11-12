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
  XenditPaymentRequest,
  XenditPaymentResponse,
  XenditWebhookEvent,
  XenditRefundRequest,
  XenditRefundResponse,
  XenditError,
  XenditChannelCode,
} from "./types";

type InjectedDependencies = {
  logger: Logger;
};

class XenditProviderService extends AbstractPaymentProvider<XenditProviderOptions> {
  static identifier = "xendit";

  protected options_: XenditProviderOptions;
  protected apiUrl: string;
  protected logger_: Logger;

  constructor(container: InjectedDependencies, options: XenditProviderOptions) {
    super(container, options);

    this.logger_ = container.logger;
    this.options_ = options;
    this.apiUrl = options.api_url || "https://api.xendit.co";

    if (!options.api_key) {
      throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "Xendit API key is required");
    }

    this.logger_.info("Xendit Payment Provider initialized");
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.api_key) {
      throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "Xendit API key is required");
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const paymentId = input.data?.id as string;

    try {
      const payment = await this.retrievePaymentFromXendit(paymentId);

      return {
        status: this.mapXenditStatusToMedusa(payment.status),
        data: payment as unknown as Record<string, unknown>,
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

      // Extract payment channel from context
      const channelCode = (data?.channel_code as XenditChannelCode) || "OVO";
      const channelProperties = (data?.channel_properties as Record<string, unknown>) || {};

      // Convert amount to number
      const amountValue = typeof amount === "string" ? Number.parseFloat(amount) : Number(amount);

      // Create payment request
      const paymentRequest: XenditPaymentRequest = {
        reference_id: `medusa_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: "PAY",
        country: this.options_.default_country || "ID",
        currency: currency_code.toUpperCase(),
        request_amount: amountValue,
        capture_method: this.options_.default_capture_method || "AUTOMATIC",
        channel_code: channelCode,
        channel_properties: {
          ...channelProperties,
          success_return_url: channelProperties.success_return_url as string,
          failure_return_url: channelProperties.failure_return_url as string,
          cancel_return_url: channelProperties.cancel_return_url as string,
        },
        metadata: {
          session_id: data?.session_id as string,
          customer_id: context?.customer?.id as string,
          ...((data?.metadata as Record<string, unknown>) || {}),
        },
      };

      const response = await this.createPaymentRequest(paymentRequest);

      // Store essential data for later use
      return {
        id: response.id,
        data: {
          id: response.id,
          reference_id: response.reference_id,
          status: response.status,
          actions: response.actions,
          amount: response.request_amount,
          captured_amount: response.captured_amount,
          currency: response.currency,
          channel_code: response.channel_code,
          payment_method: response.payment_method,
          created: response.created,
          metadata: response.metadata,
        },
      };
    } catch (error) {
      throw this.buildError("An error occurred in initiatePayment", error);
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    try {
      const paymentId = input.data?.id as string;
      const payment = await this.retrievePaymentFromXendit(paymentId);

      return {
        status: this.mapXenditStatusToMedusa(payment.status),
        data: {
          id: payment.id,
          status: payment.status,
          captured_amount: payment.captured_amount,
        },
      };
    } catch (error) {
      throw this.buildError("An error occurred in authorizePayment", error);
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    try {
      const paymentId = input.data?.id as string;
      const payment = await this.retrievePaymentFromXendit(paymentId);

      // For AUTOMATIC capture, payment is already captured
      // For MANUAL capture, you would call a capture endpoint
      if (payment.status === "SUCCEEDED") {
        return {
          data: {
            id: payment.id,
            status: payment.status,
            captured_amount: payment.captured_amount,
          },
        };
      }

      throw this.buildError(
        "Payment not ready for capture",
        new Error(`Payment status: ${payment.status}`),
      );
    } catch (error) {
      throw this.buildError("An error occurred in capturePayment", error);
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    try {
      const paymentId = input.data?.id as string;
      const currency = input.data?.currency as string;

      // Convert amount to number
      const refundAmount =
        typeof input.amount === "string" ? Number.parseFloat(input.amount) : Number(input.amount);

      const refundRequest: XenditRefundRequest = {
        reference_id: `refund_${paymentId}_${Date.now()}`,
        payment_request_id: paymentId,
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
      const paymentId = input.data?.id as string;

      // Xendit doesn't have explicit cancel endpoint for payment requests
      // Payment will auto-expire if not completed
      const payment = await this.retrievePaymentFromXendit(paymentId);

      return {
        data: {
          id: payment.id,
          status: payment.status,
        },
      };
    } catch (error) {
      throw this.buildError("An error occurred in cancelPayment", error);
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const paymentId = input.data?.id as string;
    const payment = await this.retrievePaymentFromXendit(paymentId);

    return {
      data: {
        id: payment.id,
        status: payment.status,
        amount: payment.request_amount,
        captured_amount: payment.captured_amount,
        currency: payment.currency,
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
    const event = payload.data as XenditWebhookEvent;

    this.logger_.info(`Processing Xendit webhook: ${event.event}`);

    switch (event.event) {
      case "payment.capture":
        return {
          action: PaymentActions.AUTHORIZED,
          data: {
            session_id: event.data.payment_request_id,
            amount: event.data.amount,
          },
        };
      case "payment.failed":
        return {
          action: PaymentActions.FAILED,
          data: {
            session_id: event.data.payment_request_id,
            amount: event.data.amount,
          },
        };
      default:
        this.logger_.warn(`Unsupported webhook event: ${event.event}`);
        return {
          action: PaymentActions.NOT_SUPPORTED,
        };
    }
  }

  // ====== Helper Methods ======

  /**
   * Get authorization headers for Xendit API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const auth = Buffer.from(`${this.options_.api_key}:`).toString("base64");
    return {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    };
  }

  /**
   * Handle Xendit API errors
   */
  private async handleApiError(response: Response): Promise<never> {
    let errorData: XenditError;

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

    this.logger_.error(`Xendit API Error [${errorData.error_code}]: ${errorMessage}`);

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Xendit API error [${errorData.error_code}]: ${errorMessage}`,
    );
  }

  /**
   * Create a payment request in Xendit
   */
  private async createPaymentRequest(
    request: XenditPaymentRequest,
  ): Promise<XenditPaymentResponse> {
    this.logger_.info(`Creating Xendit payment request: ${request.reference_id}`);

    const response = await fetch(`${this.apiUrl}/v3/payment_requests`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const result: XenditPaymentResponse = await response.json();
    this.logger_.info(`Payment request created: ${result.id} (status: ${result.status})`);
    return result;
  }

  /**
   * Retrieve a payment request from Xendit
   */
  private async retrievePaymentFromXendit(paymentId: string): Promise<XenditPaymentResponse> {
    this.logger_.debug(`Retrieving payment request: ${paymentId}`);

    const response = await fetch(`${this.apiUrl}/v3/payment_requests/${paymentId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Payment request not found: ${paymentId}`,
        );
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

  private mapXenditStatusToMedusa(status: XenditPaymentResponse["status"]): PaymentSessionStatus {
    switch (status) {
      case "SUCCEEDED":
        return PaymentSessionStatus.AUTHORIZED;
      case "REQUIRES_ACTION":
        return PaymentSessionStatus.PENDING;
      case "FAILED":
        return PaymentSessionStatus.ERROR;
      case "CANCELED":
        return PaymentSessionStatus.CANCELED;
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
