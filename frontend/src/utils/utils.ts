
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