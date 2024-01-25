import { useState } from "react";
import { ConnectedWallet } from "../../ConnectedWallet";
import Rng from "./Rng";
import Whitelist from "./Whitelist";
import Nft from "./Nft";
import { Container, Grid } from "@mui/material";

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

interface Props {
  connectedWallet: ConnectedWallet;
  adminWallet: ConnectedWallet | undefined;
}
const Contract = (props: Props) => {


  return (<>
    <Container maxWidth="xl">
      <Grid container spacing={2} >
        <Grid item xs>
          <Rng connectedWallet={props.connectedWallet} contractAddress={process.env.REACT_APP_RNG_CONTRACT} />
        </Grid>
        <Grid item xs>
          <Nft />
        </Grid>
      </Grid>
    </Container>
  </>)
}

export default Contract;