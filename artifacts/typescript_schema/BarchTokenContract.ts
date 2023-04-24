import { Contract, wasmKitTypes, Coin } from "@arufa/wasmkit";
export interface AllAccountsResponse {
  accounts: string[];
  [k: string]: unknown;
}
export type Uint128 = string;
export type Expiration = {
  at_height: number;
} | {
  at_time: Timestamp;
} | {
  never: {
    [k: string]: unknown;
  };
};
export type Timestamp = Uint64;
export type Uint64 = string;
export interface AllAllowancesResponse {
  allowances: AllowanceInfo[];
  [k: string]: unknown;
}
export interface AllowanceInfo {
  allowance: Uint128;
  expires: Expiration;
  spender: string;
  [k: string]: unknown;
}
export interface AllowanceResponse {
  allowance: Uint128;
  expires: Expiration;
  [k: string]: unknown;
}
export interface BalanceResponse {
  balance: Uint128;
  [k: string]: unknown;
}
export type Cw20ExecuteMsg = {
  transfer: {
    amount: Uint128;
    recipient: string;
    [k: string]: unknown;
  };
} | {
  burn: {
    amount: Uint128;
    [k: string]: unknown;
  };
} | {
  send: {
    amount: Uint128;
    contract: string;
    msg: Binary;
    [k: string]: unknown;
  };
} | {
  increase_allowance: {
    amount: Uint128;
    expires?: Expiration | null;
    spender: string;
    [k: string]: unknown;
  };
} | {
  decrease_allowance: {
    amount: Uint128;
    expires?: Expiration | null;
    spender: string;
    [k: string]: unknown;
  };
} | {
  transfer_from: {
    amount: Uint128;
    owner: string;
    recipient: string;
    [k: string]: unknown;
  };
} | {
  send_from: {
    amount: Uint128;
    contract: string;
    msg: Binary;
    owner: string;
    [k: string]: unknown;
  };
} | {
  burn_from: {
    amount: Uint128;
    owner: string;
    [k: string]: unknown;
  };
} | {
  mint: {
    amount: Uint128;
    recipient: string;
    [k: string]: unknown;
  };
} | {
  update_marketing: {
    description?: string | null;
    marketing?: string | null;
    project?: string | null;
    [k: string]: unknown;
  };
} | {
  upload_logo: Logo;
};
export type Binary = string;
export type Logo = {
  url: string;
} | {
  embedded: EmbeddedLogo;
};
export type EmbeddedLogo = {
  svg: Binary;
} | {
  png: Binary;
};
export interface DownloadLogoResponse {
  data: Binary;
  mime_type: string;
  [k: string]: unknown;
}
export interface InstantiateMsg {
  decimals: number;
  initial_balances: Cw20Coin[];
  marketing?: InstantiateMarketingInfo | null;
  mint?: MinterResponse | null;
  name: string;
  reward_contract_addr: string;
  symbol: string;
  [k: string]: unknown;
}
export interface Cw20Coin {
  address: string;
  amount: Uint128;
  [k: string]: unknown;
}
export interface InstantiateMarketingInfo {
  description?: string | null;
  logo?: Logo | null;
  marketing?: string | null;
  project?: string | null;
  [k: string]: unknown;
}
export interface MinterResponse {
  cap?: Uint128 | null;
  minter: string;
  [k: string]: unknown;
}
export type LogoInfo = "embedded" | {
  url: string;
};
export type Addr = string;
export interface MarketingInfoResponse {
  description?: string | null;
  logo?: LogoInfo | null;
  marketing?: Addr | null;
  project?: string | null;
  [k: string]: unknown;
}
export type QueryMsg = {
  balance: {
    address: string;
    [k: string]: unknown;
  };
} | {
  token_info: {
    [k: string]: unknown;
  };
} | {
  minter: {
    [k: string]: unknown;
  };
} | {
  allowance: {
    owner: string;
    spender: string;
    [k: string]: unknown;
  };
} | {
  all_allowances: {
    limit?: number | null;
    owner: string;
    start_after?: string | null;
    [k: string]: unknown;
  };
} | {
  all_accounts: {
    limit?: number | null;
    start_after?: string | null;
    [k: string]: unknown;
  };
} | {
  marketing_info: {
    [k: string]: unknown;
  };
} | {
  download_logo: {
    [k: string]: unknown;
  };
};
export interface TokenInfoResponse {
  decimals: number;
  name: string;
  symbol: string;
  total_supply: Uint128;
  [k: string]: unknown;
}
export interface BarchTokenReadOnlyInterface {
  balance: ({
    address
  }: {
    address: string;
  }) => Promise<any>;
  tokenInfo: () => Promise<any>;
  minter: () => Promise<any>;
  allowance: ({
    owner,
    spender
  }: {
    owner: string;
    spender: string;
  }) => Promise<any>;
  allAllowances: ({
    limit,
    owner,
    startAfter
  }: {
    limit: number | null;
    owner: string;
    startAfter: string | null;
  }) => Promise<any>;
  allAccounts: ({
    limit,
    startAfter
  }: {
    limit: number | null;
    startAfter: string | null;
  }) => Promise<any>;
  marketingInfo: () => Promise<any>;
  downloadLogo: () => Promise<any>;
}
export class BarchTokenQueryContract extends Contract implements BarchTokenReadOnlyInterface {
  constructor(contractName: string, instantiateTag?: string) {
    super(contractName, instantiateTag);
    this.balance = this.balance.bind(this);
    this.tokenInfo = this.tokenInfo.bind(this);
    this.minter = this.minter.bind(this);
    this.allowance = this.allowance.bind(this);
    this.allAllowances = this.allAllowances.bind(this);
    this.allAccounts = this.allAccounts.bind(this);
    this.marketingInfo = this.marketingInfo.bind(this);
    this.downloadLogo = this.downloadLogo.bind(this);
  }

  balance = async ({
    address
  }: {
    address: string;
  }): Promise<any> => {
    return this.queryMsg({
      balance: {
        address
      }
    });
  };
  tokenInfo = async (): Promise<any> => {
    return this.queryMsg({
      token_info: {}
    });
  };
  minter = async (): Promise<any> => {
    return this.queryMsg({
      minter: {}
    });
  };
  allowance = async ({
    owner,
    spender
  }: {
    owner: string;
    spender: string;
  }): Promise<any> => {
    return this.queryMsg({
      allowance: {
        owner,
        spender
      }
    });
  };
  allAllowances = async ({
    limit,
    owner,
    startAfter
  }: {
    limit: number | null;
    owner: string;
    startAfter: string | null;
  }): Promise<any> => {
    return this.queryMsg({
      all_allowances: {
        limit,
        owner,
        start_after: startAfter
      }
    });
  };
  allAccounts = async ({
    limit,
    startAfter
  }: {
    limit: number | null;
    startAfter: string | null;
  }): Promise<any> => {
    return this.queryMsg({
      all_accounts: {
        limit,
        start_after: startAfter
      }
    });
  };
  marketingInfo = async (): Promise<any> => {
    return this.queryMsg({
      marketing_info: {}
    });
  };
  downloadLogo = async (): Promise<any> => {
    return this.queryMsg({
      download_logo: {}
    });
  };
}
export interface BarchTokenInterface extends BarchTokenReadOnlyInterface {
  transfer: ({
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
    amount,
    recipient
  }: {
    amount: Uint128;
    recipient: string;
  }) => Promise<any>;
  burn: ({
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
    amount
  }: {
    amount: Uint128;
  }) => Promise<any>;
  send: ({
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
    amount,
    contract,
    msg
  }: {
    amount: Uint128;
    contract: string;
    msg: Binary;
  }) => Promise<any>;
  increaseAllowance: ({
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
    amount,
    expires,
    spender
  }: {
    amount: Uint128;
    expires: Expiration | null;
    spender: string;
  }) => Promise<any>;
  decreaseAllowance: ({
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
    amount,
    expires,
    spender
  }: {
    amount: Uint128;
    expires: Expiration | null;
    spender: string;
  }) => Promise<any>;
  transferFrom: ({
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
    amount,
    owner,
    recipient
  }: {
    amount: Uint128;
    owner: string;
    recipient: string;
  }) => Promise<any>;
  sendFrom: ({
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
    amount,
    contract,
    msg,
    owner
  }: {
    amount: Uint128;
    contract: string;
    msg: Binary;
    owner: string;
  }) => Promise<any>;
  burnFrom: ({
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
    amount,
    owner
  }: {
    amount: Uint128;
    owner: string;
  }) => Promise<any>;
  mint: ({
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
    amount,
    recipient
  }: {
    amount: Uint128;
    recipient: string;
  }) => Promise<any>;
  updateMarketing: ({
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
    description,
    marketing,
    project
  }: {
    description: string | null;
    marketing: string | null;
    project: string | null;
  }) => Promise<any>;
  uploadLogo: ({
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
}
export class BarchTokenContract extends BarchTokenQueryContract implements BarchTokenInterface {
  constructor(instantiateTag?: string) {
    super("barch_token", instantiateTag);
    this.transfer = this.transfer.bind(this);
    this.burn = this.burn.bind(this);
    this.send = this.send.bind(this);
    this.increaseAllowance = this.increaseAllowance.bind(this);
    this.decreaseAllowance = this.decreaseAllowance.bind(this);
    this.transferFrom = this.transferFrom.bind(this);
    this.sendFrom = this.sendFrom.bind(this);
    this.burnFrom = this.burnFrom.bind(this);
    this.mint = this.mint.bind(this);
    this.updateMarketing = this.updateMarketing.bind(this);
    this.uploadLogo = this.uploadLogo.bind(this);
  }

  transfer = async ({
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
    amount,
    recipient
  }: {
    amount: Uint128;
    recipient: string;
  }): Promise<any> => {
    return await this.executeMsg({
      transfer: {
        amount,
        recipient
      }
    }, account, customFees, memo, transferAmount);
  };
  burn = async ({
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
    amount
  }: {
    amount: Uint128;
  }): Promise<any> => {
    return await this.executeMsg({
      burn: {
        amount
      }
    }, account, customFees, memo, transferAmount);
  };
  send = async ({
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
    amount,
    contract,
    msg
  }: {
    amount: Uint128;
    contract: string;
    msg: Binary;
  }): Promise<any> => {
    return await this.executeMsg({
      send: {
        amount,
        contract,
        msg
      }
    }, account, customFees, memo, transferAmount);
  };
  increaseAllowance = async ({
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
    amount,
    expires,
    spender
  }: {
    amount: Uint128;
    expires: Expiration | null;
    spender: string;
  }): Promise<any> => {
    return await this.executeMsg({
      increase_allowance: {
        amount,
        expires,
        spender
      }
    }, account, customFees, memo, transferAmount);
  };
  decreaseAllowance = async ({
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
    amount,
    expires,
    spender
  }: {
    amount: Uint128;
    expires: Expiration | null;
    spender: string;
  }): Promise<any> => {
    return await this.executeMsg({
      decrease_allowance: {
        amount,
        expires,
        spender
      }
    }, account, customFees, memo, transferAmount);
  };
  transferFrom = async ({
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
    amount,
    owner,
    recipient
  }: {
    amount: Uint128;
    owner: string;
    recipient: string;
  }): Promise<any> => {
    return await this.executeMsg({
      transfer_from: {
        amount,
        owner,
        recipient
      }
    }, account, customFees, memo, transferAmount);
  };
  sendFrom = async ({
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
    amount,
    contract,
    msg,
    owner
  }: {
    amount: Uint128;
    contract: string;
    msg: Binary;
    owner: string;
  }): Promise<any> => {
    return await this.executeMsg({
      send_from: {
        amount,
        contract,
        msg,
        owner
      }
    }, account, customFees, memo, transferAmount);
  };
  burnFrom = async ({
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
    amount,
    owner
  }: {
    amount: Uint128;
    owner: string;
  }): Promise<any> => {
    return await this.executeMsg({
      burn_from: {
        amount,
        owner
      }
    }, account, customFees, memo, transferAmount);
  };
  mint = async ({
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
    amount,
    recipient
  }: {
    amount: Uint128;
    recipient: string;
  }): Promise<any> => {
    return await this.executeMsg({
      mint: {
        amount,
        recipient
      }
    }, account, customFees, memo, transferAmount);
  };
  updateMarketing = async ({
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
    description,
    marketing,
    project
  }: {
    description: string | null;
    marketing: string | null;
    project: string | null;
  }): Promise<any> => {
    return await this.executeMsg({
      update_marketing: {
        description,
        marketing,
        project
      }
    }, account, customFees, memo, transferAmount);
  };
  uploadLogo = async ({
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
      upload_logo: {}
    }, account, customFees, memo, transferAmount);
  };
}