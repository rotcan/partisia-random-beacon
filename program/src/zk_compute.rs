/// Template zk computation. Computes the sum of the secret variables.
use pbc_zk::*;
use create_type_spec_derive::CreateTypeSpec;
#[allow(unused)]
const SETUP_TYPE: u8 = 0u8;

#[allow(unused)]
#[derive(pbc_zk::SecretBinary, Clone, CreateTypeSpec)]
pub struct SecretNextData {
  //  id: Sbi64,
    range_start: Sbi64,
    range_end: Sbi64,
    count: Sbi8,
}

#[zk_compute(shortname = 0x61)]
pub fn rng_compute(input_id: SecretVarId) -> (Sbi64,SecretNextData) {
      let mut sum: Sbi64 = Sbi64::from(0);
      let mut next_data = load_sbi::<SecretNextData>(input_id);
      // Sum each variable
      for variable_id in secret_variable_ids() {
        if load_metadata::<u8>(variable_id) == SETUP_TYPE {
          sum = sum ^ load_sbi::<Sbi64>(variable_id);
        }
      }

      (sum,next_data)
}
