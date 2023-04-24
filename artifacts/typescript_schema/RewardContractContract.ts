import { Contract, wasmKitTypes, Coin } from "@arufa/wasmkit";
export type Uint128 = string;
export interface AccruedRewardsResponse {
  rewards: Uint128;
  [k: string]: unknown;
}
export interface ConfigResponse {
  barch_contract?: string | null;
  staking_contract: string;
  [k: string]: unknown;
}
export type Addr = string;
export type CanonicalAddr = string;
export interface Config {
  admin: Addr;
  barch_contract?: CanonicalAddr | null;
  staking_contract: CanonicalAddr;
  whitelisted_contracts: CanonicalAddr[];
  [k: string]: unknown;
}
export type ExecuteMsg = {
  update_global_index: {
    [k: string]: unknown;
  };
} | {
  increase_balance: {
    address: string;
    amount: Uint128;
    [k: string]: unknown;
  };
} | {
  decrease_balance: {
    address: string;
    amount: Uint128;
    [k: string]: unknown;
  };
} | {
  claim: {
    recipient?: string | null;
    [k: string]: unknown;
  };
} | {
  whitelist_claim: {
    contract_address: string;
    recipient?: string | null;
    [k: string]: unknown;
  };
} | {
  update_barch_addr: {
    address: string;
    [k: string]: unknown;
  };
} | {
  add_to_whitelist: {
    address: string;
    [k: string]: unknown;
  };
} | {
  remove_from_whitelist: {
    address: string;
    [k: string]: unknown;
  };
};
export type Decimal = string;
export interface HolderResponse {
  address: string;
  balance: Uint128;
  index: Decimal;
  is_whitelisted: boolean;
  pending_rewards: Decimal;
  [k: string]: unknown;
}
export interface Holder {
  balance: Uint128;
  index: Decimal;
  is_whitelisted: boolean;
  pending_rewards: Decimal;
  [k: string]: unknown;
}
export interface InstantiateMsg {
  staking_contract: string;
  [k: string]: unknown;
}
export interface MigrateMsg {
  [k: string]: unknown;
}
export type QueryMsg = {
  config: {
    [k: string]: unknown;
  };
} | {
  state: {
    [k: string]: unknown;
  };
} | {
  accrued_rewards: {
    address: string;
    [k: string]: unknown;
  };
} | {
  holder: {
    address: string;
    [k: string]: unknown;
  };
};
export interface StateResponse {
  global_index: Decimal;
  prev_reward_balance: Uint128;
  total_balance: Uint128;
  [k: string]: unknown;
}
export interface State {
  global_index: Decimal;
  prev_reward_balance: Uint128;
  total_balance: Uint128;
  [k: string]: unknown;
}
export interface RewardContractReadOnlyInterface {
  config: () => Promise<any>;
  state: () => Promise<any>;
  accruedRewards: ({
    address
  }: {
    address: string;
  }) => Promise<any>;
  holder: ({
    address
  }: {
    address: string;
  }) => Promise<any>;
}
export class RewardContractQueryContract extends Contract implements RewardContractReadOnlyInterface {
  constructor(contractName: string, instantiateTag?: string) {
    super(contractName, instantiateTag);
    this.config = this.config.bind(this);
    this.state = this.state.bind(this);
    this.accruedRewards = this.accruedRewards.bind(this);
    this.holder = this.holder.bind(this);
  }

  config = async (): Promise<any> => {
    return this.queryMsg({
      config: {}
    });
  };
  state = async (): Promise<any> => {
    return this.queryMsg({
      state: {}
    });
  };
  accruedRewards = async ({
    address
  }: {
    address: string;
  }): Promise<any> => {
    return this.queryMsg({
      accrued_rewards: {
        address
      }
    });
  };
  holder = async ({
    address
  }: {
    address: string;
  }): Promise<any> => {
    return this.queryMsg({
      holder: {
        address
      }
    });
  };
}
export interface RewardContractInterface extends RewardContractReadOnlyInterface {
  updateGlobalIndex: ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }) => Promise<any>;
  increaseBalance: ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address,
    amount
  }: {
    address: string;
    amount: Uint128;
  }) => Promise<any>;
  decreaseBalance: ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address,
    amount
  }: {
    address: string;
    amount: Uint128;
  }) => Promise<any>;
  claim: ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    recipient
  }: {
    recipient: string | null;
  }) => Promise<any>;
  whitelistClaim: ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    contractAddress,
    recipient
  }: {
    contractAddress: string;
    recipient: string | null;
  }) => Promise<any>;
  updateBarchAddr: ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address
  }: {
    address: string;
  }) => Promise<any>;
  addToWhitelist: ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address
  }: {
    address: string;
  }) => Promise<any>;
  removeFromWhitelist: ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address
  }: {
    address: string;
  }) => Promise<any>;
}
export class RewardContractContract extends RewardContractQueryContract implements RewardContractInterface {
  constructor(instantiateTag?: string) {
    super("reward_contract", instantiateTag);
    this.updateGlobalIndex = this.updateGlobalIndex.bind(this);
    this.increaseBalance = this.increaseBalance.bind(this);
    this.decreaseBalance = this.decreaseBalance.bind(this);
    this.claim = this.claim.bind(this);
    this.whitelistClaim = this.whitelistClaim.bind(this);
    this.updateBarchAddr = this.updateBarchAddr.bind(this);
    this.addToWhitelist = this.addToWhitelist.bind(this);
    this.removeFromWhitelist = this.removeFromWhitelist.bind(this);
  }

  updateGlobalIndex = async ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }): Promise<any> => {
    return await this.executeMsg({
      update_global_index: {}
    }, account, customFees, memo, transferAmount);
  };
  increaseBalance = async ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address,
    amount
  }: {
    address: string;
    amount: Uint128;
  }): Promise<any> => {
    return await this.executeMsg({
      increase_balance: {
        address,
        amount
      }
    }, account, customFees, memo, transferAmount);
  };
  decreaseBalance = async ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address,
    amount
  }: {
    address: string;
    amount: Uint128;
  }): Promise<any> => {
    return await this.executeMsg({
      decrease_balance: {
        address,
        amount
      }
    }, account, customFees, memo, transferAmount);
  };
  claim = async ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    recipient
  }: {
    recipient: string | null;
  }): Promise<any> => {
    return await this.executeMsg({
      claim: {
        recipient
      }
    }, account, customFees, memo, transferAmount);
  };
  whitelistClaim = async ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    contractAddress,
    recipient
  }: {
    contractAddress: string;
    recipient: string | null;
  }): Promise<any> => {
    return await this.executeMsg({
      whitelist_claim: {
        contract_address: contractAddress,
        recipient
      }
    }, account, customFees, memo, transferAmount);
  };
  updateBarchAddr = async ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address
  }: {
    address: string;
  }): Promise<any> => {
    return await this.executeMsg({
      update_barch_addr: {
        address
      }
    }, account, customFees, memo, transferAmount);
  };
  addToWhitelist = async ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address
  }: {
    address: string;
  }): Promise<any> => {
    return await this.executeMsg({
      add_to_whitelist: {
        address
      }
    }, account, customFees, memo, transferAmount);
  };
  removeFromWhitelist = async ({
    account,
    customFees,
    memo,
    transferAmount
  }: {
    account: polarTypes.UserAccount;
    customFees?: polarTypes.TxnStdFee;
    memo?: string;
    transferAmount?: readonly Coin[];
  }, {
    address
  }: {
    address: string;
  }): Promise<any> => {
    return await this.executeMsg({
      remove_from_whitelist: {
        address
      }
    }, account, customFees, memo, transferAmount);
  };
}