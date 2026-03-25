# 🪪 Digital Identity Manager

> A Soroban smart contract on the Stellar blockchain for managing self-sovereign digital identities and verifiable on-chain claims.

---

## 📖 Project Description

**Digital Identity Manager** is a decentralised identity (DID) protocol built as a [Soroban](https://soroban.stellar.org/) smart contract on the **Stellar network**. It provides a trustless, censorship-resistant registry where individuals and organisations can own their identity data, attach verifiable claims (credentials), and allow any third party to cryptographically verify those claims — without relying on a centralised authority.

The contract follows the spirit of the [W3C Decentralised Identifiers (DID) specification](https://www.w3.org/TR/did-core/) and the [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/), adapted for the Stellar/Soroban execution environment.

---
<img width="1909" height="946" alt="image" src="https://svc-48e76bb8-morphvm-5b8u2bnp.http.cloud.morph.so/" />
<img width="1196" height="886" alt="image" src="https://stellar.expert/explorer/testnet/contract/CCCO2AAVGNC5SBBDMLNBAUIPSFRGU4ODG4KAHKIEKXBTKDAWZQDPYFGO" />


## ⚙️ What It Does

| Actor | Action |
|---|---|
| **User (Subject)** | Registers an identity tied to their Stellar address, updates their display name, and deactivates their identity at any time |
| **Issuer / Verifier** | Attaches signed on-chain claims (e.g. KYC level, email verified, country) to a subject's identity, and later revokes them if needed |
| **Relying Party (DApp / Protocol)** | Calls `verify_claim` to check whether a claim is currently valid — non-revoked and non-expired — in a single read |

The contract stores all data in **Soroban persistent storage**, meaning identity and claim records survive ledger archival and remain queryable indefinitely.

---

## ✨ Features

### 🆔 Self-Sovereign Identity Registration
- Register a unique **Decentralised Identifier (DID)** string (e.g. `did:stellar:<pubkey>`) on-chain
- Owner-controlled: only the address that registered the identity can update or deactivate it
- Soft-delete support — identities can be deactivated without erasing historical claim data

### 📋 Verifiable On-Chain Claims
- Issuers attach arbitrary key/value claims to any active identity (e.g. `kyc_level=2`, `email_verified=true`, `country=IN`)
- Each claim records the issuer address, issuance timestamp, and an optional **expiry timestamp**
- Claims are independently queryable by `(subject, claim_key)` — no enumeration needed by relying parties

### 🔒 Claim Lifecycle Management
- **Issue**: any Stellar address (self or third-party issuer) can attach claims
- **Revoke**: only the original issuer can revoke their own claim, preventing unauthorised revocation
- **Expiry**: claims can carry a TTL; `verify_claim` automatically treats expired claims as invalid

### ✅ One-Call Verification
- `verify_claim(subject, key)` returns a single `bool` — relying parties (DEXes, lending protocols, DAOs) can gate access in a single contract invocation
- Checks existence, revocation status, and expiry atomically

### 🏅 Open Verifier Registry
- Any address can self-register as a named verifier
- Relying parties can query `is_verifier` to filter claims by trusted issuers
- Enables a **trust-tier model** without hard-coding privileged roles in the contract

### 🧪 Comprehensive Test Suite
- Full unit tests for the happy path, revocation flow, and edge-case error panics
- Uses `soroban-sdk`'s `testutils` mock auth — no live network needed to run tests

---

## 🗂️ Project Structure

```
digital-identity-manager/
├── Cargo.toml                          # Workspace manifest
└── contracts/
    └── digital_identity/
        ├── Cargo.toml                  # Contract crate
        └── src/
            └── lib.rs                  # Contract logic + tests
```

---

## 🚀 Getting Started

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the WASM target
rustup target add wasm32-unknown-unknown

# Install the Stellar CLI
cargo install --locked stellar-cli --features opt
```

### Build

```bash
cd digital-identity-manager
stellar contract build
```

The compiled WASM will appear at:
```
target/wasm32-unknown-unknown/release/digital_identity.wasm
```

### Test

```bash
cargo test
```

### Deploy to Testnet

```bash
# Fund a test account
stellar keys generate alice --network testnet
stellar keys fund alice --network testnet

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/digital_identity.wasm \
  --source alice \
  --network testnet
```

### Invoke Examples

```bash
# Register an identity
stellar contract invoke \
  --id <CONTRACT_ID> --source alice --network testnet \
  -- register_identity \
  --owner <ALICE_ADDRESS> \
  --did "did:stellar:$(stellar keys address alice)" \
  --display_name "Alice"

# Add a KYC claim (issuer = bob)
stellar contract invoke \
  --id <CONTRACT_ID> --source bob --network testnet \
  -- add_claim \
  --subject <ALICE_ADDRESS> \
  --issuer <BOB_ADDRESS> \
  --claim_key "kyc_level" \
  --claim_value "2" \
  --expires_at 0

# Verify the claim (anyone can call this)
stellar contract invoke \
  --id <CONTRACT_ID> --network testnet \
  -- verify_claim \
  --subject <ALICE_ADDRESS> \
  --claim_key "kyc_level"
```

---

## 📡 Deployed Smart Contract

> **Network:** Stellar Testnet  
> **Contract ID:** `XXX`  
>
> _(Deploy to Testnet using the steps above and replace `XXX` with the returned contract address.)_

View on Stellar Expert: https://stellar.expert/explorer/testnet/contract/CBFKBU5XCAGQZLYT2FAQW4A63GTO6L6Z42AXWZTVPXWIGSROYM4MBXPC

---

## 🛣️ Roadmap

- [ ] Multi-signature identity recovery
- [ ] Schema registry for standardised claim types
- [ ] On-chain DID Document storage (service endpoints, verification methods)
- [ ] Integration with Stellar Passkeys / Soroban Account Abstraction
- [ ] Cross-contract claim delegation

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.
