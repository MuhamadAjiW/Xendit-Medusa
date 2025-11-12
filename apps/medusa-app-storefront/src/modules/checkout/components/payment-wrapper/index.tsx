"use client"

import { loadStripe } from "@stripe/stripe-js"
import type React from "react"
import StripeWrapper from "./stripe-wrapper"
import type { HttpTypes } from "@medusajs/types"
import { isStripeLike, isXendit } from "@lib/constants"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

const stripeKey =
  process.env.NEXT_PUBLIC_STRIPE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY

const medusaAccountId = process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID
const stripePromise = stripeKey
  ? loadStripe(
      stripeKey,
      medusaAccountId ? { stripeAccount: medusaAccountId } : undefined
    )
  : null

const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ cart, children }) => {
  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  // Stripe/Medusa Payments integration
  if (
    isStripeLike(paymentSession?.provider_id) &&
    paymentSession &&
    stripePromise
  ) {
    return (
      <StripeWrapper
        paymentSession={paymentSession}
        stripeKey={stripeKey}
        stripePromise={stripePromise}
      >
        {children}
      </StripeWrapper>
    )
  }

  // Xendit doesn't need a special wrapper
  // Payment is handled directly via API calls and redirects
  if (isXendit(paymentSession?.provider_id)) {
    return <div>{children}</div>
  }

  return <div>{children}</div>
}

export default PaymentWrapper
