import { getAccountByName } from "archkit";

import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";

function sleep(seconds: number) {
  console.log("Sleeping for " + seconds + " seconds");
  return new Promise(resolve => setTimeout(resolve, seconds*1000));
}

async function run () {
  const runTs = String(new Date());
  const contract_owner = getAccountByName("admin");

  const barch_token = new barchTokenContract();

  console.log("All contract instance created successfully");

  await barch_token.setUpclient();

  // deploy new barch contract
  const deploy_res = await barch_token.deploy(
    contract_owner,
    // {
    //   amount: [{ amount: "1300000", denom: "uconst" }],
    //   gas: "35000000",
    // }
  );
  console.log("deploy_res: ", JSON.stringify(deploy_res, null, 2));

  // migrate the contract to new codeId
  const migrate_res = await barch_token.migrate(
    {},
    barch_token.codeId,
    contract_owner,
    {
      amount: [{ amount: "25000", denom: "uconst" }],
      gas: "500000",
    },
  );
  console.log("migrate_res: ", JSON.stringify(migrate_res, null, 2));

  const barch_info_after = await barch_token.tokenInfo();
  console.log("barch_info_after: ", JSON.stringify(barch_info_after, null, 2));

  const barch_bal_res_after = await barch_token.balance(
    { address: contract_owner.account.address }
  );
  console.log("barch_bal owner: ", JSON.stringify(barch_bal_res_after.balance, null, 2)); 
}

module.exports = { default: run };
