import { Button, Grid, TextField } from "@mui/material";
import { useWeb3React } from "@web3-react/core";
import { getEndRaffle } from "../../../contract/Raffle";
import useLoading from "../../useLoading";
import { useContext, useEffect, useState } from "react";
import BN from "bn.js";
import { ContractContext } from "../Index";
import { getStringArray } from "../../../utils/utils";

interface Props{
    endpoint: string | undefined,
     contractAddress: string | undefined;
    lastUpdateTimestamp: number | undefined,
}

interface EndRaffleState{
    minValue: string,
    maxValue: string,
    rngTimestamp: string,
    proofOfResult: string,
    merkleRoot: string,
    values: string,
}

const Finish=(props:Props)=>{
    const { account, provider } = useWeb3React();
    const {setLoading}=useLoading();
    const [args,setArgs]=useState<EndRaffleState>();
    const {pbcContractState,selectedRngIndex,merkleRoot}=useContext(ContractContext);

    const parseFromContractContext=()=>{
        if(pbcContractState && selectedRngIndex!==undefined){
            const result=pbcContractState.nextValue[selectedRngIndex];
             if(result.proof){
                setArgs({maxValue: result.maxValue.toString(),merkleRoot:merkleRoot ,minValue: result.minValue.toString(),proofOfResult: result.proof,
                rngTimestamp: result.calculateTimestamp.toString(),values: JSON.stringify(result.values.toString())})
            }
        }
    }
    
    const submitEndRaffle = async () => {
        if (!provider) {
            alert("Connect goerli wallet");
            return;
        }
        if(!args)
        {
            alert("Random numbers not generated for this raffle")
            return;
        }
        if (provider && props.endpoint && props.contractAddress && args) {
            // const sgms=await provider.getSigner().signMessage("Test");
            // console.log("sgms",sgms);
            console.log("getStringArray(args.values)[0]", getStringArray(args.values).map(m=>new BN(m)) );
            const encData =  getEndRaffle({ args: { _proofOfResult: getStringArray(args.proofOfResult),
            maxValue: new BN(args.maxValue), merkleRoot: args.merkleRoot,minValue: new BN(args.minValue),
        rngTimestamp: new BN(args.rngTimestamp),values:   getStringArray(args.values).map(m=>new BN(m))  } });
            console.log("encData", props.contractAddress);
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
                //console.log(msg.indexOf("reason=")+7,msg.indexOf(msg.indexOf("reason=")+7,","))
                alert(msg.substring(msg.indexOf("reason=")+7,msg.indexOf("reason=")+7+msg.substring(msg.indexOf("reason=")+7).indexOf(",")));
                //console.log("submitEndRaffle error", error);
            }
            setLoading(false);

        }
    }

    useEffect(()=>{
        console.log("finish useeffect");
        parseFromContractContext();
    },[pbcContractState,selectedRngIndex])

    return (<>
        <Grid container >
            <Grid item>
            <Button onClick={()=>{submitEndRaffle(); }}>End Raffle</Button>
            </Grid>
        </Grid>
    </>)
}

export default Finish;