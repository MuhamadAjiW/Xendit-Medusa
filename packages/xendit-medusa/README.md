# Xendit Payment Provider for Medusa v2

A comprehensive payment provider plugin for Medusa v2 that integrates with [Xendit](https://www.xendit.co/), enabling merchants to accept payments from customers across Southeast Asia, particularly Indonesia.

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

# Required for production (optional for development): Get from https://dashboard.xendit.co/settings/developers#webhooks
# STRONGLY RECOMMENDED by Xendit to prevent man-in-the-middle attacks and money loss incidents
# This is the "Callback Token" shown when you set your webhook URL
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
| `webhook_token` | string | **Prod: Yes**<br>Dev: No | - | Webhook verification token - **REQUIRED for production** to verify webhook authenticity and prevent attacks |
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

### 2. Webhook Verification (Security)

**IMPORTANT**: Xendit strongly recommends webhook verification to prevent man-in-the-middle attacks and money loss incidents.

The plugin automatically verifies incoming webhooks using the `x-callback-token` header when you configure `XENDIT_WEBHOOK_TOKEN`:

- **With token**: Webhooks are verified against the token. Unauthorized requests are rejected with 401.
- **Without token**: Webhooks are accepted but a security warning is logged. **Not recommended for production**.

**How it works:**
1. Xendit includes an `x-callback-token` header in each webhook request
2. The plugin compares this token with your configured `XENDIT_WEBHOOK_TOKEN`
3. Only webhooks with matching tokens are processed
4. This ensures webhooks are actually from Xendit, not malicious third parties

Reference: [Xendit Webhook Security Best Practices](https://docs.xendit.co/docs/handling-webhooks)

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

### Development Mode

Use Xendit test credentials for development:

```bash
XENDIT_SECRET_KEY=xnd_development_your_test_key_here
```

### Test Payment Scenarios

Xendit provides test credentials and scenarios for different payment methods:

- [Test Scenarios Documentation](https://docs.xendit.co/docs/en/test-scenarios)
- [Simulate Different Payment Outcomes](https://docs.xendit.co/docs/simulate-error-scenarios)

### Testing Webhooks Locally

For local development, use tools like:

- [ngrok](https://ngrok.com/) to expose your local server
- [localtunnel](https://localtunnel.github.io/www/) as an alternative
- Xendit Dashboard webhook simulator

Example with ngrok:

```bash
ngrok http 9000
# Use the HTTPS URL in Xendit Dashboard: https://xxxx.ngrok.io/hooks/payment/xendit
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check Webhook URL Configuration**
   - Verify the URL in Xendit Dashboard matches your deployment
   - Ensure the URL is publicly accessible (use ngrok for local testing)
   - URL format: `https://your-domain.com/hooks/payment/xendit`

2. **Verify Webhook Token**
   - Check `XENDIT_WEBHOOK_TOKEN` is set correctly
   - Token should match the one in Xendit Dashboard
   - Look for "SECURITY WARNING" in logs if token is missing

3. **Check Webhook Logs**
   - View webhook delivery status in Xendit Dashboard
   - Check your application logs for "Xendit webhook received" messages
   - Look for error responses (401, 400, 500)

### Payment Not Processing

1. **Check API Key**
   - Verify `XENDIT_SECRET_KEY` is correct
   - Ensure using the right environment (test vs production)
   - Check for "API_VALIDATION_ERROR" in logs

2. **Rate Limiting**
   - Default limits: 60 requests/min (test), 600 requests/min (live)
   - Check logs for "rate limit exceeded" messages
   - Implement exponential backoff for retries

3. **Payment Channel Issues**
   - Verify the channel is enabled in your Xendit account
   - Check minimum/maximum amounts for the channel
   - Ensure required channel properties are provided

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `API_VALIDATION_ERROR` | Invalid API key or authentication | Check your `XENDIT_SECRET_KEY` |
| `CHANNEL_UNAVAILABLE` | Payment channel not available | Enable channel in Xendit Dashboard |
| `INVALID_AMOUNT` | Amount outside allowed range | Check min/max amounts for channel |
| `DUPLICATE_REQUEST` | Duplicate reference_id | Use unique reference IDs |

### Debug Mode

Enable detailed logging by setting log level:

```typescript
// In medusa-config.ts
export default defineConfig({
  projectConfig: {
    // ... other config
    logger: {
      level: "debug", // Enable debug logs
    },
  },
});
```

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
