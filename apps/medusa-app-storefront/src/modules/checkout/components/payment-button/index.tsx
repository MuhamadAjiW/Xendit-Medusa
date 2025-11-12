"use client";

import { isManual, isStripeLike, isXendit } from "@lib/constants";
import { placeOrder } from "@lib/data/cart";
import type { HttpTypes } from "@medusajs/types";
import { Button } from "@medusajs/ui";
import { useElements, useStripe } from "@stripe/react-stripe-js";
import type React from "react";
import { useState } from "react";
import ErrorMessage from "../error-message";

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart;
  "data-testid": string;
};

const PaymentButton: React.FC<PaymentButtonProps> = ({ cart, "data-testid": dataTestId }) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1;

  const paymentSession = cart.payment_collection?.payment_sessions?.[0];

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return <StripePaymentButton notReady={notReady} cart={cart} data-testid={dataTestId} />;
    case isXendit(paymentSession?.provider_id):
      return <XenditPaymentButton notReady={notReady} cart={cart} data-testid={dataTestId} />;
    case isManual(paymentSession?.provider_id):
      return <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />;
    default:
      return <Button disabled>Select a payment method</Button>;
  }
};

const XenditPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart;
  notReady: boolean;
  "data-testid"?: string;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const session = cart.payment_collection?.payment_sessions?.find((s) => s.status === "pending");

  const handlePayment = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      // For Xendit Payment Links, the session data contains the invoice_url
      // We redirect the customer to complete payment on Xendit's hosted page
      const invoiceUrl = session?.data?.invoice_url as string | undefined;

      if (invoiceUrl) {
        // Redirect to Xendit Payment Link
        // The customer will complete payment on Xendit's hosted page
        // After payment, Xendit will redirect back to success_redirect_url
        // and send a webhook to confirm the payment
        window.location.href = invoiceUrl;
        return;
      }

      // If no invoice URL, show error
      throw new Error("Payment link not available. Please try again.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Payment failed");
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        disabled={notReady || !session?.data?.invoice_url}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        Proceed to Payment
      </Button>
      <ErrorMessage error={errorMessage} data-testid="xendit-payment-error-message" />
    </>
  );
};

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart;
  notReady: boolean;
  "data-testid"?: string;
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const stripe = useStripe();
  const elements = useElements();
  const card = elements?.getElement("card");

  const session = cart.payment_collection?.payment_sessions?.find((s) => s.status === "pending");

  const disabled = !stripe || !elements;

  const handlePayment = async () => {
    setSubmitting(true);

    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false);
      return;
    }

    await stripe
      .confirmCardPayment(session?.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name: `${cart.billing_address?.first_name} ${cart.billing_address?.last_name}`,
            address: {
              city: cart.billing_address?.city ?? undefined,
              country: cart.billing_address?.country_code ?? undefined,
              line1: cart.billing_address?.address_1 ?? undefined,
              line2: cart.billing_address?.address_2 ?? undefined,
              postal_code: cart.billing_address?.postal_code ?? undefined,
              state: cart.billing_address?.province ?? undefined,
            },
            email: cart.email,
            phone: cart.billing_address?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent;

          if ((pi && pi.status === "requires_capture") || (pi && pi.status === "succeeded")) {
            onPaymentCompleted();
          }

          setErrorMessage(error.message || null);
          return;
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted();
        }

        return;
      });
  };

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        Place order
      </Button>
      <ErrorMessage error={errorMessage} data-testid="stripe-payment-error-message" />
    </>
  );
};

const ManualTestPaymentButton = ({ notReady }: { notReady: boolean }) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const handlePayment = () => {
    setSubmitting(true);

    onPaymentCompleted();
  };

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
      >
        Place order
      </Button>
      <ErrorMessage error={errorMessage} data-testid="manual-payment-error-message" />
    </>
  );
};

export default PaymentButton;
