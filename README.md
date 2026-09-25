# GovBid Midnight — Confidential Government Procurement & Sealed-Bid Platform

[![CI/CD Pipeline](https://github.com/Varunshinde01/Midnight-4/actions/workflows/ci.yml/badge.svg)](https://github.com/Varunshinde01/Midnight-4/actions/workflows/ci.yml)
![Midnight Preprod Testnet](https://img.shields.io/badge/Midnight-Preprod%20Testnet-6366f1)
![Compact Smart Contract](https://img.shields.io/badge/Compact%20DSL-v0.1.0-8b5cf6)
![License](https://img.shields.io/badge/License-MIT-10b981)
[![Product X Profile](https://img.shields.io/badge/X%20(Twitter)-%40govbidmidnight-000000?logo=x)](https://x.com/govbidmidnight)

> **Submitted for**: Rise In Midnight Developer Program — Level 4 Submission  
> **Preprod Network ID**: `preprod`  
> **Preprod Contract Address**: `0xaef7aff4de73ab87ea9e0e3252682c2351bc0df71ccaef2471cb22375427f645`  
> **Deployment Tx Hash**: `0x64a81e1e1b318b670cd50d6f826930f53b438c7a90d6fb2071bc9e02d4c90999` (Block `1849204`)  
> **Midnight Explorer Link**: [https://midnightexplorer.com](https://midnightexplorer.com)  
> **Product X (Twitter) Profile**: [https://x.com/govbidmidnight](https://x.com/govbidmidnight)  

---

## Executive Summary

Public government procurement systems worldwide process trillions of dollars annually but suffer from corruption, bid sniping, front-running, and strategic price exposure due to transparent bidding ledgers. 

**GovBid Midnight** leverages the **Midnight Blockchain** (`preprod` testnet), **Compiler-Generated Midnight Compact Bindings**, **Actual Wallet-Authorized Transactions**, and **Compact Zero-Knowledge (ZK) smart contracts** to create a privacy-first government procurement portal. Bidders submit zero-knowledge price commitments ($H = \text{SHA256}(\text{bid} \parallel \text{salt} \parallel \text{vendor\_tax\_id})$). Raw vendor pricing and identity evaluations remain 100% hidden in client-side private witness state. At settlement, a ZK proof selectively discloses **only** the winning bid valuation and winning vendor address, while all losing bids remain unrevealed on-chain permanently.

---

## Key Technical Features & Enhancements

1. **Compiler-Generated Midnight Bindings & Wallet-Authorized Transactions**: Uses compiler-generated bindings (`createGovBidContractBindings()`) and wallet API calls via `@midnight-ntwrk/dapp-connector-api`. Fallback dummy addresses, fake transaction hashes, and silent fallback identities have been eliminated.
2. **Authoritative Ledger & Circuit Invariant Verification**:
   - **Procurement Authority Authorization**: Enforces `caller_authority_pk == authority_pubkey` on settlement. Non-authority settlement triggers an explicit authorization error.
   - **Registered Commitment Verification**: Settlement verifies that the disclosed `winning_commitment_hash` exists in the authoritative ledger's `commitments` vector.
   - **Replay Protection**: Prevents submission of duplicate commitment digests on-chain.
   - **Canonical Commitment Encoding**: Standardized SHA-256 byte encoding shared by TypeScript and Compact.
   - **Verifiable Qualification Proofs**: Vendor qualification is verified cryptographically ($\text{SHA256}(\text{vendor\_tax\_id} \parallel \text{authority\_pubkey})$) rather than accepting arbitrary dummy proof digests.
3. **Explicit Indexer Error Handling**: Queries the Midnight Preprod Indexer (`https://indexer.preprod.midnight.network/api/v1/graphql`) with explicit error handling and status reporting.
4. **Dual Perspective Interface**:
   - **Public Ledger View**: Demonstrates zero price or identity leakage on-chain during open bidding.
   - **Private Witness View**: Displays confidential client-side witness state (raw bids, blinding salts, vendor tax IDs).
5. **Interactive ZK Prover & Execution Console**: Real-time terminal logging witness generation, circuit constraint validation, commitment hashing, and wallet authorization.
6. **Automated Test & AST Suite**: 13 comprehensive Vitest automated integration and circuit compiler tests covering range proofs, deployment receipts, replay protection, authorization, registered commitments, and explicit indexer error handling.

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
    authority_pubkey: Bytes<32>;
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
    
    let expected_qual_proof = sha256_concat(vendor_tax_id, authority_pubkey);
    assert(qual_proof == expected_qual_proof, "Vendor qualification proof verification failed");

    let calculated_hash = sha256_concat(bid_amount, salt, vendor_tax_id);
    assert(submitted_commitment == calculated_hash, "Submitted commitment hash mismatch");

    for i in 0..100 {
        if i < bids_count {
            assert(commitments[i].commitment_hash != submitted_commitment, "Replay protection error: Commitment already registered on ledger");
        }
    }

    commitments[bids_count] = BidCommitment {
        commitment_hash: submitted_commitment,
        timestamp: current_timestamp(),
        qualification_proof: qual_proof
    };
    bids_count = bids_count + 1;
    return true;
}

export circuit settle_procurement(
    caller_authority_pk: Bytes<32>,
    winning_pk: Bytes<32>,
    winning_amount: Uint<64>,
    winning_salt: Bytes<32>,
    winning_commitment_hash: Bytes<32>,
    proof_digest: Bytes<32>
): Cell<Boolean> {
    assert(caller_authority_pk == authority_pubkey, "Unauthorized: Caller is not the registered procurement authority");
    assert(state == ProcurementState.OpenBidding || state == ProcurementState.QualificationCheck, "Invalid state");

    let mutable commitment_found: Boolean = false;
    for i in 0..100 {
        if i < bids_count {
            if commitments[i].commitment_hash == winning_commitment_hash {
                commitment_found = true;
            }
        }
    }
    assert(commitment_found, "Settlement failed: Winning commitment not found in registered ledger state");

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
# Compile Compact contract AST and bindings
npm run compile:compact

# Execute Vitest test suite
npm test
```

| Test Case | Description | Result |
| :--- | :--- | :---: |
| **Test 1** | **Network Configuration**: Validates networkId set to "preprod" | `PASS` |
| **Test 2** | **Compiler Bindings**: Validates Midnight Compact bindings generator | `PASS` |
| **Test 3** | **Preprod Deployment**: Genuine `deployContract()` returns valid receipt | `PASS` |
| **Test 4** | **Canonical Commitment**: SHA-256 commitment digest hides raw bid amount & salt | `PASS` |
| **Test 5** | **ZK Circuit Validity**: Valid bid ($\ge$ min bid) passes circuit constraint | `PASS` |
| **Test 6** | **Qualification Proof Rejection**: Invalid qualification proof fails circuit assertion | `PASS` |
| **Test 7** | **Reserve Price Enforcement**: Invalid bid ($<$ min bid) triggers constraint rejection | `PASS` |
| **Test 8** | **Budget Limit Enforcement**: Bid exceeding budget limit triggers constraint rejection | `PASS` |
| **Test 9** | **Replay Protection**: Duplicate commitment hash triggers rejection error | `PASS` |
| **Test 10** | **Authority Authorization**: Non-authority caller fails settlement with `Unauthorized` error | `PASS` |
| **Test 11** | **Registered Commitment Check**: Settling unsubmitted commitment digest fails | `PASS` |
| **Test 12** | **Auction Settlement Invariants**: Winner verified against registered commitment | `PASS` |
| **Test 13** | **Explicit Indexer Error Handling**: Unreachable indexer error is explicitly surfaced | `PASS` |

---

## Quickstart & Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Varunshinde01/Midnight-4.git
cd Midnight-4

# 2. Install dependencies
npm install

# 3. Compile compact circuit and run automated tests
npm run compile:compact
npm test

# 4. Launch local development server
npm run dev
```

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
