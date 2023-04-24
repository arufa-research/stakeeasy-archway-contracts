import { getAccountByName, archkitTypes }  from "archkit";

import { barchTokenMigrateContract } from "../artifacts/typescript_schema/barchTokenMigrate";
import { StakingContractMigrateContract } from "../artifacts/typescript_schema/StakingContractMigrate";

export async function setupMigrate(
): Promise<any> {
  const runTs: string = String(new Date());
  const contract_owner: archkitTypes.UserAccount = getAccountByName("admin");

  console.log("admin account fetched successfully");

  const barch_migrate_contract: barchTokenMigrateContract = new barchTokenMigrateContract();
  const staking_migrate_contract: StakingContractMigrateContract = new StakingContractMigrateContract();

  console.log("All contract instance created successfully");

  await barch_migrate_contract.setUpclient();
  await staking_migrate_contract.setUpclient();

  console.log("Client setup successfully");

  /*
   * Deploy all contracts
   */
  const barch_migrate_deploy = await barch_migrate_contract.deploy(
    contract_owner,
    {
      amount: [{ amount: "2250000", denom: "uconst" }],
      gas: "90000000",
    }
  );
  console.log("barch migrate contract deployed ", barch_migrate_deploy);

  const staking_migrate_deploy = await staking_migrate_contract.deploy(
    contract_owner,
    {
      amount: [{ amount: "2250000", denom: "uconst" }],
      gas: "90000000",
    }
  );
  console.log("staking migrate contract deployed ", staking_migrate_deploy);

  return {
    runTs, contract_owner,
    barch_migrate_contract, staking_migrate_contract
  }
}