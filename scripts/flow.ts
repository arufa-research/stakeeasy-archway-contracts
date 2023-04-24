// deploy contract

// make a deposit

// wait some time and do a ClaimAndStake

// wait some time and query exch rate, info, dev fee

// do a user withdraw, this will start the pending claims window

// query current withdraw window (3 days one), pending claims

// claim the rewards after pending claim window is finished (21 + 3 days),
// this will claim from validator to contract and then transfer SCRT from contract to user's wallet
const { getAccountByName } = require("secret-polar");
// import getAccountByName from "secret-polar";
import { BscrtTokenContract } from "../artifacts/typescript_schema/BscrtTokenContract";
import { SescrtTokenContract } from "../artifacts/typescript_schema/SescrtTokenContract";
import { RewardContractContract } from "../artifacts/typescript_schema/RewardContractContract";
import { StakingContractContract } from "../artifacts/typescript_schema/StakingContractContract";

function sleep(seconds: number) {
  console.log("Sleeping for " + seconds + " seconds");
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function run() {
  const runTs = String(new Date());
  const contract_owner = await getAccountByName("account_2");
  console.log("admin account fetched successfully");
  const other_account = await getAccountByName("account_1");
  console.log("other account fetched successfully");

  const staking_contract = new StakingContractContract();
  await staking_contract.setupClient();
  console.log("staking_contract contract instance created successfully");

  // deploy staking contract
  const staking_contract_deploy_res = await staking_contract.deploy(
    contract_owner,
    {
      amount: [{ amount: "1000000", denom: "uscrt" }],
      gas: "4000000",
    }
  );
  console.log("staking_contract token deployed ", staking_contract_deploy_res);
  // init staking contract
  const staking_contract_info = await staking_contract.instantiate(
    {
      "dev_address": contract_owner.account.address,
      "dev_fee": 5000,  // 5%
      "epoch_period": 4 * 60 * 60,  // 4 hours
      "underlying_coin_denom": "uscrt",
      "unbonding_period": 24 * 60 * 60, // 24 hours
      "reward_denom": "uscrt",
      "er_threshold": 970,
      "peg_recovery_fee": 10,
      "viewing_key": "VIEW"
    },
    `Staking contract ${runTs}`,
    contract_owner, undefined, {
      amount:
        [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
    }
  );
  console.log(staking_contract_info);

  console.log("staking contract instantiated");

  const reward_contract = new RewardContractContract();
  await reward_contract.setupClient();
  console.log("reward_contract instance created successfully");

  const reward_contract_res = await reward_contract.deploy(
    contract_owner,
    {
      amount: [{ amount: "1000000", denom: "uscrt" }],
      gas: "4000000",
    }
  );
  console.log("reward_contract token deployed ", reward_contract_res);

  const reward_contract_instantiate = await reward_contract.instantiate(
    {
      "staking_contract": staking_contract.contractAddress,
      "staking_contract_hash": staking_contract.contractCodeHash
    },
    `reward contract ${runTs}`,
    contract_owner,
    undefined, {
      amount:
        [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
    }
  );
  console.log("reward_contract_instantiate ", reward_contract_instantiate);

  const bscrt_token = new BscrtTokenContract();
  await bscrt_token.setupClient();
  console.log("bscrt_token contract instance created successfully");
  // // deploy staking token, $seSCRT
  const bscrt_token_res = await bscrt_token.deploy(
    contract_owner,
    {
      amount: [{ amount: "1000000", denom: "uscrt" }],
      gas: "4000000",
    }
  );
  console.log("bscrt token deployed ", bscrt_token_res);

  const bscrt_token_info = await bscrt_token.instantiate(
    {
      "name": "bscrt",
      // "admin": contract_owner.account.address,
      "admin": staking_contract.contractAddress,
      "symbol": "BSCRT",
      "decimals": 6,
      "config": {enable_deposit: true,enable_redeem: true,enable_mint: true,enable_burn: true,public_total_supply: true},
      "initial_balances": [],
      "prng_seed": "GDShgdiu",
      "reward_contract_addr": reward_contract.contractAddress,
      "reward_contract_hash": reward_contract.contractCodeHash
    },
    `bscrt token ${runTs}`,
    contract_owner, undefined,{
      amount:
        [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
    }
  );
  console.log(bscrt_token_info);

  console.log("bscrt_token contract instantiated");

  const sescrt_token = new SescrtTokenContract();
  await sescrt_token.setupClient();
  console.log("sescrt_token contract instance created successfully");

  const sescrt_token_res = await sescrt_token.deploy(
    contract_owner,
    {
      amount: [{ amount: "1000000", denom: "uscrt" }],
      gas: "4000000",
    }
  );
  console.log("sescrt token deployed ", sescrt_token_res);

  // SESCRT TOKEN INIT
  const sescrt_token_info = await sescrt_token.instantiate(
    {
      "name": "sescrt",
      "admin": staking_contract.contractAddress,
      "symbol": "SESCRT",
      "decimals": 6,
      "config": {enable_deposit: true,enable_redeem: true,enable_mint: true,enable_burn: true,public_total_supply: true},
      "initial_balances": [],
      "prng_seed": "GDShgdiu"
    },
    `sescrt token ${runTs}`,
    contract_owner, undefined, {
      amount:
        [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
    }
  );
  console.log("sescrt_token_info ",sescrt_token_info);

  console.log("All contract instance created successfully");

  // ADD SEscrt addr to STAKING CONTRACT's CONFIG
  const sescrt_update_res = await staking_contract.updateSescrtAddr(
    {
      account: contract_owner,
      customFees:{
        amount:
          [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
      }
    },
    {
      address: sescrt_token.contractAddress,
      codeHash: sescrt_token.contractCodeHash,
    }
  );
  console.log("sescrt_update_res ",sescrt_update_res);

  // ADD Bscrt addr to STAKING CONTRACT's CONFIG
  const bscrt_update_res = await staking_contract.updateBscrtAddr(
    {
      account: contract_owner,
      customFees: {
        amount:
          [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
      }
    },
    {
      address: bscrt_token.contractAddress,
      codeHash: bscrt_token.contractCodeHash
    }
  );
  console.log("bscrt_update_res",bscrt_update_res);
  // update reward contract's bscrt address
  const bscrt_update_inreward = await reward_contract.updateBscrtAddr(
    {
      account: contract_owner,
      customFees:{
        amount:
          [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
      }
    },
    {
      address: bscrt_token.contractAddress,
      codeHash: bscrt_token.contractCodeHash
    }
  );
  console.log("bscrt_update_res",bscrt_update_inreward);

  // ADD Bscrt addr to STAKING CONTRACT's CONFIG
  const reward_update_res = await staking_contract.updateRewardsAddr(
    {
      account: contract_owner,
      customFees: {
        amount:
          [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
      }
    },
    {
      address: reward_contract.contractAddress,
      codeHash: reward_contract.contractCodeHash
    }
  );
  console.log("reward_update_res",reward_update_res);

  const c1 = await staking_contract.info();
  console.log("info before deposit ", c1);

  let set_viewing_key_res = await sescrt_token.setViewingKey({
    account: contract_owner,
    customFees: {
      amount:
        [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
    }
  },
  {
    key: 'viewing',
    padding: null,
  })
  console.log("set_viewing_key_res ",set_viewing_key_res);
  let set_viewing_key_res_bscrt = await bscrt_token.setViewingKey({
    account: contract_owner,
    customFees: {
      amount:
        [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
    }
  },
  {
    key: 'viewing',
    padding: null
  })
  console.log("set_viewing_key_res-BSCRT ",set_viewing_key_res_bscrt);

  let set_viewing_key_res_acc2 = await bscrt_token.setViewingKey({
    account: other_account,
    customFees: {
      amount:
        [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
    }
  },
  {
    key: 'viewing',
    padding: null
  })
  console.log("set_viewing_key_res-other account ",set_viewing_key_res_acc2);

  const validator_list = [
    "secretvaloper1gutgtpw0caqfsp8ja0r5yecv8jxz2y8vxxa9mw", //
    "secretvaloper1l92u46n0d33mhkknwm7zpg0twlqqxg826990re", //4u
    "secretvaloper1ahawe276d250zpxt0xgpfg63ymmu63a0svuvgw" //x3r
  ];

  for (let i=0;i<3;i++) {
    let add_res = await staking_contract.addValidator(
      {
        account: contract_owner,
        customFees:{
          amount:
            [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
        }
      },
      {
        address: validator_list[i]
      }
    );
    console.log("add_res ",add_res);
    console.log("Added validator: ", validator_list[i]);
  }

  const sescrt_rate_before_stake = await staking_contract.sescrtExchangeRate();
  // console.log("sescrt_rate_before_stake",sescrt_rate_before_stake.rate);
  console.log("sescrt_rate_before_stake",sescrt_rate_before_stake.sescrt_exchange_rate.rate * 10000000000000);
  
  const bscrt_rate_before_stake = await staking_contract.bscrtExchangeRate();
  console.log("bscrt_rate_before_stake",bscrt_rate_before_stake.bscrt_exchange_rate.rate);


  // Stake 1.5 scrt and get sescrt
  const deposit_res_sescrt = await staking_contract.stake(
    {
      account: contract_owner,
      transferAmount: [{"denom": "uscrt", "amount": "1000000"}], // 100 scrt
      customFees: {
        amount:
          [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
      }
    },
    {
      referral: 0
    }
  );
  console.log("deposit_res_sescrt ",deposit_res_sescrt);
  // Stake 1.5 scrt and get bscrt
  
  const deposit_res_bscrt = await staking_contract.stakeForBscrt(
    {
      account: contract_owner,
      transferAmount: [{"denom": "uscrt", "amount": "1000000"}], // 100 scrt
      customFees: {
        amount:
          [{ amount: "70000", denom: "uscrt" }], gas: "1200000"
      }
    },
    {
      referral: 0
    }
  );
  console.log("deposit_res_bscrt ",deposit_res_bscrt);

  // console.log(await staking_contract.killSwitchUnbond({ 
  //   account: contract_owner,
  //   customFees: {
  //     amount: [{ amount: "75000", denom: "uscrt" }],
  //     gas: "3000000",
  //   }, }));
  // await sleep(110);

  // console.log(await staking_contract.killSwitchOpenWithdraws({ account: contract_owner,
  //   customFees: {
  //   amount: [{ amount: "75000", denom: "uscrt" }],
  //   gas: "3000000",
  // }, }));

  // await contract_owner.setupClient(); do we need it .......???????????????????
  // let bal_before = await contract_owner.getBalance();
  // console.log("before: ", bal_before);
  // console.log(await sescrt_token.send(
  //   {
  //     txnAccount: contract_owner,
  //     txnCustomFees: {
  //       amount: [{ amount: "2250000", denom: "uscrt" }],
  //       gas: "90000000",
  //     },
  //   },
  //   {
  //     amount: "1000000",
  //     recipient: staking_contract.contractAddress,
  //     recipientCodeHash: staking_contract.contractCodeHash,
  //     msg: "eyJ1bmJvbmQiOnt9fQ=="
  //   }
  // ));

  // let bal_after = await contract_owner.getBalance();
  // console.log("before: ", bal_before, "After: ", bal_after);
 

  // console.log(await bscrt_token.send(
  //   {
  //     txnAccount: contract_owner,
  //     txnCustomFees: {
  //       amount: [{ amount: "75000", denom: "uscrt" }],
  //       gas: "1000000",
  //     }
  //   },
  //   {
  //     amount: "1000000",
  //     recipient: staking_contract.contractAddress,
  //     recipientCodeHash: staking_contract.contractCodeHash,
  //     msg: "eyJjb252ZXJ0Ijp7fX0=" // {"convert":{}}
  //   }
  // ));
  
  // let sescrt_balance = await sescrt_token.balance({
  //   address: contract_owner.account.address,
  //   key: 'viewing',
  // })
  // console.log("sescrt_balance ",sescrt_balance);
  
  // //bscrt balance check(100000000)
  
  // let bscrt_balance = await bscrt_token.balance({
  //   address: contract_owner.account.address,
  //   key: "viewing"
  // })
  // console.log("bscrt_balance ",bscrt_balance);
  
  
  // console.log(await sescrt_token.send(
  //   {
  //     txnAccount: contract_owner,
  //     txnCustomFees: {
  //       amount: [{ amount: "75000", denom: "uscrt" }],
  //       gas: "1000000",
  //     }
  //   },
  //   {
  //     amount: "1000000",
  //     recipient: staking_contract.contractAddress,
  //     recipientCodeHash: staking_contract.contractCodeHash,
  //     msg: "eyJjb252ZXJ0Ijp7fX0=" // {"convert":{}}
  //   }
  // ));

  // let sescrt_balance_res = await sescrt_token.balance({
  //   address: contract_owner.account.address,
  //   key: 'viewing',
  // })
  // console.log("sescrt_balance after",sescrt_balance_res);
  
  // //bscrt balance check(100000000)
  
  // let bscrt_balance_res = await bscrt_token.balance({
  //   address: contract_owner.account.address,
  //   key: "viewing"
  // })
  // console.log("bscrt_balance after ",bscrt_balance_res);

  /*
  
  await sleep(10);
  const query_globalidx = await reward_contract.state();
  console.log("state global index ",query_globalidx);

  const c2 = await staking_contract.info();
  console.log("info just after deposit ",c2);
  
  //check user's sescrt and bscrt tokens
  let sescrt_balance = await sescrt_token.balance({
    address: contract_owner.account.address,
    key: 'viewing',
  })
  console.log("sescrt_balance ",sescrt_balance);
  
  //bscrt balance check(100000000)
  
  let bscrt_balance = await bscrt_token.balance({
    address: contract_owner.account.address,
    key: "viewing"
  })
  console.log("bscrt_balance ",bscrt_balance);

  const claim_and_stake_res = await staking_contract.claimAndStake(
    {account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "uscrt" }],
        gas: "3000000",
      },}
  );
  console.log(claim_and_stake_res);
  await sleep(1800);  
  console.log(await staking_contract.claimAndStake(
    {
      account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "uscrt" }],
        gas: "3000000",
      },
    }
  ));
  const rewards_0 = await reward_contract.accruedRewards({ address: contract_owner.account.address });
  console.log("rewards_0: ", rewards_0);

  console.log("reward contract state global index ",await reward_contract.state());

  console.log(await reward_contract.claim(
    {
      account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "uscrt" }],
        gas: "3000000",
      },
    },
    {}
  ));
  const rewards_1 = await reward_contract.accruedRewards({ address: contract_owner.account.address });
  console.log("rewards_1: ", rewards_1);
  
  await sleep(50);
  const c3 = await staking_contract.info();
  console.log("info just after claim and stake ",c3); 

  const sescrt_rate_after_claim_stake = await staking_contract.sescrtExchangeRate();
  const rate = parseFloat(sescrt_rate_after_claim_stake.sescrt_exchange_rate.rate);
  console.log("sescrt_rate after claim and stake",rate);  

  const unstaking_res = await sescrt_token.send(
    {
      txnAccount: contract_owner,
      txnCustomFees: {
        amount: [{ amount: "75000", denom: "uscrt" }],
        gas: "3000000",
      },
    },
    {
      amount: "1000000",
      recipient: staking_contract.contractAddress,
      recipientCodeHash: staking_contract.contractCodeHash,
      msg: "eyJ1bmJvbmQiOnt9fQ" 
    }
  );
  console.log("unstaking_res ",unstaking_res);

  const c4 = await staking_contract.info();
  console.log("info after sending sescrt deposit ",c4);

  const sescrt_rate = await staking_contract.sescrtExchangeRate();
  let rate_se = sescrt_rate.sescrt_exchange_rate.rate * 100000000000000;
  console.log("sescrt_rate after sending sescrt to contract",rate_se);

  // // advance withdraw window
  const adv_window_res = await staking_contract.advanceWindow(
    {
      account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "uscrt" }],
        gas: "3000000",
      },
    }
  );
  console.log(adv_window_res);

  const window_res = await staking_contract.window();
  console.log("window before after first advance window",window_res);
  
  await sleep(900);
  
  const adv_window_res_1 = await staking_contract.advanceWindow(
    {
      account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "uscrt" }],
        gas: "3000000",
      },
    }
  );
  console.log("Advance window after waiting",adv_window_res_1);
  const window_res_1 = await staking_contract.window();
  console.log("window after second advance window",window_res_1);

  const sescrt_rate_1 = await staking_contract.sescrtExchangeRate();
  let rate_se_1 = sescrt_rate_1.sescrt_exchange_rate.rate * 100000000000000;
  console.log("sescrt_rate after sending sescrt to contract",rate_se_1);

  const user_claimable_res_after1stadv = await staking_contract.userClaimable(
    {address: contract_owner.account.address}
    );
    console.log("claimable amount after first advance window ",user_claimable_res_after1stadv.claimable.claimable_amount);


  const user_claimable_res = await staking_contract.userClaimable(
    {address: contract_owner.account.address}
  );
  console.log("claimable amount outside loop",user_claimable_res.claimable.claimable_amount);

  const claim_res = await staking_contract.claim(
    {account: contract_owner,
      customFees: {
        amount: [{ amount: "75000", denom: "uscrt" }],
        gas: "3000000",
      },}
  );
  console.log("claim_res",claim_res);
  */
  
}



module.exports = { default: run };
