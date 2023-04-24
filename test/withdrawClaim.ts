// TODO : Check on Exchange rate
// UDIT
import { use, assert, expect }  from "chai";
import { archkitChai, archkitTypes, getLogs }  from "archkit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { seArchTokenContract } from "../artifacts/typescript_schema/seArchToken";
import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(archkitChai);

describe("Withdraw Flow", () => {
    let contract_owner: archkitTypes.UserAccount;
    let account_1: archkitTypes.UserAccount;
    let account_2: archkitTypes.UserAccount;
    let runTs: String;
    let seArch_token: seArchTokenContract, staking_contract: StakingContractContract;
    let barch_token: barchTokenContract, validator_info: MockSelectionContract;
    let reward_contract: RewardContractContract;
    let window_time: number, unbonding_time: number;
    before(async () => {
        const result = await setup();
        runTs = result.runTs;
        contract_owner = result.contract_owner;
        account_1 = result.account_1;
        account_2 = result.account_2;
        seArch_token = result.seArch_token;
        staking_contract = result.staking_contract;
        barch_token = result.barch_token;
        validator_info = result.validator_info;
        reward_contract = result.reward_contract;
        window_time = result.window_time;
        unbonding_time = result.unbonding_time;
    });

    afterEach(async () => {
        const result = await setup();
        runTs = result.runTs;
        contract_owner = result.contract_owner;
        account_1 = result.account_1;
        account_2 = result.account_2;
        seArch_token = result.seArch_token;
        staking_contract = result.staking_contract;
        barch_token = result.barch_token;
        validator_info = result.validator_info;
        reward_contract = result.reward_contract;
        window_time = result.window_time;
        unbonding_time = result.unbonding_time;
    });

    function sleep(seconds:number) {
        console.log("Sleeping for " + seconds + " seconds");
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    /*
        1)   With 0 deposit
            -query info (variables should be as expected)
    */
    it("Claim should be 0 with 0 seArch unstaking", async () => {
        await sleep(20);
        await staking_contract.advanceWindow(
            { account: contract_owner }
        );
        await expect(
            staking_contract.userClaimable(
                { "address": contract_owner.account.address }
            )
        ).to.respondWith({ claimable: { claimable_amount: '0' } });
        await staking_contract.claim(
            { account: contract_owner },
        );
        const staking_info = await staking_contract.info();
        assert.equal(staking_info.info.admin, contract_owner.account.address);
        assert.equal(staking_info.info.seArch_in_contract, '0');
        assert.equal(staking_info.info.arch_under_withdraw, '0');
    });

    /*
        2) User should be able to deposit even during their unbonding period
            -deposit arch
            -withdraw arch(send seArch to contract)
            -Advance window called
            -Deposit again(Should work fine)
     */
    it("Should be able to Stake during unbonding period", async () => {
        const transferAmount_2 = [{ "denom": "uconst", "amount": "1200000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const balance_res = await seArch_token.balance({
            "address": contract_owner.account.address,
        });
        const transferAmount_seArch = balance_res.balance;
        console.log("send amount ", transferAmount_seArch);
        await seArch_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_seArch,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );
        await expect(seArch_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '0' });

        await staking_contract.advanceWindow(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            }
        );
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await expect(seArch_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '1200000' });

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);
            await staking_contract.claimAndStake(
                { account: contract_owner }
            );
            await staking_contract.advanceWindow(
                { 
                    account: contract_owner,
                    customFees: {
                        amount: [{ amount: "500000", denom: "uconst" }],
                        gas: "1000000",
                    }
                }
            );
        }
        const claimable = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        const claimable_amount = claimable.claimable.claimable_amount;
        assert.isAtLeast(parseInt(claimable_amount), 1200000);

        await staking_contract.claim(
            { account: contract_owner },
        );
        const staking_info_3 = await staking_contract.info();
        assert.equal(staking_info_3.info.admin, contract_owner.account.address);
        assert.equal(staking_info_3.info.seArch_in_contract, '0');
        assert.equal(staking_info_3.info.arch_under_withdraw, '0');
    });

    /*
        3) Without advance window call claimable amount should be zero
            -deposit
            -claim_and_stake
            -withdraw
            -check claimbale amount(Should be zero)
    */
    it("Claim without advance_window Call", async () => {
        const transferAmount_2 = [{ "denom": "uconst", "amount": "1100000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const balance_res = await seArch_token.balance({
            "address": contract_owner.account.address,
        });

        const transferAmount_seArch = balance_res.balance;
        await seArch_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_seArch,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );

        const claimable_res = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        const claimable_amount = claimable_res.claimable.claimable_amount;
        assert.equal(parseInt(claimable_amount), 0);
        const claim_res = await staking_contract.claim(
            { account: contract_owner },
        );
    });

    /*
        4) trying to send seArch to contract with 0 balance
            -should fail
    */
    it("Without depositing making request for unstaking", async () => {
        const staking_info_1 = await staking_contract.info();
        console.log(staking_info_1);
        const balance_res = await seArch_token.balance({
            "address": contract_owner.account.address,
        });
        console.log(balance_res);

        const transferAmount_seArch = "1100000";
        await expect(seArch_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_seArch,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        )).to.be.revertedWith('insufficient funds');    // confirm the error here-----------
        // TODO: check
        // Got error: failed to execute message; message index: 0: Overflow: Cannot Sub with 0 and 1100000: execute wasm contract failed
    });

    /*
        5) Happy flow
            -stake
            -claim_and_stake
            -send(withdraw)
            -advance window
            -claim(after waiting)
     */
    it("Check Withdrawal with a Happy flow", async () => {
        const transferAmount_2 = [{ "denom": "uconst", "amount": "12000000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const balance_res = await seArch_token.balance({
            "address": contract_owner.account.address,
        });
        const transferAmount_seArch = balance_res.balance;
        console.log("send amount ", transferAmount_seArch);
        await seArch_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_seArch,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );
        await expect(seArch_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '0' });

        await staking_contract.advanceWindow(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            }
        );
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await expect(seArch_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '12000000' });

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);
            await staking_contract.claimAndStake(
                { account: contract_owner }
            );
            await staking_contract.advanceWindow(
                { 
                    account: contract_owner,
                    customFees: {
                        amount: [{ amount: "500000", denom: "uconst" }],
                        gas: "1000000",
                    }
                }
            );
        }
        const claimable_res = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        const claimable_amount = claimable_res.claimable.claimable_amount;
        assert.isAtLeast(parseInt(claimable_amount), 12000000);

        await contract_owner.setupClient();
        const arch_balance_before = Number((await contract_owner.getBalance("uconst")).amount);
        await staking_contract.claim(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            }
        );
        const arch_balance_after = Number((await contract_owner.getBalance("uconst")).amount);
        assert.isAtLeast(arch_balance_after-arch_balance_before, 12000000-500000);
        const staking_info_3 = await staking_contract.info();
        assert.equal(staking_info_3.info.admin, contract_owner.account.address);
        assert.equal(staking_info_3.info.seArch_in_contract, '0');
        assert.equal(staking_info_3.info.arch_under_withdraw, '0');
    });

    /*
        6) Checking withdraw if claim_and_stake not called
            -Deposit
            -claim_and_stake
            -deposit again
            -Advance window call(without claim_and_stake)
            -claim(Should be as expected by user)
    */
    it("Double deposit and claim_stake not called after second deposit", async () => {
        const transferAmount_2 = [{ "denom": "uconst", "amount": "1100000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const transferAmount_3 = [{ "denom": "uconst", "amount": "1200000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_3 },
            {referral: 0}
        );
        const balance_after_two_deposit = await seArch_token.balance({
            "address": contract_owner.account.address,
        });
        
        const transferAmount_seArch = balance_after_two_deposit.balance;
        await seArch_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_seArch,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );

        const query_window_1 = await staking_contract.window();
        console.log("query window 1 => ", query_window_1);

        await expect(seArch_token.balance({
            "address": contract_owner.account.address,
        })).to.respondWith({ 'balance': '0' });

        const staking_info_2 = await staking_contract.info();
        console.log("info: ", staking_info_2);
        assert.isAtLeast(parseInt(staking_info_2.info.total_staked), 2300000);  /////////////////check again

        // TODO: check this later in contract
        // assert.equal(staking_info_2.info.seArch_in_contract, transferAmount_seArch);
        assert.equal(staking_info_2.info.arch_under_withdraw, '0');

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);

            const undelegations_res = await staking_contract.undelegations({
                "address": contract_owner.account.address
            });
            console.log("Pending:  ", undelegations_res.pending_claims.pending);

            await staking_contract.claimAndStake(
                { account: contract_owner }
            );
            await staking_contract.advanceWindow(
                { 
                    account: contract_owner,
                    customFees: {
                        amount: [{ amount: "500000", denom: "uconst" }],
                        gas: "1000000",
                    }
                }
            );
        }

        const claimable = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        const claimable_amount = claimable.claimable.claimable_amount;
        assert.isAtLeast(parseInt(claimable_amount), 2300000);

        await staking_contract.claim(
            { account: contract_owner },
        );
        const staking_info_3 = await staking_contract.info();
        assert.equal(staking_info_3.info.admin, contract_owner.account.address);
        assert.equal(staking_info_3.info.seArch_in_contract, '0');
        assert.equal(staking_info_3.info.arch_under_withdraw, '0');
    });

    /*
        7) Sending more seArch than in balance
            -should fail
    */
    it("Sending more seArch than in balance", async () => {
        const transferAmount_2 = [{ "denom": "uconst", "amount": "1200000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const transferAmount_seArch = "30000000";
        await expect(seArch_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_seArch,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        )).to.be.revertedWith('insufficient funds');
        // TODO: geeting different error
        // failed to execute message; message index: 0: Overflow: Cannot Sub with 1200000 and 30000000: execute wasm contract failed
    });

    /*
        8) Sending less seArch than limit to withdraw
            -should fail
    */
    it("unstaking less seArch than limit", async () => {
        const transferAmount_2 = [{ "denom": "uconst", "amount": "1200000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );
        const transferAmount_seArch = "8000";

        await expect(seArch_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            {
                amount: transferAmount_seArch,
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        )).to.be.revertedWith('Amount withdrawn below minimum of 10000 useArch');
    });

    // **********NEED TWO ACCOUNTS************

    /*
        9) Two users partial withdraw seArch
            - first user deposit
            - second user deposit
            - first user withdraws some part of seArch
            - second user withdraws some part of seArch
            - claim for first user
            - claim for second user
            - both withdraws in the same window
    */
    it("Two User partial withdraw-Test", async () => {
        // First user desposits
        const transferAmount_1 = [{ "denom": "uconst", "amount": "4000000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_1 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );

        // Second user deposits
        const transferAmount_2 = [{ "denom": "uconst", "amount": "2000000" }];
        await staking_contract.stake(
            { account: account_1, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );

        await staking_contract.advanceWindow(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            }
        );

        // First user withdraws some portion of seArch
        await seArch_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            { 
                amount: "2000000", 
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );

        // Second user withdraws some portion of seArch
        await seArch_token.send(
            { 
                account: account_1,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            { 
                amount: "1000000", 
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );

        const exchange_rate_1 = await staking_contract.seArchExchangeRate();
        let rate_1 = parseFloat(exchange_rate_1.seArch_exchange_rate.rate);
        console.log("exchange_rate_1: ", rate_1);
        const user_1_arch_amount = Math.floor(rate_1 * 2000000);
        const user_2_arch_amount = Math.floor(rate_1 * 1000000);

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);

            const undelegations_res = await staking_contract.undelegations({
                "address": contract_owner.account.address
            });
            console.log("Pending:  ", undelegations_res.pending_claims.pending);

            await staking_contract.claimAndStake(
                { account: contract_owner }
            );
            await staking_contract.advanceWindow(
                { 
                    account: contract_owner,
                    customFees: {
                        amount: [{ amount: "500000", denom: "uconst" }],
                        gas: "1000000",
                    }
                }
            );
        }

        const user_1_claimable = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        await staking_contract.claim(
            { account: contract_owner },
        )
        const user_1_claimable_amount = user_1_claimable.claimable.claimable_amount;
        console.log("(user_1_claimable_amount - user_1_arch_amount) => ", (user_1_claimable_amount - user_1_arch_amount));
        assert.isAtMost((user_1_claimable_amount - user_1_arch_amount), 10000);

        console.log("user_2_arch_amount should be=> ", user_2_arch_amount);
        const user_2_claimable = await staking_contract.userClaimable(
            { "address": account_1.account.address }
        );
        const user_2_claimable_amount = user_2_claimable.claimable.claimable_amount;
        console.log("(user_2_claimable_amount - user_2_arch_amount) => ", (user_2_claimable_amount - user_2_arch_amount));
        await staking_contract.claim(
            { account: account_1 }
        )
        assert.isAtMost((user_2_claimable_amount - user_2_arch_amount), 10000);
        // xrate after both partial withdraw
        const XR_BPW = await staking_contract.seArchExchangeRate();
        let XR_after_both_partial_withdraw = parseFloat(XR_BPW.seArch_exchange_rate.rate);
        console.log("exchange_rate_3: ", XR_after_both_partial_withdraw);
        assert.isAtLeast(XR_after_both_partial_withdraw, rate_1);
    });

    /*
        10) Two users fully withdraw seArch
            - first user deposit
            - second user deposit
            - first user withdraws all of seArch
            - second user withdraws all of seArch
            - claim for first user
            - claim for second user
            - both withdraws in different window
    */
    it("Two User FULL withdraw-Test", async () => {
        // First user desposits
        const transferAmount_1 = [{ "denom": "uconst", "amount": "4000000" }];
        await staking_contract.stake(
            { account: contract_owner, transferAmount: transferAmount_1 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );

        const balance_res = await seArch_token.balance({
            "address": contract_owner.account.address,
        });
        const owner_seArch = balance_res.balance;

        // Second user deposits
        const transferAmount_2 = [{ "denom": "uconst", "amount": "2000000" }];
        await staking_contract.stake(
            { account: account_1, transferAmount: transferAmount_2 },
            {referral: 0}
        );
        await staking_contract.claimAndStake(
            { account: contract_owner }
        );

        const balance_res_1 = await seArch_token.balance({
            "address": account_1.account.address,
        });
        const account_1_seArch = balance_res_1.balance;

        // First user withdraws some portion of seArch
        await seArch_token.send(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            { 
                amount: owner_seArch, 
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );

        await staking_contract.advanceWindow(
            { 
                account: contract_owner,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            }
        );

        // Second user withdraws some portion of seArch
        await seArch_token.send(
            { 
                account: account_1,
                customFees: {
                    amount: [{ amount: "500000", denom: "uconst" }],
                    gas: "1000000",
                }
            },
            { 
                amount: account_1_seArch, 
                contract: staking_contract.contractAddress,
                msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
            }
        );

        const exchange_rate_1 = await staking_contract.seArchExchangeRate();
        let rate_1 = parseFloat(exchange_rate_1.seArch_exchange_rate.rate);
        console.log("exchange_rate_1: ", rate_1);
        const user_1_arch_amount = Math.floor(rate_1 * owner_seArch);
        const user_2_arch_amount = Math.floor(rate_1 * account_1_seArch);

        // do 7 advance window after prev adv window
        // after 7th advance window (total 8th) is done,
        // prev window will be matured and claimable
        for (let idx = 0; idx < 7; idx++) {
            await sleep(window_time);

            const undelegations_res = await staking_contract.undelegations({
                "address": contract_owner.account.address
            });
            console.log("Pending:  ", undelegations_res.pending_claims.pending);

            await staking_contract.claimAndStake(
                { account: contract_owner }
            );
            await staking_contract.advanceWindow(
                { 
                    account: contract_owner,
                    customFees: {
                        amount: [{ amount: "500000", denom: "uconst" }],
                        gas: "1000000",
                    }
                }
            );
        }

        const user_1_claimable = await staking_contract.userClaimable(
            { "address": contract_owner.account.address }
        );
        await staking_contract.claim(
            { account: contract_owner },
        )
        const user_1_claimable_amount = user_1_claimable.claimable.claimable_amount;
        console.log("(user_1_claimable_amount - user_1_arch_amount) => ", (user_1_claimable_amount - user_1_arch_amount));
        assert.isAtMost((user_1_claimable_amount - user_1_arch_amount), 20000);

        console.log("user_2_arch_amount should be=> ", user_2_arch_amount);
        const user_2_claimable = await staking_contract.userClaimable(
            { "address": account_1.account.address }
        );
        const user_2_claimable_amount = user_2_claimable.claimable.claimable_amount;
        console.log("(user_2_claimable_amount - user_2_arch_amount) => ", (user_2_claimable_amount - user_2_arch_amount));
        await staking_contract.claim(
            { account: account_1 }
        )
        assert.isAtMost((user_2_claimable_amount - user_2_arch_amount), 20000);
    });
})