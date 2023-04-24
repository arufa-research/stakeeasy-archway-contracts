// Deposit for barch
// claim and stake
// make withdraw request or exchange for barch
// wait for some time
// call callreward,
// assert some rewards should be received by `to` address.
import { use, assert, expect } from "chai";
import { getLogs, archkitChai, archkitTypes } from "archkit";

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { seArchTokenContract } from "../artifacts/typescript_schema/seArchToken";
import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

import { setup } from "./setupContracts";
import { UserAccountI } from "archkit/dist/lib/account";

use(archkitChai);

describe("Reward claim Flow", () => {
  let contract_owner: archkitTypes.UserAccount;
  let treasury: archkitTypes.UserAccount;
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
    treasury = result.account_1;
  });

  function sleep(seconds: number) {
    console.log("Sleeping for " + seconds + " seconds");
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  it("Should claim reward", async () => {
    const transferAmount_2 = [{ "denom": "uconst", "amount": "1200000" }];
    await staking_contract.stake(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.stakeForbarch(
      { account: contract_owner, transferAmount: transferAmount_2 },  {referral: 0} 
    );
    await staking_contract.claimAndStake(
      {
        account: contract_owner, 
        customFees: {
          amount: [{ amount: "2250000", denom: "uconst" }],
          gas: "90000000",
        },
      }
    );

    const stakingInfo = await staking_contract.info();
    console.log(stakingInfo, stakingInfo.info.validator_set);

    await expect(seArch_token.balance({
      "address": contract_owner.account.address
    })).to.respondWith({ 'balance': '1200000' });

    await expect(barch_token.balance({
      "address": contract_owner.account.address
    })).to.respondWith({ 'balance': '1200000' });

    await barch_token.send(
      {
        account: contract_owner, 
        customFees: {
          amount: [{ amount: "2250000", denom: "uconst" }],
          gas: "90000000",
        }
      },
      {
        amount: "600000",
        contract: staking_contract.contractAddress,
        msg: "eyJjb252ZXJ0Ijoge319" // {"convert": {}}
      }
    );

    const stakingInfo1 = await staking_contract.info();
    console.log(stakingInfo1, stakingInfo1.info.validator_set);

    await sleep(40);
    await staking_contract.claimAndStake(
      {
        account: contract_owner, 
        customFees: {
          amount: [{ amount: "2250000", denom: "uconst" }],
          gas: "90000000",
        },
      }
    );
    //await sleep(30);
    const contract_claim_res = await reward_contract.accruedRewards(
      { address: staking_contract.contractAddress }
    );
    console.log("contract_claim_res:", contract_claim_res);
    const owner_claim_res = await reward_contract.accruedRewards(
      { address: contract_owner.account.address }
    );
    console.log("owner_claim_res:", owner_claim_res);

    await treasury.setupClient();
    let bal_before = await treasury.getBalance("uconst");
    //let res = await staking_contract.callReward({ account: contract_owner }, { to: treasury.account.address });
    let res = await staking_contract.claimReward({ account: contract_owner });

    console.log("claim_res: ", JSON.stringify(res, null, 2));
    let bal_after = await treasury.getBalance("uconst");

    console.log("Balance: ", bal_before, bal_after);
    assert.isAbove(parseFloat(bal_after.amount), parseFloat(bal_before.amount));

    const stakingInfo2 = await staking_contract.info();
    console.log(stakingInfo2, stakingInfo2.info.validator_set);
  });
});