use crate::ContractError;
use crate::types::config::CONFIG;
use crate::{state::STATE, msg::ExecuteMsg};
use crate::types::withdraw_window::{USER_CLAIMABLE, USER_CLAIMABLE_AMOUNT};
use cosmwasm_std::{
    BankMsg, Coin, CosmosMsg, Env,
    Uint128, DepsMut, MessageInfo, Response, StdError,
};

/**
 * Transfer matured arch from contract to user's wallet.
 */
pub fn claim(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    let mut messages: Vec<CosmosMsg> = vec![];
    let mut state = STATE.load(deps.storage)?;
    let config = CONFIG.load(deps.storage)?;

    if config.paused == true {
        return Err(ContractError::Std(StdError::generic_err(
            "The contract is temporarily paused",
        )));
    }

    let mut user_claimable = USER_CLAIMABLE.load(deps.storage)?;

    let arch_amount: Uint128 = Uint128::from(0u128);
    if let Some(arch_amount) = USER_CLAIMABLE_AMOUNT.may_load(deps.storage, &_info.sender)? {
        user_claimable.total_arch -= arch_amount;

        if arch_amount > Uint128::from(0u128) {
                // If users wants arch amount
                messages.push(CosmosMsg::Bank(BankMsg::Send {
                    to_address: _info.sender.to_string(),
                    amount: vec![Coin {
                        denom: "uconst".to_string(),
                        amount: Uint128::from(arch_amount),
                    }],
                }));

            state.not_redeemed -= arch_amount.clone();
        }
        STATE.save(deps.storage, &state)?;
        USER_CLAIMABLE.save(deps.storage, &user_claimable)?;

        // store-optimize
        //USER_CLAIMABLE_AMOUNT.save(deps.storage, &_info.sender, &Uint128::from(0u128))?;
        USER_CLAIMABLE_AMOUNT.remove(deps.storage, &_info.sender);
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "claim")
        .add_attribute("account", _info.sender)
        .add_attribute("amount", arch_amount))
}