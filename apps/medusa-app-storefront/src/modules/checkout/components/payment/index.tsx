"use client";

import { RadioGroup } from "@headlessui/react";
import { isStripeLike, isXendit, paymentInfoMap } from "@lib/constants";
import { initiatePaymentSession } from "@lib/data/cart";
import { CheckCircleSolid, CreditCard } from "@medusajs/icons";
import type { HttpTypes } from "@medusajs/types";
import { Button, Container, Heading, Text, clx } from "@medusajs/ui";
import ErrorMessage from "@modules/checkout/components/error-message";
import PaymentContainer, {
  StripeCardContainer,
} from "@modules/checkout/components/payment-container";
import { XenditPayment } from "@modules/checkout/components/payment-container/xendit-payment";
import Divider from "@modules/common/components/divider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type PaymentMethod = {
  id: string;
  [key: string]: unknown;
};

type ExtendedStoreCart = HttpTypes.StoreCart & {
  gift_cards?: unknown[];
};

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: ExtendedStoreCart;
  availablePaymentMethods: PaymentMethod[];
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending",
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? "",
  );
  const [xenditChannel, setXenditChannel] = useState<string>("");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isOpen = searchParams.get("step") === "payment";

  const setPaymentMethod = async (method: string) => {
    setError(null);
    setSelectedPaymentMethod(method);
    if (isStripeLike(method)) {
      await initiatePaymentSession(cart, {
        provider_id: method,
      });
    }
    // Reset Xendit channel selection when switching payment methods
    if (!isXendit(method)) {
      setXenditChannel("");
    }
  };

  const paidByGiftcard = cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0;

  const paymentReady =
    (activeSession && (cart?.shipping_methods?.length ?? 0) !== 0) || paidByGiftcard;

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(name, value);

      return params.toString();
    },
    [searchParams],
  );

  const handleEdit = () => {
    router.push(`${pathname}?${createQueryString("step", "payment")}`, {
      scroll: false,
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const shouldInputCard = isStripeLike(selectedPaymentMethod) && !activeSession;

      const checkActiveSession = activeSession?.provider_id === selectedPaymentMethod;

      // For Xendit Payment Links, no channel selection is needed
      // The payment link shows all available payment methods

      if (!checkActiveSession) {
        const sessionData: {
          provider_id: string;
          data?: Record<string, unknown>;
        } = {
          provider_id: selectedPaymentMethod,
        };

        // Add Xendit-specific data for Payment Links
        if (isXendit(selectedPaymentMethod)) {
          sessionData.data = {
            success_redirect_url: `${window.location.origin}/order/confirmed`,
            failure_redirect_url: `${window.location.origin}/checkout?step=payment&status=failed`,
          };
        }

        await initiatePaymentSession(cart, sessionData);

        // For Xendit, we need to refetch the cart to get the updated payment session with invoice_url
        // Then we can redirect to the payment link
        if (isXendit(selectedPaymentMethod)) {
          // The cart should now have the payment session with invoice_url
          // We'll redirect on the next render when the component sees the updated cart
          // Or we could refetch the cart here and redirect immediately
          return router.push(`${pathname}?${createQueryString("step", "review")}`, {
            scroll: false,
          });
        }
      }

      if (!shouldInputCard) {
        return router.push(`${pathname}?${createQueryString("step", "review")}`, {
          scroll: false,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setError(null);
  }, []);

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx("flex flex-row text-3xl-regular gap-x-2 items-baseline", {
            "opacity-50 pointer-events-none select-none": !isOpen && !paymentReady,
          })}
        >
          Payment
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
          <Text>
            <button
              type="button"
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-payment-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <RadioGroup
              value={selectedPaymentMethod}
              onChange={(value: string) => setPaymentMethod(value)}
            >
              {availablePaymentMethods.map((paymentMethod) => (
                <div key={paymentMethod.id}>
                  {isStripeLike(paymentMethod.id) ? (
                    <StripeCardContainer
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                      paymentInfoMap={paymentInfoMap}
                      setCardBrand={setCardBrand}
                      setError={setError}
                      setCardComplete={setCardComplete}
                    />
                  ) : isXendit(paymentMethod.id) ? (
                    <PaymentContainer
                      paymentInfoMap={paymentInfoMap}
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                    >
                      {selectedPaymentMethod === paymentMethod.id && (
                        <div className="mt-4 p-4 bg-ui-bg-subtle rounded-lg">
                          <Text className="text-sm text-ui-fg-subtle">
                            You will be redirected to Xendit's secure payment page to complete your
                            payment. Multiple payment methods including e-wallets, bank transfers,
                            and cards are available.
                          </Text>
                        </div>
                      )}
                    </PaymentContainer>
                  ) : (
                    <PaymentContainer
                      paymentInfoMap={paymentInfoMap}
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                    />
                  )}
                </div>
              ))}
            </RadioGroup>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">Payment method</Text>
              <Text className="txt-medium text-ui-fg-subtle" data-testid="payment-method-summary">
                Gift card
              </Text>
            </div>
          )}

          <ErrorMessage error={error} data-testid="payment-method-error-message" />

          <Button
            size="large"
            className="mt-6"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              (isStripeLike(selectedPaymentMethod) && !cardComplete) ||
              (!selectedPaymentMethod && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
          >
            {!activeSession && isStripeLike(selectedPaymentMethod)
              ? "Enter card details"
              : isXendit(selectedPaymentMethod)
                ? "Proceed to Xendit Payment"
                : "Continue to review"}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex items-start gap-x-1 w-full">
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">Payment method</Text>
                <Text className="txt-medium text-ui-fg-subtle" data-testid="payment-method-summary">
                  {paymentInfoMap[activeSession?.provider_id]?.title || activeSession?.provider_id}
                </Text>
              </div>
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">Payment details</Text>
                <div
                  className="flex gap-2 txt-medium text-ui-fg-subtle items-center"
                  data-testid="payment-details-summary"
                >
                  <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                    {paymentInfoMap[selectedPaymentMethod]?.icon || <CreditCard />}
                  </Container>
                  <Text>
                    {isStripeLike(selectedPaymentMethod) && cardBrand
                      ? cardBrand
                      : "Another step will appear"}
                  </Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">Payment method</Text>
              <Text className="txt-medium text-ui-fg-subtle" data-testid="payment-method-summary">
                Gift card
              </Text>
            </div>
          ) : null}
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  );
};

export default Payment;
