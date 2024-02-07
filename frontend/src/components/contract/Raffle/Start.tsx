import { useWeb3React } from "@web3-react/core";
import useLoading from "../../useLoading";
import { getStartRaffle } from "../../../contract/Raffle";
import { Button, Grid, TextField } from "@mui/material";
import useRaffleData from "../../useRaffleData";
import { useState } from "react";

interface Props {
    endpoint: string | undefined,
    nftUrl: string | undefined,
    contractAddress: string | undefined;
    lastUpdateTimestamp: number | undefined,
}

const Start = (props: Props) => {

    const { account, provider } = useWeb3React();
    const [nftUrl, setNftUrl] = useState<string | undefined>(props.nftUrl);
    const { setLoading } = useLoading();
    const { raffleState } = useRaffleData({ address: props.contractAddress, endpoint: props.endpoint, lastUpdateTimestamp: props.lastUpdateTimestamp });

    const submitStartRaffle = async () => {
        console.log("provider", provider);
        if (!provider) {
            alert("Connect goerli wallet")
        }
        if (provider && props.endpoint && props.contractAddress && nftUrl) {
            // const sgms=await provider.getSigner().signMessage("Test");
            // console.log("sgms",sgms);

            const encData =  getStartRaffle({ args: { url: nftUrl } });
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
    return (<>
        <Grid container spacing={1}>
            <Grid item sx={{ flexGrow: 1 }}>
                <TextField defaultValue={nftUrl} size="small" onChange={(e) => { setNftUrl(e.target.value) }} label="Nft Url" key={nftUrl ? 'nftUrlNotLoaded' : 'nftUrlLoaded'}  sx={{ width: '100%' }} />
            </Grid>
            <Grid item xs>
                <Button onClick={() => { submitStartRaffle(); }}>Start Raffle</Button>
            </Grid>
        </Grid>
    </>)
}

export default Start;