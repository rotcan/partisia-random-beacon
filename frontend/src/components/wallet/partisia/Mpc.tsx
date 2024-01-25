import { Dispatch, SetStateAction } from "react";
import { ConnectedWallet } from "../../../ConnectedWallet";
import PartisiaSdk from "partisia-sdk";
import { CLIENT } from "../../../AppState";
import { partisiaCrypto } from 'partisia-crypto'
import { serializeTransaction } from "../../../client/TransactionSerialization";
import { TransactionApi } from "../../../client/TransactionApi";


export const connectMpcWallet = async() : Promise<ConnectedWallet> => {
    // Call Partisia SDK to initiate connection
    const partisiaSdk = new PartisiaSdk();
    // handleWalletConnect(
     return partisiaSdk
        .connect({
          // eslint-disable-next-line
          permissions: ["sign" as any],
          dappName: "Wallet integration demo",
          chainId: "Partisia Blockchain Testnet",
        })
        .then(() => {
          const connection = partisiaSdk.connection;
          if (connection != null) {
            // User connection was successful. Use the connection to build up a connected wallet
            // in state.
            const userAccount: ConnectedWallet = {
              address: connection.account.address,
              signMessage: async(msg,callback):Promise<string> =>{
                return CLIENT.getAccountData(connection.account.address).then((accountData) => {
                  console.log("pubkey",connection.account.pub);
                  if (accountData == null) {
                    throw new Error("Account data was null");
                  }
                  // Account data was fetched, build and serialize the transaction
                  // data.
                  // const obj={
                  //   payload: msg,
                  //   payloadType: "utf8" as  'utf8' | 'hex' | 'hex_payload',
                  //   dontBroadcast: false,
                  // };
                  //console.log("signMessage obj 2 ",bson.serialize(obj));
                  const hd = partisiaCrypto.wallet.getKeyPairHD(partisiaCrypto.wallet.entropyToMnemonic(partisiaSdk.seed), 0)
                  console.log("hd2",hd);
                  partisiaSdk
                  .signMessage({
                    payload: msg,
                    payloadType: "utf8" as  'utf8' | 'hex' | 'hex_payload',
                    dontBroadcast: false,
                  }) .then((value) => {
                    console.log("value",value);
                    try{
                      const test="3d000000027061796c6f616400050000007465737400027061796c6f6164547970650005000000757466380008646f6e7442726f616463617374000000";
                    console.log("verify",partisiaCrypto.wallet.verifySignature(Buffer.from(test, 'hex'),value.signature,hd.publicKey));
                    }catch(e2){
                      console.log("verify error",e2);
                    }
                    if(callback) callback(value.signature,value.digest);
                    return value.signature;
                  }).catch(( ) => (
                    
                     {
                    putSuccessful: false,
                  }));
                }).catch((e)=>{
                  console.log("error1",e);
                  return e;
                });
  
              },
              signAndSendTransaction: (payload, cost = 0) => {
                // To send a transaction we need some up-to-date account information, i.e. the
                // current account nonce.
                return CLIENT.getAccountData(connection.account.address).then((accountData) => {
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
                  // Ask the MPC wallet to sign and send the transaction.
                  return partisiaSdk
                    .signMessage({
                      payload: serializedTx.toString("hex"),
                      payloadType: "hex",
                      dontBroadcast: false,
                    })
                    .then((value) => {
                      return {
                        putSuccessful: true,
                        shard: CLIENT.shardForAddress(connection.account.address),
                        transactionHash: value.trxHash,
                      };
                    })
                    .catch(() => ({
                      putSuccessful: false,
                    }));
                });
              },
            };
            return userAccount;
          } else {
            throw new Error("Unable to establish connection to MPC wallet");
          }
        })
        .catch((error) => {
          // Something went wrong with the connection.
          if (error instanceof Error) {
            if (error.message === "Extension not Found") {
              throw new Error("Partisia Wallet Extension not found.");
            } else if (error.message === "user closed confirm window") {
              throw new Error("Sign in using MPC wallet was cancelled");
            } else if (error.message === "user rejected") {
              throw new Error("Sign in using MPC wallet was rejected");
            } else {
              throw error;
            }
          } else {
            throw new Error(error);
          }
        })
    // );
  };

  

  interface Props{
    handleConnection: (connect: Promise<ConnectedWallet>, callback?:  ((cw: ConnectedWallet)=>void ) , showStatus?: boolean,clearState? : boolean )=>void,
    callback: ((cw: ConnectedWallet)=>void ) | undefined,
  }

const MpcWallet=(props: Props)=>{
    const click=async(  )=>{
       //console.log("click")
        props.handleConnection(connectMpcWallet(),props.callback, props.callback ? true : false, props.callback ? true : false);
      }

    return (<>
    <div id="wallet-connect">
              <form className="pure-form">
                <button
                  className="pure-button pure-button-primary"
                  id="wallet-connect-btn"
                  onClick={(e)=>{e.preventDefault(); click();}} >Login using MPC Wallet</button>
              </form>
            </div>
    </>)
}

export default MpcWallet;