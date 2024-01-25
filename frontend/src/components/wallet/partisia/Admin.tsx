import { useState } from "react";
import { CryptoUtils } from "../../../client/CryptoUtils";
import { KEY_ADMIN } from "../../../utils/utils";
import { ConnectedWallet } from "../../../ConnectedWallet";
import { connectPrivateKey } from "./Connect";

interface Props{
    handleConnection: (connect: Promise<ConnectedWallet>, callback?:  ((cw: ConnectedWallet)=>void ) , showStatus?: boolean,clearState? : boolean )=>void,
    callback: ((cw: ConnectedWallet)=>void ) | undefined,
    connected: boolean,
    disconnect: ()=>void,
  }
  

const AdminWallet=(props: Props)=>{
    const [privateKey,setPrivateKey]=useState<string | undefined>(process.env.REACT_APP_ADMIN_KEY);

    const getPubkey=()=>{
        if(privateKey){
            const keyPair = CryptoUtils.privateKeyToKeypair(privateKey);
            const sender = CryptoUtils.keyPairToAccountAddress(keyPair);
            return sender
        }
        return undefined;
    }

    const updatePrivateKey=()=>{
        if(privateKey){
            localStorage.setItem(KEY_ADMIN,privateKey);
            const keyPair = CryptoUtils.privateKeyToKeypair(privateKey);
            const sender = CryptoUtils.keyPairToAccountAddress(keyPair);
            props.handleConnection(connectPrivateKey(sender,keyPair),props.callback,  false,false);
        }
    }

    return (<>
    <div>
    <input type="password" 
    defaultValue={process.env.REACT_APP_ADMIN_KEY}
    onChange={(e)=>{setPrivateKey(e.target.value)}} 
    onBlur={(e)=>{setPrivateKey(e.target.value)}}
    />
    {!props.connected ? <button onClick={(e)=>{e.preventDefault();updatePrivateKey()}}>Set Admin Private Key</button>
    : <button onClick={(e)=>{e.preventDefault();props.disconnect()}}>Disconnect</button>}
    </div>
    {privateKey && <div>Public Key= {getPubkey()} </div>}
    </>)
}

export default AdminWallet;