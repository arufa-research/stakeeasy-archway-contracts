"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardContractContract = exports.RewardContractQueryContract = void 0;
const wasmkit_1 = require("@arufa/wasmkit");
class RewardContractQueryContract extends wasmkit_1.Contract {
    constructor(contractName, instantiateTag) {
        super(contractName, instantiateTag);
        this.config = async () => {
            return this.queryMsg({
                config: {}
            });
        };
        this.state = async () => {
            return this.queryMsg({
                state: {}
            });
        };
        this.accruedRewards = async ({ address }) => {
            return this.queryMsg({
                accrued_rewards: {
                    address
                }
            });
        };
        this.holder = async ({ address }) => {
            return this.queryMsg({
                holder: {
                    address
                }
            });
        };
        this.config = this.config.bind(this);
        this.state = this.state.bind(this);
        this.accruedRewards = this.accruedRewards.bind(this);
        this.holder = this.holder.bind(this);
    }
}
exports.RewardContractQueryContract = RewardContractQueryContract;
class RewardContractContract extends RewardContractQueryContract {
    constructor(instantiateTag) {
        super("reward_contract", instantiateTag);
        this.updateGlobalIndex = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                update_global_index: {}
            }, account, customFees, memo, transferAmount);
        };
        this.increaseBalance = async ({ account, customFees, memo, transferAmount }, { address, amount }) => {
            return await this.executeMsg({
                increase_balance: {
                    address,
                    amount
                }
            }, account, customFees, memo, transferAmount);
        };
        this.decreaseBalance = async ({ account, customFees, memo, transferAmount }, { address, amount }) => {
            return await this.executeMsg({
                decrease_balance: {
                    address,
                    amount
                }
            }, account, customFees, memo, transferAmount);
        };
        this.claim = async ({ account, customFees, memo, transferAmount }, { recipient }) => {
            return await this.executeMsg({
                claim: {
                    recipient
                }
            }, account, customFees, memo, transferAmount);
        };
        this.whitelistClaim = async ({ account, customFees, memo, transferAmount }, { contractAddress, recipient }) => {
            return await this.executeMsg({
                whitelist_claim: {
                    contract_address: contractAddress,
                    recipient
                }
            }, account, customFees, memo, transferAmount);
        };
        this.updateBarchAddr = async ({ account, customFees, memo, transferAmount }, { address }) => {
            return await this.executeMsg({
                update_barch_addr: {
                    address
                }
            }, account, customFees, memo, transferAmount);
        };
        this.addToWhitelist = async ({ account, customFees, memo, transferAmount }, { address }) => {
            return await this.executeMsg({
                add_to_whitelist: {
                    address
                }
            }, account, customFees, memo, transferAmount);
        };
        this.removeFromWhitelist = async ({ account, customFees, memo, transferAmount }, { address }) => {
            return await this.executeMsg({
                remove_from_whitelist: {
                    address
                }
            }, account, customFees, memo, transferAmount);
        };
        this.updateGlobalIndex = this.updateGlobalIndex.bind(this);
        this.increaseBalance = this.increaseBalance.bind(this);
        this.decreaseBalance = this.decreaseBalance.bind(this);
        this.claim = this.claim.bind(this);
        this.whitelistClaim = this.whitelistClaim.bind(this);
        this.updateBarchAddr = this.updateBarchAddr.bind(this);
        this.addToWhitelist = this.addToWhitelist.bind(this);
        this.removeFromWhitelist = this.removeFromWhitelist.bind(this);
    }
}
exports.RewardContractContract = RewardContractContract;
//# sourceMappingURL=RewardContractContract.js.map