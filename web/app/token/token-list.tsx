import { getEthAddress, getIpfsUrl } from "@/lib/utils"
import { TokenLogo } from "./token-logo"
import { useAccount } from "wagmi"
import { Address, formatEther } from "viem"
import { useERC20Balances } from "@/lib/tcr/use-erc20-balances"
import { formatUSDValue, useETHPrice } from "./hooks/useETHPrice"
import { useSellTokenQuote } from "./hooks/useSellTokenQuote"
import { base } from "viem/chains"

const chainId = base.id

interface TokenData {
  address: string | undefined
  name: string | undefined
  symbol: string | undefined
  image: string | undefined
  tagline: string | undefined
  tokenEmitter: string | undefined
}

interface TokenListProps {
  tokens: TokenData[] | undefined
  currentToken: Address | undefined
  currentTokenEmitter: Address | undefined
  switchToken: (token: Address, tokenEmitter: Address) => void
}

export const TokenList = ({
  tokens,
  currentToken,
  currentTokenEmitter,
  switchToken,
}: TokenListProps) => {
  const { address: owner } = useAccount()
  const { balances } = useERC20Balances(
    tokens?.map((token) => getEthAddress(token.address as Address)) || [],
    owner,
  )
  const { ethPrice } = useETHPrice()

  return (
    <ul>
      {tokens?.map((token, index) => (
        <TokenListItem
          key={token.address}
          token={token}
          onClick={() =>
            switchToken(
              getEthAddress(token.address as Address),
              getEthAddress(token.tokenEmitter as Address),
            )
          }
          currentToken={currentToken}
          currentTokenEmitter={currentTokenEmitter}
          balance={balances[index]}
          ethPrice={ethPrice || 0}
        />
      ))}
    </ul>
  )
}

const TokenListItem = ({
  token,
  balance,
  ethPrice,
  onClick,
  currentToken,
  currentTokenEmitter,
}: {
  token: TokenData
  balance: bigint
  ethPrice: number
  onClick: () => void
  currentToken: Address | undefined
  currentTokenEmitter: Address | undefined
}) => {
  const { payment, isLoading: isLoadingQuote } = useSellTokenQuote(
    getEthAddress(currentTokenEmitter || ""),
    balance,
    chainId,
  )

  return (
    <li onClick={onClick}>
      <div className="flex cursor-pointer flex-row items-center justify-between rounded-md px-3 py-4 hover:bg-gray-200">
        <div className="flex items-center gap-3">
          <TokenLogo height={45} width={45} src={getIpfsUrl(token.image || "")} alt="TCR token" />
          <div className="flex flex-col items-start justify-between">
            <span className="text-xl">{token.name}</span>
            <span className="text-sm opacity-50">{token.symbol}</span>
          </div>
        </div>
        {balance && (
          <div className="flex flex-col items-end justify-between">
            <span className="text-xl">{formatUSDValue(ethPrice || 0, payment)}</span>
            <span className="text-sm opacity-50">{formatEther(balance)}</span>
          </div>
        )}
      </div>
    </li>
  )
}