import { Result, ethers} from 'ethers'
import Raffle from '../abi/Raffle.json';
import BN from 'bn.js';

//Start Raffle
//Calculate Raffle
//Claim

export enum ContractEvents{
    RaffleStart="RaffleStart",
    RaffleEnd="RaffleEnd",
    ClaimNFT="ClaimNFT"
}

export interface StartRaffleArgs{
    url: string;
}

export interface EndRaffleArgs{
     
    values: BN[],
    minValue: BN,
    maxValue :BN,
    rngTimestamp: BN,
    _proofOfResult: string[],
    merkleRoot: string,
}

export interface ClaimNftArgs{
    index: BN,
    signature: string,
    msgData : string,
    to: string,
    merkleProof: string[]
}

export interface RaffleStartCallbackArgs{
    url: string;
}

export interface RaffleEndCallbackArgs{
    _winners: BN,
    values: BN[],
}

 
export interface ClaimNftCallbackArgs{
    user: string,
    index: BN,
}

export interface RaffleState{
    tokenUri: string,
    isRaffleStarted:boolean,
    merkleRoot: string,
    winners: BN,
    minted: BN,
    mintCount: BN,
    totalCount: BN ,
    totalMinted: BN,
}

export const getStartRaffle=({args}:{args: StartRaffleArgs }): string=>{
    const iface=new ethers.Interface(Raffle.abi);
  
    console.log("args",args);
    const data=iface.encodeFunctionData(iface.getFunction("startRaffe")?.name!,
    [args.url]);
    return data;
}

export const getEndRaffle=({args}:{args: EndRaffleArgs }):string=>{
    const iface=new ethers.Interface(Raffle.abi);
  
    console.log("getEndRaffle args",args);
    const data=iface.encodeFunctionData(iface.getFunction("calculateRaffle")?.name!,
    [args.values.map(m=>ethers.toBigInt(m.toString())),ethers.toBigInt(args.minValue.toString()),
    ethers.toBigInt(args.maxValue.toString()), ethers.toBigInt(args.rngTimestamp.toString()),
    args._proofOfResult,args.merkleRoot]);
    return data;
}

export const getClaimNft=({args}:{args: ClaimNftArgs }):string=>{
    const iface=new ethers.Interface(Raffle.abi);
  
    console.log("getClaimNft args",args);
    const data=iface.encodeFunctionData(iface.getFunction("claimToken")?.name!,
    [ethers.toBigInt(args.index.toString()),args.signature,args.msgData,args.to,args.merkleProof]);
    return data;
}
const getContractObject=(endpoint: string,address: string): ethers.Contract=>{
    // const address=process.env.REACT_APP_CONTRACT_ADDRESS!;
    const jsonRpc=new ethers.JsonRpcProvider(endpoint);
    // console.log("MazeContract",MazeContract);
    const raffleContract=new ethers.Contract(address,Raffle.abi,jsonRpc);
    return raffleContract;
}

export const readRaffleMetadata=async({endpoint,address}:{endpoint: string,address: string}):Promise<RaffleState>=>{
    const raffleContract=getContractObject(endpoint,address);
    const isRaffleStarted=recursivelyDecodeResult(await raffleContract.isRaffleStarted()) as boolean;
    const merkleRoot=recursivelyDecodeResult(await raffleContract._merkleRoot()) as string;
    const mintCount= recursivelyDecodeResult(await raffleContract._mintCount()) as BigInt;
    const totalCount= recursivelyDecodeResult(await raffleContract._totalCount()) as BigInt;
    const winners= recursivelyDecodeResult(await raffleContract._winners()) as BigInt;
    const minted= recursivelyDecodeResult(await raffleContract._minted()) as BigInt;
    const tokenUri= recursivelyDecodeResult(await raffleContract.tokenUri()) as string;
    const totalMinted=recursivelyDecodeResult(await raffleContract._tokenIds()) as string;
    return { isRaffleStarted,merkleRoot,mintCount: new BN(mintCount.toString()),
        minted: new BN(minted.toString()),tokenUri,winners: new BN(winners.toString()),totalCount : new BN(totalCount.toString()),
        totalMinted: new BN(0)} as RaffleState;

}


export const getOwnerOf=async ({endpoint,address,index}:{endpoint: string,address: string,index: BN}): Promise<string>=>{
    const raffleContract=getContractObject(endpoint,address);
    return  recursivelyDecodeResult(await raffleContract.ownerOf(ethers.toBigInt(index.toString()))) as string
}
 

export const addRaffleStartEventListener=async(endpoint: string,
    address: string,
    event: ContractEvents,
     callback: (args: RaffleStartCallbackArgs)=>void)=>
{
    const raffleContract=getContractObject(endpoint,address);
    const existingListeners=await raffleContract.listeners(event.toString())
    //console.log("existingListeners start",existingListeners.length);
    if(existingListeners.length===0){
        raffleContract.on(event.toString(),(url)=>{
            console.log("raffle start",url);
            callback({url: url});
        })
    }
    // console.log("existingListeners end",(await mazeContract.listeners(event.toString())).length);
}
    
export const addRaffleEndEventListener=async(endpoint: string,
    address: string,
    event: ContractEvents,
     callback: (args: RaffleEndCallbackArgs)=>void)=>
{
    const raffleContract=getContractObject(endpoint,address);
    const existingListeners=await raffleContract.listeners(event.toString())
    //console.log("existingListeners start",existingListeners.length);
    if(existingListeners.length===0){
        raffleContract.on(event.toString(),(winners, values)=>{
            callback({_winners: new BN(winners.toString()),values :values.map((m: any)=>new BN(m.toString()))});
        })
    }
    // console.log("existingListeners end",(await mazeContract.listeners(event.toString())).length);
}
    
export const addClaimNftEventListener=async(endpoint: string,
    address: string,
    event: ContractEvents,
     callback: (args: ClaimNftCallbackArgs)=>void)=>
{
    const raffleContract=getContractObject(endpoint,address);
    const existingListeners=await raffleContract.listeners(event.toString())
    //console.log("existingListeners start",existingListeners.length);
    if(existingListeners.length===0){
        raffleContract.on(event.toString(),(user, index)=>{
            callback({index: new BN(index.toString()),user :user});
        })
    }
    // console.log("existingListeners end",(await mazeContract.listeners(event.toString())).length);
}
const recursivelyDecodeResult = (result: Result): any => {
    if (typeof result !== 'object') {
      // Raw primitive value
      return result;
    }
    try {
      const obj = result.toObject();
      if (obj._) {
        throw new Error('Decode as array, not object');
      }
      Object.keys(obj).forEach((key) => {
        obj[key] = recursivelyDecodeResult(obj[key]);
      });
      return obj;
    } catch (err) {
      // Result is array.
      return result
        .toArray()
        .map((item) => recursivelyDecodeResult(item as Result));
    }
};