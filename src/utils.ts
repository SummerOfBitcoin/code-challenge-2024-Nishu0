import * as crypto from "crypto";
import { OP_CODES } from "./features/script/op_codes";

export const hash256 = (str: string) => {
  return crypto
    .createHash("ripemd160")
    .update(Buffer.from(sha256(str), "hex"))
    .digest("hex");
};

export const sha256 = (str: string) => {
  return crypto
    .createHash("sha256")
    .update(Buffer.from(str, "hex"))
    .digest("hex");
};

export const asmToHex = (asm: string) => {
  const tokens = asm.split(" ") as OP_CODES[];
  return [...new Array(tokens.length)]
    .map((_, index) => OP_CODES[tokens[index]])
    .map((token, index) => (!token ? tokens[index] : token))
    .join("");
};

//reverses every byte of the string - every 2 hex chars
export const reversify = (str: string) => {
  return str
    .match(/.{1,2}/g)!
    .reverse()
    .join("");
};


