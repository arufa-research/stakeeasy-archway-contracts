import { use, assert, expect }  from "chai";
import { archkitChai, archkitTypes }  from "archkit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { seArchTokenContract } from "../artifacts/typescript_schema/seArchToken";
import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(archkitChai);

describe("seArch token flow", () => {
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
    1) Deposit for seArch multiple times
      - Deposit for seArch
      - Check exchange rate
      - Wait and deposit for seArch again
      - Check for exchange rate, should be more than previous
      - Withdraw some seArch
      - Deposit for barch
      - Check for exchange rate, should be more than previous
  */
  it("seArch exchange rate", async () => {
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },
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
    const exchange_rate_1 = await staking_contract.seArchExchangeRate();
    let rate_1 = parseFloat(exchange_rate_1.seArch_exchange_rate.rate);
    console.log("seArch exchange_rate_1: ", rate_1);
    assert.isAtLeast(rate_1, 1.00);

    const transferAmount_2 = [{ "denom": "uconst", "amount": "1800000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_2 },
      {referral: 0} 
    );

    // assert exch rate
    const exchange_rate_2 = await staking_contract.seArchExchangeRate();
    let rate_2 = parseFloat(exchange_rate_2.seArch_exchange_rate.rate);
    console.log("seArch exchange_rate_2: ", rate_2);
    assert.isAtLeast(rate_2, rate_1);

    // withdraw seArch
    await seArch_token.send(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: "800000",
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
    await staking_contract.stakeForbarch(
      { account: account_2, transferAmount: transferAmount_3 },
      {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // assert exch rate
    const exchange_rate_3 = await staking_contract.seArchExchangeRate();
    let rate_3 = parseFloat(exchange_rate_3.seArch_exchange_rate.rate);
    console.log("seArch exchange_rate_3: ", rate_3);
    assert.isAtLeast(rate_3, rate_2);
  });

  /*
    2) Mint seArch multiple times
      - Deposit for seArch
      - Deposit for barch
      - Deposit for seArch from account_1
      - Check supply of seArch
  */
  it("Minting of seArch", async () => {
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },  {referral: 0} 
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
    await staking_contract.stakeForbarch(
      { account: account_2, transferAmount: transferAmount_2 },  {referral: 0} 
    );

    const exchange_rate_1 = await staking_contract.seArchExchangeRate();
    let seArch_rate_1 = parseFloat(exchange_rate_1.seArch_exchange_rate.rate);
    console.log("seArch exchange_rate_1: ", seArch_rate_1);

    const transferAmount_3 = [{ "denom": "uconst", "amount": "1500000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_3 },  {referral: 0} 
    );

    // assert wallet balances
    const account_2_balance_res = await seArch_token.balance({
      "address": account_2.account.address,
    });
    const account_2_seArch = account_2_balance_res.balance;
    assert.equal(account_2_seArch, "1200000");

    const account_1_balance_res = await seArch_token.balance({
      "address": account_1.account.address,
    });
    const account_1_seArch = account_1_balance_res.balance;
    assert.isAtMost(parseFloat(account_1_seArch), 1500000 / seArch_rate_1);

    // assert total supply
    const supply_res = await seArch_token.tokenInfo();
    assert.isAtMost(parseFloat(supply_res.total_supply), 1200000 + (1500000 / seArch_rate_1));
  });

  /*
    3) Deposit and withdraw all of seArch
      - Deposit for seArch
      - Withdraw portion of amount
      - Deposit again for seArch
      - Withdraw all of seArch
      - Check when seArch supply is zero
      - Should get arch at claim
  */
  it("burning of seArch", async () => {
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // withdraw some seArch in first window
    await seArch_token.send(
      {
        account: account_2,
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

    // query window before withdraw txn
    const window_before_1 = await staking_contract.window();
    console.log("window before 1: ", window_before_1);

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

    // query window before withdraw txn
    const window_before_2 = await staking_contract.window();
    console.log("window before 2: ", window_before_2);

    const exchange_rate_1 = await staking_contract.seArchExchangeRate();
    let seArch_rate_1 = parseFloat(exchange_rate_1.seArch_exchange_rate.rate);
    console.log("seArch exchange_rate_1: ", seArch_rate_1);

    const transferAmount_2 = [{ "denom": "uconst", "amount": "1500000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const seArch_balance_res = await seArch_token.balance({ address: account_2.account.address });
    const seArch_balance = seArch_balance_res.balance;

    // withdraw all seArch in second window
    await seArch_token.send(
      {
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: seArch_balance,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // query window after withdraw txn
    const window_after_1 = await staking_contract.window();
    console.log("window after 1: ", window_after_1);

    const seArch_balance_res_1 = await seArch_token.balance({ address: account_1.account.address });
    const seArch_balance_1 = seArch_balance_res_1.balance;

    // withdraw all amount for second account
    await seArch_token.send(
      {
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: seArch_balance_1,
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // query window after withdraw txn
    const window_after_2 = await staking_contract.window();
    console.log("window after 2: ", window_after_2);

    // assert total supply
    const supply_res = await seArch_token.tokenInfo();
    assert.isAtMost(parseFloat(supply_res.total_supply), 200000 + (1500000 / seArch_rate_1));

    // do 7 advance window after prev adv window
    // after 7th advance window (total 8th) is done,
    // prev window will be matured and claimable
    for (let idx = 0; idx < 7; idx++) {
      await sleep(window_time);

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
    const final_supply_res = await seArch_token.tokenInfo();
    assert.equal(final_supply_res.total_supply, "0");

    // claim for account_2
    const account_2_claim_res = await staking_contract.userClaimable(
      { "address": account_2.account.address }
    );
    const account_2_claim_amount = Number(account_2_claim_res.claimable.claimable_amount);
    assert.isAtLeast(account_2_claim_amount, 1200000 - 5);  // -5 to handle division error
    await staking_contract.claim(
        { account: account_2 },
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
    4) Check conversion of seArch to barch
      - Deposit for barch
      - Deposit for seArch
      - Convert seArch to barch
      - Check balance of barch in account
  */
  it("Convert seArch to barch", async () => {
    // Deposit for barch
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1600000" }];
    await staking_contract.stakeForbarch(
      { account: account_2, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Deposit for seArch
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },  {referral: 0} 
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

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const seArch_exch_rate_res = await staking_contract.seArchExchangeRate();
    let seArch_exch_rate_1 = parseFloat(seArch_exch_rate_res.seArch_exchange_rate.rate);
    console.log("seArch_exch_rate: ", seArch_exch_rate_1);

    const seArch_balance_res = await seArch_token.balance({ address: account_2.account.address });
    const seArch_balance = seArch_balance_res.balance;

    // convert all seArch to barch
    await seArch_token.send(
      {
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: seArch_balance,
        contract: staking_contract.contractAddress,
        msg: "eyJjb252ZXJ0Ijp7fX0=" // {"convert":{}}
      }
    );

    // check if barch balance is within range
    const barch_balance_res = await barch_token.balance({ address: account_2.account.address });
    const barch_balance = parseFloat(barch_balance_res.balance);
    console.log("barch_balance: ", barch_balance);

    const expected_balance = 1600000 + (1200000 * seArch_exch_rate_1);
    assert.isAtLeast(barch_balance, expected_balance - 2000);
  });
});