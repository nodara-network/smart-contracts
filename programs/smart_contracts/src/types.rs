use anchor_lang::prelude::*;

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum TaskType {
    LocationProof = 0,
    Compute = 1,
    BandwidthRelay = 2,
    ZKProofGen = 3,
}
