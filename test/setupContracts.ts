import { getAccountByName, archkitTypes }  from "archkit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { seArchTokenContract } from "../artifacts/typescript_schema/seArchToken";
import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

export async function setup(
): Promise<any> {
  const runTs: string = String(new Date());
  const unbonding_time = 70; // 70 seconds
  const window_time = unbonding_time / 7; // 7 windows in unbonding time
  const contract_owner: archkitTypes.UserAccount = getAccountByName("admin");
  const account_1: archkitTypes.UserAccount = getAccountByName("account_1");
  const account_2: archkitTypes.UserAccount = getAccountByName("account_2");

  console.log("admin account fetched successfully");

  const staking_contract: StakingContractContract = new StakingContractContract();
  const seArch_token: seArchTokenContract = new seArchTokenContract();
  const barch_token: barchTokenContract = new barchTokenContract();
  const validator_info: MockSelectionContract = new MockSelectionContract();
  const reward_contract: RewardContractContract = new RewardContractContract();

  console.log("All contract instance created successfully");

  await staking_contract.setUpclient();
  await seArch_token.setUpclient();
  await barch_token.setUpclient();
  await validator_info.setUpclient();
  await reward_contract.setUpclient();

  console.log("Client setup successfully");

  /*
   * Deploy all contracts first
   */
  const validator_info_deploy = await validator_info.deploy(
    contract_owner,
    {
      amount: [{ amount: "2250000", denom: "uconst" }],
      gas: "90000000",
    }
  );
  console.log("validator info deployed ", validator_info_deploy);

  const staking_contract_deploy = await staking_contract.deploy(
    contract_owner,
    {
      amount: [{ amount: "2250000", denom: "uconst" }],
      gas: "90000000",
    }
  );
  console.log("staking contract deployed ", staking_contract_deploy);

  const seArch_deploy = await seArch_token.deploy(
    contract_owner,
    {
      amount: [{ amount: "2250000", denom: "uconst" }],
      gas: "90000000",
    }
  );
  console.log("seArch deployed ", seArch_deploy);

  const barch_deploy = await barch_token.deploy(
    contract_owner,
    {
      amount: [{ amount: "2250000", denom: "uconst" }],
      gas: "90000000",
    }
  );
  console.log("barch deployed ", barch_deploy);

  const rewards_deploy = await reward_contract.deploy(
    contract_owner,
    {
      amount: [{ amount: "2250000", denom: "uconst" }],
      gas: "90000000",
    }
  );
  console.log("rewards contract deployed ", rewards_deploy);

  /*
   * Instantate all contracts depending
   * upon the network chosen (unbonding time, window time, denomination)
   */
  const validator_info_init = await validator_info.instantiate(
    {
      "count": 404
    },
    `Validator info contract ${runTs}`,
    contract_owner
  );
  console.log("Validator info init ", validator_info_init);

  const staking_contract_init = await staking_contract.instantiate(
    {
      "dev_address": account_1.account.address,
      "dev_fee": 5000,  // 5%
      "epoch_period": window_time,
      "underlying_coin_denom": "uconst",
      "unbonding_period": unbonding_time,
      "reward_denom": "uconst",
      "er_threshold": 1000,
      "peg_recovery_fee": 0,
    },
    `Staking contract ${runTs}`,
    contract_owner,
    undefined,
    undefined,
    contract_owner.account.address
  );
  console.log("Staking contract init ", staking_contract_init);

  const rewards_contract_init = await reward_contract.instantiate(
    {
      "staking_contract": staking_contract.contractAddress,
    },
    `rewards contract ${runTs}`,
    contract_owner
  );
  console.log("Rewards contract init ", rewards_contract_init);

  // ADD rewards CONTRACT to CONFIG
  await staking_contract.updateRewardsAddr(
    {
      account: contract_owner
    },
    {
      address: reward_contract.contractAddress
    }
  );

  const seArch_token_init = await seArch_token.instantiate(
    {
      "name": "seArch",
      "symbol": "seArch",
      "decimals": 6,
      "initial_balances": [],
      "mint": { minter: staking_contract.contractAddress.toString() },
    },
    `seArch token ${runTs}`,
    contract_owner
  );
  console.log("seArch contract init ", seArch_token_init);

  const barch_token_init = await barch_token.instantiate(
    {
      "name": "barch",
      "symbol": "barch",
      "decimals": 6,
      "initial_balances": [],
      "mint": { minter: staking_contract.contractAddress, cap: null },
      "marketing": null,
      "reward_contract_addr": reward_contract.contractAddress
    },
    `barch token ${runTs}`,
    contract_owner,
    undefined,
    undefined,
    contract_owner.account.address
  );
  console.log("barch contract init ", barch_token_init);

  await reward_contract.UpdateBarchAddr(
    { account: contract_owner },
    {
      address: barch_token.contractAddress
    }
  );

  await staking_contract.UpdateSearchAddr(
    { account: contract_owner },
    {
      address: seArch_token.contractAddress
    }
  );

  await staking_contract.UpdateBarchAddr(
    { account: contract_owner },
    {
      address: barch_token.contractAddress
    }
  );

  // first update validator_info contract validators with all available address
  await validator_info.updateList(
    { account: contract_owner }
  );

  // ADD top validator CONTRACT to CONFIG
  await staking_contract.updateValidatorSetAddr(
    {
      account: contract_owner
    },
    {
      address: validator_info.contractAddress
    }
  );

  return {
    runTs, contract_owner, staking_contract,
    seArch_token, barch_token, validator_info, reward_contract,
    unbonding_time, window_time, account_1, account_2
  }
}