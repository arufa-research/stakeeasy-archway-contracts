"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { Contract, getAccountByName } = require("@arufa/wasmkit");
const StakingContractContract_1 = require("../artifacts/typescript_schema/StakingContractContract");
function sleep(seconds) {
    console.log("Sleeping for " + seconds + " seconds");
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
async function run() {
    const contract_owner = await getAccountByName("admin");
    const staking_contract = new StakingContractContract_1.StakingContractContract();
    await staking_contract.setupClient();
    var count = 0;
    while (true) {
        try {
            const customFees = {
                amount: [{ amount: "1000", denom: "uconst" }],
                gas: "500000",
            };
            const advance_res = await staking_contract.claimAndStake({ account: contract_owner, customFees: customFees });
            // console.log(JSON.stringify(claim_and_stake_res, null, 2));
        }
        catch (e) {
            console.log(e);
            console.log("Claim and stake failing, skipping");
        }
        await sleep(12 * 60 * 60 + (60 * 5));
        count += 1;
    }
}
module.exports = { default: run };
//# sourceMappingURL=claim-testnet.js.map