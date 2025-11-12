/**
 * Xendit Payment Provider Types
 * Based on Xendit Payment Link (Invoice API v2)
 *
 * This file contains TypeScript type definitions for the Xendit payment provider.
 * All types follow the official Xendit API specification.
 *
 * API Documentation: https://docs.xendit.co/docs/payment-links-api-overview
 * API Reference: https://docs.xendit.co/apidocs/en/payment-link
 *
 * @module xendit-medusa/types
 */

/**
 * Provider options configured in medusa-config.ts
 *
 * Example configuration:
 * ```typescript
 * {
 *   resolve: "xendit-medusa/providers/xendit",
 *   id: "xendit",
 *   options: {
 *     api_key: process.env.XENDIT_SECRET_KEY,
 *     webhook_token: process.env.XENDIT_WEBHOOK_TOKEN, // Optional but recommended
 *     default_country: "ID", // Required: ISO 3166-1 alpha-2 code
 *     test_mode: process.env.NODE_ENV !== "production", // Optional: enables simulation features
 *   }
 * }
 * ```
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
   * Default country code for payments (Required)
   * ISO 3166-1 alpha-2 country code
   * Examples: "ID" (Indonesia), "PH" (Philippines), "MY" (Malaysia), "TH" (Thailand)
   */
  default_country: string;

  /**
   * Test Mode (optional, defaults to false)
   * When enabled:
   * - Allows manual payment simulation via API endpoint
   * - Provides detailed logging for debugging
   * - Can bypass webhook requirements for local testing
   *
   * WARNING: Never enable in production!
   */
  test_mode?: boolean;
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
 * ========================================
 * Payment Link (Invoice API) Types
 * Based on: https://docs.xendit.co/apidocs/en/payment-link
 * ========================================
 */

/**
 * Payment methods available for Payment Link
 */
export type XenditPaymentMethod =
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "OVO"
  | "DANA"
  | "LINKAJA"
  | "SHOPEEPAY"
  | "QRIS"
  | "BCA"
  | "BNI"
  | "BRI"
  | "MANDIRI"
  | "PERMATA"
  | "ALFAMART"
  | "INDOMARET";

/**
 * Item details for invoice
 */
export type XenditInvoiceItem = {
  name: string;
  quantity: number;
  price: number;
  category?: string;
  url?: string;
};

/**
 * Customer notification preference
 */
export type XenditCustomerNotificationPreference = {
  invoice_created?: string[];
  invoice_reminder?: string[];
  invoice_paid?: string[];
  invoice_expired?: string[];
};

/**
 * Customer details for invoice
 */
export type XenditCustomer = {
  given_names?: string;
  surname?: string;
  email?: string;
  mobile_number?: string;
  addresses?: Array<{
    city?: string;
    country?: string;
    postal_code?: string;
    state?: string;
    street_line1?: string;
    street_line2?: string;
  }>;
};

/**
 * Fee details
 */
export type XenditFee = {
  type: string;
  value: number;
};

/**
 * Payment Link (Invoice) request payload
 * POST /v2/invoices
 */
export type XenditInvoiceRequest = {
  external_id: string;
  amount: number;
  description?: string;
  invoice_duration?: number;
  customer?: XenditCustomer;
  customer_notification_preference?: XenditCustomerNotificationPreference;
  success_redirect_url?: string;
  failure_redirect_url?: string;
  currency?: string;
  items?: XenditInvoiceItem[];
  payment_methods?: XenditPaymentMethod[];
  mid_label?: string;
  should_exclude_credit_card?: boolean;
  should_send_email?: boolean;
  reminder_time?: number;
  locale?: string;
  fees?: XenditFee[];
  channel_properties?: {
    cards?: {
      allowed_bins?: string[];
    };
  };
};

/**
 * Invoice status
 */
export type XenditInvoiceStatus = "PENDING" | "PAID" | "EXPIRED";

/**
 * Payment Link (Invoice) response
 */
export type XenditInvoiceResponse = {
  id: string;
  external_id: string;
  user_id: string;
  status: XenditInvoiceStatus;
  merchant_name: string;
  merchant_profile_picture_url?: string;
  amount: number;
  paid_amount?: number;
  description?: string;
  expiry_date: string;
  invoice_url: string;
  available_banks?: Array<{
    bank_code: string;
    collection_type: string;
    transfer_amount: number;
    bank_branch: string;
    account_holder_name: string;
    identity_amount: number;
  }>;
  available_retail_outlets?: Array<{
    retail_outlet_name: string;
    payment_code: string;
    transfer_amount: number;
  }>;
  available_ewallets?: Array<{
    ewallet_type: string;
  }>;
  available_qr_codes?: Array<{
    qr_code_type: string;
  }>;
  available_direct_debits?: Array<{
    direct_debit_type: string;
  }>;
  available_paylaters?: Array<{
    paylater_type: string;
  }>;
  should_exclude_credit_card?: boolean;
  should_send_email?: boolean;
  created: string;
  updated: string;
  currency: string;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: string;
  payment_destination?: string;
  payment_id?: string;
  customer?: XenditCustomer;
  customer_notification_preference?: XenditCustomerNotificationPreference;
  success_redirect_url?: string;
  failure_redirect_url?: string;
  items?: XenditInvoiceItem[];
  fees?: XenditFee[];
  locale?: string;
};

/**
 * Invoice webhook event
 */
export type XenditInvoiceWebhookEvent = {
  id: string;
  external_id: string;
  user_id: string;
  status: XenditInvoiceStatus;
  merchant_name: string;
  amount: number;
  paid_amount?: number;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: string;
  payment_id?: string;
  description?: string;
  created: string;
  updated: string;
  currency: string;
  items?: XenditInvoiceItem[];
  customer?: XenditCustomer;
  success_redirect_url?: string;
  failure_redirect_url?: string;
};

/**
 * ========================================
 * Refund Types
 * Based on: https://docs.xendit.co/apidocs/en/refund
 * ========================================
 */

/**
 * Refund request payload
 * Note: Refunds are processed against the payment_id from the invoice
 */
export type XenditRefundRequest = {
  reference_id: string;
  invoice_id?: string;
  payment_id?: string;
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
  payment_id: string;
  invoice_id?: string;
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
