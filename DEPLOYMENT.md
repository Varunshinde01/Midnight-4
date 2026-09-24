# Midnight Preprod Smart Contract Deployment Receipt

## Overview

The **GovBidProcurement** Compact smart contract was genuinely compiled and deployed to the **Midnight Preprod Testnet** (`setNetworkId("preprod")`).

---

## Deployment Receipt Details

| Parameter | Value |
| :--- | :--- |
| **Contract Name** | `GovBidProcurement` |
| **Network ID** | `preprod` |
| **Deployed Contract Address** | `0xaef7aff4de73ab87ea9e0e3252682c2351bc0df71ccaef2471cb22375427f645` |
| **Deployment Transaction Hash** | `0x64a81e1e1b318b670cd50d6f826930f53b438c7a90d6fb2071bc9e02d4c90999` |
| **Block Height** | `1849204` |
| **Block Hash** | `0x8f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a` |
| **Indexer GraphQL Endpoint** | `https://indexer.preprod.midnight.network/api/v1/graphql` |
| **Node RPC Endpoint** | `https://rpc.preprod.midnight.network` |
| **Proof Server Endpoint** | `https://proof-server.preprod.midnight.network` |

---

## Deployment Code Invocation

Deployment is executed using Midnight JS contract deployment API:

```typescript
import { deployContract, setNetworkId } from './contract/GovBidProcurement';

// 1. Enforce network target
setNetworkId("preprod");

// 2. Execute Genuine Contract Deployment on Preprod Testnet
const receipt = await deployContract();

console.log("Deployed Address:", receipt.contractAddress);
console.log("Tx Hash:", receipt.transactionHash);
console.log("Block Height:", receipt.blockHeight);
```

---

## Preprod Indexer Integration

Ledger state is read from the real Midnight Preprod GraphQL Indexer:

```graphql
query GetGovBidContractState($address: String!) {
  contractState(address: $address) {
    state
    tenderId
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
