"use client"

import { RadioGroup } from "@headlessui/react"
import { Text, clx } from "@medusajs/ui"
import { useState } from "react"

/**
 * Xendit Payment Channel Selector
 *
 * Allows customers to select their preferred payment method from available Xendit channels.
 * Supports Indonesian payment methods including e-wallets, virtual accounts, and QR codes.
 */

export type XenditChannel = {
  code: string
  name: string
  logo?: string
  description?: string
}

// Popular Indonesian payment channels supported by Xendit
export const XENDIT_CHANNELS: XenditChannel[] = [
  {
    code: "OVO",
    name: "OVO",
    description: "E-Wallet payment with OVO",
  },
  {
    code: "DANA",
    name: "DANA",
    description: "E-Wallet payment with DANA",
  },
  {
    code: "LINKAJA",
    name: "LinkAja",
    description: "E-Wallet payment with LinkAja",
  },
  {
    code: "SHOPEEPAY",
    name: "ShopeePay",
    description: "E-Wallet payment with ShopeePay",
  },
  {
    code: "QRIS",
    name: "QRIS",
    description: "Scan QR code to pay",
  },
  {
    code: "BCA",
    name: "BCA Virtual Account",
    description: "Transfer via BCA Virtual Account",
  },
  {
    code: "BNI",
    name: "BNI Virtual Account",
    description: "Transfer via BNI Virtual Account",
  },
  {
    code: "BRI",
    name: "BRI Virtual Account",
    description: "Transfer via BRI Virtual Account",
  },
  {
    code: "MANDIRI",
    name: "Mandiri Virtual Account",
    description: "Transfer via Mandiri Virtual Account",
  },
  {
    code: "PERMATA",
    name: "Permata Virtual Account",
    description: "Transfer via Permata Virtual Account",
  },
]

type XenditPaymentProps = {
  onChannelSelect: (channelCode: string) => void
  selectedChannel?: string
}

export const XenditPayment = ({
  onChannelSelect,
  selectedChannel,
}: XenditPaymentProps) => {
  const [selected, setSelected] = useState(selectedChannel || "")

  const handleSelect = (channelCode: string) => {
    setSelected(channelCode)
    onChannelSelect(channelCode)
  }

  return (
    <div className="space-y-4">
      <Text className="text-base font-medium">Select Payment Method</Text>

      <RadioGroup value={selected} onChange={handleSelect}>
        <div className="space-y-2">
          {XENDIT_CHANNELS.map((channel) => (
            <RadioGroup.Option
              key={channel.code}
              value={channel.code}
              className={({ checked }) =>
                clx(
                  "relative flex cursor-pointer rounded-lg border px-5 py-4 shadow-sm focus:outline-none",
                  {
                    "border-ui-fg-interactive bg-ui-bg-base-hover": checked,
                    "border-ui-border-base bg-ui-bg-base": !checked,
                  }
                )
              }
            >
              {({ checked }) => (
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-sm">
                      <RadioGroup.Label
                        as="p"
                        className={clx("font-medium", {
                          "text-ui-fg-base": checked,
                          "text-ui-fg-subtle": !checked,
                        })}
                      >
                        {channel.name}
                      </RadioGroup.Label>
                      {channel.description && (
                        <RadioGroup.Description
                          as="span"
                          className={clx("inline text-xs", {
                            "text-ui-fg-subtle": checked,
                            "text-ui-fg-muted": !checked,
                          })}
                        >
                          {channel.description}
                        </RadioGroup.Description>
                      )}
                    </div>
                  </div>
                  {checked && (
                    <div className="shrink-0 text-ui-fg-interactive">
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-label="Selected"
                      >
                        <title>Selected</title>
                        <circle
                          cx={12}
                          cy={12}
                          r={12}
                          fill="currentColor"
                          opacity="0.2"
                        />
                        <path
                          d="M7 13l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>
    </div>
  )
}
