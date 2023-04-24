"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StakingContractContract = exports.StakingContractQueryContract = void 0;
const wasmkit_1 = require("@arufa/wasmkit");
class StakingContractQueryContract extends wasmkit_1.Contract {
    constructor(contractName, instantiateTag) {
        super(contractName, instantiateTag);
        this.seArchExchangeRate = async () => {
            return this.queryMsg({
                se_arch_exchange_rate: {}
            });
        };
        this.bArchExchangeRate = async () => {
            return this.queryMsg({
                b_arch_exchange_rate: {}
            });
        };
        this.queryDevFee = async () => {
            return this.queryMsg({
                query_dev_fee: {}
            });
        };
        this.info = async () => {
            return this.queryMsg({
                info: {}
            });
        };
        this.undelegations = async ({ address }) => {
            return this.queryMsg({
                undelegations: {
                    address
                }
            });
        };
        this.userClaimable = async ({ address }) => {
            return this.queryMsg({
                user_claimable: {
                    address
                }
            });
        };
        this.window = async () => {
            return this.queryMsg({
                window: {}
            });
        };
        this.validatorList = async () => {
            return this.queryMsg({
                validator_list: {}
            });
        };
        this.activeUnbonding = async ({ address }) => {
            return this.queryMsg({
                active_unbonding: {
                    address
                }
            });
        };
        this.seArchExchangeRate = this.seArchExchangeRate.bind(this);
        this.bArchExchangeRate = this.bArchExchangeRate.bind(this);
        this.queryDevFee = this.queryDevFee.bind(this);
        this.info = this.info.bind(this);
        this.undelegations = this.undelegations.bind(this);
        this.userClaimable = this.userClaimable.bind(this);
        this.window = this.window.bind(this);
        this.validatorList = this.validatorList.bind(this);
        this.activeUnbonding = this.activeUnbonding.bind(this);
    }
}
exports.StakingContractQueryContract = StakingContractQueryContract;
class StakingContractContract extends StakingContractQueryContract {
    constructor(instantiateTag) {
        super("staking_contract", instantiateTag);
        this.stake = async ({ account, customFees, memo, transferAmount }, { referral }) => {
            return await this.executeMsg({
                stake: {
                    referral
                }
            }, account, customFees, memo, transferAmount);
        };
        this.stakeForbarch = async ({ account, customFees, memo, transferAmount }, { referral }) => {
            return await this.executeMsg({
                stake_forbarch: {
                    referral
                }
            }, account, customFees, memo, transferAmount);
        };
        this.claim = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                claim: {}
            }, account, customFees, memo, transferAmount);
        };
        this.claimAndStake = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                claim_and_stake: {}
            }, account, customFees, memo, transferAmount);
        };
        this.updateSearchAddr = async ({ account, customFees, memo, transferAmount }, { address }) => {
            return await this.executeMsg({
                update_search_addr: {
                    address
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
        this.updateValidatorSetAddr = async ({ account, customFees, memo, transferAmount }, { address }) => {
            return await this.executeMsg({
                update_validator_set_addr: {
                    address
                }
            }, account, customFees, memo, transferAmount);
        };
        this.updateRewardsAddr = async ({ account, customFees, memo, transferAmount }, { address }) => {
            return await this.executeMsg({
                update_rewards_addr: {
                    address
                }
            }, account, customFees, memo, transferAmount);
        };
        this.receive = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                receive: {}
            }, account, customFees, memo, transferAmount);
        };
        this.advanceWindow = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                advance_window: {}
            }, account, customFees, memo, transferAmount);
        };
        this.rebalanceSlash = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                rebalance_slash: {}
            }, account, customFees, memo, transferAmount);
        };
        this.pauseContract = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                pause_contract: {}
            }, account, customFees, memo, transferAmount);
        };
        this.unpauseContract = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                unpause_contract: {}
            }, account, customFees, memo, transferAmount);
        };
        this.voteOnChain = async ({ account, customFees, memo, transferAmount }, { proposal, vote }) => {
            return await this.executeMsg({
                vote_on_chain: {
                    proposal,
                    vote
                }
            }, account, customFees, memo, transferAmount);
        };
        this.removeValidator = async ({ account, customFees, memo, transferAmount }, { address, redelegate }) => {
            return await this.executeMsg({
                remove_validator: {
                    address,
                    redelegate
                }
            }, account, customFees, memo, transferAmount);
        };
        this.addValidator = async ({ account, customFees, memo, transferAmount }, { address }) => {
            return await this.executeMsg({
                add_validator: {
                    address
                }
            }, account, customFees, memo, transferAmount);
        };
        this.redelegate = async ({ account, customFees, memo, transferAmount }, { from, to }) => {
            return await this.executeMsg({
                redelegate: {
                    from,
                    to
                }
            }, account, customFees, memo, transferAmount);
        };
        this.changeOwner = async ({ account, customFees, memo, transferAmount }, { newOwner }) => {
            return await this.executeMsg({
                change_owner: {
                    new_owner: newOwner
                }
            }, account, customFees, memo, transferAmount);
        };
        this.recoverarch = async ({ account, customFees, memo, transferAmount }, { amount, denom, to }) => {
            return await this.executeMsg({
                recover_arch: {
                    amount,
                    denom,
                    to
                }
            }, account, customFees, memo, transferAmount);
        };
        this.killSwitchUnbond = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                kill_switch_unbond: {}
            }, account, customFees, memo, transferAmount);
        };
        this.killSwitchOpenWithdraws = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                kill_switch_open_withdraws: {}
            }, account, customFees, memo, transferAmount);
        };
        this.changeUnbondingTime = async ({ account, customFees, memo, transferAmount }, { newTime }) => {
            return await this.executeMsg({
                change_unbonding_time: {
                    new_time: newTime
                }
            }, account, customFees, memo, transferAmount);
        };
        this.changeDevFee = async ({ account, customFees, memo, transferAmount }, { devAddress, devFee }) => {
            return await this.executeMsg({
                change_dev_fee: {
                    dev_address: devAddress,
                    dev_fee: devFee
                }
            }, account, customFees, memo, transferAmount);
        };
        this.changePegRecoveryFee = async ({ account, customFees, memo, transferAmount }, { pegRecoveryFee }) => {
            return await this.executeMsg({
                change_peg_recovery_fee: {
                    peg_recovery_fee: pegRecoveryFee
                }
            }, account, customFees, memo, transferAmount);
        };
        this.changeThreshold = async ({ account, customFees, memo, transferAmount }, { erThreshold }) => {
            return await this.executeMsg({
                change_threshold: {
                    er_threshold: erThreshold
                }
            }, account, customFees, memo, transferAmount);
        };
        this.claimAirdrop1 = async ({ account, customFees, memo, transferAmount }, { address, amount, proof, stage }) => {
            return await this.executeMsg({
                claim_airdrop1: {
                    address,
                    amount,
                    proof,
                    stage
                }
            }, account, customFees, memo, transferAmount);
        };
        this.claimAirdrop2 = async ({ account, customFees, memo, transferAmount }, { address, amount, proof }) => {
            return await this.executeMsg({
                claim_airdrop2: {
                    address,
                    amount,
                    proof
                }
            }, account, customFees, memo, transferAmount);
        };
        this.claimAirdrop3 = async ({ account, customFees, memo, transferAmount }, { address }) => {
            return await this.executeMsg({
                claim_airdrop3: {
                    address
                }
            }, account, customFees, memo, transferAmount);
        };
        this.claimReward = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                claim_reward: {}
            }, account, customFees, memo, transferAmount);
        };
        this.changeReferralContract = async ({ account, customFees, memo, transferAmount }, { referralContract }) => {
            return await this.executeMsg({
                change_referral_contract: {
                    referral_contract: referralContract
                }
            }, account, customFees, memo, transferAmount);
        };
        this.removeOldWindowData = async ({ account, customFees, memo, transferAmount }, { window }) => {
            return await this.executeMsg({
                remove_old_window_data: {
                    window
                }
            }, account, customFees, memo, transferAmount);
        };
        this.removeOldClaimData = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                remove_old_claim_data: {}
            }, account, customFees, memo, transferAmount);
        };
        this.removeOldQueueData = async ({ account, customFees, memo, transferAmount }) => {
            return await this.executeMsg({
                remove_old_queue_data: {}
            }, account, customFees, memo, transferAmount);
        };
        this.stake = this.stake.bind(this);
        this.stakeForbarch = this.stakeForbarch.bind(this);
        this.claim = this.claim.bind(this);
        this.claimAndStake = this.claimAndStake.bind(this);
        this.updateSearchAddr = this.updateSearchAddr.bind(this);
        this.updateBarchAddr = this.updateBarchAddr.bind(this);
        this.updateValidatorSetAddr = this.updateValidatorSetAddr.bind(this);
        this.updateRewardsAddr = this.updateRewardsAddr.bind(this);
        this.receive = this.receive.bind(this);
        this.advanceWindow = this.advanceWindow.bind(this);
        this.rebalanceSlash = this.rebalanceSlash.bind(this);
        this.pauseContract = this.pauseContract.bind(this);
        this.unpauseContract = this.unpauseContract.bind(this);
        this.voteOnChain = this.voteOnChain.bind(this);
        this.removeValidator = this.removeValidator.bind(this);
        this.addValidator = this.addValidator.bind(this);
        this.redelegate = this.redelegate.bind(this);
        this.changeOwner = this.changeOwner.bind(this);
        this.recoverarch = this.recoverarch.bind(this);
        this.killSwitchUnbond = this.killSwitchUnbond.bind(this);
        this.killSwitchOpenWithdraws = this.killSwitchOpenWithdraws.bind(this);
        this.changeUnbondingTime = this.changeUnbondingTime.bind(this);
        this.changeDevFee = this.changeDevFee.bind(this);
        this.changePegRecoveryFee = this.changePegRecoveryFee.bind(this);
        this.changeThreshold = this.changeThreshold.bind(this);
        this.claimAirdrop1 = this.claimAirdrop1.bind(this);
        this.claimAirdrop2 = this.claimAirdrop2.bind(this);
        this.claimAirdrop3 = this.claimAirdrop3.bind(this);
        this.claimReward = this.claimReward.bind(this);
        this.changeReferralContract = this.changeReferralContract.bind(this);
        this.removeOldWindowData = this.removeOldWindowData.bind(this);
        this.removeOldClaimData = this.removeOldClaimData.bind(this);
        this.removeOldQueueData = this.removeOldQueueData.bind(this);
    }
}
exports.StakingContractContract = StakingContractContract;
//# sourceMappingURL=StakingContractContract.js.map