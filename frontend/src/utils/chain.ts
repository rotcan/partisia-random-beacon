import type { AddEthereumChainParameter } from '@web3-react/types'
import type { Connector } from '@web3-react/types'
import { MetaMask } from '@web3-react/metamask'

type ChainConfig = { [chainId: number]: BasicChainInformation | ExtendedChainInformation }

interface BasicChainInformation {
    urls: string[]
    name: string
}
  
interface ExtendedChainInformation extends BasicChainInformation {
    nativeCurrency: AddEthereumChainParameter['nativeCurrency']
    blockExplorerUrls: AddEthereumChainParameter['blockExplorerUrls']
}
  
export const TESTNET_CHAINS: ChainConfig = {
  0x5: {
      urls: [process.env.REACT_APP_RPC_ENDPOINT!].filter(Boolean),
      name: 'Goerli',
      nativeCurrency:{name:"GoerliEth",symbol:"Eth",decimals:18}
    },
}


function isExtendedChainInformation(
    chainInformation: BasicChainInformation | ExtendedChainInformation
  ): chainInformation is ExtendedChainInformation {
    return !!(chainInformation as ExtendedChainInformation).nativeCurrency
  }
  

export function getAddChainParameters(chainId: number): AddEthereumChainParameter | number {
    const chainInformation = TESTNET_CHAINS[chainId]
    if (isExtendedChainInformation(chainInformation)) {
      return {
        chainId,
        chainName: chainInformation.name,
        nativeCurrency: chainInformation.nativeCurrency,
        rpcUrls: chainInformation.urls,
        blockExplorerUrls: chainInformation.blockExplorerUrls,
      }
    } else {
      return chainId
    }
  }

  export function getName(connector: Connector) {
    if (connector instanceof MetaMask) return 'MetaMask'
    return 'Unknown'
}

export const getTruncatedAddress=(address: string,strip0x: boolean=true, charLength:number=3)=>{
    const finalAddress=strip0x ? address.startsWith("0x") ? address.substring(2) : address : address;
    return finalAddress.substring(0,charLength)+".."+finalAddress.substring(finalAddress.length-charLength-1,finalAddress.length-1);
}