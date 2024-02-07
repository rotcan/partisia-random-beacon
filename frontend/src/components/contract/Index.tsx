import { Context, Dispatch, SetStateAction, createContext, useState } from "react";
import { ConnectedWallet } from "../../ConnectedWallet";
import Rng from "./Rng";
import Whitelist from "./Raffle/Whitelist";
import Nft from "./Nft";
import { Container, Grid } from "@mui/material";
import { RngContractState } from "../../contract/RandomGenerated";

export interface RawContractData {
  state: { data: string };
}


/** dto of an engine in the zk contract object. */
interface Engine {
  /** Address of the engine. */
  identity: string;
  /** Public key of the engine encoded in base64. */
  publicKey: string;
  /** Rest interface of the engine. */
  restInterface: string;
}

/** A subset of a Zk variable on chain. */
interface ZkVariable {
  id: number;
  information: { data: string };
  owner: string;
  transaction: string;
}


export interface RawZkContractData {
  engines: { engines: Engine[] };
  openState: { openState: { data: string } };
  variables: Array<{ key: number; value: ZkVariable }>;
}

export interface TransactionData {
  hash: string | undefined,
  error: string | undefined,
}

export const defaultTransactionState = (): TransactionData => {
  return { error: undefined, hash: undefined };
}


export interface NextValueVars {
  rangeStart: string,
  rangeEnd: string,
  count: number,

}

export interface WalletLimit{
  rangeStart: string,
  rangeEnd: string,
}

const defaultNextValueVars = (): NextValueVars => {
  return { id: "1", count: 1, rangeStart: "1", rangeEnd: "100" } as NextValueVars;
}
interface Props {
  connectedWallet: ConnectedWallet;
  adminWallet: ConnectedWallet | undefined;
}

interface ContextProps {
  nextValueVars: NextValueVars | undefined;
  setNextValueVars: Dispatch<SetStateAction<NextValueVars>>; 
  finalHash: string,
  setFinalHash: Dispatch<SetStateAction<string>>; 
  merkleRoot: string,
  setMerkleRoot: Dispatch<SetStateAction<string>>; 
  useRaffle: boolean,
  setUseRaffle: Dispatch<SetStateAction<boolean>>; 
  setWalletLimit:Dispatch<SetStateAction<WalletLimit>>;
  walletLimit: WalletLimit,
  pbcContractState: RngContractState | undefined,
  setPbcContractState: Dispatch<SetStateAction<RngContractState | undefined>>;
  selectedRngIndex: number | undefined,
  setSelectedRngIndex: Dispatch<SetStateAction<number | undefined>>;
}

export const ContractContext=createContext<ContextProps>({nextValueVars: defaultNextValueVars(),setNextValueVars: ()=>{},
finalHash: "",setFinalHash:()=>{},useRaffle:true,setUseRaffle:()=>{},walletLimit:{rangeEnd:"1",rangeStart:"0"},setWalletLimit: ()=>{},
pbcContractState: undefined, setPbcContractState: ()=>{},selectedRngIndex: undefined,setSelectedRngIndex: ()=>{},
merkleRoot: "",setMerkleRoot : ()=>{}});

const Contract = (props: Props) => {
  const [finalHash,setFinalHash]=useState<string>("");
  const [merkleRoot,setMerkleRoot]=useState<string>("");
  const [nextValueVars, setNextValueVars] = useState<NextValueVars>(defaultNextValueVars());
  const [useRaffle, setUseRaffle] = useState<boolean>(true);
  const [walletLimit,setWalletLimit]=useState<WalletLimit>({rangeEnd:"1",rangeStart:"0"});
  const [pbcContractState,setPbcContractState]=useState<RngContractState>();
  const [selectedRngIndex,setSelectedRngIndex]=useState<number | undefined>();
   
  return (<>
  <ContractContext.Provider value={{
    nextValueVars,setNextValueVars,finalHash,setFinalHash,useRaffle,setUseRaffle,
    setWalletLimit,walletLimit,pbcContractState,setPbcContractState,selectedRngIndex,setSelectedRngIndex,
    merkleRoot,setMerkleRoot
  }}>
    <Container maxWidth="xl">
      <Grid container spacing={2} direction={"row"} >
        <Grid item xs>
          <Rng connectedWallet={props.connectedWallet} contractAddress={process.env.REACT_APP_RNG_CONTRACT} finalHash={finalHash}
          // nextValueVars={nextValueVars} setNextValueVars={setNextValueVars} 
          />
        </Grid>
        <Grid item xs>
          <Nft  />
        </Grid>
      </Grid>
    </Container>
    </ContractContext.Provider>
  </>)
}

export default Contract;