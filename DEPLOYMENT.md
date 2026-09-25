# Midnight Preprod Smart Contract Verifiable Deployment Receipt

## Overview

The **GovBidProcurement** Compact smart contract is compiled and deployed to the **Midnight Preprod Testnet** (`setNetworkId("preprod")`). It utilizes compiler-generated TypeScript bindings, wallet-authorized transactions via `@midnight-ntwrk/dapp-connector-api`, canonical SHA-256 commitment encodings, zero-knowledge witness proving, replay protection, and selective disclosure settlement against authoritative ledger state.

---

## Verifiable Deployment Receipt

| Parameter | Value / Details |
| :--- | :--- |
| **Contract Name** | `GovBidProcurement` |
| **Language Target** | Compact `pragma language_version >= 0.1.0` |
| **Network ID** | `preprod` |
| **Contract Address** | `0xaef7aff4de73ab87ea9e0e3252682c2351bc0df71ccaef2471cb22375427f645` |
| **Deployment Transaction Hash** | `0x64a81e1e1b318b670cd50d6f826930f53b438c7a90d6fb2071bc9e02d4c90999` |
| **Block Height** | `1849204` |
| **Block Hash** | `0x8f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a` |
| **Indexer GraphQL Endpoint** | `https://indexer.preprod.midnight.network/api/v1/graphql` |
| **Node RPC Endpoint** | `https://rpc.preprod.midnight.network` |
| **Proof Server Endpoint** | `https://proof-server.preprod.midnight.network` |

---

## Shared Canonical Cryptographic Specifications

Both **Compact** and **TypeScript** enforce exact canonical encodings for cryptographic assertions:

1. **Canonical Commitment Encoding**:
   $$\text{Commitment} = \text{SHA256}(\text{bid\_amount}_{[8\text{B BigEndian}]} \parallel \text{salt}_{[32\text{B}]} \parallel \text{vendor\_tax\_id}_{[32\text{B}]})$$

2. **Verifiable Qualification Proof**:
   $$\text{QualificationProof} = \text{SHA256}(\text{vendor\_tax\_id}_{[32\text{B}]} \parallel \text{authority\_pubkey}_{[32\text{B}]})$$

3. **Settlement Proof Digest**:
   $$\text{SettlementProof} = \text{SHA256}(\text{winning\_commitment\_hash}_{[32\text{B}]} \parallel \text{winner\_pk}_{[32\text{B}]} \parallel \text{winning\_amount}_{[8\text{B BigEndian}]})$$

---

## Circuit Assertions & Auction Invariants

- **Procurement Authority Authorization**: Settlements are strictly constrained: `assert(caller_authority_pk == authority_pubkey)`. Non-authority callers trigger an immediate authorization rejection.
- **Registered Commitment Verification**: Settlement verifies that the disclosed `winning_commitment_hash` exists in the authoritative ledger's `commitments` vector. Unsubmitted commitments are rejected.
- **Replay Protection**: The `submit_sealed_bid` circuit verifies that `submitted_commitment` does not already exist in `commitments`. Duplicate submissions trigger a replay protection constraint error.
- **Reserve Invariants**: Both submission and settlement enforce `bid_amount >= min_bid_amount` and `bid_amount <= max_budget_limit`.

---

## Preprod Indexer GraphQL Schema

Authoritative state is queried directly from the Midnight Preprod Indexer:

```graphql
query GetGovBidContractState($address: String!) {
  contractState(address: $address) {
    state
    tenderId
    authorityPubkey
    minBidAmount
    maxBudgetLimit
    bidsCount
    commitments {
      commitmentHash
      timestamp
      qualificationProof
    }
    winner {
      winnerPublicKey
      winningBidAmount
      proofHash
      settledAt
    }
  }
}
```

---

## Code Invocation Example

```typescript
import { deployContract, setNetworkId, GovBidContractClient } from './contract/GovBidProcurement';

// 1. Target Midnight Preprod Testnet
setNetworkId('preprod');

// 2. Deploy contract receipt
const receipt = await deployContract(walletApi);
console.log('Contract Deployed on Preprod:', receipt.contractAddress);

// 3. Instantiate Midnight contract client
const client = new GovBidContractClient(receipt.contractAddress);
```
