import { use, assert, expect }  from "chai";
import { archkitChai, archkitTypes }  from "archkit";
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { seArchTokenContract } from "../artifacts/typescript_schema/seArchToken";
import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(archkitChai);

describe("rewards contract flow", () => {
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
    1) Balance updates on barch balance updates
      - Deposit for barch
      - Should change reward contract balances
      - Deposit for seArch
      - Deposit for barch from account_1
      - Should NOT change reward contract balances for account_2
      - Withdraw some barch
      - Should change reward contract balances
      - Withdraw all of barch
      - Reward contract balance should be zero
      - Send barch from one account to another
      - Convert seArch to barch
      - Should change reward contract balances
  */
  it("Balance updates when barch token balance changes (mint, burn, send)", async () => {
    // Deposit for barch
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: account_2, transferAmount: transferAmount_1 },
      {referral: 0}
    );
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );
    // await staking_contract.advanceWindow(
    //   { 
    //     account: contract_owner,
    //     customFees: {
    //       amount: [{ amount: "500000", denom: "uconst" }],
    //       gas: "1000000",
    //     }
    //   }
    // );

    // Should change reward contract balances
    const holder_res = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res.balance, "1200000");

    // Deposit for seArch
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1400000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_2 },
      {referral: 0}
    );

    // Deposit for barch from account_1
    const transferAmount_3 = [{ "denom": "uconst", "amount": "1600000" }];
    await staking_contract.stakeForbarch(
      { account: account_1, transferAmount: transferAmount_3 },
      {referral: 0}
    );

    // Should NOT change reward contract balances for account_2
    const holder_res_1 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res_1.balance, "1200000");

    const holder_res_2 = await reward_contract.holder(
      { address: account_1.account.address }
    );
    assert.equal(holder_res_2.balance, "1600000");

    // Withdraw some barch
    await barch_token.send(
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

    // Should change reward contract balances
    const holder_res_3 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res_3.balance, "400000");

    // Withdraw all of barch
    await barch_token.send(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: "400000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ==" // {"unbond": {}}
      }
    );

    // Reward contract balance should be zero
    const holder_res_4 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res_4.balance, "0");

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    // Send barch from account_1 to account_2
    await barch_token.transfer(
      { 
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: "600000",
        recipient: account_2.account.address,
      }
    );

    // Should change reward contract balances
    const holder_res_5 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(holder_res_5.balance, "600000");

    const holder_res_6 = await reward_contract.holder(
      { address: account_1.account.address }
    );
    assert.equal(holder_res_6.balance, "1000000");

    // Convert seArch to barch for account_2
    const seArch_balance_res = await seArch_token.balance(
      { address: account_2.account.address }
    );
    const seArch_balance = seArch_balance_res.balance;
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

    // Should change reward contract balances
    const holder_res_7 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.isAbove(parseFloat(holder_res_7.balance), 2000000);

    const holder_res_8 = await reward_contract.holder(
      { address: account_1.account.address }
    );
    assert.equal(holder_res_8.balance, "1000000");
  });

  /*
    2) Amount of reward for seArch and barch
      - Deposit for seArch
      - Deposit for barch
      - Sleep for sometime and do claim_and_stake
      - Check rewards to be equal for barch ans seArch
  */
  it("Amount of reward should be same for barch and seArch if claim_and_stake done once", async () => {
    // Deposit for seArch
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_2, transferAmount: transferAmount_1 },
      {referral: 0}
    );
    // Deposit for barch
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: account_2, transferAmount: transferAmount_2 },
      {referral: 0}
    );
    await staking_contract.claimAndStake(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      }
    );

    // Sleep for sometime and do claim_and_stake
    await sleep(20);
    await staking_contract.claimAndStake(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      }
    );

    // Check rewards to be equal for barch ans seArch
    const seArch_exch_rate_res = await staking_contract.seArchExchangeRate();
    const seArch_exch_rate = parseFloat(seArch_exch_rate_res.seArch_exchange_rate.rate);
    console.log("seArch_exch_rate: ", seArch_exch_rate);

    const barch_exch_rate_res = await staking_contract.BArchExchangeRate();
    const barch_exch_rate = parseFloat(barch_exch_rate_res.barch_exchange_rate.rate);
    console.log("barch_exch_rate: ", barch_exch_rate);

    const seArch_balance_res = await seArch_token.balance({
      "address": account_2.account.address,
    });
    const seArch_bal = parseFloat(seArch_balance_res.balance);

    const barch_balance_res = await barch_token.balance({
      "address": account_2.account.address,
    });
    const barch_bal = parseFloat(barch_balance_res.balance);

    const wasmChainClient = await CosmWasmClient.connect(
      "http://localhost:26657/",
    );

    const contract_arch_before = await wasmChainClient.getBalance(reward_contract.contractAddress, "uconst");
    console.log("contract_arch_before: ", contract_arch_before);

    await account_1.setupClient();
    const account_1_arch_before = Number((await account_1.getBalance("uconst")).amount);
    console.log("account_1_arch_before: ", account_1_arch_before);

    // barch reward
    const reward_res = await reward_contract.accruedRewards(
      { address: account_2.account.address }
    );

    const claim_res = await reward_contract.claim(
      { 
        account: account_2
      },
      {
        recipient: account_1.account.address
      }
    );
    console.log("claim_res: ", JSON.stringify(claim_res, null, 2));

    const contract_arch_after = await wasmChainClient.getBalance(reward_contract.contractAddress, "uconst");
    console.log("contract_arch_after: ", contract_arch_after);

    const account_1_arch_after = Number((await account_1.getBalance("uconst")).amount);
    console.log("account_1_arch_after: ", account_1_arch_after);

    const seArch_arch = (seArch_bal * seArch_exch_rate);
    const barch_arch = (barch_bal * barch_exch_rate) + parseFloat(reward_res.rewards);
    assert.isAtMost(Math.abs(seArch_arch-barch_arch), 10);
  });

  /*
    3) Reward contract config and state
      - Query rewards config
      - Deposit for barch
      - Deposit for seArch from account_1
      - Query rewards state
  */
  it("Query config and state after doing updates", async () => {
    const reward_cfg_res = await reward_contract.config();
    console.log("reward_cfg_res: ", reward_cfg_res);

    // Deposit for barch
    const transferAmount_1 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stakeForbarch(
      { account: account_2, transferAmount: transferAmount_1 },
      {referral: 0}
    );
    // Deposit for seArch from account_1
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stake(
      { account: account_1, transferAmount: transferAmount_2 },
      {referral: 0}
    );

    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_state_res = await reward_contract.state();
    assert.equal(rewards_state_res.global_index, '0');
    assert.equal(rewards_state_res.total_balance, '1200000');
    assert.equal(rewards_state_res.prev_reward_balance, '0');

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_state_res_1 = await reward_contract.state();
    assert.isAbove(parseFloat(rewards_state_res_1.global_index), 0);
    assert.equal(rewards_state_res_1.total_balance, '1200000');
    assert.isAbove(parseFloat(rewards_state_res_1.prev_reward_balance), 0);

    await sleep(10);
    await staking_contract.claimAndStake(
      { account: contract_owner }
    );

    const rewards_state_res_2 = await reward_contract.state();
    assert.isAbove(
      parseFloat(rewards_state_res_2.global_index),
      parseFloat(rewards_state_res_1.global_index)
    );
    assert.equal(rewards_state_res_2.total_balance, '1200000');
    assert.isAtMost(
      Math.abs(
        parseFloat(rewards_state_res_2.prev_reward_balance)
        - 2 * parseFloat(rewards_state_res_1.prev_reward_balance)
      ),
      200
    );

    const account_2_holder_res_1 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(account_2_holder_res_1.balance, "1200000");
    assert.equal(account_2_holder_res_1.index, "0");
    assert.equal(account_2_holder_res_1.pending_rewards, "0");

    // Send barch from account_2 to account_1
    await barch_token.transfer(
      { 
        account: account_2,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: "600000",
        recipient: account_1.account.address,
      }
    );

    const rewards_state_res_3 = await reward_contract.state();
    assert.equal(
      parseFloat(rewards_state_res_3.global_index),
      parseFloat(rewards_state_res_2.global_index)
    );
    assert.equal(rewards_state_res_3.total_balance, '1200000');
    assert.equal(
      parseFloat(rewards_state_res_3.prev_reward_balance),
      parseFloat(rewards_state_res_2.prev_reward_balance)
    );

    const account_2_holder_res_2 = await reward_contract.holder(
      { address: account_2.account.address }
    );
    assert.equal(account_2_holder_res_2.balance, "600000");
    assert.equal(account_2_holder_res_2.index, rewards_state_res_3.global_index);
    assert.isAtMost(
      Math.abs(
        parseFloat(account_2_holder_res_2.pending_rewards)
        - parseFloat(rewards_state_res_3.prev_reward_balance)
      ),
      200
    );

    // Burn barch from account_1
    await barch_token.send(
      { 
        account: account_1,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      },
      {
        amount: "600000",
        contract: staking_contract.contractAddress,
        msg: "eyJjb252ZXJ0Ijp7fX0=" // {"convert":{}}
      }
    );

    await staking_contract.claimAndStake(
      { 
        account: contract_owner,
        customFees: {
          amount: [{ amount: "500000", denom: "uconst" }],
          gas: "1000000",
        }
      }
    );

    const account_1_holder_res_3 = await reward_contract.holder(
      { address: account_1.account.address }
    );
    assert.equal(account_1_holder_res_3.balance, "0");
    assert.equal(account_1_holder_res_3.index, rewards_state_res_3.global_index);
    assert.equal(account_1_holder_res_3.pending_rewards, "0");

    const rewards_state_res_4 = await reward_contract.state();
    assert.equal(rewards_state_res_4.total_balance, "600000");
  });
});