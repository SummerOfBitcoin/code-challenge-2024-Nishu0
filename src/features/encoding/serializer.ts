import { Transaction, Input, Output } from "../transaction";
import { reversify, sha256 } from "../../utils";
import { compactSize } from "./compactSize";
import { getNextNBytes } from "../script/utils";

export class Serializer {
  static serializeTx(tx: Transaction) {
    let serializedTx = "";

    const version = Buffer.alloc(4);
    version.writeInt16LE(tx.version, 0);
    serializedTx += version.toString("hex");

    const numInputs = compactSize(BigInt(tx.vin.length));
    serializedTx += numInputs.toString("hex");

    for (let i = 0; i < tx.vin.length; i++) {
      serializedTx += Serializer.serializeInput(tx.vin[i]);
    }

    const numOutputs = compactSize(BigInt(tx.vout.length));
    serializedTx += numOutputs.toString("hex");
    for (let i = 0; i < tx.vout.length; i++) {
      serializedTx += Serializer.serializeOutput(tx.vout[i]);
    }

    const locktime = Buffer.alloc(4);
    locktime.writeUint32LE(tx.locktime, 0);
    serializedTx += locktime.toString("hex");

    return serializedTx;
  }

  static serializeWTx(tx: Transaction) {
    let serializedWTx = "";

    const version = Buffer.alloc(4);
    version.writeInt16LE(tx.version, 0);
    serializedWTx += version.toString("hex");

    serializedWTx += "0001";

    const numInputs = compactSize(BigInt(tx.vin.length));
    serializedWTx += numInputs.toString("hex");

    for (let i = 0; i < tx.vin.length; i++) {
      serializedWTx += Serializer.serializeInput(tx.vin[i]);
    }

    const numOutputs = compactSize(BigInt(tx.vout.length));
    serializedWTx += numOutputs.toString("hex");

    for (let i = 0; i < tx.vout.length; i++) {
      serializedWTx += Serializer.serializeOutput(tx.vout[i]);
    }

    for (let i = 0; i < tx.vin.length; i++) {
      const input = tx.vin[i];
      if (
        !input.witness ||
        (input && input.witness !== undefined && input.witness.length === 0)
      ) {
        serializedWTx += compactSize(BigInt(0)).toString("hex");
      } else {
        serializedWTx += compactSize(BigInt(input.witness.length)).toString(
          "hex"
        );
        for (const witness of input.witness) {
          serializedWTx += compactSize(BigInt(witness.length / 2)).toString(
            "hex"
          );
          serializedWTx += witness;
        }
      }
    }

    const locktime = Buffer.alloc(4);
    locktime.writeUint32LE(tx.locktime, 0);
    serializedWTx += locktime.toString("hex");

    return serializedWTx;
  }

  static serializeInput(input: Input) {
    let serializedInput = "";

    const txHash = reversify(input.txid);
    serializedInput += txHash;

    const outputIndex = Buffer.alloc(4);
    outputIndex.writeUint32LE(input.vout, 0);
    serializedInput += outputIndex.toString("hex");

    const scriptSig = input.scriptsig;
    const scriptSigSize = compactSize(BigInt(scriptSig.length / 2));
    const sequence = Buffer.alloc(4);
    sequence.writeUint32LE(input.sequence, 0);

    serializedInput += scriptSigSize.toString("hex");
    serializedInput += scriptSig;
    serializedInput += sequence.toString("hex");

    return serializedInput;
  }

  static serializeOutput(output: Output) {
    let serializedOutput = "";
    const amount = Buffer.alloc(8);
    amount.writeBigInt64LE(BigInt(output.value), 0);

    serializedOutput += amount.toString("hex");
    serializedOutput += compactSize(
      BigInt(output.scriptpubkey.length / 2)
    ).toString("hex");
    serializedOutput += output.scriptpubkey;

    return serializedOutput;
  }
}

const weight = (val: Buffer | string, multiplier: number) => {
  return val instanceof Buffer
    ? (val.toString("hex").length / 2) * multiplier
    : (val.length / 2) * multiplier;
};

// export const outputSerializer = (outTx: Output) => {
//   const amount = Buffer.alloc(8);
//   amount.writeBigInt64LE(BigInt(outTx.value), 0);
//   return `${amount.toString("hex")}${compactSize(
//     BigInt(outTx.scriptpubkey.length / 2)
//   ).toString("hex")}${outTx.scriptpubkey}`;
// };

// export const inputSerializer = (inTx: Input) => {
//   let serializedInput = "";

//   const txHash = reversify(inTx.txid);
//   serializedInput += txHash;

//   const outputIndex = Buffer.alloc(4);
//   outputIndex.writeUint32LE(inTx.vout, 0);
//   serializedInput += outputIndex.toString("hex");

//   const scriptSig = inTx.scriptsig;
//   const scriptSigSize = compactSize(BigInt(scriptSig.length / 2));
//   const sequence = Buffer.alloc(4);
//   sequence.writeUint32LE(inTx.sequence, 0);

//   serializedInput += scriptSigSize.toString("hex");
//   serializedInput += scriptSig;
//   serializedInput += sequence.toString("hex");

//   return serializedInput;
// };

// export const txSerializer = (tx: Transaction) => {
//   let serializedTx = "";
//   let serializedWTx = "";
//   let totalWeight = 0;

//   const version = Buffer.alloc(4);
//   version.writeInt16LE(tx.version, 0);
//   serializedTx += version.toString("hex");
//   serializedWTx += version.toString("hex");
//   totalWeight += weight(version, 4);

//   serializedWTx += "0001";
//   let witnessWeights = 2;

//   const numInputs = compactSize(BigInt(tx.vin.length));
//   serializedTx += numInputs.toString("hex");
//   serializedWTx += numInputs.toString("hex");
//   totalWeight += weight(numInputs, 4);

//   for (let i = 0; i < tx.vin.length; i++) {
//     serializedTx += inputSerializer(tx.vin[i]);
//     serializedWTx += inputSerializer(tx.vin[i]);
//     totalWeight += weight(inputSerializer(tx.vin[i]), 4);
//   }

//   const numOutputs = compactSize(BigInt(tx.vout.length));
//   serializedTx += numOutputs.toString("hex");
//   serializedWTx += numOutputs.toString("hex");
//   totalWeight += weight(numOutputs, 4);
//   for (let i = 0; i < tx.vout.length; i++) {
//     serializedTx += outputSerializer(tx.vout[i]);
//     serializedWTx += outputSerializer(tx.vout[i]);
//     totalWeight += weight(outputSerializer(tx.vout[i]), 4);
//   }

//   let isWitness = false;
//   for (let i = 0; i < tx.vin.length; i++) {
//     if (!tx.vin[i].witness || tx.vin[i].witness.length === 0) {
//       serializedWTx += compactSize(BigInt(0)).toString("hex");
//       witnessWeights += weight(compactSize(BigInt(0)), 1);
//     } else {
//       isWitness = true;
//       serializedWTx += compactSize(BigInt(tx.vin[i].witness.length)).toString(
//         "hex"
//       );
//       witnessWeights += weight(
//         compactSize(BigInt(tx.vin[i].witness.length)),
//         1
//       );
//       for (const witness of tx.vin[i].witness) {
//         serializedWTx += compactSize(BigInt(witness.length / 2)).toString(
//           "hex"
//         );
//         witnessWeights += weight(compactSize(BigInt(witness.length / 2)), 1);
//         serializedWTx += witness;
//         witnessWeights += weight(witness, 1);
//       }
//     }
//   }

//   const locktime = Buffer.alloc(4);
//   locktime.writeUint32LE(tx.locktime, 0);
//   serializedTx += locktime.toString("hex");
//   serializedWTx += locktime.toString("hex");
//   totalWeight += weight(locktime, 4);

//   if (isWitness) totalWeight += witnessWeights; //for marker and flag

//   return {
//     serializedTx,
//     serializedWTx: isWitness ? serializedWTx : serializedTx,
//     weight: totalWeight,
//   };
// };

// export const txWeight = (tx: Transaction) => {
//   // return txSerializer(tx).serializedWTx.length / 2;
//   return txSerializer(tx).weight;
// };

// export const txForSigning = (
//   tx: Transaction,
//   input: number,
//   sighash: SigHash
// ) => {
//   const txCopy = cloneDeep(tx);
//   let hashcode = Buffer.alloc(4);
//   switch (sighash) {
//     case SigHash.ALL:
//       for (let i = 0; i < txCopy.vin.length; i++) {
//         hashcode.writeUint32LE(1, 0);
//         if (i === input) {
//           txCopy.vin[i].scriptsig = txCopy.vin[i].prevout.scriptpubkey;
//         } else {
//           txCopy.vin[i].scriptsig = "";
//         }
//       }
//       break;
//     case SigHash.ALL_ANYONECANPAY:
//       hashcode.writeUint32LE(0x81, 0);
//       txCopy.vin = [txCopy.vin[input]];
//       txCopy.vin[0].scriptsig = txCopy.vin[0].prevout.scriptpubkey;
//       break;
//   }

//   return txSerializer(txCopy).serializedTx + hashcode.toString("hex");
// };

export const extractRSFromSignature = (derEncodedSignature: string) => {
  let derEncodingScheme,
    signatureLength,
    r,
    s,
    rLength,
    sLength,
    rest,
    prefix,
    rPadding = "",
    sPadding = "";
  [derEncodingScheme, rest] = getNextNBytes(derEncodedSignature, 1);
  if (derEncodingScheme !== "30")
    throw new Error("Invalid DER encoding scheme");
  [signatureLength, rest] = getNextNBytes(rest, 1);
  [prefix, rest] = getNextNBytes(rest, 1);
  [rLength, rest] = getNextNBytes(rest, 1);
  [r, rest] = getNextNBytes(rest, parseInt(rLength, 16));
  if (r.length === 66) [rPadding, r] = getNextNBytes(r, 1); //account for 00 padding

  [prefix, rest] = getNextNBytes(rest, 1);
  [sLength, rest] = getNextNBytes(rest, 1);
  [s, rest] = getNextNBytes(rest, parseInt(sLength, 16));
  if (s.length === 66) [sPadding, s] = getNextNBytes(s, 1); //account for 00 padding

  return r.padStart(64, "0") + s.padStart(64, "0");
};

const tx = {
  version: 1,
  locktime: 0,
  vin: [
    {
      txid: "3b7dc918e5671037effad7848727da3d3bf302b05f5ded9bec89449460473bbb",
      vout: 16,
      prevout: {
        scriptpubkey: "0014f8d9f2203c6f0773983392a487d45c0c818f9573",
        scriptpubkey_asm:
          "OP_0 OP_PUSHBYTES_20 f8d9f2203c6f0773983392a487d45c0c818f9573",
        scriptpubkey_type: "v0_p2wpkh",
        scriptpubkey_address: "bc1qlrvlygpudurh8xpnj2jg04zupjqcl9tnk5np40",
        value: 37079526,
      },
      scriptsig: "",
      scriptsig_asm: "",
      witness: [
        "30440220780ad409b4d13eb1882aaf2e7a53a206734aa302279d6859e254a7f0a7633556022011fd0cbdf5d4374513ef60f850b7059c6a093ab9e46beb002505b7cba0623cf301",
        "022bf8c45da789f695d59f93983c813ec205203056e19ec5d3fbefa809af67e2ec",
      ],
      is_coinbase: false,
      sequence: 4294967295,
    },
  ],
  vout: [
    {
      scriptpubkey: "76a9146085312a9c500ff9cc35b571b0a1e5efb7fb9f1688ac",
      scriptpubkey_asm:
        "OP_DUP OP_HASH160 OP_PUSHBYTES_20 6085312a9c500ff9cc35b571b0a1e5efb7fb9f16 OP_EQUALVERIFY OP_CHECKSIG",
      scriptpubkey_type: "p2pkh",
      scriptpubkey_address: "19oMRmCWMYuhnP5W61ABrjjxHc6RphZh11",
      value: 100000,
    },
    {
      scriptpubkey: "0014ad4cc1cc859c57477bf90d0f944360d90a3998bf",
      scriptpubkey_asm:
        "OP_0 OP_PUSHBYTES_20 ad4cc1cc859c57477bf90d0f944360d90a3998bf",
      scriptpubkey_type: "v0_p2wpkh",
      scriptpubkey_address: "bc1q44xvrny9n3t5w7lep58egsmqmy9rnx9lt6u0tc",
      value: 36977942,
    },
  ],
} as unknown as Transaction;
