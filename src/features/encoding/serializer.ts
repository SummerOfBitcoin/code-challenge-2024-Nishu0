import { Transaction, Input, Output } from "../../types";
import { reversify, sha256 } from "../../utils";
import { compactSize } from "./compactSize";
import cloneDeep from "lodash.clonedeep";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { bitcoin } from "ecpair/src/networks";
import { getNextNBytes } from "../script/utils";
import { ZEROS } from "../block/coinbaseTransaction";

const ECPair = ECPairFactory(ecc);

export const outputSerializer = (outTx: Output) => {
  const amount = Buffer.alloc(8);
  amount.writeBigInt64LE(BigInt(outTx.value), 0);
  return `${amount.toString("hex")}${compactSize(
    BigInt(outTx.scriptpubkey.length / 2)
  ).toString("hex")}${outTx.scriptpubkey}`;
};

export const inputSerializer = (inTx: Input) => {
  let serializedInput = "";

  const txHash = reversify(inTx.txid);
  serializedInput += txHash;

  const outputIndex = Buffer.alloc(4);
  outputIndex.writeUint32LE(inTx.vout, 0);
  serializedInput += outputIndex.toString("hex");

  const scriptSig = inTx.scriptsig;
  const scriptSigSize = compactSize(BigInt(scriptSig.length / 2));
  const sequence = Buffer.alloc(4);
  sequence.writeUint32LE(inTx.sequence, 0);

  serializedInput += scriptSigSize.toString("hex");
  serializedInput += scriptSig;
  serializedInput += sequence.toString("hex");

  return serializedInput;
};

export const txSerializer = (tx: Transaction) => {
  let serializedTx = "";
  let serializedWTx = "";

  const version = Buffer.alloc(4);
  version.writeInt16LE(tx.version, 0);
  serializedTx += version.toString("hex");
  serializedWTx += version.toString("hex");

  serializedWTx += "0001";

  const numInputs = compactSize(BigInt(tx.vin.length));
  serializedTx += numInputs.toString("hex");
  serializedWTx += numInputs.toString("hex");

  for (let i = 0; i < tx.vin.length; i++) {
    serializedTx += inputSerializer(tx.vin[i]);
    serializedWTx += inputSerializer(tx.vin[i]);
  }

  const numOutputs = compactSize(BigInt(tx.vout.length));
  serializedTx += numOutputs.toString("hex");
  serializedWTx += numOutputs.toString("hex");
  for (let i = 0; i < tx.vout.length; i++) {
    serializedTx += outputSerializer(tx.vout[i]);
    serializedWTx += outputSerializer(tx.vout[i]);
  }

  let isWitness = false;
  for (let i = 0; i < tx.vin.length; i++) {
    if (!tx.vin[i].witness || tx.vin[i].witness.length === 0) {
      serializedWTx += compactSize(BigInt(0)).toString("hex");
    } else {
      isWitness = true;
      serializedWTx += compactSize(BigInt(tx.vin[i].witness.length)).toString(
        "hex"
      );
      for (const witness of tx.vin[i].witness) {
        serializedWTx += compactSize(BigInt(witness.length / 2)).toString(
          "hex"
        );
        serializedWTx += witness;
      }
    }
  }

  const locktime = Buffer.alloc(4);
  locktime.writeUint32LE(tx.locktime, 0);
  serializedTx += locktime.toString("hex");
  serializedWTx += locktime.toString("hex");

  return {
    serializedTx,
    serializedWTx: isWitness ? serializedWTx : serializedTx,
  };
};

export const txWeight = (tx: Transaction) => {
  return txSerializer(tx).serializedTx.length / 2; // divide by two cuz 2 hex chars are 1 byte and 1e6 as you cconsider it in mb
};

const txForSigning = (tx: Transaction, input: number) => {
  const txCopy = cloneDeep(tx);
  for (let i = 0; i < txCopy.vin.length; i++) {
    if (i === input) {
      txCopy.vin[i].scriptsig = txCopy.vin[i].prevout.scriptpubkey;
    } else {
      txCopy.vin[i].scriptsig = "";
    }
  }

  return txSerializer(txCopy).serializedTx + "01000000"; //force SIGHASH_ALL
};

const extractRSFromSignature = (derEncodedSignature: string) => {
  let derEncodingScheme,
    signatureLength,
    r,
    s,
    rLength,
    sLength,
    rest,
    prefix,
    padding;
  [derEncodingScheme, rest] = getNextNBytes(derEncodedSignature, 1);
  if (derEncodingScheme !== "30")
    throw new Error("Invalid DER encoding scheme");
  [signatureLength, rest] = getNextNBytes(rest, 1);
  [prefix, rest] = getNextNBytes(rest, 1);
  [rLength, rest] = getNextNBytes(rest, 1);
  [r, rest] = getNextNBytes(rest, parseInt(rLength, 16));
  if (r.length === 66) [padding, r] = getNextNBytes(r, 1); //account for 00 padding
  [prefix, rest] = getNextNBytes(rest, 1);
  [sLength, rest] = getNextNBytes(rest, 1);
  [s, rest] = getNextNBytes(rest, parseInt(sLength, 16));
  return r + s;
};


const tx = {
  version: 2,
  locktime: 0,
  vin: [
    {
      txid: "fb7fe37919a55dfa45a062f88bd3c7412b54de759115cb58c3b9b46ac5f7c925",
      vout: 1,
      prevout: {
        scriptpubkey: "76a914286eb663201959fb12eff504329080e4c56ae28788ac",
        scriptpubkey_asm:
          "OP_DUP OP_HASH160 OP_PUSHBYTES_20 286eb663201959fb12eff504329080e4c56ae287 OP_EQUALVERIFY OP_CHECKSIG",
        scriptpubkey_type: "p2pkh",
        scriptpubkey_address: "14gnf7L2DjBYKFuWb6iftBoWE9hmAoFbcF",
        value: 433833,
      },
      scriptsig:
        "4830450221008f619822a97841ffd26eee942d41c1c4704022af2dd42600f006336ce686353a0220659476204210b21d605baab00bef7005ff30e878e911dc99413edb6c1e022acd012102c371793f2e19d1652408efef67704a2e9953a43a9dd54360d56fc93277a5667d",
      scriptsig_asm:
        "OP_PUSHBYTES_72 30450221008f619822a97841ffd26eee942d41c1c4704022af2dd42600f006336ce686353a0220659476204210b21d605baab00bef7005ff30e878e911dc99413edb6c1e022acd01 OP_PUSHBYTES_33 02c371793f2e19d1652408efef67704a2e9953a43a9dd54360d56fc93277a5667d",
      is_coinbase: false,
      sequence: 4294967295,
    },
  ],
  vout: [
    {
      scriptpubkey: "76a9141ef7874d338d24ecf6577e6eadeeee6cd579c67188ac",
      scriptpubkey_asm:
        "OP_DUP OP_HASH160 OP_PUSHBYTES_20 1ef7874d338d24ecf6577e6eadeeee6cd579c671 OP_EQUALVERIFY OP_CHECKSIG",
      scriptpubkey_type: "p2pkh",
      scriptpubkey_address: "13pjoLcRKqhzPCbJgYW77LSFCcuwmHN2qA",
      value: 387156,
    },
    {
      scriptpubkey: "76a9142e391b6c47778d35586b1f4154cbc6b06dc9840c88ac",
      scriptpubkey_asm:
        "OP_DUP OP_HASH160 OP_PUSHBYTES_20 2e391b6c47778d35586b1f4154cbc6b06dc9840c OP_EQUALVERIFY OP_CHECKSIG",
      scriptpubkey_type: "p2pkh",
      scriptpubkey_address: "15DQVhQ7PU6VPsTtvwLxfDsTP4P6A3Z5vP",
      value: 37320,
    },
  ],
} as unknown as Transaction;


const txToBeSigned = txForSigning(tx, 0);
const hash = sha256(sha256(txToBeSigned));

const pubkey = ECPair.fromPublicKey(
  Buffer.from(
    "02c371793f2e19d1652408efef67704a2e9953a43a9dd54360d56fc93277a5667d",
    "hex"
  ),
  { compressed: false, network: bitcoin }
);

console.log(
  extractRSFromSignature(
    "30450221008f619822a97841ffd26eee942d41c1c4704022af2dd42600f006336ce686353a0220659476204210b21d605baab00bef7005ff30e878e911dc99413edb6c1e022acd01"
  )
);

const res = pubkey.verify(
  Buffer.from(hash, "hex"),
  Buffer.from(
    extractRSFromSignature(
      //extract r, s from DER encoded ECDSA signature
      "30450221008f619822a97841ffd26eee942d41c1c4704022af2dd42600f006336ce686353a0220659476204210b21d605baab00bef7005ff30e878e911dc99413edb6c1e022acd01"
    ),
    "hex"
  )
);

console.log(res);
