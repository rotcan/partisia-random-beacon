import { Dispatch, SetStateAction } from "react";
import Whitelist from "./Raffle/Whitelist";
import { NextValueVars } from "./Index";
import Raffle from "./Raffle/Index";
import { MetaMask } from "@web3-react/metamask";
import { metaMask, hooks as metaMaskHooks } from "../../connectors/metamask";
import { Web3ReactHooks, Web3ReactProvider } from "@web3-react/core";
interface Props{
    
}
const connectors: [MetaMask, Web3ReactHooks][] = [[metaMask, metaMaskHooks]];
const Nft=(props: Props)=>{

    return (<>
    <Web3ReactProvider connectors={connectors}>
    <Raffle address={process.env.REACT_APP_RAFFLE_CONTRACT} endpoint={process.env.REACT_APP_RPC_ENDPOINT}/>
    </Web3ReactProvider>
    </>)
}

export default Nft;