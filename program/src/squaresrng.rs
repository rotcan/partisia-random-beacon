 
 
pub fn squares64(counter: u64, seed: u64) -> u64{
    let mut x: u64=counter;
    x=x.overflowing_mul(seed).0;
    let y=x;
    
    let z= y.overflowing_add(seed).0;

    //round1
    x=x.overflowing_mul(x).0;
    x=x.overflowing_add(y).0;
    x=(x.overflowing_shr(32).0) | (x.overflowing_shl(32).0);

    //round2
    x=x.overflowing_mul(x).0;
    x=x.overflowing_add(z).0;
    x=(x.overflowing_shr(32).0) | (x.overflowing_shl(32).0);

    //round3
    x=x.overflowing_mul(x).0;
    x=x.overflowing_add(y).0;
    x=(x.overflowing_shr(32).0) | (x.overflowing_shl(32).0);

    //round4
    x=x.overflowing_mul(x).0;
    x=x.overflowing_add(z).0;
    let t=x;
    x=(x.overflowing_shr(32).0) | (x.overflowing_shl(32).0);

    x=x.overflowing_mul(x).0;
    //round5
    t.overflowing_pow((x.overflowing_add(y).0).overflowing_shr(32).0.try_into().unwrap()).0
    
    
}