const PHILOX_M2_64_0: &str="d2b74407b1ce6e93";
const PHILOX_M2_64: [&'static str;1]=[PHILOX_M2_64_0];

const PHILOX_M4_64_0: &str="d2b74407b1ce6e93";
const PHILOX_M4_64_1: &str="ca5a82695121157";
const PHILOX_M4_64: [&'static str;2]= [PHILOX_M4_64_0,PHILOX_M4_64_1];


//32 bit
const PHILOX_M2_32_0: &str = "0xd256d193";
const PHILOX_M2_32: [&'static str;1]= [PHILOX_M2_32_0];

const PHILOX_M4_32_0: &str = "0xd2511f53";
const PHILOX_M4_32_1: &str = "0xcd9ee8d57";
const PHILOX_M4_32: [&'static str;2]= [PHILOX_M4_32_0, PHILOX_M4_32_1];

//64 bit
const PHILOX_W_64_0: &str = "0x9e3779b97f4a7C15";   //golden ratio
const PHILOX_W_64_1: &str = "0xbb67ae8584caa73b" ;  //sqrt(3)-1
const PHILOX_W_64: [&'static str;2]=  [PHILOX_W_64_0, PHILOX_W_64_1];

//32 bit
const PHILOX_W_32_0: &str = "0x9e3779b9";   // golden ratio
const PHILOX_W_32_1: &str = "0xbb67ae85";   // sqrt(3)-1
const PHILOX_W_32: [&'static str;2]=  [PHILOX_W_32_0, PHILOX_W_32_1];

const VAL_1: usize = 0;
const VAL_2: usize  = 1;
const VAL_3: usize  = 2;
const VAL_4: usize  = 3;

const MASK_64:&str = "0xffffffffffffffff";
const MASK_32: &str = "0xffffffff";

//def philox2_32(counter, key, rounds=10):
//  return philox(counter, key, philox2_round, PHILOX_M2_32, philox2_bumpkey, PHILOX_W_32, 32, MASK_32, rounds)

struct Philox{
    seed: u64,
    counter: Vec<u64>,
    p: u8,
}

impl Philox{
    // fn philox2_32(&self, counter, key, rounds)->{

    // }
    // def philox(counter, key, philox_round, philox_m, philox_bumpkey, philox_w, len_w, mask_w, rounds = 10):
    //     for i in range(rounds - 1):
    //         philox_round(counter, key, philox_m, len_w, mask_w) # updates counter
    //         philox_bumpkey(key, philox_w, len_w, mask_w) # updates key
    //     philox_round(counter, key, philox_m, len_w, mask_w) # updates counter
    //     return counter
    

}
