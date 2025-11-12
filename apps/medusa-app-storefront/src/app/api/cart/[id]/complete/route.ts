import { sdk } from "@lib/config";
import { getAuthHeaders, getCacheTag, removeCartId } from "@lib/data/cookies";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cartId = params.id;

  try {
    const headers = {
      ...(await getAuthHeaders()),
    };

    const cartRes = await sdk.store.cart
      .complete(cartId, {}, headers)
      .then(async (cartRes) => {
        const cartCacheTag = await getCacheTag("carts");
        revalidateTag(cartCacheTag);
        return cartRes;
      });

    if (cartRes?.type === "order") {
      const orderCacheTag = await getCacheTag("orders");
      revalidateTag(orderCacheTag);
      await removeCartId();
      
      return NextResponse.json({
        type: "order",
        order: cartRes.order,
      });
    }

    return NextResponse.json({
      type: "cart",
      cart: cartRes.cart,
    });
  } catch (error) {
    console.error("Error completing cart:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete cart" },
      { status: 500 }
    );
  }
}
