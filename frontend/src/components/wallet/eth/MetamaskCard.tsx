import { useEffect, useState } from "react";
import { hooks, metaMask } from "../../../connectors/metamask";
import { Card } from "./Card";
import { TESTNET_CHAINS, getAddChainParameters } from "../../../utils/chain";
const {
  useChainId,
  useAccounts,
  useENSName,
  useIsActivating,
  useAccount,
  useIsActive,
  useProvider,
  useENSNames,
} = hooks;

export default function MetaMaskCard() {
  const chainId = useChainId();
  const isActivating = useIsActivating();
  const account = useAccount();
  const isActive = useIsActive();

  const provider = useProvider();
  const ENSName = useENSName(provider);

  const [error, setError] = useState<Error | undefined>(undefined);

  const connect=()=>{
    const chainId=parseInt(process.env.REACT_APP_CHAIN_ID!,16) as number;
    console.log("ChainId",chainId);
    void metaMask.activate(getAddChainParameters(chainId))
    void metaMask
      .connectEagerly()
      .then(() => {
        console.log("Card metamask connect", provider);
        provider?.getNetwork().then((r) => {
          console.log("provider?.network.chainId", r);
          
        });
      })
      .catch((e) => {
        console.log("Card metamask connect error", e);
        console.debug("Failed to connect eagerly to metamask");
      });
  }
  // attempt to connect eagerly on mount
  useEffect(() => {
   
  }, []);

  return (
    <Card
      connector={metaMask}
      activeChainId={chainId}
      isActivating={isActivating}
      isActive={isActive}
      error={error}
      account={account}
      provider={provider}
      ENSName={ENSName}
      setError={setError}
    />
  );
}