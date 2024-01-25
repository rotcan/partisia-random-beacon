import { Dispatch, SetStateAction } from "react";
import { ConnectedWallet } from "../../../ConnectedWallet";
import { MetaMask } from "../../../utils/utils";
import { CLIENT } from "../../../AppState";
import { serializeTransaction } from "../../../client/TransactionSerialization";
import { TransactionApi } from "../../../client/TransactionApi";
import { WalletState } from "./Index";

const connectMetaMask = async (): Promise<ConnectedWallet> => {
    const snapId = "npm:@partisiablockchain/snap";
  
    if ("ethereum" in window) {
      const metamask = window.ethereum as MetaMask;
  
      // Request snap to be installed and connected
      await metamask.request({
        method: "wallet_requestSnaps",
        params: {
          [snapId]: {},
        },
      });
  
      // Get the address of the user from the snap
      const userAddress: string = await metamask.request({
        method: "wallet_invokeSnap",
        params: { snapId, request: { method: "get_address" } },
      });
  
      return {
        address: userAddress,
        signMessage: async(msg) =>{
          const signature: string = await metamask.request({
            method: "wallet_invokeSnap",
            params: {
              snapId: "npm:@partisiablockchain/snap",
              request: {
                method: "sign_transaction",
                params: {
                  payload: Buffer.from(msg).toString("hex"),
                  chainId: "Partisia Blockchain Testnet",
                },
              },
            },
          });
  
  
         
          return signature;
        },
        signAndSendTransaction: async (payload, cost = 0) => {
          // To send a transaction we need some up-to-date account information, i.e. the
          // current account nonce.
          const accountData = await CLIENT.getAccountData(userAddress);
          if (accountData == null) {
            throw new Error("Account data was null");
          }
          // Account data was fetched, build and serialize the transaction
          // data.
          const serializedTx = serializeTransaction(
            {
              cost: String(cost),
              nonce: accountData.nonce,
              validTo: String(new Date().getTime() + TransactionApi.TRANSACTION_TTL),
            },
            payload
          );
  
          // Request signature from MetaMask
          const signature: string = await metamask.request({
            method: "wallet_invokeSnap",
            params: {
              snapId: "npm:@partisiablockchain/snap",
              request: {
                method: "sign_transaction",
                params: {
                  payload: serializedTx.toString("hex"),
                  chainId: "Partisia Blockchain Testnet",
                },
              },
            },
          });
  
          // Serialize transaction for sending
          const transactionPayload = Buffer.concat([Buffer.from(signature, "hex"), serializedTx]);
  
          // Send the transaction to the blockchain
          return CLIENT.putTransaction(transactionPayload).then((txPointer) => {
            if (txPointer != null) {
              return {
                putSuccessful: true,
                shard: txPointer.destinationShardId,
                transactionHash: txPointer.identifier,
              };
            } else {
              return { putSuccessful: false };
            }
          });
        },
      };
    } else {
      throw new Error("Unable to find MetaMask extension");
    }
  };

interface Props{
  handleConnection: (connect: Promise<ConnectedWallet>, callback?:  ((cw: ConnectedWallet)=>void ) , showStatus?: boolean,clearState? : boolean )=>void,
  callback: ((cw: ConnectedWallet)=>void ) | undefined,
}

const MetamaskWallet=(props: Props)=>{

  const click=async()=>{
    props.handleConnection(connectMetaMask(),props.callback, props.callback ? true : false, props.callback ? true : false);
  }
  return (
    <>
     <div id="metamask-connect">
        <form>
          <button
            className="pure-button pure-button-primary"
            id="metamask-connect-btn"
            onClick={(e)=>{e.preventDefault(); click();}}>Login using MetaMask snap</button>
        </form>
      </div>
    </>
  )
}

export default MetamaskWallet;