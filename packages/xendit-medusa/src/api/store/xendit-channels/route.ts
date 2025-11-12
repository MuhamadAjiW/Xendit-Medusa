import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { PaymentChannelInfo } from "../../../providers/xendit/types";

/**
 * Get available Xendit payment channels
 *
 * This endpoint returns information about all supported Xendit payment channels
 * that can be used for payments in your store.
 *
 * GET /store/xendit/channels
 *
 * Response:
 * {
 *   "channels": [
 *     {
 *       "code": "OVO",
 *       "name": "OVO",
 *       "type": "ewallet",
 *       "country": "ID",
 *       "currency": "IDR",
 *       "description": "OVO e-wallet payment"
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  // List of available payment channels
  // In a production environment, this could be fetched from Xendit API
  // or configured dynamically based on your account settings
  const channels: PaymentChannelInfo[] = [
    // E-Wallets
    {
      code: "OVO",
      name: "OVO",
      type: "ewallet",
      country: "ID",
      currency: "IDR",
      description: "One of Indonesia's leading digital payment platforms",
      is_activated: true,
      min_amount: 10000,
      max_amount: 10000000,
    },
    {
      code: "DANA",
      name: "DANA",
      type: "ewallet",
      country: "ID",
      currency: "IDR",
      description: "Popular Indonesian e-wallet backed by Ant Group",
      is_activated: true,
      min_amount: 10000,
      max_amount: 20000000,
    },
    {
      code: "LINKAJA",
      name: "LinkAja",
      type: "ewallet",
      country: "ID",
      currency: "IDR",
      description: "State-owned digital payment solution",
      is_activated: true,
      min_amount: 10000,
      max_amount: 10000000,
    },
    {
      code: "SHOPEEPAY",
      name: "ShopeePay",
      type: "ewallet",
      country: "ID",
      currency: "IDR",
      description: "E-wallet integrated with Shopee ecosystem",
      is_activated: true,
      min_amount: 1000,
      max_amount: 10000000,
    },

    // Virtual Accounts
    {
      code: "BCA",
      name: "BCA Virtual Account",
      type: "virtual_account",
      country: "ID",
      currency: "IDR",
      description: "Bank Central Asia virtual account",
      is_activated: true,
      min_amount: 10000,
    },
    {
      code: "BNI",
      name: "BNI Virtual Account",
      type: "virtual_account",
      country: "ID",
      currency: "IDR",
      description: "Bank Negara Indonesia virtual account",
      is_activated: true,
      min_amount: 10000,
    },
    {
      code: "BRI",
      name: "BRI Virtual Account",
      type: "virtual_account",
      country: "ID",
      currency: "IDR",
      description: "Bank Rakyat Indonesia virtual account",
      is_activated: true,
      min_amount: 10000,
    },
    {
      code: "MANDIRI",
      name: "Mandiri Virtual Account",
      type: "virtual_account",
      country: "ID",
      currency: "IDR",
      description: "Bank Mandiri virtual account",
      is_activated: true,
      min_amount: 10000,
    },
    {
      code: "PERMATA",
      name: "Permata Virtual Account",
      type: "virtual_account",
      country: "ID",
      currency: "IDR",
      description: "Bank Permata virtual account",
      is_activated: true,
      min_amount: 10000,
    },

    // QR Codes
    {
      code: "QRIS",
      name: "QRIS",
      type: "qr_code",
      country: "ID",
      currency: "IDR",
      description: "Indonesian standard QR code payment",
      is_activated: true,
      min_amount: 1500,
    },

    // Cards
    {
      code: "CREDIT_CARD",
      name: "Credit Card",
      type: "card",
      country: "ID",
      currency: "IDR",
      description: "International credit card payment",
      is_activated: true,
      min_amount: 10000,
    },
    {
      code: "DEBIT_CARD",
      name: "Debit Card",
      type: "card",
      country: "ID",
      currency: "IDR",
      description: "Debit card payment",
      is_activated: true,
      min_amount: 10000,
    },

    // Retail Outlets
    {
      code: "ALFAMART",
      name: "Alfamart",
      type: "retail",
      country: "ID",
      currency: "IDR",
      description: "Pay at Alfamart stores",
      is_activated: true,
      min_amount: 10000,
      max_amount: 5000000,
    },
    {
      code: "INDOMARET",
      name: "Indomaret",
      type: "retail",
      country: "ID",
      currency: "IDR",
      description: "Pay at Indomaret stores",
      is_activated: true,
      min_amount: 10000,
      max_amount: 5000000,
    },
  ];

  // Optional: Filter by query parameters
  const { type, country } = req.query;

  let filteredChannels = channels;

  if (type) {
    filteredChannels = filteredChannels.filter((channel) => channel.type === type);
  }

  if (country) {
    filteredChannels = filteredChannels.filter((channel) => channel.country === country);
  }

  res.status(200).json({
    channels: filteredChannels,
    count: filteredChannels.length,
  });
}
