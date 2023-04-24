use std::cmp::min;
use std::convert::TryFrom;

use cosmwasm_std::{
    BankMsg, Coin, CosmosMsg, Env, Response, Addr,
    StdError, Uint128, DepsMut, MessageInfo, WasmMsg, to_binary
};
use cw20::{Cw20ReceiveMsg, Cw20ExecuteMsg};
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;

use crate::ContractError;
use crate::msg::ReferralMsg;
use crate::deposit::{calc_fee, calc_barch_reward};
use crate::staking::{get_rewards, stake_msg, se_arch_exchange_rate, barch_exchange_rate, get_balance};
// use crate::state::get_frozen_exchange_rate;
use crate::state::{STATE,RewardExecuteMsg};
use crate::tokens::query_total_supply;
use crate::types::config::CONFIG;
use crate::types::killswitch::KillSwitch;
use crate::types::validator_set::{VALIDATOR_SET};
use crate::types::window_manager::WINDOW_MANANGER;
use crate::utils::{calc_threshold, calc_withdraw};

const MINIMUM_WITHDRAW: u128 = 10_000; // 0.01 seArch

/**
 * Adds user addr, amount to active withdraw window
 * barch is true when withdrawing arch for barch tokens.
 * barch is false when withdrawing arch for seArch tokens.
 */
pub fn try_withdraw(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    _cw20_msg: Cw20ReceiveMsg,
    barch: bool,
) -> Result<Response, ContractError> {
    let mut messages: Vec<CosmosMsg> = vec![];

    let config = CONFIG.load(deps.storage)?;
    let mut state = STATE.load(deps.storage)?;
    let kill_switch = KillSwitch::try_from(config.kill_switch)?;

    if kill_switch == KillSwitch::Unbonding {
        return Err(ContractError::Std(StdError::generic_err(
            "Contract has been frozen.
                You must wait till unbonding has finished,
                then you will be able to withdraw your funds",
        )));
    }

    if kill_switch == KillSwitch::Open {
        return release_tokens(deps, env, _info, _cw20_msg, barch);
    }

    // cannot withdraw less than 0.01 seArch or barch (10_000 seArch or barch without decimals)
    if _cw20_msg.amount < Uint128::from(MINIMUM_WITHDRAW) {
        return Err(ContractError::Std(StdError::generic_err(format!(
            "Amount withdrawn below minimum of {:?} useArch or ubarch",
            MINIMUM_WITHDRAW
        ))));
    }

    if !config.referral_contract.is_none() {
        messages.push(
            CosmosMsg::Wasm(WasmMsg::Execute {
                contract_addr:  config.referral_contract.unwrap_or(Addr::unchecked("")).to_string(),
                msg: to_binary(&ReferralMsg::Withdraw { recipient: _cw20_msg.sender.clone(), barch: barch, amount: _cw20_msg.amount })?,
                funds: vec![],
            })
        )
    }

    let mut validator_set = VALIDATOR_SET.load(deps.storage)?;
    let mut window_manager = WINDOW_MANANGER.load(deps.storage)?;

    let mut total_se_arch_amount = window_manager.queue_window.total_seArch;
    let mut user_se_arch_amount = window_manager.get_user_seArch_in_active_window(
        deps.storage,
        Addr::unchecked(_cw20_msg.sender.clone()),
    )?;
    let mut total_barch_amount = window_manager.queue_window.total_barch;
    let mut user_barch_amount = window_manager.get_user_barch_in_active_window(
        deps.storage,
        Addr::unchecked(_cw20_msg.sender.clone()),
    )?;

    let mut peg_fee = 0u128;

    // Store user's seArch or barch amount in active window (WithdrawWindow)
    if !barch { // seArch sent by user
        window_manager.add_user_amount_to_active_window(
            deps.storage,
            Addr::unchecked(_cw20_msg.sender.clone()),
            _cw20_msg.amount,
            Uint128::from(0u128)
        )?;
        total_se_arch_amount = window_manager.queue_window.total_seArch;
        user_se_arch_amount = window_manager.get_user_seArch_in_active_window(
            deps.storage,
            Addr::unchecked(_cw20_msg.sender.clone()),
        )?;
    }
    else { // barch sent by user
        let barch_exch_rate = barch_exchange_rate(deps.storage, deps.querier)?;
        let mut barch_amount = _cw20_msg.amount.clone().u128();
        let barch_token = config.barch_token.ok_or_else(|| {
            ContractError::Std(StdError::generic_err(
                "barch token addr not registered".to_string(),
            ))
        })?.to_string();

        // peg recovery fee
        let barch_threshold = Decimal::from(config.er_threshold)/Decimal::from(1000u64);
        let recovery_fee = Decimal::from(config.peg_recovery_fee)/Decimal::from(1000u64);
        if barch_exch_rate < barch_threshold {
            let max_peg_fee = recovery_fee.checked_mul(Decimal::from(barch_amount)).unwrap();
            let required_peg_fee =
                query_total_supply(deps.querier, &Addr::unchecked(barch_token.clone()))?.u128()
                .saturating_sub(state.barch_to_burn.u128() + state.barch_backing.u128());
            peg_fee = max_peg_fee.min(Decimal::from(required_peg_fee)).to_u128().unwrap();
            barch_amount = barch_amount.checked_sub(peg_fee).unwrap();
        }

        window_manager.add_user_amount_to_active_window(
            deps.storage,
            Addr::unchecked(_cw20_msg.sender.clone()),
            Uint128::from(0u128),
            Uint128::from(barch_amount),
        )?;
        total_barch_amount = window_manager.queue_window.total_barch;
        user_barch_amount = window_manager.get_user_barch_in_active_window(
            deps.storage,
            Addr::unchecked(_cw20_msg.sender.clone()),
        )?;
    }

    if peg_fee > 0 {
        state.barch_to_burn += Uint128::from(peg_fee);
    }

    WINDOW_MANANGER.save(deps.storage, &window_manager)?;

    messages.append(&mut validator_set.withdraw_rewards_messages());

    let reward_amount = get_rewards(
        deps.storage,
        deps.querier,
        &env.contract.address
    ).unwrap_or_default();

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
    // let deposit_amount = state.to_deposit.u128() + reward_amount_to_add.u128();

    state.to_deposit = Uint128::from(0u128);
    STATE.save(deps.storage, &state)?;
    // debug_print!("To deposit amount = {}", state.to_deposit);

    let val_count = validator_set.validators.len();
    let total_staked = validator_set.total_staked();

    // only call Delegate msg when deposit_amount > 0
    if deposit_amount > calc_threshold(total_staked, val_count) {
        // divide and deposit to multiple validators
        // check division
        if val_count == 0 {
            return Err(ContractError::Std(StdError::generic_err(
                "No validator found!"
            )));
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

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "withdraw")
        .add_attribute("total seArch amount in active window", total_se_arch_amount)
        .add_attribute("total barch amount in active window", total_barch_amount)
        .add_attribute("user seArch amount in active window", user_se_arch_amount)
        .add_attribute("user barch amount in active window", user_barch_amount))
}

/**
 * If barch is true then release amount for barch else
 * return amount for seArch
 */
pub fn release_tokens(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    _cw20_msg: Cw20ReceiveMsg,
    barch: bool
) -> Result<Response, ContractError> {
    let mut messages: Vec<CosmosMsg> = vec![];
    let config = CONFIG.load(deps.storage)?;

    // debug_print(format!("** tokens withdrawn: {}", amount));
    let se_arch_xrate = se_arch_exchange_rate(deps.storage,deps.querier)?;
    let barch_xrate = barch_exchange_rate(deps.storage,deps.querier)?;

    // debug_print(format!("** Frozen seArch exchange rate: {}", seArch_xrate.to_string()));
    // debug_print(format!("** Frozen barch exchange rate: {}", barch_xrate.to_string()));
    let mut arch_amount:u128 = 0;
    if barch {
        arch_amount = calc_withdraw(_cw20_msg.amount, barch_xrate)?;
    }else{
        arch_amount = calc_withdraw(_cw20_msg.amount, se_arch_xrate)?;
    }
    // debug_print(format!("** arch amount withdrawn: {}", arch_amount));
    let my_balance = get_balance(deps.querier, &env.contract.address)?;
    // debug_print(format!("** contract balance: {}", my_balance));

    let arch_coin = Coin {
        denom: "uconst".to_string(),
        amount: min(my_balance, Uint128::from(arch_amount)),
    };

    let burn_msg = Cw20ExecuteMsg::Burn {
        amount: Uint128::from(_cw20_msg.amount)
    };

    if barch {
        // burn unbonding barch
        messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr: config.barch_token.ok_or_else(|| {
                ContractError::Std(StdError::generic_err(
                    "barch token addr not registered".to_string(),
                ))
            })?.to_string(),
            msg: to_binary(&burn_msg)?,
            funds: vec![],
        }));
    } else {
        // burn unbonding seArch
        messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr: config.seArch_token.ok_or_else(|| {
                ContractError::Std(StdError::generic_err(
                    "seArch token addr not registered".to_string(),
                ))
            })?.to_string(),
            msg: to_binary(&burn_msg)?,
            funds: vec![],
        }));
    }

    messages.push(CosmosMsg::Bank(BankMsg::Send {
        to_address: _cw20_msg.sender.clone(),
        amount: vec![arch_coin.clone()],
    }));

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "withdraw")
        .add_attribute("account", _cw20_msg.sender.clone())
        .add_attribute("amount", arch_coin.amount))
}
