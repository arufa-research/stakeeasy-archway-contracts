use cw_storage_plus::Item;

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use cosmwasm_std::{Uint128};

pub const STATE: Item<State> = Item::new("state");

pub const SEARCH_FROZEN_TOTAL_ONCHAIN: Item<Uint128> = Item::new("SEARCH_FROZEN_TOTAL_ONCHAIN");
pub const SEARCH_FROZEN_TOKENS: Item<Uint128> = Item::new("SEARCH_FROZEN_TOKENS");

pub const BARCH_FROZEN_TOTAL_ONCHAIN: Item<Uint128> = Item::new("BARCH_FROZEN_TOTAL_ONCHAIN");
pub const BARCH_FROZEN_TOKENS: Item<Uint128> = Item::new("BARCH_FROZEN_TOKENS");


#[derive(Serialize, Debug, Deserialize, Clone, PartialEq)]
pub struct State {
    pub seArch_backing: Uint128,    // amount of arch backing seArch in circulation
    pub barch_backing: Uint128,     // amount of arch backing barch in circulation
    pub to_deposit: Uint128, // amount of arch to be deposited but not yet deposited to validators
    pub not_redeemed: Uint128, // amount of arch matured but not redeemed by user
    pub seArch_under_withdraw: Uint128, // amount of seArch under 21 days withdraw
    pub barch_under_withdraw: Uint128, // amount of arch under 21 days withdraw
    pub arch_under_withdraw: Uint128,
    pub seArch_to_burn: Uint128,
    pub barch_to_burn: Uint128,
}

// for reward contrct's global index execution
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum RewardExecuteMsg {
    UpdateGlobalIndex {}
}
