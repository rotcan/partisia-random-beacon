import BN from "bn.js";
import { TransactionApi } from "../client/TransactionApi";
import { BlockchainAddress, ContractAbi, FnRpcBuilder, ZkInputBuilder } from "@partisiablockchain/abi-client";
import { BlockchainPublicKey, ZkRpcBuilder,BlockchainAddress as ZkBlockchainAddress, } from "@partisiablockchain/zk-client";
import { DEFAULT_GAS_COST, DEFAULT_ZK_GAS_COST } from "../utils/utils";
import { resetState, setNewAdmin } from "./RandomGenerated";

export class RandomApi{
    private readonly transactionApi: TransactionApi;
    private readonly contractAddress: string;
    private readonly abi: ContractAbi;
    private readonly engineKeys: BlockchainPublicKey[];
    private readonly sender: ZkBlockchainAddress;

    constructor({abi,contractAddress,engineKeys,sender,transactionApi}:{transactionApi: TransactionApi,contractAddress: string,
        abi: ContractAbi,
        engineKeys: BlockchainPublicKey[],sender: string}) {
        this.transactionApi = transactionApi;
        this.contractAddress=contractAddress;
        this.abi = abi;
        this.engineKeys = engineKeys.map((key) => BlockchainPublicKey.fromBuffer(key.asBuffer()));
        this.sender=ZkBlockchainAddress.fromString(sender);
      }

      private readonly buildInputContribution = (val: BN): Buffer => {
        // First build the public inputs
        const fnBuilder = new FnRpcBuilder("add_input", this.abi);
        const additionalRpc = fnBuilder.getBytes();
    
        // Then build the secret input
        const secretInputBuilder = ZkInputBuilder.createZkInputBuilder("add_input", this.abi);
        secretInputBuilder.addI64(new BN(val));
        const compactBitArray = secretInputBuilder.getBits();
    
        // Create the final rpc
        return ZkRpcBuilder.zkInputOnChain(
          this.sender,
          compactBitArray,
          additionalRpc,
          this.engineKeys
        );
    };
      
    readonly addInitContribution = (val: BN) => {
        const address = this.contractAddress;
        if (address === undefined) {
          throw new Error("No address provided");
        }
        console.log("addInitContribution",address);
        // First build the RPC buffer that is the payload of the transaction.
        const rpc = this.buildInputContribution(val);
        // Then send the payload via the transaction API.
        return this.transactionApi.sendTransactionAndWait(address, rpc, DEFAULT_ZK_GAS_COST);
      };

      
      private readonly buildNextContribution = ({count, rangeSerialized,sig0,sig1,sig2,sig3}:
        { rangeSerialized: BN,  count: number, sig0: BN, sig1: BN, sig2: BN,sig3: BN}): Buffer => {
        // First build the public inputs
        const fnBuilder = new FnRpcBuilder("generate_next", this.abi);
        const additionalRpc = fnBuilder.getBytes();
    
        // Then build the secret input
        const secretInputBuilder = ZkInputBuilder.createZkInputBuilder("generate_next", this.abi);
        secretInputBuilder.addStruct().addI64(rangeSerialized).addI8(count).addI64(sig0).addI64(sig1).addI64(sig2).addI64(sig3);
        // secretInputBuilder.addI64(rangeStart);
        // secretInputBuilder.addI64(rangeEnd);
        // secretInputBuilder.addI8(count);
        const compactBitArray = secretInputBuilder.getBits();
    
        // Create the final rpc
        return ZkRpcBuilder.zkInputOnChain(
          this.sender,
          compactBitArray,
          additionalRpc,
          this.engineKeys
        );
    };

    readonly getNextValues = ({count, rangeSerialized,sig0,sig1,sig2,sig3}:
      { rangeSerialized: BN,  count: number, sig0: BN, sig1: BN, sig2: BN,sig3: BN}) => {
        const address = this.contractAddress;
        if (address === undefined) {
          throw new Error("No address provided");
        }
        console.log("getNextValues",address);
        // First build the RPC buffer that is the payload of the transaction.
        const rpc = this.buildNextContribution({count, rangeSerialized,sig0,sig1,sig2,sig3});
        // Then send the payload via the transaction API.
        return this.transactionApi.sendTransactionAndWait(address, rpc, DEFAULT_ZK_GAS_COST);
      };

      //resetState
      readonly resetState=({maxValueLimit,minContributions}:{minContributions: number,maxValueLimit: number})=>{
        const address = this.contractAddress;
          if (address === undefined) {
            throw new Error("No address provided");
          }
        const rpc=resetState(minContributions,maxValueLimit);
        // Then send the payload via the transaction API.
        return this.transactionApi.sendTransactionAndWait(address, rpc, DEFAULT_GAS_COST);
      }

      //resetState
      readonly setNewAdmin=(newAdmin: string)=>{
        const address = this.contractAddress;
          if (address === undefined) {
            throw new Error("No address provided");
          }
        const rpc=setNewAdmin( BlockchainAddress.fromString(newAdmin));
        // Then send the payload via the transaction API.
        return this.transactionApi.sendTransactionAndWait(address, rpc, DEFAULT_GAS_COST);
      }
     
}