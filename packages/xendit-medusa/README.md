# Xendit Payment Provider for Medusa v2

A comprehensive payment provider plugin for Medusa v2 that integrates with [Xendit](https://www.xendit.co/), enabling merchants to accept payments from customers across Southeast Asia, particularly Indonesia.

<p align="center">
  <a href="https://www.xendit.co/">
    <img src="https://www.xendit.co/en/wp-content/uploads/2021/08/Xendit-Logo.png" alt="Xendit" width="200"/>
  </a>
  <a href="https://www.medusajs.com">
    <img src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg" alt="Medusa" width="200"/>
  </a>
</p>

## Features

- Full support for Xendit Payments API v3
- Multiple payment methods:
  - E-wallets (OVO, DANA, GoPay, LinkAja, ShopeePay, etc.)
  - Virtual Accounts (BCA, BNI, BRI, Mandiri, Permata, etc.)
  - QR Codes (QRIS)
  - Credit/Debit Cards
  - Retail Outlets (Alfamart, Indomaret)
  - Direct Debit
- Automatic webhook handling for payment status updates
- Secure webhook verification
- Comprehensive logging and error handling
- Multi-currency support
- Refund support

## Installation

### 1. Install the Plugin

```bash
npm install xendit-medusa
# or
yarn add xendit-medusa
# or
pnpm add xendit-medusa
```

### 2. Configure the Plugin

Add the Xendit payment provider to your `medusa-config.ts`:

```typescript
import { defineConfig } from "@medusajs/framework/utils";

export default defineConfig({
  // ... other config
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "xendit-medusa/providers/xendit",
            id: "xendit",
            options: {
              api_key: process.env.XENDIT_SECRET_KEY,
              webhook_token: process.env.XENDIT_WEBHOOK_TOKEN, // Optional but recommended
              api_url: "https://api.xendit.co", // Optional, defaults to production
              default_country: "ID", // Optional, defaults to Indonesia
              default_capture_method: "AUTOMATIC", // Optional, defaults to AUTOMATIC
            },
          },
        ],
      },
    },
  ],
});
```

### 3. Add Environment Variables

Create or update your `.env` file:

```bash
# Required: Get from https://dashboard.xendit.co/settings/developers#api-keys
XENDIT_SECRET_KEY=xnd_development_your_secret_key_here

# Optional but recommended: Get from https://dashboard.xendit.co/settings/developers#webhooks
XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token_here
```

### 4. Enable the Payment Provider

1. Start your Medusa backend:
   ```bash
   npm run dev
   ```

2. Open the Medusa Admin Dashboard
3. Go to **Settings** → **Regions**
4. Select or create a region
5. In the **Payment Providers** section, enable **Xendit**

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `api_key` | string | Yes | - | Your Xendit secret API key |
| `webhook_token` | string | No | - | Webhook verification token for security |
| `api_url` | string | No | `https://api.xendit.co` | Xendit API base URL |
| `default_country` | string | No | `ID` | Default country code for payments |
| `default_capture_method` | string | No | `AUTOMATIC` | Payment capture method (`AUTOMATIC` or `MANUAL`) |

## Webhook Setup

Webhooks are essential for receiving real-time payment status updates from Xendit.

### 1. Configure Webhook URL in Xendit Dashboard

1. Go to [Xendit Dashboard](https://dashboard.xendit.co/settings/developers#webhooks)
2. Add your webhook URL:
   ```
   https://your-domain.com/hooks/payment/xendit
   ```
3. Select the following events:
   - `payment.capture`
   - `payment.failed`
4. Copy the **Callback Token** and add it to your `.env` as `XENDIT_WEBHOOK_TOKEN`

### 2. Webhook Verification

The plugin automatically verifies incoming webhooks using the `x-callback-token` header if you've configured `XENDIT_WEBHOOK_TOKEN`.

## Supported Payment Channels

### E-Wallets
- **OVO** - `OVO`
- **DANA** - `DANA`
- **LinkAja** - `LINKAJA`
- **ShopeePay** - `SHOPEEPAY`
- **JeniusPay** - `JENIUSPAY`
- **AstraPay** - `ASTRAPAY`

### Virtual Accounts
- **BCA** - `BCA`
- **BNI** - `BNI`
- **BRI** - `BRI`
- **Mandiri** - `MANDIRI`
- **Permata** - `PERMATA`
- **BJB** - `BJB`
- **BSI** - `BSI`
- **CIMB** - `CIMB`

### QR Codes
- **QRIS** - `QRIS` (Indonesian standard QR)

### Cards
- **Credit Card** - `CREDIT_CARD`
- **Debit Card** - `DEBIT_CARD`

### Retail Outlets
- **Alfamart** - `ALFAMART`
- **Indomaret** - `INDOMARET`

### Direct Debit
- **BRI Direct Debit** - `DD_BRI`
- **BCA KlikPay** - `DD_BCA_KLIKPAY`
- **Mandiri Direct Debit** - `DD_MANDIRI`

## Usage in Storefront

### Example: E-Wallet Payment

```typescript
const paymentSession = await medusa.paymentCollections.initiatePaymentSession({
  provider_id: "xendit",
  data: {
    channel_code: "OVO",
    channel_properties: {
      mobile_number: "+628123456789",
      success_return_url: "https://your-store.com/order/success",
      failure_return_url: "https://your-store.com/order/failed",
    },
  },
});

// Redirect user to payment URL
if (paymentSession.data.actions?.[0]?.url) {
  window.location.href = paymentSession.data.actions[0].url;
}
```

### Example: Virtual Account

```typescript
const paymentSession = await medusa.paymentCollections.initiatePaymentSession({
  provider_id: "xendit",
  data: {
    channel_code: "BCA",
  },
});

// Display account number to customer
const accountNumber = paymentSession.data.actions[0].data.account_details.account_number;
```

## Testing

Use Xendit test credentials for development:
```bash
XENDIT_SECRET_KEY=xnd_development_your_test_key_here
```

Test credentials: [Xendit Test Scenarios](https://docs.xendit.co/docs/en/test-scenarios)

## Resources

- [Xendit Documentation](https://docs.xendit.co/)
- [Xendit Dashboard](https://dashboard.xendit.co/)
- [Medusa Documentation](https://docs.medusajs.com)
- [GitHub Repository](https://github.com/MuhamadAjiW/xendit-medusa)

## License

MIT

## Support

- [GitHub Issues](https://github.com/MuhamadAjiW/xendit-medusa/issues)
- [Medusa Discord](https://discord.gg/medusajs)

## Compatibility

This starter is compatible with versions >= 2.4.0 of `@medusajs/medusa`. 

## Medusa Resources

Visit the [Quickstart Guide](https://docs.medusajs.com/learn/installation) to set up a server.

Visit the [Plugins documentation](https://docs.medusajs.com/learn/fundamentals/plugins) to learn more about plugins and how to create them.

Visit the [Docs](https://docs.medusajs.com/learn/installation#get-started) to learn more about our system requirements.

## What is Medusa

Medusa is a set of commerce modules and tools that allow you to build rich, reliable, and performant commerce applications without reinventing core commerce logic. The modules can be customized and used to build advanced ecommerce stores, marketplaces, or any product that needs foundational commerce primitives. All modules are open-source and freely available on npm.

Learn more about [Medusa’s architecture](https://docs.medusajs.com/learn/introduction/architecture) and [commerce modules](https://docs.medusajs.com/learn/fundamentals/modules/commerce-modules) in the Docs.

## Community & Contributions

The community and core team are available in [GitHub Discussions](https://github.com/medusajs/medusa/discussions), where you can ask for support, discuss roadmap, and share ideas.

Join our [Discord server](https://discord.com/invite/medusajs) to meet other community members.

## Other channels

- [GitHub Issues](https://github.com/medusajs/medusa/issues)
- [Twitter](https://twitter.com/medusajs)
- [LinkedIn](https://www.linkedin.com/company/medusajs)
- [Medusa Blog](https://medusajs.com/blog/)
