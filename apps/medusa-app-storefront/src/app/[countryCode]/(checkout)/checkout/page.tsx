import { retrieveCart } from "@lib/data/cart";
import { retrieveCustomer } from "@lib/data/customer";
import PaymentWrapper from "@modules/checkout/components/payment-wrapper";
import CheckoutForm from "@modules/checkout/templates/checkout-form";
import CheckoutSummary from "@modules/checkout/templates/checkout-summary";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Checkout",
};

type Props = {
  params: Promise<{ countryCode: string }>;
  searchParams: Promise<{ step?: string; status?: string }>;
};

export default async function Checkout(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  // Handle Xendit payment success callback
  if (searchParams.step === "success") {
    // Check if there's a completed order by trying to retrieve the cart
    const cart = await retrieveCart();

    // If no cart found, it means the order was completed successfully
    // Redirect to the homepage or a generic success page
    if (!cart) {
      return redirect(`/${params.countryCode}/?order_completed=true`);
    }

    // If cart still exists, check if it has been converted to an order via webhook
    // This might take a moment, so show a loading/processing state
    // For now, redirect to homepage with a success message
    return redirect(`/${params.countryCode}/?payment_processing=true`);
  }

  const cart = await retrieveCart();

  if (!cart) {
    return notFound();
  }

  const customer = await retrieveCustomer();

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <PaymentWrapper cart={cart}>
        <CheckoutForm cart={cart} customer={customer} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} />
    </div>
  );
}
