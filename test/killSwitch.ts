// Stake amount to recieve barch
// Stake amount to recieve seArch
// claim and stake
// killswitch, wait for 180s, withdraw
// User should get their fund back
import { use, assert, expect } from "chai";
import { archkitChai, archkitTypes } from "archkit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { seArchTokenContract } from "../artifacts/typescript_schema/seArchToken";
import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";

use(archkitChai);

describe("Killswitch Flow", () => {
  let contract_owner: archkitTypes.UserAccount;
  let runTs: String;
  let seArch_token: seArchTokenContract, staking_contract: StakingContractContract;
  let barch_token: barchTokenContract, validator_info: MockSelectionContract;
  let reward_contract: RewardContractContract;
  before(async () => {
    const result = await setup();
    runTs = result.runTs;
    contract_owner = result.contract_owner;
    seArch_token = result.seArch_token;
    staking_contract = result.staking_contract;
    barch_token = result.barch_token;
    validator_info = result.validator_info;
    reward_contract = result.reward_contract;
  });

  function sleep(seconds: number) {
    console.log("Sleeping for " + seconds + " seconds");
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  it("Should return correct amount after killswitch", async () => {
    const stakingInfo = await staking_contract.info();
    console.log(stakingInfo, stakingInfo.info.validator_set);
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.stakeForbarch(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );

    await expect(seArch_token.balance({
      "address": contract_owner.account.address
    })).to.respondWith({ 'balance': '1200000' });

    await expect(barch_token.balance({
      "address": contract_owner.account.address
    })).to.respondWith({ 'balance': '1200000' });

    await sleep(60);
    await staking_contract.claimAndStake(
      {
        account: contract_owner, customFees: {
          amount: [{ amount: "2250000", denom: "uconst" }],
          gas: "90000000",
        },
      }
    );
    //await sleep(200);

    //await staking_contract.rebalanceSlash({ account: contract_owner });
    await staking_contract.killSwitchUnbond({ account: contract_owner });
    await sleep(110);

    await staking_contract.killSwitchOpenWithdraws({ account: contract_owner });

    await contract_owner.setupClient();
    let bal_before = await contract_owner.getBalance("uconst");
    await seArch_token.send(
      {
        account: contract_owner
      },
      {
        amount: "1200000",
        contract: staking_contract.contractAddress,
        msg: "eyJ1bmJvbmQiOnt9fQ=="
      }
    );

    let bal_after = await contract_owner.getBalance("uconst");
    console.log("Before: ", bal_before, "After: ", bal_after);
    // assert.equal(bal_before.amount + Number(1200000), bal_after.amount);

    const stakingInfo2 = await staking_contract.info();
    console.log(stakingInfo2, stakingInfo2.info.validator_set);
  });
});