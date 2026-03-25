"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these for your contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CCCO2AAVGNC5SBBDMLNBAUIPSFRGU4ODG4KAHKIEKXBTKDAWZQDPYFGO";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 *
 * @param method   - The contract method name to invoke
 * @param params   - Array of xdr.ScVal parameters for the method
 * @param caller   - The public key (G...) of the calling account
 * @param sign     - If true, signs via Freighter and submits. If false, only simulates.
 * @returns        The result of the simulation or submission
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    // Read-only call — just return the simulation result
    return simulated;
  }

  // Prepare the transaction with the simulation result
  const prepared = rpc.assembleTransaction(tx, simulated).build();

  // Sign with Freighter
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey(); // Use a random keypair for read-only
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValU64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function toScValI64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i64" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

// ============================================================
// Digital Identity Manager — Contract Methods
// ============================================================

/**
 * Register a new on-chain identity.
 * Calls: register_identity(owner: Address, did: String, display_name: String) -> Identity
 */
export async function registerIdentity(
  caller: string,
  did: string,
  displayName: string
) {
  return callContract(
    "register_identity",
    [toScValAddress(caller), toScValString(did), toScValString(displayName)],
    caller,
    true
  );
}

/**
 * Fetch an identity record by owner.
 * Calls: get_identity(owner: Address) -> Identity
 */
export async function getIdentity(owner: string, caller?: string) {
  return readContract(
    "get_identity",
    [toScValAddress(owner)],
    caller
  );
}

/**
 * Update display name (owner-only).
 * Calls: update_display_name(owner: Address, new_display_name: String) -> Identity
 */
export async function updateDisplayName(
  caller: string,
  newDisplayName: string
) {
  return callContract(
    "update_display_name",
    [toScValAddress(caller), toScValString(newDisplayName)],
    caller,
    true
  );
}

/**
 * Deactivate (soft-delete) an identity.
 * Calls: deactivate_identity(owner: Address)
 */
export async function deactivateIdentity(caller: string) {
  return callContract(
    "deactivate_identity",
    [toScValAddress(caller)],
    caller,
    true
  );
}

/**
 * Add a verifiable claim to an identity.
 * Calls: add_claim(subject: Address, issuer: Address, claim_key: String, claim_value: String, expires_at: u64) -> Claim
 */
export async function addClaim(
  caller: string,
  subject: string,
  claimKey: string,
  claimValue: string,
  expiresAt: bigint = BigInt(0)
) {
  return callContract(
    "add_claim",
    [
      toScValAddress(subject),
      toScValAddress(caller),
      toScValString(claimKey),
      toScValString(claimValue),
      toScValU64(expiresAt),
    ],
    caller,
    true
  );
}

/**
 * Retrieve a specific claim.
 * Calls: get_claim(subject: Address, claim_key: String) -> Claim
 */
export async function getClaim(subject: string, claimKey: string, caller?: string) {
  return readContract(
    "get_claim",
    [toScValAddress(subject), toScValString(claimKey)],
    caller
  );
}

/**
 * Revoke a claim (only original issuer can revoke).
 * Calls: revoke_claim(subject: Address, issuer: Address, claim_key: String)
 */
export async function revokeClaim(
  caller: string,
  subject: string,
  claimKey: string
) {
  return callContract(
    "revoke_claim",
    [toScValAddress(subject), toScValAddress(caller), toScValString(claimKey)],
    caller,
    true
  );
}

/**
 * Self-register as a trusted verifier.
 * Calls: register_verifier(verifier: Address, name: String)
 */
export async function registerVerifier(caller: string, name: string) {
  return callContract(
    "register_verifier",
    [toScValAddress(caller), toScValString(name)],
    caller,
    true
  );
}

/**
 * Check if an address is a registered verifier.
 * Calls: is_verifier(verifier: Address) -> bool
 */
export async function isVerifier(verifier: string, caller?: string) {
  return readContract(
    "is_verifier",
    [toScValAddress(verifier)],
    caller
  );
}

/**
 * Verify that a claim is valid (exists, not revoked, not expired).
 * Calls: verify_claim(subject: Address, claim_key: String) -> bool
 */
export async function verifyClaim(subject: string, claimKey: string, caller?: string) {
  return readContract(
    "verify_claim",
    [toScValAddress(subject), toScValString(claimKey)],
    caller
  );
}

export { nativeToScVal, scValToNative, Address, xdr };
