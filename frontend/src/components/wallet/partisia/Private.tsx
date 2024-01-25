import { Dispatch, SetStateAction, useState } from "react";
import { ConnectedWallet } from "../../../ConnectedWallet";
import { CryptoUtils } from "@partisiablockchain/zk-client";
import { connectPrivateKey } from "./Connect";



  interface Props{
    handleConnection: (connect: Promise<ConnectedWallet>, callback?:  ((cw: ConnectedWallet)=>void ) , showStatus?: boolean,clearState? : boolean )=>void,
    callback: ((cw: ConnectedWallet)=>void ) | undefined,
 }

const PrivateWallet=(props:Props)=>{

    const [privateKeyValue,setPrivateKeyValue]=useState<string | undefined>("954b4c92606737f41bdced17b2c1dbcc5ac6f1c19b0f683115f465d2117a2e62");
    
    const click=async()=>{
        if(privateKeyValue){
            const keyPair = CryptoUtils.privateKeyToKeypair(privateKeyValue);
            const sender = CryptoUtils.keyPairToAccountAddress(keyPair);
            props.handleConnection(connectPrivateKey(sender,keyPair), props.callback, props.callback ? true :false, props.callback ? true : false);
        }
    }

    return (<><div id="private-key-connect">
              <form onSubmit={()=>{return false;}} className="pure-form">
                <button
                  className="pure-button pure-button-primary"
                  id="private-key-connect-btn"
                  onClick={(e)=>{e.preventDefault(); click();}}
                  >Login using private key</button>
                <input id="private-key-value" name="private-key-value" type="password"  defaultValue={privateKeyValue}
                onChange={(e)=>{setPrivateKeyValue(e.target.value)}}
                />
              </form>
            </div></>)
}

export default PrivateWallet;