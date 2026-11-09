import { NETWORKS, type Network } from "./networks";

/** Minimal read-only chain access. `fetchImpl` is a parameter so callers can supply their own fetch. */

export class RpcError extends Error {}

export interface RpcOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

async function request(url: string, init: RequestInit, { fetchImpl = fetch, timeoutMs = 8000 }: RpcOptions): Promise<Response> {
  try {
    const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new RpcError(`the server answered HTTP ${res.status}`);
    return res;
  } catch (error) {
    if (error instanceof RpcError) throw error;
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) throw new RpcError("the request timed out");
    throw new RpcError("the network request failed");
  }
}

export async function jsonRpc(url: string, method: string, params: unknown[], options: RpcOptions = {}): Promise<unknown> {
  const res = await request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }, options);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new RpcError("the server's answer was not JSON");
  }
  if (typeof body !== "object" || body === null) throw new RpcError("the server's answer was not a JSON-RPC response");
  const { result, error } = body as { result?: unknown; error?: { message?: unknown } };
  if (error) throw new RpcError(typeof error.message === "string" ? error.message : "the node returned an error");
  if (result === undefined) throw new RpcError("the response has no result");
  return result;
}

const rpcUrl = (network: Network): string => {
  if (!network.rpc) throw new RpcError(`${network.name} has no RPC endpoint`);
  return network.rpc;
};

function toBlockNumber(value: unknown): number {
  const n = typeof value === "string" ? Number(BigInt(value)) : typeof value === "number" ? value : Number.NaN;
  if (!Number.isSafeInteger(n) || n < 0) throw new RpcError("the block number in the response is not valid");
  return n;
}

export async function blockHeight(network: Network, options: RpcOptions = {}): Promise<number> {
  if (network.kind === "bitcoin") {
    const res = await request(`${network.explorer}/api/blocks/tip/height`, {}, options);
    return toBlockNumber(Number((await res.text()).trim()));
  }
  if (network.kind === "evm") return toBlockNumber(await jsonRpc(rpcUrl(network), "eth_blockNumber", [], options));
  return toBlockNumber(await jsonRpc(rpcUrl(network), "starknet_blockNumber", [], options));
}

export async function bitcoinTipHash(options: RpcOptions = {}): Promise<string> {
  const res = await request(`${NETWORKS.bitcoin.explorer}/api/blocks/tip/hash`, {}, options);
  const hash = (await res.text()).trim();
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new RpcError("the block hash in the response is not valid");
  return hash;
}

/** A read-only contract call. Returns the raw hex result. */
export async function ethCall(network: Network, to: string, data: string, options: RpcOptions = {}): Promise<string> {
  const result = await jsonRpc(rpcUrl(network), "eth_call", [{ to, data }, "latest"], options);
  if (typeof result !== "string" || !/^0x[0-9a-fA-F]*$/.test(result)) throw new RpcError("the call result is not hexadecimal");
  return result;
}
