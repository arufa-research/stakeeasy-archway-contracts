const { Contract, getAccountByName } = require("@arufa/wasmkit");

import { StakingContractContract } from "../artifacts/typescript_schema/StakingContractContract";

function sleep(seconds: number) {
  console.log("Sleeping for " + seconds + " seconds");
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function run() {
  const contract_owner = await getAccountByName("admin");

  const staking_contract = new StakingContractContract();
  await staking_contract.setupClient();
  //await sleep(4 * 60 * 60 + (60 * 5)); // 4 hours 5 minutes

  var count = 0;
  while (true) {
    try {
      const customFees = { // custom fees
        amount: [{ amount: "1000", denom: "uconst" }],
        gas: "500000",
      }
      const advance_res = await staking_contract.advanceWindow(
        { account: contract_owner, customFees: customFees }
      );
      // console.log(JSON.stringify(claim_and_stake_res, null, 2));
    } catch (e) {
      console.log(e);
      console.log("Advance window failing, skipping");
    }

    await sleep(7 * 24 * 60 * 60 + (60 * 5)); // 4 hours 5 minutes
    count += 1;
  }
}

module.exports = { default: run };