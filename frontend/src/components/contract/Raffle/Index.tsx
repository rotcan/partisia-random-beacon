import { Button, Grid, Paper } from "@mui/material";
import Whitelist from "./Whitelist"
import Start from "./Start";
import { Web3ReactHooks, Web3ReactProvider, useWeb3React } from "@web3-react/core";

import Finish from "./Finish";
import { useEffect, useMemo, useState } from "react";
import { ClaimNftCallbackArgs, ContractEvents, RaffleEndCallbackArgs, RaffleStartCallbackArgs, RaffleState, addClaimNftEventListener, addRaffleEndEventListener, addRaffleStartEventListener } from "../../../contract/Raffle";
import useRaffleData from "../../useRaffleData";
import BN from "bn.js";
import { Label } from "@mui/icons-material";
import Loading from "../../loading/Index";
import useLoading from "../../useLoading";
import NftList from "./NftList";

interface Props {
    address: string | undefined,
    endpoint: string | undefined,
}

const getCurrentTime = () => {
    //@ts-ignore
    const sec = new Date() / 1;
    return sec;
}
const Raffle = (props: Props) => {
    const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(getCurrentTime());
    const { raffleState } = useRaffleData({ address: props.address, endpoint: props.endpoint, lastUpdateTimestamp: lastUpdateTimestamp });
    const { account } = useWeb3React();
    const { loading, setLoading } = useLoading();
    const startRaffleCallback = (data: RaffleStartCallbackArgs) => {
        setLoading(true);
        setTimeout(() => {
            //@ts-ignore
            const sec = getCurrentTime();
            console.log("startRaffleCallback", data, sec);
            setLastUpdateTimestamp(sec)
        }, 15000);
    };

    const endRaffleCallback = (data: RaffleEndCallbackArgs) => {
        setLoading(true);
        setTimeout(() => {
            //@ts-ignore
            const sec = getCurrentTime();
            console.log("endRaffleCallback", data, sec);
            setLastUpdateTimestamp(sec)
        }, 15000);
    };

    const claimNftCallback = (data: ClaimNftCallbackArgs) => {
        setLoading(true);
        setTimeout(() => {
            //@ts-ignore
            const sec = getCurrentTime();
            console.log("claimNftCallback", data, sec);
            setLastUpdateTimestamp(sec)
        }, 15000);
    };

    useEffect(() => {

        if (props.endpoint && props.address && account) {
            console.log("adding listener");
            addRaffleStartEventListener(props.endpoint, props.address, ContractEvents.RaffleStart, startRaffleCallback);
            addRaffleEndEventListener(props.endpoint, props.address, ContractEvents.RaffleEnd, endRaffleCallback);
            addClaimNftEventListener(props.endpoint, props.address, ContractEvents.ClaimNFT, claimNftCallback);
            console.log("added listener");
        }

    }, [props.endpoint, props.address, account])

    useEffect(() => {
        if (raffleState) {
            setLoading(false);
        }
        
        //console.log("raffleState",raffleState,raffleState?.totalCount.toString());
    }, [raffleState])
    return (<>
        <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
            <Grid container>
                <Grid item sx={{ flexGrow: 1 }}>
                    <div style={{width:'100%'}}>Raffle | Nfts Minted: {raffleState?.totalCount.toString()}</div>
                </Grid>
                <Grid item sx={{width:'32px'}}>
                    {loading && <Loading />}
                </Grid>
            </Grid>

        </Paper>
        <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
            <label>Contract address:  <a href={process.env.REACT_APP_GOERLI_SCAN! + "address/" + props.address} target="_blank">{props.address}</a>
                <Button onClick={(e) => { e.preventDefault(); setLastUpdateTimestamp(getCurrentTime()); }}>Refresh</Button></label>
        </Paper>
        <Whitelist raffleState={raffleState} contractAddress={props.address} endpoint={props.endpoint} />
        <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
            <Grid container spacing={2} direction={"row"}>
                {!raffleState?.isRaffleStarted && raffleState?.totalCount.eq(new BN(0)) &&
                    <Grid item xs>
                        <Start contractAddress={props.address} endpoint={props.endpoint} nftUrl={process.env.REACT_APP_NFT_URL} lastUpdateTimestamp={lastUpdateTimestamp} />
                    </Grid>
                }
                {raffleState?.isRaffleStarted && raffleState?.totalCount.eq(new BN(0)) &&
                    <Grid item xs>
                        <Finish contractAddress={props.address} endpoint={props.endpoint} lastUpdateTimestamp={lastUpdateTimestamp} />
                    </Grid>
                }
                {raffleState?.totalCount.gt(new BN(0)) &&
                    <Grid item xs>
                        <span>Wait for users to claim the NFT</span>
                    </Grid>
                }
            </Grid>
        </Paper>
        <NftList contractAddress={props.address}  endpoint={props.endpoint}/>
    </>)
}

export default Raffle;