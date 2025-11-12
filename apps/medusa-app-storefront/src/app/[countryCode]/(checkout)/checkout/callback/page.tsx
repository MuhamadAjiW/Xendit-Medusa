"use client";

import { Spinner } from "@medusajs/icons";
import { Text } from "@medusajs/ui";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Xendit Payment Callback Page
 * 
 * This page handles the redirect from Xendit after payment completion.
 * It polls the payment status until the webhook confirms the payment,
 * then redirects to the order confirmation page.
 * 
 * Flow:
 * 1. Customer completes payment on Xendit's hosted page
 * 2. Xendit redirects to this callback page with cart_id parameter
 * 3. Meanwhile, Xendit sends webhook to backend to confirm payment
 * 4. This page polls the cart/payment status until payment is confirmed
 * 5. Once confirmed, place the order and redirect to order confirmation page
 * 
 * Note: The cart_id is passed as a URL parameter from the success_redirect_url
 */
export default function CallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing your payment...");
  const [attempts, setAttempts] = useState(0);

  const cartId = searchParams.get("cart_id");

  useEffect(() => {
    if (!cartId) {
      setStatus("error");
      setMessage("Invalid callback - missing cart information");
      return;
    }

    const MAX_ATTEMPTS = 30; // 30 attempts * 2 seconds = 60 seconds max wait
    const POLL_INTERVAL = 2000; // Poll every 2 seconds

    const pollPaymentStatus = async () => {
      try {
        // Check the cart's payment status
        const response = await fetch(`/api/cart/${cartId}`);
        
        if (!response.ok) {
          // Cart might have been converted to order already
          if (response.status === 404) {
            setStatus("success");
            setMessage("Payment confirmed! Redirecting to your orders...");
            setTimeout(() => {
              const countryCode = window.location.pathname.split('/')[1];
              router.push(`/${countryCode}/account/orders`);
            }, 1500);
            return true;
          }
          throw new Error('Failed to fetch cart');
        }

        const data = await response.json();
        const cart = data.cart;
        
        if (!cart) {
          // Cart not found, likely converted to order
          setStatus("success");
          setMessage("Payment confirmed! Redirecting to your orders...");
          setTimeout(() => {
            const countryCode = window.location.pathname.split('/')[1];
            router.push(`/${countryCode}/account/orders`);
          }, 1500);
          return true;
        }

        // Check if payment has been authorized
        const paymentCollection = cart.payment_collection;
        const paymentSession = paymentCollection?.payment_sessions?.[0];
        
        if (paymentSession?.status === "authorized") {
          // Payment is authorized, try to complete the order
          setMessage("Payment confirmed! Completing your order...");
          
          try {
            const completeResponse = await fetch(`/api/cart/${cartId}/complete`, {
              method: 'POST',
            });
            
            if (completeResponse.ok) {
              const completeData = await completeResponse.json();
              
              if (completeData.type === 'order') {
                setStatus("success");
                setMessage("Order completed! Redirecting...");
                const countryCode = completeData.order.shipping_address?.country_code?.toLowerCase() || 
                                  window.location.pathname.split('/')[1];
                setTimeout(() => {
                  router.push(`/${countryCode}/order/${completeData.order.id}/confirmed`);
                }, 1000);
                return true;
              }
            }
          } catch (completeError) {
            console.error("Error completing order:", completeError);
            // Continue polling
          }
        }

        // If we've exhausted attempts, show error
        if (attempts >= MAX_ATTEMPTS) {
          setStatus("error");
          setMessage(
            "Payment processing is taking longer than expected. Please check your orders or contact support."
          );
          setTimeout(() => {
            const countryCode = window.location.pathname.split('/')[1];
            router.push(`/${countryCode}/account/orders`);
          }, 5000);
          return true;
        }

        setAttempts(prev => prev + 1);
        return false;
      } catch (error) {
        console.error("Error polling payment status:", error);
        
        // If we've hit max attempts, show error
        if (attempts >= MAX_ATTEMPTS) {
          setStatus("error");
          setMessage("Unable to verify payment. Please check your orders or contact support.");
          setTimeout(() => {
            const countryCode = window.location.pathname.split('/')[1];
            router.push(`/${countryCode}/account/orders`);
          }, 5000);
          return true;
        }
        
        setAttempts(prev => prev + 1);
        return false;
      }
    };

    const intervalId = setInterval(async () => {
      const shouldStop = await pollPaymentStatus();
      if (shouldStop) {
        clearInterval(intervalId);
      }
    }, POLL_INTERVAL);

    // Initial poll
    pollPaymentStatus();

    return () => clearInterval(intervalId);
  }, [cartId, router, attempts]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      {status === "loading" && (
        <>
          <Spinner className="animate-spin h-12 w-12 text-ui-fg-base mb-4" />
          <Text className="text-xl mb-2">{message}</Text>
          <Text className="text-sm text-ui-fg-subtle">
            Please wait while we confirm your payment...
          </Text>
          <Text className="text-xs text-ui-fg-muted mt-2">
            This usually takes a few seconds
          </Text>
        </>
      )}

      {status === "success" && (
        <>
          <div className="h-12 w-12 mb-4 text-green-500">
            <svg fill="currentColor" viewBox="0 0 20 20" aria-label="Success">
              <title>Success</title>
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <Text className="text-xl mb-2">{message}</Text>
        </>
      )}

      {status === "error" && (
        <>
          <div className="h-12 w-12 mb-4 text-red-500">
            <svg fill="currentColor" viewBox="0 0 20 20" aria-label="Error">
              <title>Error</title>
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <Text className="text-xl mb-2">{message}</Text>
          <Text className="text-sm text-ui-fg-subtle">
            Redirecting to your orders page...
          </Text>
        </>
      )}
    </div>
  );
}
