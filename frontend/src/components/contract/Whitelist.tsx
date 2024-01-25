import { useMemo, useState } from "react";
import UserList from "./UserList";
import MerkleTree from "merkletreejs";
import { keccak256, ethers } from "ethers";
import { getPvtKeys, wrapText } from "../../utils/utils";
import keys from "../../keys/pvk.json";
import { Button, Paper } from "@mui/material";
import ContentPasteIcon from '@mui/icons-material/ContentPaste';

interface AddressProof{
    proof: string | undefined,
    address: string | undefined,
    index: string | undefined,
}

const getDefaultProof=()=>{
    return {address: undefined, index:undefined,proof: undefined} as AddressProof;
}

const Whitelist=()=>{

    const [data,setData]=useState<string[]>([]);
    const [merkleTree,setMerkleTree]=useState<MerkleTree>();
    const [itemProof,setItemProof]=useState<AddressProof>(getDefaultProof());
    const [walletCount,setWalletCount]=useState<string>("20");
    const [finalHash,setFinalHash]=useState<string>("");

    const generateMerkleRoot=()=>{
        ;
        const leafNodes=data.map((m,index)=>
        // keccak256(
        //      ethers.solidityPacked(["address","uint256"], [ m.toLowerCase(),index])
        // )    
        ethers.solidityPackedKeccak256(["string","uint256"], [m.toLowerCase(),index])
        )
        const mt=new MerkleTree(leafNodes,keccak256,{sortPairs:true});
        setMerkleTree(mt);
        //
        
        setFinalHash(ethers.solidityPackedKeccak256(["string","uint256","uint256"], [mt.getHexRoot(),0,leafNodes.length-1]))
       // return merkleTree;
    }

    const generateProof=(val: string, index: number)=>{
        if(merkleTree){
            //const d=ethers.solidityPacked(["address","uint256"], [val.toLowerCase(),index]);
            const hash=ethers.solidityPackedKeccak256(["string","uint256"], [val.toLowerCase(),index]);
           
            setItemProof({address: val.toLowerCase(),index: ""+index,proof: JSON.stringify(merkleTree.getHexProof(hash))});
            }
    }

    const generateWallet=( )=>{
        const existingWallets=keys.keys;
        for(var i=0;i<existingWallets.length;i++){
            const pvk=existingWallets[i];
            const wallet=new ethers.Wallet(pvk)
            const address=wallet.address;
            const message=ethers.solidityPackedKeccak256(['string'],["test"]); 
            //Sign message using user's wallet
            //const signature=await provider?.getSigner().signMessage(hashMsg);
            const signature=wallet.signMessageSync(message);
            setData(current=>([...current,signature]));
        }
    }
    
    const updateList=(data: string[])=>{
        setData(data);
    }

    useMemo(()=>{
        if(data.length>0){
            generateMerkleRoot();
        }
    },[data])
    return (
        <div>
            
            <UserList data={data} editable={true} title="Whitelist" updateData={updateList} itemFunc={generateProof} itemFuncTitle="Generate Proof"/>
                {/* <input placeholder="Wallet count" defaultValue={walletCount} onChange={(e)=>{setWalletCount(e.target.value)}}/> */}
            <Button onClick={(e)=>{e.preventDefault(); if(walletCount) generateWallet( );}}>Load Wallets</Button> 
            <Paper  variant="outlined" square={false} className="padding5 textAlignLeft">
            <label>Root: {merkleTree?.getHexRoot()}</label><br/>
            <label>Final Hash: {finalHash}</label><br/>
            {itemProof && itemProof.address && (
                <Paper  variant="outlined" square={false} className="padding5 textAlignLeft">
                    <div>Address: {itemProof.address}</div>
                    <div>Index: {itemProof.index}</div>
                    <div>Proof: {wrapText(itemProof.proof, 10)} 
                    <Button onClick={(e) => { e.preventDefault(); if (itemProof.proof) navigator.clipboard.writeText(itemProof.proof) }}>
                        <ContentPasteIcon titleAccess={itemProof.proof}/></Button></div>
                </Paper>
            )} 
            </Paper>
        </div>
    )
}

export default Whitelist;