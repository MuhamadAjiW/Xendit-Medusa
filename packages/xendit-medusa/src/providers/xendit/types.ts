/**
 * Xendit Payment Provider Types
 * Based on Xendit Payments API v3
 * Documentation: https://docs.xendit.co/docs/payments-api
 */

/**
 * Provider options configured in medusa-config.ts
 */
export type XenditProviderOptions = {
  /**
   * Xendit API Secret Key
   * Get from: https://dashboard.xendit.co/settings/developers#api-keys
   */
  api_key: string;

  /**
   * Xendit Webhook Verification Token (optional but recommended)
   * Get from: https://dashboard.xendit.co/settings/developers#webhooks
   */
  webhook_token?: string;

  /**
   * Base URL for Xendit API
   * @default "https://api.xendit.co"
   */
  api_url?: string;

  /**
   * Default country code for payments
   * @default "ID" (Indonesia)
   */
  default_country?: string;

  /**
   * Default capture method
   * @default "AUTOMATIC"
   */
  default_capture_method?: "AUTOMATIC" | "MANUAL";
};

/**
 * Payment request types
 */
export type XenditRequestType = "PAY" | "PAY_AND_SAVE" | "SAVE" | "REUSABLE_PAYMENT_CODES";

/**
 * Payment capture methods
 */
export type XenditCaptureMethod = "AUTOMATIC" | "MANUAL";

/**
 * Payment channel codes
 * For comprehensive list see: https://docs.xendit.co/docs/payment-channels
 */
export type XenditChannelCode =
  // E-Wallets
  | "OVO"
  | "DANA"
  | "LINKAJA"
  | "SHOPEEPAY"
  | "JENIUSPAY"
  | "ASTRAPAY"
  // Virtual Accounts
  | "BCA"
  | "BNI"
  | "BRI"
  | "MANDIRI"
  | "PERMATA"
  | "BJB"
  | "BSI"
  | "CIMB"
  | "SAHABAT_SAMPOERNA"
  // QR Codes
  | "QRIS"
  // Cards
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  // Retail Outlets
  | "ALFAMART"
  | "INDOMARET"
  // Direct Debit
  | "DD_BRI"
  | "DD_BCA_KLIKPAY"
  | "DD_MANDIRI";

/**
 * Channel properties for different payment methods
 */
export type XenditChannelProperties = {
  success_return_url?: string;
  failure_return_url?: string;
  cancel_return_url?: string;
  redemption_points?: string;
  mobile_number?: string;
  account_holder_name?: string;
  cardholder_name?: string;
  [key: string]: unknown;
};

/**
 * Payment request payload
 */
export type XenditPaymentRequest = {
  reference_id: string;
  type: XenditRequestType;
  country: string;
  currency: string;
  request_amount: number;
  capture_method?: XenditCaptureMethod;
  channel_code: XenditChannelCode;
  channel_properties?: XenditChannelProperties;
  payment_method_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  customer_id?: string;
};

/**
 * Action types in payment response
 */
export type XenditActionType = "REDIRECT_CUSTOMER" | "PRESENT_TO_CUSTOMER";

/**
 * URL types for redirect actions
 */
export type XenditUrlType = "DEEPLINK" | "WEB";

/**
 * Payment action object
 */
export type XenditAction = {
  action: XenditActionType;
  url?: string;
  url_type?: XenditUrlType;
  method?: string;
  data?: {
    account_details?: {
      account_number?: string;
      bank_code?: string;
      [key: string]: unknown;
    };
    qr_code?: {
      type?: string;
      value?: string;
    };
    [key: string]: unknown;
  };
};

/**
 * Payment request status
 */
export type XenditPaymentStatus =
  | "REQUIRES_ACTION"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED";

/**
 * Payment request response
 */
export type XenditPaymentResponse = {
  id: string;
  reference_id: string;
  status: XenditPaymentStatus;
  actions?: XenditAction[];
  request_amount: number;
  captured_amount?: number;
  refunded_amount?: number;
  currency: string;
  country: string;
  channel_code: XenditChannelCode;
  payment_method?: {
    id: string;
    type: string;
    reusability: string;
    status: string;
    reference_id?: string;
  };
  created: string;
  updated: string;
  description?: string;
  metadata?: Record<string, unknown>;
  failure_code?: string;
  failure_message?: string;
};

/**
 * Payment object (from webhook or retrieval)
 */
export type XenditPayment = {
  id: string;
  reference_id: string;
  payment_request_id: string;
  status: XenditPaymentStatus;
  payment_method: {
    id: string;
    type: string;
    reusability: string;
    reference_id?: string;
  };
  currency: string;
  amount: number;
  country: string;
  channel_code: XenditChannelCode;
  created: string;
  updated: string;
  metadata?: Record<string, unknown>;
  failure_code?: string;
  failure_message?: string;
};

/**
 * Webhook event types
 */
export type XenditWebhookEventType = "payment.capture" | "payment.failed";

/**
 * Webhook event payload
 */
export type XenditWebhookEvent = {
  event: XenditWebhookEventType;
  created: string;
  data: XenditPayment;
};

/**
 * Refund request payload
 */
export type XenditRefundRequest = {
  reference_id: string;
  payment_request_id: string;
  currency: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Refund response
 */
export type XenditRefundResponse = {
  id: string;
  reference_id: string;
  payment_request_id: string;
  payment_id: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  currency: string;
  amount: number;
  reason?: string;
  created: string;
  updated: string;
  metadata?: Record<string, unknown>;
  failure_code?: string;
  failure_message?: string;
};

/**
 * Xendit API Error Response
 */
export type XenditError = {
  error_code: string;
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
};

/**
 * Payment channel information
 */
export type PaymentChannelInfo = {
  code: XenditChannelCode;
  name: string;
  type: "ewallet" | "virtual_account" | "qr_code" | "card" | "retail" | "direct_debit";
  country: string;
  currency: string;
  logo_url?: string;
  description?: string;
  min_amount?: number;
  max_amount?: number;
  is_activated: boolean;
};
