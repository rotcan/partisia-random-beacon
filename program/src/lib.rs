//! Simple secret sum contract.
//!
//! Calculates the sum of secret inputs from multiple parties. The inputs are not revealed.
//!
//! This implementation works in following steps:
//!
//! 1. Initialization on the blockchain.
//! 2. Receival of multiple secret inputs, using the real zk protocol.
//! 3. The contract owner can start the ZK computation.
//! 4. The Zk computation sums all the given inputs.
//! 5. Once the zk computation is complete, the contract will publicize the summed variable.
//! 6. Once the summed variable is public, the contract will also store it in the state,
//!     such that the value can be read by all.
//!

#![allow(unused_variables)]

#[macro_use]
extern crate pbc_contract_codegen;
extern crate pbc_contract_common;
extern crate pbc_lib;

use pbc_contract_common::address::Address;
use pbc_contract_common::context::ContractContext;
use pbc_contract_common::events::EventGroup;
use pbc_contract_common::zk::{CalculationStatus, SecretVarId, ZkInputDef, ZkState, ZkStateChange,ZkClosed};
use read_write_rpc_derive::{ReadRPC};
use pbc_traits::{ReadRPC, ReadWriteState, WriteRPC};
use create_type_spec_derive::CreateTypeSpec;
use read_write_state_derive::ReadWriteState;
use pbc_contract_common::signature::Signature;
use pbc_contract_common::zk::AttestationId;
use std::fmt::Write;

use pbc_zk::Sbi64;
mod zk_compute;
mod philox;
mod squaresrng;
mod threefry;
use crate::zk_compute::SecretNextData;
use crate::threefry::ThreeFryType;

#[derive(ReadWriteState, Debug, PartialEq)]
#[repr(u8)]
enum SecretVarType {
    Setup = 0,
    Generate = 1,
}

/// Secret variable metadata. Unused for this contract, so we use a zero-sized struct to save space.
#[derive(ReadWriteState,  Debug)]
struct SecretVarMetadata {
    variable_type: SecretVarType,
}


#[derive(ReadWriteState, CreateTypeSpec, ReadRPC, Clone)]
#[repr(C)]
pub struct NextData {
  //  pub id: u64,
//    pub range_start: i64,
   pub range: i64,
   pub count: i8,
   signature_le_0: i64,
   signature_le_1: i64,
   signature_le_2: i64,
   signature_le_3: i64,
}

const I64_TO_U64: i128=i64::MAX as i128 +1;

#[derive(ReadWriteState, CreateTypeSpec, Clone)]
struct RngResult{
    min_value: u64,
    max_value:u64,
    values: Vec<u64>,
    calculate_timestamp: i64,
    signature: Option<String>,
    //signature_le_0: Option<String>,
    // signature_le_1: i64,
    // signature_le_2: i64,
    // signature_le_3: i64,
    proof: Option<String>,
    sender: Option<Address>,
    result_id: u64,
}
/// The maximum size of MPC variables.
const BITLENGTH_OF_SECRET_VARIABLES: u32 = 32;
const MAX_TRIES: u8=255;
/// The contract's state
///
/// ### Fields:
///
/// * `administrator`: [`Address`], the administrator of the contract.
///
/// * `sum_result`: [`Option<u32>`], place for storing the final result of the zk computation.
#[state]
struct RngContractState {
    /// Address allowed to start computation
    administrator: Address,
    /// Will contain the result (sum) when computation is complete
    counter: u64,
    ///
    min_setup_contributions: u8,
    ///
    next_value: Vec<RngResult>,
    ///
    value_generation_time: i64,
    ///
    max_value_count: i8, 
    current_result: u64,
    temp: Option<Vec<u8>>,
}

/// Initializes the contract and bootstrab the contract state.
///
/// ### Parameters:
///
/// * `ctx`: [`ContractContext`], initial context.
///
/// * `zk_state`: [`ZkState<SecretVarMetadata>`], initial zk state.
///
/// ### Returns
///
/// The new state object of type [`ContractState`] with the administrator set to the
/// caller of this function.
#[init(zk=true)]
fn initialize(ctx: ContractContext, zk_state: ZkState<SecretVarMetadata>,min_contributions: u8,max_value_count : i8) -> RngContractState {
    RngContractState {
        administrator: ctx.sender,
        counter: 1,
        min_setup_contributions: min_contributions,
        next_value: vec![],
        value_generation_time:0,
        max_value_count,
        current_result:0,
        temp: None,
    }
}

/// Adds another secret input of size [`BITLENGTH_OF_SECRET_VARIABLES`].
///
/// ### Parameters:
///
/// * `ctx`: [`ContractContext`], the context of the current call.
///
/// * `state`: [`ContractState`], the current state of the contract.
///
/// * `zk_state`: [`ZkState<SecretVarMetadata>`], the current zk state.
///
/// ### Returns
///
/// The unchanged state, and a ZkInputDef defining the input size.
#[zk_on_secret_input(shortname = 0x40, secret_type = "Sbi64")]
fn add_input(
    context: ContractContext,
    mut state: RngContractState,
    zk_state: ZkState<SecretVarMetadata>,
) -> (
    RngContractState,
    Vec<EventGroup>,
    ZkInputDef<SecretVarMetadata,Sbi64>,
) {

    assert!(
        zk_state
            .secret_variables
            .iter()
            .chain(zk_state.pending_inputs.iter())
            .all(|(_, v)| v.owner != context.sender),
        "Each user is allowed to send only one value. Sender: {:?}",
        context.sender
    );

    let total_vars: Vec<_>= zk_state
    .secret_variables
    .iter()
    .chain(zk_state.pending_inputs.iter())
    .filter(|(var,meta)| meta.metadata.variable_type == SecretVarType::Setup ).collect();

    assert!(
        total_vars.len()<=state.min_setup_contributions.into(),
        "No more contributions required"
    );

    let input_def = ZkInputDef::with_metadata(SecretVarMetadata {
        variable_type: SecretVarType::Setup,
    });
    (state, vec![], input_def)
}

/// Start the zk-computation computing the sum of the secret variables. Only callable by the
/// administrator.
///
/// ### Parameters:
///
/// * `ctx`: [`ContractContext`], the context of the current call.
///
/// * `state`: [`ContractState`], the current state of the contract.
///
/// * `zk_state`: [`ZkState<SecretVarMetadata>`], the current zk state.
///
/// ### Returns
///
/// The unchanged state, and a ZkStateChange denoting that the zk-computation should start.
// #[action(shortname = 0x01,zk=true)]
// fn generate_next(
//     context: ContractContext,
//     state: RngContractState,
//     zk_state: ZkState<SecretVarMetadata>,
// ) -> (RngContractState, Vec<EventGroup>, Vec<ZkStateChange>) {
//     // assert_eq!(
//     //     context.sender, state.administrator,
//     //     "Only administrator can start computation"
//     // );
//     assert_eq!(
//         zk_state.calculation_state,
//         CalculationStatus::Waiting,
//         "Computation must start from Waiting state, but was {:?}",
//         zk_state.calculation_state,
//     );

//     let all_variables: Vec<_> = zk_state
//     .secret_variables
//     .iter()
//     .chain(zk_state.pending_inputs.iter())
//     .filter(|(var,meta)| meta.metadata.variable_type == SecretVarType::Setup )
//     .collect();

//     assert!(all_variables.len() as u8>= state.min_setup_contributions, "Setup not done, expect {:?} more contributions", state.min_setup_contributions -all_variables.len() as u8  ) ;

//     (
//         state,
//         vec![],
//         vec![zk_compute::rng_compute_start(&SecretVarMetadata {
//             variable_type: SecretVarType::Generate,
//         })],
//     )
// }

#[zk_on_secret_input(shortname = 0x41, secret_type = "SecretNextData")]
fn generate_next(
    context: ContractContext,
    state: RngContractState,
    zk_state: ZkState<SecretVarMetadata>,
)->(
    RngContractState,
    Vec<EventGroup>,
    ZkInputDef<SecretVarMetadata,SecretNextData>,
){
    // assert_eq!(
    //     context.sender, state.administrator,
    //     "Only administrator can start computation"
    // );
    assert_eq!(
        zk_state.calculation_state,
        CalculationStatus::Waiting,
        "Computation must start from Waiting state, but was {:?}",
        zk_state.calculation_state,
    );

    let all_variables: Vec<_> = zk_state
    .secret_variables
    .iter()
    .chain(zk_state.pending_inputs.iter())
    .filter(|(var,meta)| meta.metadata.variable_type == SecretVarType::Setup )
    .collect();

    assert!(all_variables.len() as u8>= state.min_setup_contributions, "Setup not done, expect {:?} more contributions", state.min_setup_contributions -all_variables.len() as u8  ) ;

    // (
    //     state,
    //     vec![],
    //     vec![zk_compute::rng_compute_start(&SecretVarMetadata {
    //         variable_type: SecretVarType::Generate,
    //     })],
    // )
    let input_def = ZkInputDef::with_metadata(SecretVarMetadata {
        variable_type: SecretVarType::Generate,
    });
    (state, vec![], input_def)
}



#[action(shortname = 0x02, zk = true)]
fn reset_state(
    context: ContractContext,
    state: RngContractState,
    zk_state: ZkState<SecretVarMetadata>,
    min_contributions: u8,
    max_value_count: i8,
) -> (RngContractState, Vec<EventGroup>, Vec<ZkStateChange>) {

    assert_eq!(
        context.sender, state.administrator,
        "Only administrator can reset the state"
    );

    let new_state = RngContractState {
        administrator: context.sender,
        counter: 1,
        min_setup_contributions: min_contributions,
        next_value: vec![],
        value_generation_time:0,
        max_value_count,
        current_result:0,
        temp:None,
    };
    let all_variables = zk_state
        .secret_variables
        .iter()
        .chain(zk_state.pending_inputs.iter())
        .map(|(v, _)| v)
        .collect();

    (
        new_state,
        vec![],
        vec![ZkStateChange::DeleteVariables {
            variables_to_delete: all_variables,
        }],
    )
}

#[action(shortname = 0x03, zk = true)]
fn set_new_admin(
    context: ContractContext,
    mut state: RngContractState,
    zk_state: ZkState<SecretVarMetadata> ,
    new_admin: Address,
) -> (RngContractState, Vec<EventGroup>, Vec<ZkStateChange>) {
    assert_eq!(
        context.sender, state.administrator,
        "Only administrator can reset the state"
    );
    state.administrator=new_admin;
    (
        state,
        vec![],
        vec![],
    )
}
/// Automatically called when a variable is confirmed on chain.
///
/// Unused for this contract, so we do nothing.
///
/// ### Parameters:
///
/// * `ctx`: [`ContractContext`], the context of the current call.
///
/// * `state`: [`ContractState`], the current state of the contract.
///
/// * `zk_state`: [`ZkState<SecretVarMetadata>`], the current zk state.
///
/// * `inputted_variable`: [`SecretVarId`], the id of the inputted secret variable.
///
/// ### Returns
/// The unchanged contract state.
#[zk_on_variable_inputted]
fn inputted_variable(
    context: ContractContext,
    state: RngContractState,
    zk_state: ZkState<SecretVarMetadata>,
    inputted_variable: SecretVarId,
) ->  (RngContractState, Vec<EventGroup>, Vec<ZkStateChange>)  {
    // state
     
    let all_variables: Vec<_> = zk_state
    .secret_variables
    .iter()
    .chain(zk_state.pending_inputs.iter())
    .filter(|(var,meta)| var == &inputted_variable  )
    .collect();

    let var=&all_variables.get(0).unwrap().1;
    if let SecretVarType::Generate {} = var.metadata.variable_type {
        return (
            state,
            vec![],
            vec![zk_compute::rng_compute_start(
                inputted_variable,
                [&SecretVarMetadata {variable_type: SecretVarType::Generate,},
                &SecretVarMetadata {variable_type: SecretVarType::Generate,},]
            )],
        );
    }

    (
        state,
        vec![],
        vec![],
    )
}


/// Automatically called when the computation is completed
///
/// The only thing we do is to instantly open/declassify the output variables.
///
/// ### Parameters:
///
/// * `ctx`: [`ContractContext`], the context of the current call.
///
/// * `state`: [`ContractState`], the current state of the contract.
///
/// * `zk_state`: [`ZkState<SecretVarMetadata>`], the current zk state.
///
/// * `output_variables`: [`Vec<SecretVarId>`], the id's of the output variables.
///
/// ### Returns
///
/// The unchanged state, and a ZkStateChange opening the output variables.
#[zk_on_compute_complete]
fn generate_next_complete(
    context: ContractContext,
    state: RngContractState,
    zk_state: ZkState<SecretVarMetadata>,
    output_variables: Vec<SecretVarId>,
) -> (RngContractState, Vec<EventGroup>, Vec<ZkStateChange>) {
    (
        state,
        vec![],
        vec![ZkStateChange::OpenVariables {
            variables: output_variables,
        }],
    )
}

/// Automatically called when a variable is opened/declassified.
///
/// We can now read the sum variable, and save it in the contract state.
///
/// ### Parameters:
///
/// * `ctx`: [`ContractContext`], the context of the current call.
///
/// * `state`: [`ContractState`], the current state of the contract.
///
/// * `zk_state`: [`ZkState<SecretVarMetadata>`], the current zk state.
///
/// * `opened_variables`: [`Vec<SecretVarId>`], the id's of the opened variables.
///
/// ### Returns
///
/// The new state with the computed sum, and a ZkStateChange denoting that the zk computation is done.
#[zk_on_variables_opened]
fn open_next_variable(
    context: ContractContext,
    mut state: RngContractState,
    zk_state: ZkState<SecretVarMetadata>,
    opened_variables: Vec<SecretVarId>,
) -> (RngContractState, Vec<EventGroup>, Vec<ZkStateChange>) {
    assert_eq!(
        opened_variables.len(),
        2,
        "Unexpected number of output variables"
    );
    let rng_total_var = zk_state
    .get_variable(*opened_variables.get(0).unwrap())
    .unwrap();

    let rng_settings_var= zk_state
    .get_variable(*opened_variables.get(1).unwrap())
    .unwrap();

    let result = read_variable_u64_le(&rng_total_var);
    let settings: NextData = read_variable(&rng_settings_var);

    if let SecretVarType::Generate {} = rng_settings_var.metadata.variable_type {
        //hash counter
        let seed=result ;
        //let rnd: u64=squaresrng::squares64(state.counter,seed);
        //let key=ThreeFryType::new(seed,0);
        //let counter=ThreeFryType::new(state.counter,0);
        let mut counter=state.counter;
        //hash result
        //xor both of them
        // state.next_value=Some();
        let mut count=settings.count; //+128 
        if count > state.max_value_count {
            count=state.max_value_count;
        }

        let range=deserialize_range_value(settings.range);
        let start_u64=*range.get(0).unwrap();//(settings.range_start as i128+I64_TO_U64) as u64;
        let end_u64=*range.get(1).unwrap();//(settings.range_end as i128 +I64_TO_U64) as u64;

        let rng_values=ThreeFryType::get_ranged_num_by_count(start_u64.try_into().unwrap_or_else(|_| panic!("start field error {}", start_u64)),
        end_u64.try_into().unwrap_or_else(|_| panic!("end field error {}", end_u64)),&mut counter, seed, count.try_into().expect("count field u8 error"),MAX_TRIES);
        let full_signature=convert_i64sig_to_str(&mut vec![settings.signature_le_0,settings.signature_le_1,settings.signature_le_2,settings.signature_le_3]);
        let result=RngResult{
            min_value: start_u64,
            max_value: end_u64,
            values:rng_values,
            calculate_timestamp: context.block_production_time,
            sender: Some(context.sender),
            proof: None,
            result_id: state.current_result,
            signature: Some(full_signature),
            // signature_le_0: settings.signature_le_0,
            // signature_le_1: settings.signature_le_1,
            // signature_le_2: settings.signature_le_2,
            // signature_le_3: settings.signature_le_3,
        };
        state.next_value.push(result.clone());
        state.counter=counter;
        state.value_generation_time= context.block_production_time;
        let serialized_result=serialize_result_as_big_endian(result) ;
        state.temp=Some(serialized_result.clone());
        //zk_state_changes = vec![ZkStateChange::ContractDone];
        return (state, vec![],  vec![ZkStateChange::Attest {
            data_to_attest: serialized_result,
        }]);
    }
    else{
        return (state, vec![],  vec![]);
    }
    //Delete extra vars
    // let all_variables = zk_state
    //     .secret_variables
    //     .iter()
    //     .chain(zk_state.pending_inputs.iter())
    //     .filter(|(var,meta)| meta.metadata.variable_type == SecretVarType::Generate )
    //     .map(|(v, _)| v)
    //     .collect();

     
    // (state, vec![],vec![ZkStateChange::DeleteVariables {
    //     variables_to_delete: all_variables,
    // }])
    
}



#[zk_on_attestation_complete]
fn save_attestation( _context: ContractContext,
    mut state: RngContractState,
    zk_state: ZkState<SecretVarMetadata>,
    attestation_id: AttestationId,)->(RngContractState, Vec<EventGroup>, Vec<ZkStateChange>)
{
    let variables_to_delete: Vec<SecretVarId> = zk_state
        .secret_variables
        .iter()
        .filter(|(var,meta)| meta.metadata.variable_type == SecretVarType::Generate )
        .map(|(v,_)|  v)
        .collect();

    let result = state
        .next_value
        .iter_mut()
        .find(|r| r.result_id == state.current_result)
        .unwrap_or_else(|| panic!("Unable to get matching result {}", state.current_result));

    // The signatures provided by the computation nodes can be found on the data attestation object
    // in the zk state. Find the attestation that has the same id as the one provided in the
    // arguments.
    let attestation = zk_state
        .data_attestations
        .iter()
        .find(|(_,a)| a.attestation_id == attestation_id)
        .unwrap();

    // Parse the signatures into a text format that can be used in an Eth transaction without
    // further data conversions. The format is an array of the signatures in hex encoding.
    let proof_of_result = format! {"[{}]", attestation.1
    .signatures
    .iter()
    .map(|m| as_evm_string(m.as_ref().unwrap()))
    .collect::<Vec<String>>()
    .join(", ")};

    // Save the proof on the result object for convenient retrieval.
    result.proof = Some(proof_of_result);
    state.current_result=state.current_result+1;
    // Return the tuple with the new updated state, no events, and an update to notify the runtime
    // environment to delete the variables and set the calculation status to Waiting. This ensures
    // that the contract will accept secret votes for the next round.
    (
        state,
        vec![],
        vec![ZkStateChange::DeleteVariables {
            variables_to_delete,
        }],
    )
}

/// Reads a variable's data as an u32.
///
/// ### Parameters:
///
/// * `zk_state`: [`&ZkState<SecretVarMetadata>`], the current zk state.
///
/// * `sum_variable_id`: [`Option<&SecretVarId>`], the id of the secret variable to be read.
///
/// ### Returns
/// The value of the variable as an [`u32`].
fn _read_variable_u32_le(
    zk_state: &ZkState<SecretVarMetadata>,
    sum_variable_id: Option<&SecretVarId>,
) -> u32 {
    let sum_variable_id = *sum_variable_id.unwrap();
    let sum_variable = zk_state.get_variable(sum_variable_id).unwrap();
    let mut buffer = [0u8; 4];
    buffer.copy_from_slice(sum_variable.data.as_ref().unwrap().as_slice());
    <u32>::from_le_bytes(buffer)
}


fn serialize_result_as_big_endian(result: RngResult) -> Vec<u8> {
    let mut output: Vec<u8> = vec![];
    // (result.values.len() as u64).rpc_write_to(&mut output).expect("Unable to serialize len of values");
    // for i in result.values.iter() {
    //     i.rpc_write_to(&mut output).expect("Unable to serialize value");
    // }
    result.values.rpc_write_to(&mut output).expect("Unable to serialize value");
    result
    .min_value
    .rpc_write_to(&mut output)
    .expect("Unable to serialize min value");
    result
    .max_value
    .rpc_write_to(&mut output)
    .expect("Unable to serialize max value");
    result
    .calculate_timestamp
    .rpc_write_to(&mut output)
    .expect("Unable to serialize timestamp");
    result
    .signature.map(|m| m.rpc_write_to(&mut output)
    .expect("Unable to serialize signature"));
    // result
    // .signature_le_0
    // .rpc_write_to(&mut output)
    // .expect("Unable to serialize signature part 0");
    // result
    // .signature_le_1
    // .rpc_write_to(&mut output)
    // .expect("Unable to serialize signature part 1");
    // result
    // .signature_le_2
    // .rpc_write_to(&mut output)
    // .expect("Unable to serialize signature part 2");
    // result
    // .signature_le_3
    // .rpc_write_to(&mut output)
    // .expect("Unable to serialize signature part 3");
    
     
    output
}


fn as_evm_string(signature: &Signature) -> String {
    // Ethereum expects that the recovery id has value 0x1B or 0x1C, but the algorithm used by PBC
    // outputs 0x00 or 0x01. Add 27 to the recovery id to ensure it has an expected value, and
    // format as a hexidecimal string.
    let recovery_id = signature.recovery_id + 27;
    let recovery_id = format!("{recovery_id:02x}");
    // The r value is 32 bytes, i.e. a string of 64 characters when represented in hexidecimal.
    let mut r = String::with_capacity(64);
    // For each byte in the r value format is a hexidecimal string of length 2 to ensure zero
    // padding, and write it to the output string defined above.
    for byte in signature.value_r {
        write!(r, "{byte:02x}").unwrap();
    }
    // Do the same for the s value.
    let mut s = String::with_capacity(64);
    for byte in signature.value_s {
        write!(s, "{byte:02x}").unwrap();
    }
    // Combine the three values into a single string, prepended with "0x".
    format!("0x{r}{s}{recovery_id}")
}

fn _read_variable_u128_le(
    sum_variable: &ZkClosed<SecretVarMetadata>
) -> u128 {
    let mut buffer = [0u8; 16];
    buffer.copy_from_slice(sum_variable.data.as_ref().unwrap().as_slice());
    <u128>::from_le_bytes(buffer)
}

fn read_variable_u64_le(
    sum_variable: &ZkClosed<SecretVarMetadata>
) -> u64 {
    let mut buffer = [0u8; 8];
    buffer.copy_from_slice(sum_variable.data.as_ref().unwrap().as_slice());
    <u64>::from_le_bytes(buffer)
}

fn read_variable<T: ReadWriteState>(
    variable: &ZkClosed<SecretVarMetadata>
) -> T {
    let buffer: Vec<u8> = variable.data.clone().unwrap();
    T::state_read_from(&mut buffer.as_slice())
}


fn serialize_range_value(start_val: u64, end_val: u64)->u64{
    let mut temp=start_val;
    let mut bits=0;
    while temp>0{
         
        bits+=1;
        temp = temp >> 1;
        
    }
    let diff=end_val-start_val;
    let mut size_bits=(0..6).map(|m| (bits>>m) & (1)).collect::<Vec<u64>>();
   // size_bits.reverse();
    let  mut start_bits=(0..bits as usize).map(|m| (start_val>>m) & (1)).collect::<Vec<u64>>();
//    start_bits.reverse();
    let  mut end_bits=(0..(64-bits-6) as usize).map(|m| (diff>>m) & (1)).collect::<Vec<u64>>();
  //  end_bits.reverse();
    let mut final_array:Vec<u64>=vec![];
    final_array=size_bits.iter().chain(start_bits.iter())
    .chain(end_bits.iter()).map(|m| *m).collect::<Vec<u64>>();
    let val:u64 = (0..63).fold(0,|acc,x| acc + &final_array[x] * (1<<x));
    val
    
}

fn deserialize_range_value(val: i64)->Vec<u64>{
    let mut val=(val as i128 +I64_TO_U64) as u64;
    // 6 + 58
    let start_size=val & ((1<<6)-1);
    val=val >>  6;
    let start_val= val & ((1<< start_size) - 1);
    val=val >> start_size;
    let end_val=start_val+val;
    return vec![start_val,end_val];
}

fn convert_i64sig_to_str(sigs: &mut Vec<i64>)-> String{
    sigs.reverse();
    sigs.iter().map(|m| format!("{:016x}", (*m as i128+I64_TO_U64) as u64)).collect::<Vec<String>>().join("")
}