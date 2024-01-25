
const KEY_LENGTH: u64=3;
const MASK: u64 = u64::MAX-1;
const NW_THREEFRY: u64 = 2;
const ROTATION: [u32;8] = [16, 42, 12, 31, 16, 32, 24, 21];
const C240_HEX: &str="1bd11bdaa9fc1a22";
const N_ROUNDS_THREEFRY: u64=20;

#[derive(Debug,Clone,Copy)]
pub struct ThreeFryType{
    c0: u64,
    c1: u64,
}

impl ThreeFryType{
    pub fn new(c0: u64, c1: u64)->Self{
        ThreeFryType{
            c0,c1
        }
    }

    
    fn rotl_64(x: u64, d: u32)->u64{
        ((x.overflowing_shl(d).0) | (x.overflowing_shr(64-d).0)) & MASK
    }

    fn mix(x: &mut ThreeFryType , R: u32){
        x.c0=x.c0.overflowing_add(x.c1).0;
        x.c1= Self::rotl_64(x.c1, R) ^ x.c0;
        
    }

    // fn power(x: u64, p: u64)->u64{
    //     let b0=u32::try_from((p%(u32::MAX as u64)) as u32).unwrap();
    //     let b1=u32::try_from((p/(u32::MAX as u64)) as u32).unwrap();
    //     let y2=x.overflowing_pow(b0).0;
    //     if b1>0 {
    //         let mut y1=x.overflowing_pow(u32::MAX).0;
    //         y1=y1.overflowing_pow(b1).0;
    //         y1=y1.overflowing_mul(y2).0;
    //         return y1;
    //     }
    //     y2
    // }

    // fn key_schedule_threefry(K: Vec<u64>, s: u64)->Vec<u64>{
    //     let mut response: Vec<u64>=vec![];
    //     for i in 0..NW_THREEFRY as usize{
    //         response.push(&K[((s)%(NW_THREEFRY+1)) as usize] & MASK);
    //     }
    //     //return [&K[(s)%(NW_THREEFRY+1)] & MASK,
    //     //          (&K[(s+1)%(NW_THREEFRY+1)] + s) & MASK]
    //     response
    // }

    pub fn threefry(p: ThreeFryType,k: ThreeFryType)->u64{
        let c240 = u64::from_str_radix(C240_HEX, 16).unwrap();
        let k: [u64;3] = [k.c0,k.c1, c240^k.c0^k.c1];
        let mut rmod4: u64=0;
        let mut rdiv4: u64=0;
        let mut x:ThreeFryType = p.clone();
        for r in 0..N_ROUNDS_THREEFRY{
            rmod4 = (r%4) as u64;
            if rmod4==0 {
            rdiv4 = (r/4) as u64;
            x.c0 =x.c0.overflowing_add(k[(rdiv4%KEY_LENGTH) as usize]).0;
            x.c1 =x.c1.overflowing_add(k[((rdiv4+1)%KEY_LENGTH) as usize]).0.overflowing_add(rdiv4).0;
            }
            Self::mix(&mut x, ROTATION[(r%8) as usize]);
        }
    
        //v = [(x + k) & MASK for x, k in zip(v, ksi)]
        x.c0
    }

    pub fn get_ranged_num_by_count(start: u64,end: u64,counter: &mut u64, seed: u64,count: u8,max_tries: u8)->Vec<u64>{
        let mut total: Vec<u64>=vec![];
        for i in 0..count as usize{
            total.push(Self::get_ranged_num_div_unbiased(start,end,counter,seed,max_tries));
        }
        total
    }

    fn get_ranged_num_div_unbiased(start: u64,end: u64,counter: &mut u64, seed: u64,max_tries: u8)->u64{
        let range=end- start;
        //uint32_t divisor = ((-range) / range) + 1;
        let divisor=(0u64.overflowing_sub(range).0 /range)+1;
        //println!("divisor={}",divisor);
        if divisor == 0 { // overflow, it's really 2**32
            return 0;
        }
        for i in 0..max_tries {
            let rnd=Self::threefry(ThreeFryType::new(*counter,0),ThreeFryType::new(seed,0));
            let val = rnd/ divisor;
            if val < range{
                *counter +=1;
                return val+start;
            }
        }
        0
    }

    fn get_ranged_num_lemire(start: u64,end: u64,counter: &mut u64, seed: u64,max_tries: u8)->u64{
        let range=end- start;
  
        let mut l=Self::get_rnd_num(*counter, seed, range);
        *counter +=1;
        if l<range{
            let mut max_tries = max_tries;
            let t=(0u64-range) % range;
            while l<t && max_tries>0 {
                l=Self::get_rnd_num(*counter, seed, range);
                *counter +=1;
                max_tries-=1;
            }
        }
        l+start
        
    }

    fn get_rnd_num(counter: u64, seed: u64, range: u64 )->u64{
        let rnd=Self::threefry(ThreeFryType::new(counter,0),ThreeFryType::new(seed,0));
        let rnd_new: u128=(rnd as u128) * (range as u128);
        rnd_new as u64 
        
    }
}

