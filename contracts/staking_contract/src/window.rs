use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use std::collections::HashMap;
use std::ops::{Mul, Sub};

use crate::ContractError;
use crate::deposit::calc_barch_reward;
use crate::msg::ExecuteMsg;
use crate::state::{STATE};
use crate::types::config::CONFIG;
use crate::types::validator_set::{VALIDATOR_SET};
use crate::types::withdraw_window::{USER_CLAIMABLE, USER_CLAIMABLE_AMOUNT, ONGOING_WITHDRAWS_AMOUNT};
use crate::utils::{calc_threshold, calc_withdraw};
use crate::staking::{undelegate_msg, se_arch_exchange_rate, barch_exchange_rate};
use crate::types::window_manager::{WINDOW_MANANGER, WindowManager};
use cosmwasm_std::{
    Env, StdError, Addr, StdResult,
    Uint128, Response, DepsMut, MessageInfo, CosmosMsg, WasmMsg, to_binary, Order, BankMsg, Coin,
};
use cw20::Cw20ExecuteMsg;

/**
 * Moves the current active window to validators and create new window as empty one.
 */
pub fn advance_window(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    _msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    let mut messages = vec![];

    let config = CONFIG.load(deps.storage)?;

    if config.paused == true {
        return Err(ContractError::Std(StdError::generic_err(
            "The contract is temporarily paused",
        )));
    }

    if _info.sender != config.admin {
        return Err(ContractError::Std(StdError::generic_err(
            "Only admin can call advance window"
        )));
    }
    
    let mut state = STATE.load(deps.storage)?;
    let mut window_manager = WINDOW_MANANGER.load(deps.storage)?;

    let withdraw_amount_arch;
    let mut claimed_arch = 0;
    let mut ongoing_arch = 0;
    if check_window_advance(&env, &window_manager) {
        // trigger withdraw request on validator set
        let mut validator_set = VALIDATOR_SET.load(deps.storage)?;

        let exchange_rate_se_arch = se_arch_exchange_rate(deps.storage, deps.querier)?;
        let exchange_rate_barch = barch_exchange_rate(deps.storage, deps.querier)?;

        let total_se_arch_amount = window_manager.queue_window.total_seArch;
        let total_barch_amount = window_manager.queue_window.total_barch;

        let se_arch_to_arch = calc_withdraw(total_se_arch_amount, exchange_rate_se_arch)?;
        let barch_to_arch = calc_withdraw(total_barch_amount, exchange_rate_barch)?;
        withdraw_amount_arch = se_arch_to_arch.checked_add(barch_to_arch).unwrap();

        state.arch_under_withdraw += Uint128::from(withdraw_amount_arch);
        state.seArch_under_withdraw += total_se_arch_amount;
        state.barch_under_withdraw += total_barch_amount;

        // Backing update
        state.seArch_backing = Uint128::from(state.seArch_backing.u128().saturating_sub(se_arch_to_arch));
        state.barch_backing = Uint128::from(state.barch_backing.u128().saturating_sub(barch_to_arch));

        let val_count = validator_set.validators.len();
        let total_staked = validator_set.total_staked();
        let mut left: u128 = 0;

        let mut remaining_rewards = Uint128::from(0u128);

        // only call Withdraw msg when withdraw_amount_arch > 0
        if withdraw_amount_arch > calc_threshold(total_staked, val_count) {
            // divide and withdraw from multiple validators
            if val_count == 0 {
                return Err(ContractError::Std(StdError::generic_err(
                    "No validator found!"
                )));
            }
            let to_withdraw = withdraw_amount_arch.checked_div(val_count as u128).unwrap() - 2; // for division errors

            for validator in validator_set.clone().validators.iter() {
                let mut temp = to_withdraw + left;
                if validator.staked.u128() < temp {
                    left = temp - validator.staked.u128();
                    temp = validator.staked.u128();
                } else {
                    left = 0;
                }
                // reduce the amount from our stake tracker
                validator_set.unbond_from(&validator.address, temp)?;
                // debug_print!("Unbond {} from {}", temp, validator.address);
                // send the undelegate message
                messages.push(undelegate_msg(&validator.address, temp));
                // fetch the amount of rewards in the validator
                // and add it to backing and to_deposit
                let val_rewards = Uint128::from(
                    validator_set.query_rewards_validator(
                        deps.querier,
                        env.contract.address.to_string(),
                        validator.address.to_string()
                    )?
                );
                remaining_rewards += val_rewards;
            }
        } else if withdraw_amount_arch > 0 {
            // withdraw from single validator with most staked amount
            // reduce the amount from our stake tracker
            let validator = validator_set.unbond_from_largest(withdraw_amount_arch)?;
            // debug_print!("Unbond {} from {}", withdraw_amount_arch, validator);
            // send the undelegate message
            messages.push(undelegate_msg(&validator, withdraw_amount_arch));
            // fetch the amount of rewards in the validator
            // and add it to backing and to_deposit
            let val_rewards = Uint128::from(
                validator_set.query_rewards_validator(
                    deps.querier,
                    env.contract.address.to_string(),
                    validator
                )?
            );
            remaining_rewards += val_rewards;
        }

        if remaining_rewards.u128() > 0 {
            let barch_reward = calc_barch_reward(
                remaining_rewards,
                state.barch_backing,
                state.seArch_backing
            )?;
            if barch_reward > 0 {
                let reward_contract_addr = if let Some(addr) = config.rewards_contract {
                    addr.to_string()
                }else{
                    return Err(ContractError::Std(StdError::generic_err(
                        "Reward contract is not registered",
                    )));
                };
                messages.push(CosmosMsg::Bank(BankMsg::Send {
                    to_address: reward_contract_addr,
                    amount: vec![Coin {
                        denom: "uconst".to_string(),
                        amount: Uint128::from(barch_reward),
                    }],
                }));
            }
            state.to_deposit += remaining_rewards.saturating_sub(Uint128::from(barch_reward));
            state.seArch_backing += remaining_rewards.saturating_sub(Uint128::from(barch_reward));
        }

        validator_set.rebalance();
        VALIDATOR_SET.save(deps.storage, &validator_set)?;

        // BURN TOKENS
        let burn_msg_se_arch = Cw20ExecuteMsg::Burn {
            amount: Uint128::from(total_se_arch_amount)
        };
        let burn_msg_barch = Cw20ExecuteMsg::Burn {
            amount: Uint128::from(total_barch_amount)
        };

        // burn unbonding seArch
        if total_se_arch_amount != Uint128::from(0u128) {
            messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
                contract_addr: config.seArch_token.ok_or_else(|| {
                    ContractError::Std(StdError::generic_err(
                        "seArch token addr not registered".to_string(),
                    ))
                })?.to_string(),
                msg: to_binary(&burn_msg_se_arch)?,
                funds: vec![],
            }));
        }
        // burn unbonding barch
        if total_barch_amount != Uint128::from(0u128) {
            messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
                contract_addr: config.barch_token.ok_or_else(|| {
                    ContractError::Std(StdError::generic_err(
                        "barch token addr not registered".to_string(),
                    ))
                })?.to_string(),
                msg: to_binary(&burn_msg_barch)?,
                funds: vec![],
            }));
        }

        // move active window object to ongoing_windows back
        window_manager.advance_window(
            deps.storage,
            env.block.time.seconds(),
            exchange_rate_se_arch,
            exchange_rate_barch
        )?;

        // mature part should be handled seperately
        // pop from front of ongoing_windows dequeue
        // while the mature timestamp of window is less than current time after active window append to back
        let mut ongoing_se_arch = 0;
        let mut ongoing_barch = 0;
        let mut ongoing_users_arch: HashMap<Addr, Uint128> = HashMap::new();
        while window_manager.ongoing_windows.len() as u128 > 0 {
            // continue only if front window is matured
            if let Some(front_window) = window_manager.ongoing_windows.front() {
                if front_window.time_to_mature_window >= env.block.time.seconds() {
                    break;
                }
            }
            // data not deleted from amounts MAP
            // TODO: check later and remove the amounts from the map
            // using prefix iteration
            let matured_window = window_manager.pop_matured(deps.storage)?;
            let arch_window = matured_window.total_arch;
            let se_arch_window = matured_window.total_seArch;
            let barch_window = matured_window.total_barch;

            ongoing_arch += arch_window.u128();
            ongoing_se_arch += se_arch_window.u128();
            ongoing_barch += barch_window.u128();

            // store-optimize: Delete current window data
            // Add function to remove previous data
            let matured_amounts: StdResult<Vec<_>> = ONGOING_WITHDRAWS_AMOUNT
                .prefix(&matured_window.id.to_string())
                .range(deps.storage, None, None, Order::Ascending).collect();
            for (user_addr, user_arch_amount) in matured_amounts?.iter() {
                if let Some(already_stored_amount) = ongoing_users_arch.get_mut(user_addr) {
                    *already_stored_amount += *user_arch_amount;
                } else {
                    ongoing_users_arch.insert(user_addr.clone(), *user_arch_amount);
                }
                ONGOING_WITHDRAWS_AMOUNT.remove(deps.storage, (&matured_window.id.to_string(), user_addr),);
            }
        }

        if ongoing_arch > 0 {
            let contract_arch = deps
                .querier
                .query_balance(env.contract.address.clone(), "uconst")?
                .amount;
            claimed_arch =
                contract_arch.u128() - state.to_deposit.u128() - state.not_redeemed.u128();
            // If claimed is less than 90% of expected value, revert
            if claimed_arch < (ongoing_arch * 90) / 100 {
                return Err(ContractError::Std(StdError::generic_err(
                    "Claim is not processed yet!"
                )));
            }

            state.arch_under_withdraw = state.arch_under_withdraw.sub(Uint128::from(ongoing_arch)); // arch

            state.seArch_under_withdraw =
                state.seArch_under_withdraw.sub(Uint128::from(ongoing_se_arch)); // seArch
            state.barch_under_withdraw =
                state.barch_under_withdraw.sub(Uint128::from(ongoing_barch)); // barch

            let mut ratio = Decimal::from(1u128);
            if ongoing_arch > 0 {
                ratio = Decimal::from(claimed_arch as u64) / Decimal::from(ongoing_arch as u64);
                if ratio > Decimal::from(1u128) {
                    ratio = Decimal::from(1u128);
                    state.not_redeemed += Uint128::from(ongoing_arch);
                } else {
                    state.not_redeemed += Uint128::from(claimed_arch);
                }
            }

            if ongoing_users_arch.len() as u128 > 0 {
                let mut user_claimable = USER_CLAIMABLE.load(deps.storage)?;
                for (user_addr, arch_amount) in ongoing_users_arch.iter() {
                    let user_arch = (Decimal::from(arch_amount.u128() as u64).mul(ratio))
                        .to_u128()
                        .unwrap();
                    let mut after_user_arch = user_arch;
                    if let Some(current_user_arch) = USER_CLAIMABLE_AMOUNT.may_load(
                        deps.storage,
                        &user_addr,
                    )? {
                        after_user_arch += current_user_arch.u128();
                    }
                    USER_CLAIMABLE_AMOUNT.save(
                        deps.storage,
                        &user_addr,
                        &Uint128::from(after_user_arch),
                    )?;
                }
                user_claimable.total_arch = Uint128::from(user_claimable.total_arch.u128() + claimed_arch);
                USER_CLAIMABLE.save(deps.storage, &user_claimable)?;

            }
        }

        STATE.save(deps.storage, &state)?;
        WINDOW_MANANGER.save(deps.storage, &window_manager)?;
    } else {
        return Err(ContractError::Std(StdError::generic_err(
            "Advance window not available yet"
        )));
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "advance_window")
        .add_attribute("account", _info.sender.as_str())
        .add_attribute("withdraw_amount_arch", withdraw_amount_arch.to_string())
        .add_attribute("claimed_arch", claimed_arch.to_string())
        .add_attribute("ongoing_arch", ongoing_arch.to_string()))
}

pub fn check_window_advance(env: &Env, window_manager: &WindowManager) -> bool {
    return window_manager.time_to_close_window <= env.block.time.seconds();
}