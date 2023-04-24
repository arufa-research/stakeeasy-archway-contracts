import { use, assert, expect }  from "chai";
import { archkitChai, archkitTypes }  from "archkit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { seArchTokenContract } from "../artifacts/typescript_schema/seArchToken";
import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(archkitChai);

describe("barch token flow", () => {
  let contract_owner: archkitTypes.UserAccount;
  let account_1: archkitTypes.UserAccount;
  let account_2: archkitTypes.UserAccount;
  let runTs: String;
  let seArch_token: seArchTokenContract, staking_contract: StakingContractContract;
  let barch_token: barchTokenContract, validator_info: MockSelectionContract;
  let reward_contract: RewardContractContract;
  let window_time: number, unbonding_time: number;
  before(async() => {
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

  afterEach(async() => {
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

  function sleep(seconds: number) {
    console.log("Sleeping for " + seconds + " seconds");
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /*
    1) Deposit for barch multiple times
      - Deposit for barch
      - Wait and deposit for barch again
      - Withdraw some barch
      - Deposit for seArch and check barch exchange rate
  */
  it("barch exchange rate", async () => {
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: contract_owner, transferAmount: transferAmount_1 },
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

    // assert exch rate
    const exchange_rate_1 = await staking_contract.BArchExchangeRate();
    let rate_1 = parseFloat(exchange_rate_1.barch_exchange_rate.rate);
    console.log("barch exchange_rate_1: ", rate_1);
    assert.equal(rate_1, 1.00);

    const transferAmount_2 = [{ "denom": "uconst", "amount": "1800000" }];
    await staking_contract.stakeForbarch(
      { account: contract_owner, transferAmount: transferAmount_2 },
      {referral: 0} 
    );

    // assert exch rate
    const exchange_rate_2 = await staking_contract.BArchExchangeRate();
    let rate_2 = parseFloat(exchange_rate_2.barch_exchange_rate.rate);
    console.log("barch exchange_rate_2: ", rate_2);
    assert.equal(rate_2, 1.00);

    // withdraw barch
    await barch_token.send(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: "1800000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
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

    const transferAmount_3 = [{ "denom": "uconst", "amount": "1000000" }];
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_3 },
      { referral: 0 }
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // assert exch rate
    const exchange_rate_3 = await staking_contract.BArchExchangeRate();
    let rate_3 = parseFloat(exchange_rate_3.barch_exchange_rate.rate);
    console.log("barch exchange_rate_3: ", rate_3);
    assert.equal(rate_3, 1.00);
  });

  /*
    2) Mint barch multiple times
      - Deposit for barch
      - Deposit for seArch
      - Deposit for barch from account_1
      - Check supply of barch
  */
  it("Minting of barch", async () => {
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: contract_owner, transferAmount: transferAmount_1 },  {referral: 0} 
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

    const transferAmount_2 = [{ "denom": "uconst", "amount": "1000000" }];
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );

    const transferAmount_3 = [{ "denom": "uconst", "amount": "1500000" }];
    await staking_contract.stakeForbarch(
      { account: account_1, transferAmount: transferAmount_3 },  {referral: 0} 
    );

    // assert wallet balances
    const owner_balance_res = await barch_token.balance({
      "address": contract_owner.account.address,
    });
    const owner_barch = owner_balance_res.balance;
    assert.equal(owner_barch, "1200000");

    const account_1_balance_res = await barch_token.balance({
      "address": account_1.account.address,
    });
    const account_1_barch = account_1_balance_res.balance;
    assert.equal(account_1_barch, "1500000");

    // assert total supply
    const supply_res = await barch_token.tokenInfo();
    assert.equal(supply_res.total_supply, "2700000");
  });

  /*
    3) Deposit and withdraw all of barch
      - Deposit for barch
      - Withdraw portion of amount
      - Deposit again for barch
      - Withdraw all of barch
      - Check when barch supply is zero
      - Should get arch at claim
  */
  it("burning of barch", async () => {
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: contract_owner, transferAmount: transferAmount_1 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // withdraw some barch in first window
    await barch_token.send(
      {
        account: contract_owner,
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

    await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      }
    );

    // query window before withdraw txn
    const window_before = await staking_contract.window();
    console.log("window before: ", window_before);

    const transferAmount_2 = [{ "denom": "uconst", "amount": "1500000" }];
    await staking_contract.stakeForbarch(
      { account: account_1, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // withdraw all barch in second window
    await barch_token.send(
      {
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: "200000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // query window after withdraw txn
    const window_after_1 = await staking_contract.window();
    console.log("window after 1: ", window_after_1);

    // withdraw all amount for second account
    await barch_token.send(
      {
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: "1500000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // query window after withdraw txn
    const window_after_2 = await staking_contract.window();
    console.log("window after 2: ", window_after_2);

    // assert total supply
    const supply_res = await barch_token.tokenInfo();
    assert.equal(supply_res.total_supply, "1700000");

    // do 7 advance window after prev adv window
    // after 7th advance window (total 8th) is done,
    // prev window will be matured and claimable
    for (let idx = 0; idx < 7; idx++) {
      await sleep(window_time);

      const owner_undelegations_res = await staking_contract.undelegations({
        "address": contract_owner.account.address
      });
      console.log("Pending: ", owner_undelegations_res.pending_claims.pending);

      const undelegations_res = await staking_contract.undelegations({
        "address": account_1.account.address
      });
      console.log("Pending: ", undelegations_res.pending_claims.pending);

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

    // assert total supply
    const final_supply_res = await barch_token.tokenInfo();
    assert.equal(final_supply_res.total_supply, "0");

    // claim for owner
    const owner_claim_res = await staking_contract.userClaimable(
      { "address": contract_owner.account.address }
    );
    const owner_claim_amount = Number(owner_claim_res.claimable.claimable_amount);
    assert.isAtLeast(owner_claim_amount, 1200000 - 5);  // -5 to handle division error
    await staking_contract.claim(
        { account: contract_owner },
    );

    // claim for account_1
    const account_1_claim_res = await staking_contract.userClaimable(
      { "address": account_1.account.address }
    );
    const account_1_claim_amount = Number(account_1_claim_res.claimable.claimable_amount);
    assert.isAtLeast(account_1_claim_amount, 1500000 - 5);  // -5 to handle division error
    await staking_contract.claim(
        { account: account_1 },
    );
  });

  /*
    4) Check conversion of barch to seArch
      - Deposit for barch
      - Deposit for seArch
      - Convert barch to seArch
      - Check balance of seArch in account
  */
  it("Convert barch to seArch", async () => {
    // Deposit for barch
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: contract_owner, transferAmount: transferAmount_1 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Deposit for seArch
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1600000" }];
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
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

    const seArch_exch_rate_res = await staking_contract.seArchExchangeRate();
    let seArch_exch_rate_1 = parseFloat(seArch_exch_rate_res.seArch_exchange_rate.rate);
    console.log("seArch_exch_rate: ", seArch_exch_rate_1);

    // convert all barch to seArch
    await barch_token.send(
      {
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: "1200000",
        contract: staking_contract.contractAddress,
        msg: "eyJjb252ZXJ0Ijp7fX0=" // {"convert":{}}
      }
    );

    // check if seArch balance is within range
    const seArch_balance_res = await seArch_token.balance({ address: contract_owner.account.address });
    const seArch_balance = parseFloat(seArch_balance_res.balance);

    const expected_balance = 1600000 + (1200000 / seArch_exch_rate_1);
    assert.isAtLeast(seArch_balance, expected_balance - 2000);
  });

  /*
    5) Check staking reward claim for barch
      - Deposit for barch
      - Wait some time
      - Claim some staking reward from reward contract
      - Deposit more for barch
      - Wait some time
      - Claim staking rewards (should be proportional to deposit)
  */
  it("User claim while holding barch", async () => {
    // Deposit for barch
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: contract_owner, transferAmount: transferAmount_1 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_1 = await reward_contract.accruedRewards({address: contract_owner.account.address});
    console.log("rewards_1: ", rewards_1);

    // claim staking rewards
    await reward_contract.claim(
      { account: contract_owner },
      {}
    );

    // Deposit for barch
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1800000" }];
    await staking_contract.stakeForbarch(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    await sleep(20);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_2 = await reward_contract.accruedRewards({address: contract_owner.account.address});
    console.log("rewards_2: ", rewards_2);

    // claim staking rewards
    await reward_contract.claim(
      { account: contract_owner },
      {}
    );

    // rewards_2 should be greater than rewards_1
    assert.isAtLeast(parseFloat(rewards_2.rewards), parseFloat(rewards_1.rewards));

    // withdraw all of barch
    const owner_balance_res = await barch_token.balance({
      "address": contract_owner.account.address,
    });
    const owner_barch = owner_balance_res.balance;
    await barch_token.send(
      {
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: owner_barch,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond":{}}
      }
    );

    // claim staking rewards
    await reward_contract.claim(
      { account: contract_owner },
      {}
    );

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // claim rewards should be zero
    const rewards_3 = await reward_contract.accruedRewards({address: contract_owner.account.address});
    console.log("rewards_3: ", rewards_3);
    assert.equal(parseFloat(rewards_3.rewards), 0.00);
  });

  /*
    6) Withdraw both seArch and barch in same window
      - Deposit for barch
      - Deposit for seArch from account_1
      - Withdraw both in same window
      - Claim unbonded arch and check
  */
  it("Withdraw barch and seArch", async () => {
    // Deposit for barch
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: account_2, transferAmount: transferAmount_1 },  {referral: 0} 
    );

    // Deposit for seArch from account_1
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1500000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_2 },  {referral: 0} 
    );

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Withdraw barch
    const account_2_balance_res = await barch_token.balance({
      "address": account_2.account.address,
    });
    const account_2_barch = account_2_balance_res.balance;
    await barch_token.send(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: account_2_barch,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // Withdraw seArch
    const account_1_balance_res = await seArch_token.balance({
      "address": account_1.account.address,
    });
    const account_1_seArch = account_1_balance_res.balance;
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

    // seArch exch rate
    const seArch_exch_rate_res = await staking_contract.seArchExchangeRate();
    let seArch_exch_rate = parseFloat(seArch_exch_rate_res.seArch_exchange_rate.rate);
    console.log("seArch_exch_rate: ", seArch_exch_rate);

    await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      }
    );

    // 7 advance window after prev adv window
    // after 7th advance window (total 8th) is done,
    // prev window will be matured and claimable
    for (let idx = 0; idx < 7; idx++) {
      await sleep(window_time);

      const account_2_undelegations_res = await staking_contract.undelegations({
        "address": account_2.account.address
      });
      console.log("Pending: ", account_2_undelegations_res.pending_claims.pending);

      const undelegations_res = await staking_contract.undelegations({
        "address": account_1.account.address
      });
      console.log("Pending: ", undelegations_res.pending_claims.pending);

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

    const account_2_claimable = await staking_contract.userClaimable(
      { address: account_2.account.address }
    );
    console.log("account_2_claimable: ", account_2_claimable);

    const account_1_claimable = await staking_contract.userClaimable(
      { address: account_1.account.address }
    );
    console.log("account_1_claimable: ", account_1_claimable);

    await staking_contract.claim(
      { account: account_2 }
    );
    await staking_contract.claim(
      { account: account_1 }
    );

    assert.isAtLeast(parseFloat(account_2_claimable.claimable.claimable_amount), parseFloat(account_2_barch) - 1000);
    assert.isAtLeast(parseFloat(account_1_claimable.claimable.claimable_amount), parseFloat(account_1_seArch)* seArch_exch_rate - 5);

    assert.isAtMost(parseFloat(account_2_claimable.claimable.claimable_amount), parseFloat(account_2_barch) + 1000);
    assert.isAtMost(parseFloat(account_1_claimable.claimable.claimable_amount), parseFloat(account_1_seArch) * seArch_exch_rate + 5000);
  });

  /*
    7) Withdraw both seArch and barch in different window
      - Deposit for barch
      - Deposit for seArch from account_1
      - Withdraw barch
      - Withdraw seArch in next window
      - Claim unbonded arch and check
  */
  it("Withdraw barch and seArch in different window", async () => {
    // Deposit for barch
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: account_2, transferAmount: transferAmount_1 },
      {referral: 0}    );

    // Deposit for seArch from account_1
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1500000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_2 },
      {referral: 0} 
    );

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Withdraw barch
    const account_2_balance_res = await barch_token.balance({
      "address": account_2.account.address,
    });
    const account_2_barch = account_2_balance_res.balance;
    await barch_token.send(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: account_2_barch,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // next window
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    const adv_res_1 = await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      }
    );
    console.log("adv_res_1:", JSON.stringify(adv_res_1, null, 2));

    // Withdraw seArch
    const account_1_balance_res = await seArch_token.balance({
      "address": account_1.account.address,
    });
    const account_1_seArch = account_1_balance_res.balance;
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

    // seArch exch rate
    const seArch_exch_rate_res = await staking_contract.seArchExchangeRate();
    let seArch_exch_rate = parseFloat(seArch_exch_rate_res.seArch_exchange_rate.rate);
    console.log("seArch_exch_rate: ", seArch_exch_rate);

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    const adv_res_2 = await staking_contract.advanceWindow(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      }
    );
    console.log("adv_res_2:", JSON.stringify(adv_res_2, null, 2));


    // 7 advance window after prev adv window
    // after 7th advance window (total 8th) is done,
    // prev window will be matured and claimable
    for (let idx = 0; idx < 7; idx++) {
      await sleep(window_time + 1);

      const owner_undelegations_res = await staking_contract.undelegations({
        "address": account_2.account.address
      });
      console.log("Pending: ", owner_undelegations_res.pending_claims.pending);

      const undelegations_res = await staking_contract.undelegations({
        "address": account_1.account.address
      });
      console.log("Pending: ", undelegations_res.pending_claims.pending);

      await staking_contract.claimAndStake(
        { account: contract_owner }
      );
      const adv_res_3 = await staking_contract.advanceWindow(
        { 
          account: contract_owner,
          customFees: {
            amount: [{ amount: "500000", denom: "uconst" }],
            gas: "1000000",
          }
        }
      );
      console.log("adv_res_3:", idx, JSON.stringify(adv_res_3, null, 2));
    }

    const account_2_claimable = await staking_contract.userClaimable(
      { address: account_2.account.address }
    );
    console.log("account_2_claimable: ", account_2_claimable);

    const account_1_claimable = await staking_contract.userClaimable(
      { address: account_1.account.address }
    );
    console.log("account_1_claimable: ", account_1_claimable);

    await staking_contract.claim(
      { account: account_2 }
    );
    await staking_contract.claim(
      { account: account_1 }
    );

    assert.isAtLeast(parseFloat(account_2_claimable.claimable.claimable_amount), parseFloat(account_2_barch) - 5);
    assert.isAtLeast(parseFloat(account_1_claimable.claimable.claimable_amount), parseFloat(account_1_seArch)* seArch_exch_rate - 5);

    assert.isAtMost(parseFloat(account_2_claimable.claimable.claimable_amount), parseFloat(account_2_barch) + 5);
    assert.isAtMost(parseFloat(account_1_claimable.claimable.claimable_amount), parseFloat(account_1_seArch) * seArch_exch_rate + 5000);
  });
});