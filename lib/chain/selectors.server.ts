import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { canonical, parseSignature } from "./abi";

/** Build time only: the browser never hashes anything with keccak. */

const keccakHex = (bytes: Uint8Array) => bytesToHex(keccak_256(bytes));

/** The 4-byte function selector (8 hex characters) for a signature such as "balanceOf(address)(uint256)". */
export function selectorOf(signature: string): string {
  return keccakHex(utf8ToBytes(canonical(parseSignature(signature)))).slice(0, 8);
}

/** EIP-55 mixed-case checksum form of an address. */
export function checksumAddress(address: string): string {
  const lower = address.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{40}$/.test(lower)) throw new Error(`Not an address: ${address}`);
  const hash = keccakHex(utf8ToBytes(lower));
  let out = "0x";
  for (let i = 0; i < 40; i += 1) out += Number.parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

export const isChecksummed = (address: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(address) && checksumAddress(address) === address;
