use cosmwasm_std::{
    Env, MessageInfo, DepsMut, Response, to_binary, BankMsg, Coin, CosmosMsg,
    StdError, Uint128, WasmMsg, Addr,
};

use std::convert::TryFrom;
use std::u128;
use crate::error::ContractError;
use crate::msg::{ExecuteMsg, ReferralMsg};
use crate::tokens::query_total_supply;

use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use cw20::Cw20ExecuteMsg;

use crate::staking::{get_rewards, stake_msg, se_arch_exchange_rate, barch_exchange_rate};
use crate::types::killswitch::KillSwitch;
use crate::types::validator_set::{VALIDATOR_SET};
use crate::utils::calc_threshold;
use crate::types::config::CONFIG;
use crate::state::{STATE,RewardExecuteMsg};

const FEE_RESOLUTION: u128 = 100_000;

/**
 * Deposit arch amount to the contract and mint seArch tokens using seArch exchange rate.
 */
pub fn try_stake(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: ExecuteMsg,
    referral: u64
) -> Result<Response, ContractError> {
    let mut messages: Vec<CosmosMsg> = vec![];

    let mut amount_raw: Uint128 = Uint128::default();
    let config = CONFIG.load(deps.storage)?;
    let mut state = STATE.load(deps.storage)?;

    if config.paused == true {
        return Err(ContractError::Std(StdError::generic_err(
            "The contract is temporarily paused",
        )));
    }

    let kill_switch = KillSwitch::try_from(config.kill_switch)?;

    if kill_switch == KillSwitch::Unbonding || kill_switch == KillSwitch::Open {
        return Err(ContractError::Std(StdError::generic_err(
            "Contract has been frozen. New deposits are not currently possible",
        )));
    }

    // read amount of arch sent by user on deposit
    for coin in &_info.funds {
        if coin.denom == "uconst" {
            amount_raw = coin.amount
        }
    }

    if !config.referral_contract.is_none() && referral != 0 {
        messages.push(
            CosmosMsg::Wasm(WasmMsg::Execute {
                contract_addr:  config.referral_contract.unwrap_or(Addr::unchecked("")).to_string(),
                msg: to_binary(&ReferralMsg::Deposit { recipient: _info.sender.to_string(), code: referral, amount: amount_raw })?,
                funds: vec![],
            })
        )
    }

    // if arch was not sent
    if amount_raw == Uint128::default() {
        return Err(ContractError::Std(StdError::generic_err(
            "Can only deposit a minimum of 1,000,000 uconst (1 arch)".to_string(),
        )));
    }

    // if less than 1 arch was sent
    if amount_raw.u128() < 1_000_000 {
        return Err(ContractError::Std(StdError::generic_err(
            "Can only deposit a minimum of 1,000,000 uconst (1 arch)".to_string(),
        )));
    }

    let seArch_token = config.seArch_token.ok_or_else(|| {
        ContractError::Std(StdError::generic_err(
            "seArch token addr not registered".to_string(),
        ))
    })?.to_string();

    // exch rate (arch staked + arch waiting withdraw) / (total supply in seArch)
    let exch_rate = se_arch_exchange_rate(deps.storage, deps.querier)?;

    // Update deposit amount
    state.to_deposit += amount_raw;
    state.seArch_backing += amount_raw;
    STATE.save(deps.storage, &state)?;
    // debug_print!("To deposit amount = {}", config.to_deposit);

    // Calculate amount of seArch to be minted
    let token_amount = calc_deposit(amount_raw, exch_rate)?;

    let mint_msg = Cw20ExecuteMsg::Mint {
        recipient: _info.sender.to_string(),
        amount: token_amount.into()
    };

    // mint message
    messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: seArch_token,
        msg: to_binary(&mint_msg)?,
        funds: vec![],
    }));

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "stake_for_seArch")
        .add_attribute("account", _info.sender.clone())
        .add_attribute("exch_rate_used", exch_rate.to_string())
        .add_attribute("seArch amount", &token_amount.to_string()))
}

/**
 * Deposit arch amount to the contract and mint barch tokens using barch exchange rate.
 */
pub fn try_stake_for_barch(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: ExecuteMsg,
    referral: u64
) -> Result<Response, ContractError> {
    let mut messages: Vec<CosmosMsg> = vec![];

    let mut amount_raw: Uint128 = Uint128::default();
    let config = CONFIG.load(deps.storage)?;
    let mut state = STATE.load(deps.storage)?;

    if config.paused == true {
        return Err(ContractError::Std(StdError::generic_err(
            "The contract is temporarily paused",
        )));
    }

    let kill_switch = KillSwitch::try_from(config.kill_switch)?;

    if kill_switch == KillSwitch::Unbonding || kill_switch == KillSwitch::Open {
        return Err(ContractError::Std(StdError::generic_err(
            "Contract has been frozen. New deposits are not currently possible",
        )));
    }

    // read amount of arch sent by user on deposit
    for coin in &_info.funds {
        if coin.denom == "uconst" {
            amount_raw = coin.amount
        }
    }

    if !config.referral_contract.is_none() && referral != 0 {
        messages.push(
            CosmosMsg::Wasm(WasmMsg::Execute {
                contract_addr:  config.referral_contract.unwrap_or(Addr::unchecked("")).to_string(),
                msg: to_binary(&ReferralMsg::Deposit { recipient: _info.sender.to_string(), code: referral, amount: amount_raw })?,
                funds: vec![],
            })
        )
    }

    // if arch was not sent
    if amount_raw == Uint128::default() {
        return Err(ContractError::Std(StdError::generic_err(
            "Can only deposit a minimum of 1,000,000 uconst (1 arch)".to_string(),
        )));
    }

    // if less than 1 arch was sent
    if amount_raw.u128() < 1_000_000 {
        return Err(ContractError::Std(StdError::generic_err(
            "Can only deposit a minimum of 1,000,000 uconst (1 arch)".to_string(),
        )));
    }

    let barch_token = config.barch_token.ok_or_else(|| {
        ContractError::Std(StdError::generic_err(
            "barch token addr not registered".to_string(),
        ))
    })?.to_string();

    // exch rate (arch staked + arch waiting withdraw) / (total supply in barch)
    // TODO: read exch rate for barch from state stored
    let exch_rate = barch_exchange_rate(deps.storage, deps.querier)?;

    // Update deposit amount
    state.to_deposit += amount_raw;
    state.barch_backing += amount_raw;
    STATE.save(deps.storage, &state)?;
    // debug_print!("To deposit amount = {}", config.to_deposit);

    // Calculate amount of barch to be minted
    let mut token_amount = calc_deposit(amount_raw, exch_rate)?;

    // peg recovery fee
    let barch_threshold = Decimal::from(config.er_threshold)/Decimal::from(1000u64);
    let recovery_fee = Decimal::from(config.peg_recovery_fee)/Decimal::from(1000u64);
    if exch_rate < barch_threshold {
        let max_peg_fee = recovery_fee.checked_mul(Decimal::from(token_amount)).unwrap();
        let required_peg_fee =
            query_total_supply(deps.querier, &Addr::unchecked(barch_token.clone()))?.u128()
            .saturating_sub(state.barch_to_burn.u128() + state.barch_backing.u128());
        let peg_fee = max_peg_fee.min(Decimal::from(required_peg_fee)).to_u128().unwrap();
        token_amount = token_amount.checked_sub(peg_fee).unwrap();
    }

    let mint_msg = Cw20ExecuteMsg::Mint {
        recipient: _info.sender.to_string(),
        amount: token_amount.into()
    };

    // mint message
    messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: barch_token,
        msg: to_binary(&mint_msg)?,
        funds: vec![],
    }));

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "stake_for_barch")
        .add_attribute("account", _info.sender.clone())
        .add_attribute("exch_rate_used", exch_rate.to_string())
        .add_attribute("barch amount", &token_amount.to_string()))
}

/**
 * Claim and stake amount to validators
 * Claim all outstanding rewards from validators and stake them.
 * If deposit + rewards amount is greater than threshold divide and
 * stake it into multiple validators,
 * else stake into validator with least stake
 */
pub fn try_claim_stake(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    _msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    let mut messages: Vec<CosmosMsg> = vec![];

    let config = CONFIG.load(deps.storage)?;
    let mut state = STATE.load(deps.storage)?;
    let mut validator_set = VALIDATOR_SET.load(deps.storage)?;

    if config.paused == true {
        return Err(ContractError::Std(StdError::generic_err(
            "The contract is temporarily paused",
        )));
    }

    //TODO: check slashing on localnet
    let slashing_amount = (state.seArch_backing + state.barch_backing).saturating_sub(state.to_deposit + Uint128::from(validator_set.total_staked()));

    let barch_slashing_amount = calc_barch_reward(slashing_amount,state.barch_backing,state.seArch_backing)?;

    state.barch_backing = state.barch_backing.saturating_sub(Uint128::from(barch_slashing_amount));
    state.seArch_backing = state.seArch_backing.saturating_sub(Uint128::from(slashing_amount.u128().saturating_sub(barch_slashing_amount)));

    // claim rewards
    messages.append(&mut validator_set.withdraw_rewards_messages());

    let reward_amount = get_rewards(deps.storage, deps.querier, &env.contract.address).unwrap_or_default();

    let fee = calc_fee(reward_amount, config.dev_fee);
    // Move fees to claim reward function only if fee > 0
    if (fee * 999 / 1000) > 0 {  // leave a tiny amount in the contract for round error purposes
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: config.dev_address.to_string(),
            amount: vec![Coin {
                denom: "uconst".to_string(),
                amount: Uint128::from(fee * 999 / 1000),
            }],
        }));
    }

    let total_reward_gen = Uint128::from(reward_amount.u128().saturating_sub(fee as u128));

    /*
     * LOGIC TO MOVE REWARD TO REWARD CONTRACT FOR barch
     */
    let reward_contract_addr = if let Some(addr) = config.rewards_contract {
        addr.to_string()
    }else{
        return Err(ContractError::Std(StdError::generic_err(
            "Reward contract is not registered",
        )));
    };

    let barch_reward = calc_barch_reward(total_reward_gen,state.barch_backing,state.seArch_backing)?;

    if barch_reward > 0 {
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: reward_contract_addr.clone(),
            amount: vec![Coin {
                denom: "uconst".to_string(),
                amount: Uint128::from(barch_reward),
            }],
        }));
    }

    let global_idx_update_msg = RewardExecuteMsg::UpdateGlobalIndex{};
    messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: reward_contract_addr.clone(),
        msg: to_binary(&global_idx_update_msg)?,
        funds: vec![],
    }));

    let reward_to_add = total_reward_gen.checked_sub(Uint128::from(barch_reward)).unwrap();

    state.seArch_backing += reward_to_add;

    let deposit_amount = state.to_deposit.u128() + reward_to_add.u128();

    state.to_deposit = Uint128::from(0u128);
    // debug_print!("To deposit amount = {}", config.to_deposit);

    let val_count = validator_set.validators.len();
    let total_staked = validator_set.total_staked();

    // only call Delegate msg when deposit_amount > 0
    if deposit_amount > calc_threshold(total_staked, val_count) {
        // divide and deposit to multiple validators
        // check division
        if val_count == 0 {
            return Err(ContractError::Std(StdError::generic_err("No validator found!")));
        }
        let to_stake = deposit_amount.checked_div(val_count as u128).unwrap();
        let mut validator_idx: u128 = 0;

        for validator in validator_set.clone().validators.iter() {
            let mut to_stake_amt = to_stake;
            if validator_idx == val_count.clone().to_u128().unwrap()-1 {
                to_stake_amt = deposit_amount.saturating_sub(
                    to_stake.checked_mul(val_count.clone().to_u128().unwrap()-1).unwrap()
                );
            }
            validator_set.stake_at(&validator.address, to_stake_amt)?;
            // debug_print!("Staked {} at {}", to_stake_amt, validator.address);
            messages.push(stake_msg(&validator.address.clone(), to_stake_amt));
            validator_idx += 1;
        }
    } else if deposit_amount > 0 {
        // deposit to single validator with least staked amount
        // add the amount to our stake tracker
        let validator = validator_set.stake_with_least(deposit_amount)?;
        // send the stake message
        messages.push(stake_msg(&validator, deposit_amount));
    }

    validator_set.rebalance();
    VALIDATOR_SET.save(deps.storage, &validator_set)?;

    // Burn converted barch or seArch
    if state.barch_to_burn.u128() > 0 {
        let burn_msg = Cw20ExecuteMsg::Burn {
            amount: state.barch_to_burn
        };

        messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr: config.barch_token.ok_or_else(|| {
                ContractError::Std(StdError::generic_err(
                    "barch token addr not registered".to_string(),
                ))
            })?.to_string(),
            msg: to_binary(&burn_msg)?,
            funds: vec![],
        }));
        state.barch_to_burn = Uint128::from(0u128);
    }
    if state.seArch_to_burn.u128() > 0 {
        let burn_msg = Cw20ExecuteMsg::Burn {
            amount: state.seArch_to_burn
        };

        messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr: config.seArch_token.ok_or_else(|| {
                ContractError::Std(StdError::generic_err(
                    "seArch token addr not registered".to_string(),
                ))
            })?.to_string(),
            msg: to_binary(&burn_msg)?,
            funds: vec![],
        }));
        state.seArch_to_burn = Uint128::from(0u128);
    }

    STATE.save(deps.storage, &state)?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "claim_and_stake")
        .add_attribute("rewards_claimed", reward_amount.to_string())
        .add_attribute("deposit amount", deposit_amount.to_string()))
}

/**
 * Calculates how much your deposited arch is worth in tokens
 * Adds the balance from the total supply and balance
 * Returns amount of tokens you get
 */
pub fn calc_deposit(
    amount: Uint128,
    exchange_rate: Decimal,
) -> Result<u128, ContractError> {
    let tokens_to_mint = Decimal::from(amount.u128() as u64)
        .checked_div(exchange_rate)
        .unwrap()
        .to_u128()
        .unwrap();

    Ok(tokens_to_mint)
}

/**
 * Calculates amount of fees from reward amount
 * and percentage of dev fees set in config.
 *
 * Returns amount of arch tokens in dev fees.
 */
pub fn calc_fee(amount: Uint128, fee: u64) -> u128 {
    amount
        .u128()
        .saturating_mul(fee as u128)
        .checked_div(FEE_RESOLUTION)
        .unwrap_or(0)
}
pub fn calc_barch_reward(
    total_reward: Uint128,
    barch_backing: Uint128,
    seArch_backing:Uint128
) -> Result<u128, ContractError> {
    
    let total_arch = Decimal::from(barch_backing.u128() + seArch_backing.u128());
    let barch_decimal = Decimal::from(barch_backing.u128());

    if (seArch_backing + barch_backing) == Uint128::from(0u128) {
        return Ok((seArch_backing + barch_backing).u128())
    }

    let barch_ratio = barch_decimal / total_arch;

    let barch_reward_amount = barch_ratio
    .checked_mul(Decimal::from(total_reward.u128()))
    .unwrap()
    .to_u128()
    .unwrap();

    Ok(barch_reward_amount)
}
