import type { Metadata } from "next";

import FeaturedProducts from "@modules/home/components/featured-products";
import Hero from "@modules/home/components/hero";
import { listCollections } from "@lib/data/collections";
import { getRegion } from "@lib/data/regions";
import { Container, Text } from "@medusajs/ui";

export const metadata: Metadata = {
  title: "Medusa Next.js Starter Template",
  description: "A performant frontend ecommerce starter template with Next.js 15 and Medusa.",
};

export default async function Home(props: {
  params: Promise<{ countryCode: string }>;
  searchParams: Promise<{ order_completed?: string; payment_processing?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { countryCode } = params;

  const region = await getRegion(countryCode);

  const { collections } = await listCollections({
    fields: "id, handle, title",
  });

  if (!collections || !region) {
    return null;
  }

  return (
    <>
      {searchParams.order_completed && (
        <Container className="max-w-4xl mx-auto my-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <Text className="text-green-800 text-lg font-medium">
            Thank you for your payment! Your order has been completed successfully.
          </Text>
          <Text className="text-green-600 mt-2">
            You will receive an order confirmation email shortly. You can view your order details in{" "}
            <a href={`/${countryCode}/account/orders`} className="underline hover:text-green-700">
              your account
            </a>{" "}
            (sign in required).
          </Text>
        </Container>
      )}
      {searchParams.payment_processing && (
        <Container className="max-w-4xl mx-auto my-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <Text className="text-blue-800 text-lg font-medium">
            Payment received! Your order is being processed.
          </Text>
          <Text className="text-blue-600 mt-2">
            Your payment has been confirmed and your order will be completed shortly. Please check
            your email or{" "}
            <a href={`/${countryCode}/account/orders`} className="underline hover:text-blue-700">
              your account
            </a>{" "}
            (sign in required) for order details.
          </Text>
        </Container>
      )}
      <Hero />
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  );
}
