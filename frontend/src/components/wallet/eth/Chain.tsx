import { Web3ReactHooks } from "@web3-react/core"
import { TESTNET_CHAINS } from "../../../utils/chain"

export function Chain({ chainId }: { chainId: ReturnType<Web3ReactHooks['useChainId']> }) {
    if (chainId === undefined) return null
  
    const name = chainId ? TESTNET_CHAINS[chainId]?.name : undefined
  
    if (name) {
      return (
        <div>
          Chain:{' '}
          <b>
            {name} ({chainId})
          </b>
        </div>
      )
    }
  
    return (
      <div>
        Chain Id: <b>{chainId}</b>
      </div>
    )
  }