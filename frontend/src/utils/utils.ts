
import BN from 'bn.js';
import * as fs from 'fs';

export interface MetamaskRequestArguments {
  /** The RPC method to request. */
  method: string;
  /** The params of the RPC method, if any. */
  params?: unknown[] | Record<string, unknown>;
}

export interface MetaMask {
  request<T>(args: MetamaskRequestArguments): Promise<T>;
}

const u128MAX=new BN("340282366920938463463374607431768211455");
const i128MAX=new BN("170141183460469231731687303715884105727");
const i64MAX=new BN("9223372036854775807").add(new BN(1));
  
export const KEY_ADMIN="admin";
export const DEFAULT_GAS_COST=10_000;
export const DEFAULT_ZK_GAS_COST=100_000;

export const MAX_AIRDROP_AMOUNT=1_000_000_000;

export const getStorageValue=(key:string): string | undefined=>{
  if(localStorage.getItem(key))
    return localStorage.getItem(key)!;
  return undefined;
}

export const getPvtKeys=(path: string)=>{
  const data=fs.readFileSync(path,"utf-8");
  const keys=data.split("\r\n");
  return keys;
}

export const wrapText=(txt: string | undefined,len: number=3)=>{
  if(!txt)
  return "";
  if(txt.length>len*2){
    return txt.substring(0,len)+".."+txt.substring(txt.length-len,txt.length);
  }
  return txt;
}

export const convertSignatureToi64=(sig: string):string[]=>{
  const sigWithoutPrefix=sig.startsWith("0x") ? sig.substring(2) : sig;
  // console.log("sigWithPrefix",sigWithoutPrefix);
  let sigBN=new BN(sigWithoutPrefix,"hex");
  const i64vals: string[]=[];
  const pow2=new BN(2).pow(new BN(64));
  for(var i=0;i<4;i++){
    const {div,mod}=sigBN.divmod(pow2);
    sigBN=div;
    i64vals.push(mod.sub(i64MAX).toString(10));
  }
  
  // console.log("div",div.toString(10),mod.toString(10));
  // console.log("div 2 ",div.mul(u128MAX).add(mod).toString("hex"));
  return i64vals;
}

export const convertI64ToSignature=(sigLe64: string[]): string=>{
  let sigBN=new BN(0);
  for(var i=0;i < sigLe64.length;i++){
    const pow2=new BN(2).pow(new BN(64).mul(new BN(i)));
    sigBN=sigBN.add(new BN(sigLe64[i]).add(i64MAX).mul(pow2));
  }
  // const sig0=new BN(sigLe0).add(i128MAX)
  // const sig1=new BN(sigLe1).add(i128MAX)
  // return sig1.mul(u128MAX).add(sig0).toString("hex");
  return sigBN.toString("hex");
}

export const serializeRange=({end,start}:{start: BN,end:BN}):string=>{
  let temp=start;
  let bits=0;
  while (temp>new BN(0)){
      bits+=1;
      temp=temp.shrn(1)
  }
  const diff=end.sub(start);
  const sizeBits=[...Array(6).keys()].map(m=>{ return new BN((bits>>m) & (1))});
  const startBits=[...Array(bits).keys()].map(m=>{ return  new BN(start.shrn(m).andln(1))});
  const endBits=[...Array(64-bits-6).keys()].map(m=>{ return new BN(diff.shrn(m).andln(1))});
  const finalArray=[...sizeBits,...startBits,...endBits];
  return finalArray.reduce((total, _currentValue, currentIndex, arr)=>{ return total.add(arr[currentIndex].mul(new BN(1<<currentIndex)))}, new BN(0)).sub(i64MAX).toString(10)

}

export const getStringArray=(str: string): string[]=>{
  try{
      
      return (JSON.parse(str) as string[]).map(m=>m.trim())
      
  }catch(e){
       return str.substring(1,str.length-1).split(",").map(m=>m.trim())
     
  }
}