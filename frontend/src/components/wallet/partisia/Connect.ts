
import { Rpc, TransactionPayload } from "../../../client/TransactionData";
import { serializeTransaction } from "../../../client/TransactionSerialization";
import { TransactionApi } from "../../../client/TransactionApi";
import { BigEndianByteOutput } from "@secata-public/bitmanipulation-ts";
import { ec  as Elliptic} from "elliptic";
import { CLIENT } from "../../../AppState";
import { ConnectedWallet } from "../../../ConnectedWallet";
import { CryptoUtils } from "../../../client/CryptoUtils";
const ec = new Elliptic('secp256k1')


export const connectPrivateKey = async (sender: string, keyPair: Elliptic.KeyPair): Promise<ConnectedWallet> => {
    return {
      address: sender,
      signMessage: async(msg,callback):Promise<string> =>{
        return CLIENT.getAccountData(sender).then((accountData) => {
          
          if (accountData == null) {
            throw new Error("Account data was null");
          }
          // Account data was fetched, build and serialize the transaction
          // data.
          const msgBuffer = Buffer.from(msg,'utf8');
          const hash = CryptoUtils.hashBuffers([
            msgBuffer,
          ]);
          const signature = keyPair.sign(hash);
          console.log("recid",signature.recoveryParam);
           console.log(signature.r.toString("hex"));
          console.log(signature.s.toString("hex"));
          // signature.r.toBuffer().map(m=>sig.push(m));
          // signature.s.toBuffer().map(m=>sig.push(m));
          const sigHash=signature.r.toString("hex").padStart(64,"0")+signature.s.toString("hex").padStart(64,"0");
          console.log("sigHash",sigHash);
          console.log("verify",ec.keyFromPublic("03219f38b6f3c9a73bae4292af72770457378749d9e8f9f5f0f18e924aa9c6e7fe","hex").verify(hash,signature));
          console.log("sig",signature.toDER("hex"),signature.toDER());
          
          if(callback) callback(signature.toDER("hex"),hash.toString('hex'));
          return signature;
        }).catch((e)=>{
          console.log("error1",e);
          return e;
        });
      },
      signAndSendTransaction: (payload: TransactionPayload<Rpc>, cost = 0) => {
        // To send a transaction we need some up-to-date account information, i.e. the
        // current account nonce.
        return CLIENT.getAccountData(sender).then((accountData) => {
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
          const hash = CryptoUtils.hashBuffers([
            serializedTx,
            BigEndianByteOutput.serialize((out) => out.writeString("Partisia Blockchain Testnet")),
          ]);
          const signature = keyPair.sign(hash);
  
          // Serialize transaction for sending
          const transactionPayload = Buffer.concat([
            CryptoUtils.signatureToBuffer(signature),
            serializedTx,
          ]);
  
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
        });
      },
    };
  };
