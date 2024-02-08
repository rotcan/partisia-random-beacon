import { Dispatch, SetStateAction, useContext, useEffect, useMemo, useState } from "react";
import UserList from "../UserList";
import MerkleTree from "merkletreejs";
import { keccak256, ethers } from "ethers";
import { convertI64ToSignature, convertSignatureToi64, getPvtKeys, getStringArray, wrapText } from "../../../utils/utils";
import keys from "../../../keys/pvk.json";
import { Button, Grid, Paper, TextField } from "@mui/material";
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { ContractContext, NextValueVars } from "../Index";
import useRaffleData from "../../useRaffleData";
import { RaffleState, getClaimNft } from "../../../contract/Raffle";
import { BN } from "bn.js";
import { useWeb3React } from "@web3-react/core";
import useLoading from "../../useLoading";
import { isRaffleCollected } from "./Index";

interface AddressProof {
    proof: string | undefined,
    address: string | undefined,
    msg: string | undefined,
    index: string | undefined,

}

interface Props {
    //finalHash: string | undefined,
    //setFinalHash: Dispatch<SetStateAction<string>>,
    // randomCount: number,
    // setNextValueVars: Dispatch<SetStateAction<NextValueVars>>,
    raffleState: RaffleState | undefined,
    endpoint: string | undefined,
    contractAddress: string | undefined;
}

const getDefaultProof = () => {
    return { address: undefined, msg: undefined, index: undefined, proof: undefined } as AddressProof;
}

const MSG_DATA = "test";
const Whitelist = (props: Props) => {

    const { account, provider } = useWeb3React();
    const [data, setData] = useState<string[]>([]);
    const [merkleTree, setMerkleTree] = useState<MerkleTree>();
    const [itemProof, setItemProof] = useState<AddressProof>(getDefaultProof());
    const [walletCount, setWalletCount] = useState<string>("20");
    const [msgData, setMsgData] = useState<string>(MSG_DATA);
    // const [finalHash,setFinalHash]=useState<string>("");
    const { nextValueVars, setNextValueVars, finalHash, setFinalHash, setWalletLimit, setMerkleRoot } = useContext(ContractContext);
    const [wallets, setWallets] = useState<string[]>([]);
    const [proofIndex, setProofIndex] = useState<number>();
    const { setLoading } = useLoading();

    const generateMerkleRoot = () => {
        // console.log("generateMerkleRoot data",data);
        const leafNodes = data.map((m, index) => {
            // console.log("m.toLowerCase().substring(2)",m.toLowerCase(),index,ethers.solidityPackedKeccak256(["bytes","uint256"], [m.toLowerCase()  ,index]));
            return ethers.solidityPackedKeccak256(["bytes", "uint256"], [m.toLowerCase(), index])
        }
        )
        // console.log("leafNodes",leafNodes[2]);
        if (leafNodes.length > 0) {
            const mt = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

            setMerkleTree(mt);
            setMerkleRoot(mt.getHexRoot());
            //
            setNextValueVars(current => ({ ...current, rangeStart: "0", rangeEnd: "" + leafNodes.length }));
            setWalletLimit(current => ({ ...current, rangeStart: "0", rangeEnd: "" + leafNodes.length }));
            const hash = ethers.solidityPackedKeccak256(["bytes32", "uint256", "uint256", "uint256"], [mt.getHexRoot(), 0, leafNodes.length, nextValueVars?.count]);
            setFinalHash(hash);
            // const sigsI128: string[]=convertSignatureToi64(hash);
            // console.log("i64 sigs",sigsI128);
            // console.log("sigs256",convertI64ToSignature(sigsI128));
        }
        // return merkleTree;
    }

    const calculateWalletProof = (val: string, index: number): string | undefined => {
        if (merkleTree) {
            const hash = ethers.solidityPackedKeccak256(["bytes", "uint256"], [val.toLowerCase(), index]);
            return JSON.stringify(merkleTree.getHexProof(hash));
        }
        return undefined;
    }

    const generateProof = (val: string, index: number) => {
        console.log("generateProof", merkleTree, val, index)
        if (merkleTree) {
            //const d=ethers.solidityPacked(["address","uint256"], [val.toLowerCase(),index]);
            const hash = ethers.solidityPackedKeccak256(["bytes", "uint256"], [val.toLowerCase(), index]);
            if (proofIndex && index === proofIndex) {
                setProofIndex(undefined);
                setItemProof(getDefaultProof());
            } else {
                setProofIndex(index);
                setItemProof({ address: wallets[index], msg: val.toLowerCase(), index: "" + index, proof: JSON.stringify(merkleTree.getHexProof(hash)) });
            }
        }
    }

    const isVisible = (_index: number) => {
        return true;
    }

    const isEnabled = (_index: number) => {
        return true;
    }

    const isWinner = (index: number): boolean => {
        if (!props.raffleState)
            return false;
        if(isRaffleCollected(props.raffleState))
            return false;
        return props.raffleState?.winners.and(new BN(1 << index)).gt(new BN(0))
    }

    const isClaimEnabled = (index: number) => {
        if(isRaffleCollected(props.raffleState))
            return false;
        return isWinner(index) && !isAlreadyClaimed(index);
    }

    const claimNft = async (_val: string, index: number) => {
        const wallet = wallets[index];
        //Claim nft
        console.log("provider", provider);
        if (!provider) {
            alert("Connect goerli wallet")
        }
        const proof = calculateWalletProof(data[index], index);
        if (provider && props.endpoint && props.contractAddress && proof) {
            // const sgms=await provider.getSigner().signMessage("Test");
            // console.log("sgms",sgms);

            const encData = getClaimNft({ args: { index: new BN(index), merkleProof: getStringArray(proof), msgData, signature: data[index], to: wallet } });
            console.log("encData", props.contractAddress, encData);
            // const tx=await provider.send("initGame",[]);
            setLoading(true);
            try {
                const tx = await provider.getSigner().sendTransaction({
                    from: account,
                    data: encData, to: props.contractAddress
                });
                const res = await tx.wait();

                console.log("tx", tx, res.logs);
            } catch (error) {
                //@ts-ignore
                const msg=error.toString();
                alert(msg.substring(msg.indexOf("reason=")+7,msg.indexOf("reason=")+7+msg.substring(msg.indexOf("reason=")+7).indexOf(",")));
                
            }
            setLoading(false);

        }
    }

    const claimTitle = (index: number) => {
        if (isAlreadyClaimed(index)) return "Claimed";
        return "Claim";
    }

    const isAlreadyClaimed = (index: number) => {
        return props.raffleState?.minted.and(new BN(1 << index)).gt(new BN(0))
    }

    const clearWallets = () => {
        updateList([]);
        setWallets([]);
    }
    const generateWallets = () => {
        const existingWallets = keys.keys;
        const d = [];
        const allAddresses = [];
        for (var i = 0; i < existingWallets.length; i++) {
            const pvk = existingWallets[i];
            const wallet = new ethers.Wallet(pvk)
            const address = wallet.address;
            allAddresses.push(address);
            const message = ethers.solidityPackedKeccak256(['string'], [msgData]);
            //Sign message using user's wallet
            //const signature=await provider?.getSigner().signMessage(hashMsg);
            const signature = wallet.signMessageSync(message);
            // console.log("signature",message,address, signature);
            d.push(signature);
            //setData(current=>([...current,signature]));
        }
        setWallets(allAddresses);
        updateList(d)
    }

    const updateList = (d: string[]) => {
        setData(d);
    }

    useEffect(()=>{
        if(msgData){
            generateWallets();
        }
    },[msgData])
    useEffect(() => {
        if (data.length > 0) {
            generateMerkleRoot();
        }
    }, [data])

    useEffect(() => {
        if (nextValueVars) {
            generateMerkleRoot();
        }
    }, [nextValueVars?.count])

    //Start Raffle

    //Finish Raffle
    //Claim
    return (

        <div>

            <UserList data={data} editable={false} title="Whitelist" updateData={updateList} itemFunc={[
                {
                    func: generateProof, enabled: isEnabled, getTitle: (index => {
                        if (proofIndex && proofIndex === index)
                            return "Hide"; return "Show"
                    }), visible: isVisible
                },
                { func: claimNft, enabled: isClaimEnabled, getTitle: claimTitle, visible: isVisible }
            ]} />
            {/* <input placeholder="Wallet count" defaultValue={walletCount} onChange={(e)=>{setWalletCount(e.target.value)}}/> */}
            <Grid container>
                <Grid item sx={{ flexGrow: 1 }}>
                    <TextField size="small" sx={{ width: '100%' }} label={"Signing Message"} value={msgData} onChange={(e) => { setMsgData(e.target.value) }} />
                </Grid>
                <Grid item>
                    <Button onClick={(e) => { e.preventDefault(); if (walletCount) generateWallets(); }}>Load Wallets</Button>
                </Grid>
                <Grid item>
                    <Button onClick={(e) => { e.preventDefault(); if (walletCount) clearWallets(); }}>Clear Wallets</Button>
                </Grid>
            </Grid>
            <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                <label>Root: {merkleTree?.getHexRoot()}</label><br />
                <label>Final Hash: {finalHash}</label><br />
                {itemProof && itemProof.address && (
                    <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                        <div>Address: {itemProof.address}</div>
                        <div>Msg:{wrapText(itemProof.msg, 10)}  <Button onClick={(e) => { e.preventDefault(); if (itemProof.msg) navigator.clipboard.writeText(itemProof.msg) }}>
                            <ContentPasteIcon titleAccess={itemProof.msg} /></Button></div>
                        <div>Index: {itemProof.index}</div>
                        <div>Proof: {wrapText(itemProof.proof, 10)}
                            <Button onClick={(e) => { e.preventDefault(); if (itemProof.proof) navigator.clipboard.writeText(itemProof.proof) }}>
                                <ContentPasteIcon titleAccess={itemProof.proof} /></Button></div>
                    </Paper>
                )}
            </Paper>
        </div>
    )
}

export default Whitelist;