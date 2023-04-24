use cosmwasm_std::{
    DepsMut, Env, MessageInfo, Response, Uint128, CosmosMsg,
    WasmMsg, StdError, to_binary, StdResult, Storage, QuerierWrapper, CustomQuery, Addr
};
use cw20::{Cw20ReceiveMsg, Cw20ExecuteMsg};
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;

use crate::staking::_calc_exchange_rate;
use crate::state::STATE;
use crate::ContractError;
use crate::tokens::query_total_supply;
use crate::types::config::CONFIG;

/**
 * Convert barch to seArch.
 */
pub fn try_convert_to_seArch(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _cw20_msg: Cw20ReceiveMsg,
) -> Result<Response, ContractError> {
    let mut messages: Vec<CosmosMsg> = vec![];

    let config = CONFIG.load(deps.storage)?;
    let mut state = STATE.load(deps.storage)?;
    let seArch_exch_rate = seArch_exchange_rate_without_rewards(deps.storage, deps.querier)?;
    let barch_exch_rate = barch_exchange_rate_without_rewards(deps.storage, deps.querier)?;

    let seArch_token = config.seArch_token.ok_or_else(|| {
        ContractError::Std(StdError::generic_err(
            "seArch token addr not registered".to_string(),
        ))
    })?.to_string();

    let barch_token = config.barch_token.ok_or_else(|| {
        ContractError::Std(StdError::generic_err(
            "barch token addr not registered".to_string(),
        ))
    })?.to_string();

    let mut barch_amount = _cw20_msg.amount.u128();

    // peg recovery fee
    let mut peg_fee = 0u128;
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

    let arch_backing = barch_exch_rate.checked_mul(Decimal::from(barch_amount as u64))
                                        .unwrap().to_u128().unwrap();

    let seArch_amount = Decimal::from(arch_backing as u64).checked_div(seArch_exch_rate)
                                        .unwrap().to_u128().unwrap();

    // reduce barch backing
    state.barch_backing = state.barch_backing.saturating_sub(Uint128::from(arch_backing));

    // increase seArch backing
    state.seArch_backing += Uint128::from(arch_backing);

    state.barch_to_burn += Uint128::from(barch_amount+peg_fee); // this amount will be burned in ClaimAndStake

    // mint seArch to sender
    let mint_msg = Cw20ExecuteMsg::Mint {
        recipient: _cw20_msg.sender.to_string(),
        amount: seArch_amount.into()
    };

    messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: seArch_token,
        msg: to_binary(&mint_msg)?,
        funds: vec![],
    }));

    STATE.save(deps.storage, &state)?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("seArch_minted", seArch_amount.to_string())
        .add_attribute("arch_backing_value", arch_backing.to_string())
    )
}

/**
 * Convert seArch to barch.
 */
pub fn try_convert_to_barch(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _cw20_msg: Cw20ReceiveMsg,
) -> Result<Response, ContractError> {
    let mut messages: Vec<CosmosMsg> = vec![];

    let config = CONFIG.load(deps.storage)?;
    let mut state = STATE.load(deps.storage)?;
    let seArch_exch_rate = seArch_exchange_rate_without_rewards(deps.storage, deps.querier)?;
    let barch_exch_rate = barch_exchange_rate_without_rewards(deps.storage, deps.querier)?;

    let barch_token = config.barch_token.ok_or_else(|| {
        ContractError::Std(StdError::generic_err(
            "barch token addr not registered".to_string(),
        ))
    })?.to_string();

    let seArch_amount = _cw20_msg.amount.u128();

    let arch_backing = seArch_exch_rate.checked_mul(Decimal::from(seArch_amount as u64))
                                        .unwrap().to_u128().unwrap();

    let mut barch_amount = Decimal::from(arch_backing as u64).checked_div(barch_exch_rate)
                                        .unwrap().to_u128().unwrap();

    // reduce seArch backing
    state.seArch_backing = state.seArch_backing.saturating_sub(Uint128::from(arch_backing));

    // increase barch backing
    state.barch_backing += Uint128::from(arch_backing);

    state.seArch_to_burn += Uint128::from(seArch_amount); // this amount will be burned in ClaimAndStake

    // peg recovery fee
    let barch_threshold = Decimal::from(config.er_threshold)/Decimal::from(1000u64);
    let recovery_fee = Decimal::from(config.peg_recovery_fee)/Decimal::from(1000u64);
    if barch_exch_rate < barch_threshold {
        let max_peg_fee = recovery_fee.checked_mul(Decimal::from(barch_amount)).unwrap();
        let required_peg_fee =
            query_total_supply(deps.querier, &Addr::unchecked(barch_token.clone()))?.u128()
            .saturating_sub(state.barch_to_burn.u128() + state.barch_backing.u128());
        let peg_fee = max_peg_fee.min(Decimal::from(required_peg_fee)).to_u128().unwrap();
        barch_amount = barch_amount.checked_sub(peg_fee).unwrap();
    }

    // mint barch to sender
    let mint_msg = Cw20ExecuteMsg::Mint {
        recipient: _cw20_msg.sender.to_string(),
        amount: barch_amount.into()
    };

    messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: barch_token,
        msg: to_binary(&mint_msg)?,
        funds: vec![],
    }));

    STATE.save(deps.storage, &state)?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("barch_minted", barch_amount.to_string())
        .add_attribute("arch_backing_value", arch_backing.to_string())
    )
}

pub fn seArch_exchange_rate_without_rewards<Q: CustomQuery>(
    storage: &dyn Storage,
    querier: QuerierWrapper<Q>,
) -> StdResult<Decimal> {
    let config = CONFIG.load(storage)?;
    let state = STATE.load(storage)?;
    let seArch_token = config.seArch_token.ok_or_else(|| {
        StdError::generic_err(
            "seArch token addr not registered".to_string(),
        )
    })?;

    let exch_rate = _calc_exchange_rate(
        state.seArch_backing.u128(),
        query_total_supply(querier, &seArch_token)?.u128()
            .saturating_sub(state.seArch_to_burn.u128()),
    )?;

    Ok(exch_rate)
}

pub fn barch_exchange_rate_without_rewards<Q: CustomQuery>(
    storage: &dyn Storage,
    querier: QuerierWrapper<Q>,
) -> StdResult<Decimal> {
    let config = CONFIG.load(storage)?;
    let state = STATE.load(storage)?;
    let barch_token = config.barch_token.ok_or_else(|| {
        StdError::generic_err(
            "barch token addr not registered".to_string(),
        )
    })?;

    let exch_rate = _calc_exchange_rate(
        state.barch_backing.u128(),
        query_total_supply(querier, &barch_token)?.u128()
            .saturating_sub(state.barch_to_burn.u128()),
    )?;

    Ok(exch_rate)
}