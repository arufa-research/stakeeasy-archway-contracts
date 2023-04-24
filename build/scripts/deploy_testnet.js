"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wasmkit_1 = require("@arufa/wasmkit");
const StakingContractContract_1 = require("../artifacts/typescript_schema/StakingContractContract");
const SearchTokenContract_1 = require("../artifacts/typescript_schema/SearchTokenContract");
const BarchTokenContract_1 = require("../artifacts/typescript_schema/BarchTokenContract");
const RewardContractContract_1 = require("../artifacts/typescript_schema/RewardContractContract");
function sleep(seconds) {
    console.log("Sleeping for " + seconds + " seconds");
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
async function run() {
    const runTs = String(new Date());
    const contract_owner = await (0, wasmkit_1.getAccountByName)("admin");
    console.log("admin account fetched successfully");
    const staking_contract = new StakingContractContract_1.StakingContractContract();
    const seArch_token = new SearchTokenContract_1.SearchTokenContract();
    const barch_token = new BarchTokenContract_1.BarchTokenContract();
    const reward_contract = new RewardContractContract_1.RewardContractContract();
    console.log("All contract instance created successfully");
    await staking_contract.setupClient();
    await seArch_token.setupClient();
    await barch_token.setupClient();
    await reward_contract.setupClient();
    console.log("Client setup successfully");
    const staking_deploy_response = await staking_contract.deploy(contract_owner, {
        amount: [{ amount: "5500", denom: "uconst" }],
        gas: "3500000",
    });
    console.log(staking_deploy_response);
    console.log("staking contract deployed");
    // STAKING CONTRACT INIT
    const staking_contract_info = await staking_contract.instantiate({
        "dev_address": contract_owner.account.address,
        "dev_fee": 5000,
        "epoch_period": 3600 * 24 * 7 + 2 * 60,
        "underlying_coin_denom": "uconst",
        "unbonding_period": 3600 * 24 * 21 + 2 * 60,
        "reward_denom": "uconst",
        "er_threshold": 970,
        "peg_recovery_fee": 10,
    }, `Staking contract ${runTs}`, contract_owner, undefined, {
        amount: [{ amount: "2000", denom: "uconst" }],
        gas: "1000000",
    });
    console.log(staking_contract_info);
    console.log("staking contract instantiated");
    // Reward CONTRACT DEPLOY
    const reward_contract_deploy_res = await reward_contract.deploy(contract_owner, {
        amount: [{ amount: "5500", denom: "uconst" }],
        gas: "3500000",
    });
    console.log("reward_contract_deploy_res ", reward_contract_deploy_res);
    const reward_contract_instantiate = await reward_contract.instantiate({
        "staking_contract": staking_contract.contractAddress
    }, `reward contract ${runTs}`, contract_owner, undefined, {
        amount: [{ amount: "2000", denom: "uconst" }],
        gas: "1000000",
    });
    console.log("reward_contract_instantiate ", reward_contract_instantiate);
    console.log("reward contract", reward_contract);
    // seArch TOKEN DEPLOY
    const seArch_deploy_response = await seArch_token.deploy(contract_owner, {
        amount: [{ amount: "5500", denom: "uconst" }],
        gas: "3500000",
    });
    console.log(seArch_deploy_response);
    console.log("seArch contract deployed");
    // seArch TOKEN INIT
    const seArch_token_info = await seArch_token.instantiate({
        "name": "seArch",
        "symbol": "seArch",
        "decimals": 6,
        "initial_balances": [],
        "mint": { minter: staking_contract.contractAddress, cap: null },
        "marketing": null,
    }, `seArch token ${runTs}`, contract_owner, undefined, {
        amount: [{ amount: "2000", denom: "uconst" }],
        gas: "1000000",
    });
    console.log(seArch_token_info);
    console.log("seArch contract instantiated");
    // barch TOKEN DEPLOY
    const barch_deploy_response = await barch_token.deploy(contract_owner, {
        amount: [{ amount: "5500", denom: "uconst" }],
        gas: "3500000",
    });
    console.log(barch_deploy_response);
    console.log("barch contract deployed");
    // barch TOKEN INIT
    const barch_token_info = await barch_token.instantiate({
        "name": "barch",
        "symbol": "barch",
        "decimals": 6,
        "initial_balances": [],
        "mint": { minter: staking_contract.contractAddress, cap: null },
        "marketing": null,
        "reward_contract_addr": reward_contract.contractAddress
    }, `barch token ${runTs}`, contract_owner, undefined, {
        amount: [{ amount: "2000", denom: "uconst" }],
        gas: "1000000",
    });
    console.log(barch_token_info);
    console.log("barch contract instantiated");
    // Add 5 validators to staking contract manually
    // const validator_list = [
    //   //"archwayvaloper1us7q40hurgx2k7zjmxe5pwuq0ffgstjlzcdncn",
    //   //"archwayvaloper1wcynzzk7fj2fsgz2dmk3qr0hk0msezxs48jhcd",
    //   "archwayvaloper1sk23ewl2kzfu9mfh3sdh6gpm9xkq56m7tjnl25",
    // ];
    // for (const val_addr of validator_list) {
    //   await staking_contract.addValidator(
    //     {
    //       account: contract_owner,
    //       customFees:
    //       {
    //         amount: [{ amount: "1000", denom: "uconst" }],
    //         gas: "500000",
    //       }
    //     },
    //     {
    //       address: val_addr
    //     }
    //   );
    //   console.log("Added validator: ", val_addr);
    // }
    // ADD seArch addr to STAKING CONTRACT's CONFIG
    // const seArch_update_res = await staking_contract.updateSearchAddr(
    //   {
    //     account: contract_owner,
    //     customFees:
    //       {
    //         amount: [{ amount: "2000", denom: "uconst" }],
    //         gas: "1000000",
    //       }
    //   },
    //   {
    //     address: seArch_token.contractAddress
    //   }
    // );
    // console.log(seArch_update_res);
    console.log("seArch contract address updated in staking contract");
    // // ADD barch addr to STAKING CONTRACT's CONFIG
    // const barch_update_res = await staking_contract.updateBarchAddr(
    //   {
    //     account: contract_owner,
    //     customFees:
    //       {
    //         amount: [{ amount: "2000", denom: "uconst" }],
    //         gas: "1000000",
    //       }
    //   },
    //   {
    //     address: barch_token.contractAddress
    //   }
    // );
    // console.log(barch_update_res);
    console.log("barch contract address updated in staking contract");
    // ADD barch addr to STAKING CONTRACT's CONFIG
    const reward_update_res = await staking_contract.updateRewardsAddr({
        account: contract_owner,
        customFees: {
            amount: [{ amount: "2000", denom: "uconst" }],
            gas: "1000000",
        }
    }, {
        address: reward_contract.contractAddress
    });
    console.log(reward_update_res);
    // const reward_barch_res = await reward_contract.updateBarchAddr(
    //   {
    //     account: contract_owner,
    //     customFees:
    //       {
    //         amount: [{ amount: "2000", denom: "uconst" }],
    //         gas: "1000000",
    //       }
    //   },
    //   {
    //     address: barch_token.contractAddress
    //   }
    // );
    // console.log(reward_barch_res);
    console.log("reward contract address updated in staking contract");
    const c1 = await staking_contract.info();
    console.log("info before deposit ", c1);
    const seArch_rate_before_stake = await staking_contract.seArchExchangeRate();
    console.log("seArch_rate_before_stake", seArch_rate_before_stake.seArch_exchange_rate);
    const barch_rate_before_stake = await staking_contract.bArchExchangeRate();
    console.log("barch_rate_before_stake", barch_rate_before_stake.barch_exchange_rate);
    // Stake 1.5 archx and get seArch
    const deposit_res = await staking_contract.stake({
        account: contract_owner,
        transferAmount: [{ "denom": "uconst", "amount": "1000" }],
        customFees: {
            amount: [{ amount: "2000", denom: "uconst" }],
            gas: "1000000",
        }
    }, { referral: 0 });
    console.log(deposit_res);
    const seArch_rate_after_stake = await staking_contract.seArchExchangeRate();
    console.log("seArch_rate_after_stake", seArch_rate_after_stake.seArch_exchange_rate.rate);
    // //stake 1.5 and get barch 
    const deposit_res_barch = await staking_contract.stakeForbarch({
        account: contract_owner,
        transferAmount: [{ "denom": "uconst", "amount": "2000" }],
        customFees: {
            amount: [{ amount: "1500", denom: "uconst" }],
            gas: "1000000",
        },
    }, { referral: 0 });
    console.log(deposit_res_barch);
    const barch_rate_after_stake = await staking_contract.bArchExchangeRate();
    console.log("rate_after_stake", barch_rate_after_stake.barch_exchange_rate.rate);
    const c2 = await staking_contract.info();
    console.log("info just after deposit ", c2);
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
    const seArch_rate_after_claimstake = await staking_contract.seArchExchangeRate();
    console.log("seArch_rate_after_claimstake", seArch_rate_after_claimstake.seArch_exchange_rate.rate);
    const c3 = await staking_contract.info();
    console.log("info after claim and stake deposit ", c3);
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
//# sourceMappingURL=deploy_testnet.js.map