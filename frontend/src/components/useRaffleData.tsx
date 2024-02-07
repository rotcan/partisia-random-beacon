import { useEffect, useMemo, useState } from "react";
import { RaffleState, readRaffleMetadata } from "../contract/Raffle";
import useLoading from "./useLoading";

interface Props{
    lastUpdateTimestamp: number | undefined,
    address: string | undefined,
    endpoint: string | undefined,
}
const useRaffleData=(props: Props)=>{
    const [raffleState,setRaffleState]=useState<RaffleState>();
    const {setLoading}=useLoading();


    const loadData=async()=>{
        console.log("loadData",props.address,props.endpoint)
        if(props.address &&  props.endpoint){
            console.log("loadData")
            setLoading(true);
            const data=await readRaffleMetadata({endpoint: props.endpoint,address: props.address});
            setRaffleState(current=>({
                ...current, ...data
            }));
            setLoading(false);
        }
    }
    useEffect(()=>{
        console.log("useMemo",props.lastUpdateTimestamp,props.address)
        if(props.lastUpdateTimestamp){
            loadData();
        }
      },[props.lastUpdateTimestamp, props.address])

    return {raffleState};
}

export default useRaffleData;;