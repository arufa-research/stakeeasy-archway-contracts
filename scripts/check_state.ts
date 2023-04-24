import { getAccountByName } from "archkit";
import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { seArchTokenContract } from "../artifacts/typescript_schema/seArchToken";
import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";
import { MockSelectionContract } from "../artifacts/typescript_schema/MockSelection";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContract";

function sleep(seconds: number) {
  console.log("Sleeping for " + seconds + " seconds");
  return new Promise(resolve => setTimeout(resolve, seconds*1000));
}

async function run () {
  const runTs = String(new Date());
  const contract_owner = getAccountByName("admin");
  // contract_owner = getAccountByName("account_1");

  console.log("admin account fetched successfully");

  const staking_contract = new StakingContractContract();
  const seArch_token = new seArchTokenContract();
  const barch_token = new barchTokenContract();
  const reward_contract = new RewardContractContract();

  console.log("All contract instance created successfully");

  await staking_contract.setUpclient();
  await seArch_token.setUpclient();
  await barch_token.setUpclient();
  await reward_contract.setUpclient();

  // claim and stake
  const stake_claim_res = await staking_contract.claimAndStake(
    {
      account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "uconst" }],
        gas: "3000000",
      },
    }
  );
  console.log(stake_claim_res);

  const c1 = await staking_contract.info();
  console.log("info before deposit: ",c1);

  const seArch_rate_before_stake = await staking_contract.seArchExchangeRate();
  console.log("seArch_rate_before_stake",seArch_rate_before_stake.seArch_exchange_rate.rate);
  const barch_rate_before_stake = await staking_contract.BArchExchangeRate();
  console.log("barch_rate_before_stake",barch_rate_before_stake.barch_exchange_rate.rate);

  const seArch_info = await seArch_token.tokenInfo();
  console.log("seArch_info: ", seArch_info);

  const barch_info = await barch_token.tokenInfo();
  console.log("barch_info: ", barch_info);

  // balances
  const seArch_bal_res = await seArch_token.balance(
    { address: contract_owner.account.address }
  );
  console.log("seArch_bal owner: ", seArch_bal_res.balance);

  const barch_bal_res = await barch_token.balance(
    { address: contract_owner.account.address }
  );
  console.log("barch_bal owner: ", barch_bal_res.balance);

  const seArch_bal_res_1 = await seArch_token.balance(
    { address: staking_contract.contractAddress }
  );
  console.log("seArch_bal staking contracts: ", seArch_bal_res_1.balance);

  const barch_bal_res_1 = await barch_token.balance(
    { address: staking_contract.contractAddress }
  );
  console.log("barch_bal staking contracts: ", barch_bal_res_1.balance);

  // // Stake 1.5 archx and get seArch
  // const deposit_res = await staking_contract.stake(
  //   {
  //     account: contract_owner,
  //     transferAmount: [{"denom": "uconst", "amount": "25000000"}] // 25 archx
  //   }
  // );
  // console.log(deposit_res);

  // // //stake 1.5 and get barch 
  // const deposit_res_barch = await staking_contract.stakeForbarch(
  //   {
  //     account: contract_owner,
  //     transferAmount: [{"denom": "uconst", "amount": "15000000"}], // 15 archx
  //     customFees: {
  //       amount: [{ amount: "75000", denom: "uconst" }],
  //       gas: "3000000",
  //     },
  //   }
  // );
  // console.log(deposit_res_barch);

  // const c2 = await staking_contract.info();
  // console.log("info just after deposit ",c2);
  
}

module.exports = { default: run };
