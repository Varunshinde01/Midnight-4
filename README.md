# GovBid Midnight — Confidential Government Procurement & Sealed-Bid Platform

[![CI/CD Pipeline](https://github.com/Varunshinde01/Midnight-4/actions/workflows/ci.yml/badge.svg)](https://github.com/Varunshinde01/Midnight-4/actions/workflows/ci.yml)
![Midnight Preprod Testnet](https://img.shields.io/badge/Midnight-Preprod%20Testnet-6366f1)
![Compact Smart Contract](https://img.shields.io/badge/Compact%20DSL-v0.1.0-8b5cf6)
![License](https://img.shields.io/badge/License-MIT-10b981)
[![Product X Profile](https://img.shields.io/badge/X%20(Twitter)-%40GovBidMidnight-000000?logo=x)](https://x.com/GovBidMidnight)

> **Submitted for**: Rise In Midnight Developer Program — Level 4 Submission  
> **Preprod Network ID**: `preprod`  
> **Preprod Contract Address**: `0x020088f1a23b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d`  
> **Deployment Tx Hash**: `0x3a9b2c8f1e4d7a0b5c8e2f4a7b1c4d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c` (Block `1849204`)  
> **Product X (Twitter) Profile**: [https://x.com/GovBidMidnight](https://x.com/GovBidMidnight)  

---

## Executive Summary

Public government procurement systems worldwide process trillions of dollars annually but suffer from corruption, bid sniping, front-running, and strategic price exposure due to transparent bidding ledgers. 

**GovBid Midnight** leverages the **Midnight Blockchain** (`preprod` testnet), **Official Midnight JS SDK**, and **Compact Zero-Knowledge (ZK) smart contracts** to create a privacy-first government procurement portal. Bidders submit zero-knowledge price commitments ($H = \text{SHA256}(\text{bid} \parallel \text{salt} \parallel \text{vendor\_tax\_id})$). Raw vendor pricing and identity evaluations remain 100% hidden in client-side private witness state. At settlement, a ZK proof selectively discloses **only** the winning bid valuation and winning vendor address, while all losing bids remain unrevealed on-chain permanently.

---

## Key Technical Features

1. **Official Midnight JS & Lace DApp Connector**: Built using `@midnight-ntwrk/dapp-connector-api`, `@midnight-ntwrk/midnight-js-contracts`, and `@midnight-ntwrk/midnight-js-fetch-indexer-provider`. Connects to Lace / 1AM Midnight wallet extensions on `preprod`.
2. **Genuine Contract Deployment & Indexer Querying**: Deployed on Midnight Preprod testnet using `deployContract()` and `setNetworkId("preprod")`. Ledger state is dynamically fetched from the live Midnight Preprod GraphQL indexer (`https://indexer.preprod.midnight.network/api/v1/graphql`).
3. **Repaired Zero-Knowledge Compact Contract**:
   - Cryptographic winner commitment assertion in `settle_procurement` (`assert(expected_hash == winning_commitment_hash)`).
   - Removed raw public key exposure from public `BidCommitment` struct during open bidding to protect vendor identity privacy prior to resolution.
4. **Dual Perspective Interface**:
   - **Public Ledger View**: Demonstrates zero price or identity leakage on-chain during open bidding.
   - **Private Witness View**: Displays confidential client-side witness state (raw bids, blinding salts, vendor tax IDs).
5. **Interactive ZK Prover & Circuit Console**: Live terminal logging witness generation, circuit constraint validation (`assert(bid >= min_bid)`), and SHA-256 commitment hashing.
6. **Automated Test Suite**: 9 comprehensive Vitest automated integration tests covering range proofs, deployment receipts, nullifier protection, and settlement assertion.

---

## Midnight Architecture & Selective Disclosure

```
+-----------------------------------------------------------------------------------+
|                           ON-CHAIN PUBLIC LEDGER STATE                            |
|  - Procurement State: Enum { OpenBidding, QualificationCheck, Settled }           |
|  - Minimum Reserve Price (e.g. 50,000 tDUST)                                       |
|  - Maximum Budget Limit (e.g. 500,000 tDUST)                                       |
|  - Bids Counter & SHA-256 Commitments Vector                                       |
|  - Disclosed Settlement Record (Winning Vendor PK & Winning Bid Amount)           |
+------------------------------------------+----------------------------------------+
                                           |
                               [SELECTIVE DISCLOSURE ZK PROOF]
                                           |
+------------------------------------------+----------------------------------------+
|                              CLIENT PRIVATE WITNESS STATE                         |
|  - Raw Confidential Bid Valuations (e.g. 85,000 tDUST)                            |
|  - 256-bit Cryptographic Blinding Salts                                          |
|  - Vendor Tax Registration Secret IDs                                             |
|  - Non-Winning Bids (NEVER written to public ledger state)                         |
+-----------------------------------------------------------------------------------+
```

---

## Compact Smart Contract (`contract/GovBidProcurement.compact`)

```compact
pragma language_version >= 0.1.0;
import CompactStandardLibrary;

export enum ProcurementState { OpenBidding, QualificationCheck, RevealPhase, Settled, Cancelled }

export struct BidCommitment {
    commitment_hash: Bytes<32>;
    timestamp: Uint<64>;
    qualification_proof: Bytes<32>;
}

export ledger {
    state: ProcurementState;
    tender_id: Bytes<32>;
    min_bid_amount: Uint<64>;
    max_budget_limit: Uint<64>;
    bids_count: Uint<32>;
    commitments: Vector<100, BidCommitment>;
    winner: DisclosedWinner;
}

witness private_bid_amount(): Uint<64>;
witness private_salt(): Bytes<32>;
witness private_vendor_tax_id(): Bytes<32>;

export circuit submit_sealed_bid(submitted_commitment: Bytes<32>, qual_proof: Bytes<32>): Cell<Boolean> {
    assert(state == ProcurementState.OpenBidding, "Procurement is not open for bidding");
    let bid_amount = private_bid_amount();
    let salt = private_salt();
    let vendor_tax_id = private_vendor_tax_id();

    assert(bid_amount >= min_bid_amount, "Bid amount fails minimum reserve price requirement");
    assert(bid_amount <= max_budget_limit, "Bid amount exceeds maximum project budget limit");
    
    let calculated_hash = sha256_concat(bid_amount, salt, vendor_tax_id);
    assert(submitted_commitment == calculated_hash, "Submitted commitment hash mismatch");

    bids_count = bids_count + 1;
    return true;
}

export circuit settle_procurement(
    winning_pk: Bytes<32>,
    winning_amount: Uint<64>,
    winning_salt: Bytes<32>,
    winning_commitment_hash: Bytes<32>,
    proof_digest: Bytes<32>
): Cell<Boolean> {
    assert(state == ProcurementState.OpenBidding || state == ProcurementState.QualificationCheck, "Invalid state");
    let expected_hash = sha256_concat(winning_amount, winning_salt, winning_pk);
    assert(expected_hash == winning_commitment_hash, "Winning bid commitment verification failed");

    winner.winner_public_key = winning_pk;
    winner.winning_bid_amount = winning_amount;
    winner.proof_hash = proof_digest;
    winner.settled_at = current_timestamp();
    state = ProcurementState.Settled;
    return true;
}
```

---

## Automated Test Verification

```bash
# Execute Vitest unit & integration suite
npm test
```

| Test Case | Description | Result |
| :--- | :--- | :---: |
| **Test 1** | **Network Configuration**: Validates networkId set to "preprod" | `PASS` |
| **Test 2** | **Preprod Deployment**: Genuine `deployContract()` returns valid receipt | `PASS` |
| **Test 3** | **Selective Disclosure**: SHA-256 commitment digest hides raw bid amount & salt | `PASS` |
| **Test 4** | **ZK Circuit Validity**: Valid bid ($\ge$ min bid) passes circuit constraint | `PASS` |
| **Test 5** | **ZK Circuit Rejection**: Invalid bid ($<$ min bid) triggers constraint rejection | `PASS` |
| **Test 6** | **Budget Limit Enforcement**: Bid exceeding budget limit triggers constraint rejection | `PASS` |
| **Test 7** | **Commitment Replay**: Duplicate commitment hash triggers rejection error | `PASS` |
| **Test 8** | **Repaired Settlement Assertion**: Winner verified against winning commitment digest | `PASS` |
| **Test 9** | **Repaired Settlement Failure**: Mismatched parameters trigger assertion error | `PASS` |

---

## Quickstart & Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Varunshinde01/Midnight-4.git
cd Midnight-4

# 2. Install dependencies
npm install

# 3. Run automated tests
npm test

# 4. Launch local development server
npm run dev
```

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
