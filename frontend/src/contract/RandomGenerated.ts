/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BN from "bn.js";
import {
  AbiParser,
  AbstractBuilder, BigEndianReader,
  FileAbi, FnKinds, FnRpcBuilder, RpcReader,
  ScValue,
  ScValueEnum, ScValueOption,
  ScValueStruct,
  StateReader, TypeIndex,
  StateBytes,
  BlockchainAddress
} from "@partisiablockchain/abi-client";
import {BigEndianByteOutput} from "@secata-public/bitmanipulation-ts";

const fileAbi: FileAbi = new AbiParser(Buffer.from(
  "5042434142490b00000504000000000701000000084e65787444617461000000030000000b72616e67655f7374617274040000000972616e67655f656e640400000005636f756e74010100000009526e67526573756c7400000007000000096d696e5f76616c756504000000096d61785f76616c7565040000000676616c7565730e040000001363616c63756c6174655f74696d657374616d70090000000570726f6f66120b0000000673656e646572120d00000009726573756c745f6964040100000010526e67436f6e74726163745374617465000000080000000d61646d696e6973747261746f720d00000007636f756e74657204000000176d696e5f73657475705f636f6e747269627574696f6e73010000000a6e6578745f76616c75650e00010000001576616c75655f67656e65726174696f6e5f74696d65090000000f6d61785f76616c75655f636f756e74010000000e63757272656e745f726573756c74040000000474656d70120e01010000000e5365637265744e65787444617461000000030000000b72616e67655f7374617274090000000972616e67655f656e640900000005636f756e7406010000000b536563726574566172496400000001000000067261775f69640301000000134576656e74537562736372697074696f6e496400000001000000067261775f696408010000000f45787465726e616c4576656e74496400000001000000067261775f69640800000009010000000a696e697469616c697a65ffffffff0f00000002000000116d696e5f636f6e747269627574696f6e73010000000f6d61785f76616c75655f636f756e740117000000096164645f696e70757440000000000000000c7365637265745f696e70757409170000000d67656e65726174655f6e65787441000000000000000c7365637265745f696e7075740003020000000b72657365745f73746174650200000002000000116d696e5f636f6e747269627574696f6e73010000000f6d61785f76616c75655f636f756e7401020000000d7365745f6e65775f61646d696e0300000001000000096e65775f61646d696e0d1100000011696e7075747465645f7661726961626c65cbe680ff0b00000000130000001667656e65726174655f6e6578745f636f6d706c657465eabecfbb0e0000000014000000126f70656e5f6e6578745f7661726961626c658890aae901000000001600000010736176655f6174746573746174696f6ee1e1e7e801000000000002",
  "hex"
)).parseAbi();

type Option<K> = K | undefined;

export interface NextData {
  rangeStart: BN;
  rangeEnd: BN;
  count: number;
}

export function newNextData(rangeStart: BN, rangeEnd: BN, count: number): NextData {
  return {rangeStart, rangeEnd, count};
}

function fromScValueNextData(structValue: ScValueStruct): NextData {
  return {
    rangeStart: structValue.getFieldValue("range_start")!.asBN(),
    rangeEnd: structValue.getFieldValue("range_end")!.asBN(),
    count: structValue.getFieldValue("count")!.asNumber(),
  };
}

export interface RngResult {
  minValue: BN;
  maxValue: BN;
  values: BN[];
  calculateTimestamp: BN;
  proof: Option<string>;
  sender: Option<BlockchainAddress>;
  resultId: BN;
}

export function newRngResult(minValue: BN, maxValue: BN, values: BN[], calculateTimestamp: BN, proof: Option<string>, sender: Option<BlockchainAddress>, resultId: BN): RngResult {
  return {minValue, maxValue, values, calculateTimestamp, proof, sender, resultId};
}

function fromScValueRngResult(structValue: ScValueStruct): RngResult {
  return {
    minValue: structValue.getFieldValue("min_value")!.asBN(),
    maxValue: structValue.getFieldValue("max_value")!.asBN(),
    values: structValue.getFieldValue("values")!.vecValue().values().map((sc1) => sc1.asBN()),
    calculateTimestamp: structValue.getFieldValue("calculate_timestamp")!.asBN(),
    proof: structValue.getFieldValue("proof")!.optionValue().valueOrUndefined((sc2) => sc2.stringValue()),
    sender: structValue.getFieldValue("sender")!.optionValue().valueOrUndefined((sc3) => BlockchainAddress.fromBuffer(sc3.addressValue().value)),
    resultId: structValue.getFieldValue("result_id")!.asBN(),
  };
}

export interface RngContractState {
  administrator: BlockchainAddress;
  counter: BN;
  minSetupContributions: number;
  nextValue: RngResult[];
  valueGenerationTime: BN;
  maxValueCount: number;
  currentResult: BN;
  temp: Option<Buffer>;
}

export function newRngContractState(administrator: BlockchainAddress, counter: BN, minSetupContributions: number, nextValue: RngResult[], valueGenerationTime: BN, maxValueCount: number, currentResult: BN, temp: Option<Buffer>): RngContractState {
  return {administrator, counter, minSetupContributions, nextValue, valueGenerationTime, maxValueCount, currentResult, temp};
}

function fromScValueRngContractState(structValue: ScValueStruct): RngContractState {
  return {
    administrator: BlockchainAddress.fromBuffer(structValue.getFieldValue("administrator")!.addressValue().value),
    counter: structValue.getFieldValue("counter")!.asBN(),
    minSetupContributions: structValue.getFieldValue("min_setup_contributions")!.asNumber(),
    nextValue: structValue.getFieldValue("next_value")!.vecValue().values().map((sc4) => fromScValueRngResult(sc4.structValue())),
    valueGenerationTime: structValue.getFieldValue("value_generation_time")!.asBN(),
    maxValueCount: structValue.getFieldValue("max_value_count")!.asNumber(),
    currentResult: structValue.getFieldValue("current_result")!.asBN(),
    temp: structValue.getFieldValue("temp")!.optionValue().valueOrUndefined((sc5) => sc5.vecU8Value()),
  };
}

export function deserializeRngContractState(state: StateBytes): RngContractState {
  const scValue = new StateReader(state.state, fileAbi.contract, state.avlTrees).readState();
  return fromScValueRngContractState(scValue);
}

export interface SecretNextData {
  rangeStart: BN;
  rangeEnd: BN;
  count: number;
}

export function newSecretNextData(rangeStart: BN, rangeEnd: BN, count: number): SecretNextData {
  return {rangeStart, rangeEnd, count};
}

function fromScValueSecretNextData(structValue: ScValueStruct): SecretNextData {
  return {
    rangeStart: structValue.getFieldValue("range_start")!.asBN(),
    rangeEnd: structValue.getFieldValue("range_end")!.asBN(),
    count: structValue.getFieldValue("count")!.asNumber(),
  };
}

export interface SecretVarId {
  rawId: number;
}

export function newSecretVarId(rawId: number): SecretVarId {
  return {rawId};
}

function fromScValueSecretVarId(structValue: ScValueStruct): SecretVarId {
  return {
    rawId: structValue.getFieldValue("raw_id")!.asNumber(),
  };
}

export interface EventSubscriptionId {
  rawId: number;
}

export function newEventSubscriptionId(rawId: number): EventSubscriptionId {
  return {rawId};
}

function fromScValueEventSubscriptionId(structValue: ScValueStruct): EventSubscriptionId {
  return {
    rawId: structValue.getFieldValue("raw_id")!.asNumber(),
  };
}

export interface ExternalEventId {
  rawId: number;
}

export function newExternalEventId(rawId: number): ExternalEventId {
  return {rawId};
}

function fromScValueExternalEventId(structValue: ScValueStruct): ExternalEventId {
  return {
    rawId: structValue.getFieldValue("raw_id")!.asNumber(),
  };
}

export function initialize(minContributions: number, maxValueCount: number): Buffer {
  const fnBuilder = new FnRpcBuilder("initialize", fileAbi.contract);
  fnBuilder.addU8(minContributions);
  fnBuilder.addU8(maxValueCount);
  return fnBuilder.getBytes();
}

export function resetState(minContributions: number, maxValueCount: number): Buffer {
  const fnBuilder = new FnRpcBuilder("reset_state", fileAbi.contract);
  fnBuilder.addU8(minContributions);
  fnBuilder.addU8(maxValueCount);
  return fnBuilder.getBytes();
}

export function setNewAdmin(newAdmin: BlockchainAddress): Buffer {
  const fnBuilder = new FnRpcBuilder("set_new_admin", fileAbi.contract);
  fnBuilder.addAddress(newAdmin.asBuffer());
  return fnBuilder.getBytes();
}

