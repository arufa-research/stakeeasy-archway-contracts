import { getAccountByName } from "archkit";
import { StakingContractContract } from "../artifacts/typescript_schema/StakingContract";
import { seArchTokenContract } from "../artifacts/typescript_schema/seArchToken";
import { barchTokenContract } from "../artifacts/typescript_schema/barchToken";
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
  // const validator_info = new MockSelectionContract();
  const reward_contract = new RewardContractContract();

  console.log("All contract instance created successfully");

  await staking_contract.setUpclient();
  await seArch_token.setUpclient();
  await barch_token.setUpclient();
  await reward_contract.setUpclient();
  // await validator_info.setUpclient();

  console.log("Client setup successfully");

  const staking_deploy_response = await staking_contract.deploy(
    contract_owner
    // {
    //   amount: [{ amount: "1300000", denom: "uconst" }],
    //   gas: "50000000",
    // }
  );
  console.log(staking_deploy_response);

  console.log("staking contract deployed");

  // STAKING CONTRACT INIT
  const staking_contract_info = await staking_contract.instantiate(
    {
      "dev_address": contract_owner.account.address,
      "dev_fee": 5000,  // 5%
      "epoch_period": 3600*24*4 + 10*60,  // 4 days + 10 mins in seconds
      "underlying_coin_denom": "uconst",
      "unbonding_period": 3600*24*28 + 10*60, // 28 days + 10 mins in seconds
      "reward_denom": "uconst",
      "er_threshold": 970,
      "peg_recovery_fee": 10,
    },
    `Staking contract ${runTs}`,
    contract_owner
  );
  console.log(staking_contract_info);

  console.log("staking contract instantiated");

  // Reward CONTRACT DEPLOY
  const reward_contract_deploy_res = await reward_contract.deploy(
    contract_owner
    // {
    //   amount: [{amount: "1300000", denom: "uconst" }],
    //   gas: "50000000"
    // }
  );
  console.log("reward_contract_deploy_res ",reward_contract_deploy_res);

  const reward_contract_instantiate = await reward_contract.instantiate(
    {
      "staking_contract": staking_contract.contractAddress
    },
    `reward contract ${runTs}`,
    contract_owner
  );
  console.log("reward_contract_instantiate ",reward_contract_instantiate);
  
    console.log("reward contract",reward_contract);
  // seArch TOKEN DEPLOY
  const seArch_deploy_response = await seArch_token.deploy(
    contract_owner
    // {
    //   amount: [{ amount: "1300000", denom: "uconst" }],
    //   gas: "35000000",
    // }
  );
  console.log(seArch_deploy_response);

  console.log("seArch contract deployed");

  // seArch TOKEN INIT
  const seArch_token_info = await seArch_token.instantiate(
    {
      "name": "seArch",
      "symbol": "seArch",
      "decimals": 6,
      "initial_balances": [],
      "mint": {minter: staking_contract.contractAddress, cap: null},
      "marketing": null,
    },
    `seArch token ${runTs}`,
    contract_owner
  );
  console.log(seArch_token_info);

  console.log("seArch contract instantiated");

  // barch TOKEN DEPLOY
  const barch_deploy_response = await barch_token.deploy(
    contract_owner
    // {
    //   amount: [{ amount: "1300000", denom: "uconst" }],
    //   gas: "35000000",
    // }
  );
  console.log(barch_deploy_response);

  console.log("barch contract deployed");

  // barch TOKEN INIT
  const barch_token_info = await barch_token.instantiate(
    {
      "name": "barch",
      "symbol": "barch",
      "decimals": 6,
      "initial_balances": [],
      "mint": {minter: staking_contract.contractAddress, cap: null},
      "marketing": null,
      "reward_contract_addr": reward_contract.contractAddress
    },
    `barch token ${runTs}`,
    contract_owner
  );
  console.log(barch_token_info);

  console.log("barch contract instantiated");

  // Add 5 validators to staking contract
  const validator_list = [
    "archvaloper1dru5985k4n5q369rxeqfdsjl8ezutch8mc6nx9",
    "archvaloper17skjxhtt54prnpxcs7a5rv9znlldpe5k3x99gp"
  ];
  for (const val_addr of validator_list) {
    await staking_contract.addValidator(
      {
        account: contract_owner
      },
      {
        address: val_addr
      }
    );
    console.log("Added validator: ", val_addr);
  }

  // ADD seArch addr to STAKING CONTRACT's CONFIG
  const seArch_update_res = await staking_contract.UpdateSearchAddr(
    {
      account: contract_owner
    },
    {
      address: seArch_token.contractAddress
    }
  );
  console.log(seArch_update_res);

  console.log("seArch contract address updated in staking contract");

  // ADD barch addr to STAKING CONTRACT's CONFIG
  const barch_update_res = await staking_contract.UpdateBarchAddr(
    {
      account: contract_owner
    },
    {
      address: barch_token.contractAddress
    }
  );
  console.log(barch_update_res);

  console.log("barch contract address updated in staking contract");

  // ADD barch addr to STAKING CONTRACT's CONFIG
  const reward_update_res = await staking_contract.updateRewardsAddr(
    {
      account: contract_owner
    },
    {
      address: reward_contract.contractAddress
    }
  );
  console.log(reward_update_res);

  const reward_barch_res = await reward_contract.UpdateBarchAddr(
    {
      account: contract_owner
    },
    {
      address: barch_token.contractAddress
    }
  );
  console.log(reward_barch_res);

  console.log("reward contract address updated in staking contract");

  const c1 = await staking_contract.info();
  console.log("info before deposit ",c1);

  const seArch_rate_before_stake = await staking_contract.seArchExchangeRate();
  console.log("seArch_rate_before_stake",seArch_rate_before_stake.seArch_exchange_rate.rate);
  const barch_rate_before_stake = await staking_contract.BArchExchangeRate();
  console.log("barch_rate_before_stake",barch_rate_before_stake.barch_exchange_rate.rate);

  // // Stake 1.5 archx and get seArch
  // const deposit_res = await staking_contract.stake(
  //   {
  //     account: contract_owner,
  //     transferAmount: [{"denom": "uconst", "amount": "25000000"}] // 25 archx
  //   }
  // );
  // console.log(deposit_res);

  // const seArch_rate_after_stake = await staking_contract.seArchExchangeRate();
  // console.log("seArch_rate_after_stake",seArch_rate_after_stake.seArch_exchange_rate.rate);
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

  // const barch_rate_after_stake = await staking_contract.BArchExchangeRate();
  // console.log("rate_after_stake",barch_rate_after_stake.barch_exchange_rate.rate);

  // const c2 = await staking_contract.info();
  // console.log("info just after deposit ",c2);

  // // claim and stake
  // const stake_claim_res = await staking_contract.claimAndStake(
  //   {
  //     account: contract_owner,
  //     customFees: {
  //       amount: [{ amount: "75000", denom: "uconst" }],
  //       gas: "3000000",
  //     },
  //   }
  // );
  // console.log(stake_claim_res);

  // const seArch_rate_after_claimstake = await staking_contract.seArchExchangeRate();
  // console.log("seArch_rate_after_claimstake",seArch_rate_after_claimstake.seArch_exchange_rate.rate);

  // const c3 = await staking_contract.info();
  // console.log("info after claim and stake deposit ",c3);
/*
  const unstaking_res = await seArch_token.send(
    {
      account: contract_owner
    },
    {
      amount: "1500000",
      contract: staking_contract.contractAddress,
      msg: ""
    }
  );
  console.log(unstaking_res);

  const c4 = await staking_contract.info();
  console.log("info after sending seArch deposit ",c4);

  const seArch_rate = await staking_contract.seArch_exchange_rate();
  console.log("seArch_rate after sending seArch to contract",seArch_rate.seArch_exchange_rate.rate);
  let amount = seArch_rate.seArch_exchange_rate.rate * 1500000;
  console.log("amount",amount);

  // advance withdraw window
  const adv_window_res = await staking_contract.advance_window(
    {
      account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "uconst" }],
        gas: "3000000",
      },
    }
  );
  console.log(adv_window_res);

  for(let i=0;i<7;i++){

    const seArch_res = await staking_contract.seArch_exchange_rate();
    console.log("seArch rate after advance window calls",seArch_res.seArch_exchange_rate.rate);

    const info_query = await staking_contract.info();
    console.log("info after claim ",info_query);

    console.log("sleeping ",i);
    await sleep(20);
    await staking_contract.advance_window(
      {
        account: contract_owner,
        customFees: {
          amount: [{ amount: "75000", denom: "uconst" }],
          gas: "3000000",
        },
      }
    );

  }

  const c5 = await staking_contract.info();
  console.log("info after advance window call ",c5);

  const claim_res = await staking_contract.claim(
    {account: contract_owner}
  );
  console.log(claim_res);

  const c6 = await staking_contract.info();
  console.log("info after claim ",c6);

  const user_claimable_res = await staking_contract.user_claimable(
    {address: contract_owner.account.address}
  );
  console.log("user_claimable_res.claimable.claimable_amount ",user_claimable_res.claimable.claimable_amount);

  const seArch_res = await staking_contract.seArch_exchange_rate();
  console.log(seArch_res);

  const barch_res = await staking_contract.barch_exchange_rate();
  console.log(barch_res);

  const info_response = await staking_contract.info();
  console.log(info_response);
  
  // console.log(info_response.info.validator_set);
*/
  
}

module.exports = { default: run };