export type Transaction = {
  txid: string;
  version: number;
  locktime: number;
  vin: Input[];
  vout: Output[];
};

export type Input = {
  txid: string;
  vout: number;
  prevout: Output;
  scriptsig: string;
  scriptsig_asm: string;
  witness: string[];
  is_coinbase: boolean;
  sequence: number;
  inner_redeemscript_asm: string;
};

export type Output = {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address: string;
  value: number;
};

export enum TransactionType {
  P2PKH = "p2pkh",
  P2SH = "p2sh",
  P2WPKH = "v0_p2wpkh",
  P2WSH = "v0_p2wsh",
  P2TR = "v1_p2tr",
  OP_RETURN = "op_return",
}

export enum SigHash {
  ALL = "01", //all inputs and outputs
  NONE = "02", //all inputs and no output
  SINGLE = "03", //all inputs and output with the same index
  ALL_ANYONECANPAY = "81", //own input and anyone can pay
  NONE_ANYONECANPAY = "82", //own input and no output
  SINGLE_ANYONECANPAY = "83", //own input and output with the same index
}

