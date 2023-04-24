use cosmwasm_std::{Addr, StdError, StdResult, Storage, Uint128, Order};

use cw_storage_plus::{Item};
use serde::{Deserialize, Serialize};

use rust_decimal::Decimal;
use std::collections::VecDeque;

use crate::msg::PendingClaimsResponse;
use crate::types::withdraw_window::{QueueWindow, OngoingWithdrawWindow, QUEUE_WINDOW_AMOUNT, ONGOING_WITHDRAWS_AMOUNT};
use crate::utils::calc_withdraw;

use crate::types::config::CONFIG;

use super::withdraw_window::BQUEUE_WINDOW_AMOUNT;

pub const WINDOW_MANANGER: Item<WindowManager> = Item::new("window_manager");

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct WindowManager {
    pub time_to_close_window: u64,
    pub queue_window: QueueWindow,
    pub ongoing_windows: VecDeque<OngoingWithdrawWindow>,
}

impl WindowManager {
    pub fn add_user_amount_to_active_window(
        &mut self,
        store: &mut dyn Storage,
        user_addr: Addr,
        seArch_amount: Uint128,
        barch_amount: Uint128,
    ) -> StdResult<()> {
        if let Some(mut already_stored_amount) = QUEUE_WINDOW_AMOUNT.may_load(store, &user_addr)? { 
            already_stored_amount += seArch_amount;
            QUEUE_WINDOW_AMOUNT.save(store, &user_addr, &already_stored_amount)?;
        } else {
            QUEUE_WINDOW_AMOUNT.save(
                store,
                &user_addr,
                &seArch_amount,
            )?;
        }
        if let Some(mut already_stored_amount) = BQUEUE_WINDOW_AMOUNT.may_load(store, &user_addr)? { 
            already_stored_amount += barch_amount;
            BQUEUE_WINDOW_AMOUNT.save(store, &user_addr, &already_stored_amount)?;
        } else {
            BQUEUE_WINDOW_AMOUNT.save(
                store,
                &user_addr,
                &barch_amount,
            )?;
        }

        self.queue_window.total_seArch += seArch_amount;
        self.queue_window.total_barch += barch_amount;

        Ok(())
    }

    pub fn get_user_seArch_in_active_window(
        &self,
        store: &dyn Storage,
        user_addr: Addr,
    ) -> StdResult<Uint128> {
        let mut seArch_amount = Uint128::from(0u128);
        if let Some(seArch_amount_got) = QUEUE_WINDOW_AMOUNT.may_load(store, &user_addr)? { 
            seArch_amount = seArch_amount_got;
        }

        Ok(seArch_amount)
    }
    pub fn get_user_barch_in_active_window(
        &self,
        store: &dyn Storage,
        user_addr: Addr,
    ) -> StdResult<Uint128> {
        let mut barch_amount = Uint128::from(0u128);
        if let Some(barch_amount_got) = BQUEUE_WINDOW_AMOUNT.may_load(store, &user_addr)? { 
            barch_amount = barch_amount_got;
        }

        Ok(barch_amount)
    }

    pub fn advance_window(
        &mut self,
        store: &mut dyn Storage,
        current_time: u64,
        exchange_rate_seArch: Decimal,
        exchange_rate_barch: Decimal,
    ) -> StdResult<()> {
        let config = CONFIG.load(store)?;
        let queue_window = self.queue_window.clone();
        let queue_amounts: StdResult<Vec<_>> = QUEUE_WINDOW_AMOUNT.range(store, None, None, Order::Ascending).collect();
        let bqueue_amounts: StdResult<Vec<_>> = BQUEUE_WINDOW_AMOUNT.range(store, None, None, Order::Ascending).collect();

        let seArch_to_arch = Uint128::from(calc_withdraw(queue_window.total_seArch, exchange_rate_seArch)?);
        let barch_to_arch = Uint128::from(calc_withdraw(queue_window.total_barch, exchange_rate_barch)?);

        self.ongoing_windows.push_back(OngoingWithdrawWindow {
            id: queue_window.id,
            time_to_mature_window: current_time + config.unbonding_period,
            total_arch: seArch_to_arch + barch_to_arch,
            total_seArch: queue_window.total_seArch,
            total_barch: queue_window.total_barch,
        });
        for (user_addr, queue_amt) in queue_amounts?.iter() {
            ONGOING_WITHDRAWS_AMOUNT.save(
                store,
                (&queue_window.id.to_string(), user_addr),
                &Uint128::from(calc_withdraw(*queue_amt, exchange_rate_seArch).unwrap()),
            )?;

            // Store-optimize: Instead of zero, remove
            // Add function to remove previous zero values.
            QUEUE_WINDOW_AMOUNT.remove(
                store,
                user_addr,
            );
            // QUEUE_WINDOW_AMOUNT.save(   // set queue window amounts to zero
            //     store,
            //     user_addr,
            //     &Uint128::from(0u128),
            // )?;
        }
        for (user_addr, queue_amt) in bqueue_amounts?.iter() {
            let mut temp = Uint128::from(calc_withdraw(*queue_amt, exchange_rate_barch).unwrap());
            if let Some(ongoing_user_amt) = ONGOING_WITHDRAWS_AMOUNT.may_load(store, (&queue_window.id.to_string(), user_addr))? {
                temp += ongoing_user_amt;
            }
            ONGOING_WITHDRAWS_AMOUNT.save(
                store,
                (&queue_window.id.to_string(), user_addr),
                &temp,
            )?;

            // Store-optimize: Instead of zero, remove
            // Add function to remove previous zero values.
            BQUEUE_WINDOW_AMOUNT.remove(
                store,
                user_addr,
            );
            // BQUEUE_WINDOW_AMOUNT.save(   // set arch queue window amounts to zero
            //     store,
            //     user_addr,
            //     &Uint128::from(0u128),
            // )?;
        }

        self.time_to_close_window = current_time + config.epoch_period;
        self.queue_window = QueueWindow {
            id: queue_window.id+1,
            total_seArch: Uint128::from(0u128),
            total_barch: Uint128::from(0u128),
        };

        Ok(())
    }

    pub fn pop_matured(
        &mut self,
        _store: &dyn Storage,
    ) -> StdResult<OngoingWithdrawWindow> {
        if let Some(matured_window) = self.ongoing_windows.pop_front() {
            Ok(matured_window)
        } else {
            return Err(StdError::generic_err(
                "Previous windows deque empty"
            ));
        }
    }

    pub fn get_user_pending_withdraws(
        &self,
        store: &dyn Storage,
        address: Addr,
    ) -> StdResult<Vec<PendingClaimsResponse>> {
        let mut pending_withdraws: Vec<PendingClaimsResponse> = vec![];

        for ongoing_window in self.ongoing_windows.iter() {
            let window_id = ongoing_window.id.to_string();

            if let Some(user_withdraw_amount) = ONGOING_WITHDRAWS_AMOUNT.may_load(store, (&window_id.to_string(), &address))? {
                if user_withdraw_amount > Uint128::from(0u128) {
                    pending_withdraws.push(PendingClaimsResponse {
                        window_id: ongoing_window.id,
                        claim_time: ongoing_window.time_to_mature_window.clone(),
                        arch_amount: user_withdraw_amount,
                    })
                }
            }
        }
        Ok(pending_withdraws)
    }
}
