import { Button, Grid, Paper, TextField } from "@mui/material";
import { useState } from "react";
import { getOwnerOf } from "../../../contract/Raffle";
import { BN } from "bn.js";

interface Props{
    endpoint: string | undefined,
    contractAddress: string | undefined,

}

const NftList=(props: Props)=>{
    const [nftId,setNftId]=useState<number>();
    const [owner,setOwner]=useState<string>();
    
    const fetchOwner=async()=>{
        if(nftId===undefined)
        alert("Input nft id to check")
        if(nftId!==undefined && props.contractAddress && props.endpoint){
            const userAddress=await getOwnerOf({address: props.contractAddress, endpoint: props.endpoint,index: new BN(nftId)})
            setOwner(userAddress)
        }
    }
    return (<>
    <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
    <Grid container>
        <Grid item sx={{flexGrow:1}}>
            <TextField size="small" sx={{ width: '100%' }} label="Nft Id" type="number" onChange={(e) => { setNftId(+e.target.value) }} />
        </Grid>
        <Grid item xs>
            <Button onClick={()=>{fetchOwner();}}>Check Owner</Button>
        </Grid>
    </Grid>
    {owner && <label>Owner:  <a href={process.env.REACT_APP_GOERLI_SCAN! + "address/" + owner} target="_blank">{owner}</a></label>}
    </Paper>
    </>)
}

export default NftList;