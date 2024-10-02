"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { tokenEmitterImplAbi } from "@/lib/abis"
import { useTcrToken } from "@/lib/tcr/use-tcr-token"
import { getEthAddress, getIpfsUrl } from "@/lib/utils"
import { useContractTransaction } from "@/lib/wagmi/use-contract-transaction"
import { Grant } from "@prisma/client"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { formatEther, zeroAddress } from "viem"
import { base } from "viem/chains"
import { useAccount, useBalance } from "wagmi"
import { useBuyTokenQuoteWithRewards } from "./hooks/useBuyTokenQuote"
import { Label } from "@/components/ui/label"
import Image from "next/image"

interface Props {
  flow: Grant
  defaultTokenAmount: bigint
}

const chainId = base.id

export function BuyTokenButton(props: Props) {
  const { flow, defaultTokenAmount } = props
  const { address } = useAccount()
  const { data: balance } = useBalance({ address })
  const ref = useRef<HTMLButtonElement>(null)
  const [tokenAmount, _setTokenAmount] = useState((Number(defaultTokenAmount) / 1e18).toString())
  const [tokenAmountBigInt, _setTokenAmountBigInt] = useState(defaultTokenAmount)

  const token = useTcrToken(getEthAddress(flow.erc20), getEthAddress(flow.tcr), chainId)

  const { totalCost: oneTokenCostWithRewards, isLoading: isLoadingRewardsQuote } =
    useBuyTokenQuoteWithRewards(getEthAddress(flow.tokenEmitter), tokenAmountBigInt, chainId)

  const { prepareWallet, writeContract, toastId, isLoading } = useContractTransaction({
    chainId,
    success: "Tokens purchased successfully!",
    onSuccess: async (hash) => {
      ref.current?.click() // close dialog
      // wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000))
    },
  })

  const setTokenAmount = (value: string) => {
    _setTokenAmount(value)
    _setTokenAmountBigInt(BigInt(Math.trunc(Number(value) * 1e18) || "0"))
  }

  const tokenSymbol = token.symbol?.toLowerCase()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" ref={ref}>
          Buy {token.symbol}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-screen-xs">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-medium">
            Buy {token.name} TCR token
          </DialogTitle>
        </DialogHeader>
        <ul className="my-4 space-y-6">
          <li className="flex items-start space-x-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
              1
            </span>
            <p>
              The price of ${tokenSymbol} fluctuates based on supply and demand according to an S
              shaped{" "}
              <a
                href="https://github.com/rocketman-21/flow-contracts/blob/main/src/token-issuance/BondingSCurve.sol"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                bonding curve
              </a>
              . View a visualization{" "}
              <a
                href="https://www.desmos.com/calculator/tnhqeskyi3"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                here
              </a>
              .
            </p>
          </li>
        </ul>
        <div className="space-y-2 rounded-3xl bg-white p-1.5 dark:bg-black">
          <ConversionBox label="Buy">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <CurrencyInput
                  id="amount"
                  name="amount"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                />
                <CurrencyDisplay>
                  <TokenLogo src={getIpfsUrl(flow.image)} alt="TCR token" />
                  <span className="px-1">{token.symbol}</span>
                </CurrencyDisplay>
              </div>
              <Balance balance={token.balance} />
            </div>
          </ConversionBox>

          <ConversionBox label="Sell">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <CurrencyInput
                  id="cost"
                  name="cost"
                  value={Number(formatEther(oneTokenCostWithRewards)).toFixed(12)}
                  disabled
                  className={cn("disabled:text-black", {
                    "opacity-50": isLoadingRewardsQuote,
                    "disabled:opacity-100": !isLoadingRewardsQuote,
                  })}
                />
                <CurrencyDisplay>
                  <TokenLogo src="/eth.png" alt="ETH" />
                  <span className="px-1">ETH</span>
                </CurrencyDisplay>
              </div>
              <Balance balance={balance?.value || BigInt(0)} />
            </div>
          </ConversionBox>
          <div className="mt-4 w-full">
            <Button
              className="w-full rounded-2xl py-7 text-xl font-normal tracking-wide"
              disabled={isLoading}
              loading={isLoading}
              type="button"
              onClick={async () => {
                try {
                  await prepareWallet()

                  console.log(
                    "buyToken",
                    address,
                    tokenAmountBigInt,
                    BigInt(Math.trunc(Number(oneTokenCostWithRewards) * 1.1)),
                    {
                      builder: zeroAddress,
                      purchaseReferral: zeroAddress,
                    },
                  )

                  writeContract({
                    account: address,
                    abi: tokenEmitterImplAbi,
                    functionName: "buyToken",
                    address: getEthAddress(flow.tokenEmitter),
                    chainId,
                    args: [
                      address as `0x${string}`,
                      tokenAmountBigInt,
                      BigInt(Math.trunc(Number(oneTokenCostWithRewards) * 1.1)),
                      {
                        builder: zeroAddress,
                        purchaseReferral: zeroAddress,
                      },
                    ],
                    value: BigInt(Math.trunc(Number(oneTokenCostWithRewards) * 1.1)),
                  })
                } catch (e: any) {
                  toast.error(e.message, { id: toastId })
                }
              }}
            >
              Swap
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const Balance = ({ balance }: { balance: bigint }) => {
  const formattedBalance = Number(formatEther(balance))
  const displayBalance =
    formattedBalance < 0.1 && formattedBalance !== 0
      ? formattedBalance.toFixed(3)
      : formattedBalance.toString()
  return (
    <p className="whitespace-nowrap text-right text-xs text-gray-500">Balance: {displayBalance}</p>
  )
}

const TokenLogo = ({
  src,
  alt,
  className = "",
}: {
  src: string
  alt: string
  className?: string
}) => <Image src={src} alt={alt} className={`rounded-full ${className}`} width={22} height={22} />

const CurrencyInput = ({
  id,
  name,
  value,
  onChange,
  disabled = false,
  className = "",
}: {
  id: string
  name: string
  value: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  className?: string
}) => (
  <input
    id={id}
    name={name}
    value={value}
    onChange={onChange}
    autoFocus={false}
    disabled={disabled}
    className={`flex h-10 w-full appearance-none rounded-md border-none bg-transparent px-0 py-1 text-3xl font-medium shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  />
)

const CurrencyDisplay = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-shrink-0 items-center space-x-0.5 rounded-full bg-white px-2 py-1 text-xl font-medium shadow-sm dark:border-black">
    {children}
  </div>
)

const ConversionBox = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-2xl bg-gray-100 p-4">
    <Label htmlFor={label.toLowerCase()} className="text-sm font-medium text-gray-500">
      {label}
    </Label>
    <div className="mt-1">{children}</div>
  </div>
)
