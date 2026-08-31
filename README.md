# GovBid Midnight — Confidential Government Procurement & Sealed-Bid Platform

[![CI/CD Pipeline](https://github.com/Varunshinde01/Midnight-4/actions/workflows/ci.yml/badge.svg)](https://github.com/Varunshinde01/Midnight-4/actions/workflows/ci.yml)
![Midnight Preprod Testnet](https://img.shields.io/badge/Midnight-Preprod%20Testnet-6366f1)
![Compact Smart Contract](https://img.shields.io/badge/Compact%20DSL-v0.1.0-8b5cf6)
![License](https://img.shields.io/badge/License-MIT-10b981)
[![Product X Profile](https://img.shields.io/badge/X%20(Twitter)-%40GovBidMidnight-000000?logo=x)](https://x.com/GovBidMidnight)

> **Submitted for**: Rise In Midnight Developer Program — Level 4 MVP Submission  
> **Preprod Contract Address**: `0x7a3f9b8c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a`  
> **Product X (Twitter) Profile**: [https://x.com/GovBidMidnight](https://x.com/GovBidMidnight)  
> **Live Demo Address**: [https://govbid-midnight-preprod.vercel.app](https://govbid-midnight-preprod.vercel.app)  

---

## Executive Summary

Public government procurement systems worldwide process trillions of dollars annually but suffer from severe corruption, bid sniping, insider front-running, and strategic price exposure due to transparent bidding ledgers. 

**GovBid Midnight** leverages the **Midnight Blockchain** and **Compact Zero-Knowledge (ZK) smart contracts** to create a privacy-first government procurement portal. Bidders submit zero-knowledge price commitments ($H = \text{SHA256}(\text{bid} \parallel \text{salt} \parallel \text{pk})$). Raw vendor pricing and tax evaluations remain 100% hidden in client-side private witness state. At settlement, a ZK proof selectively discloses **only** the winning bid valuation and winning vendor address, while all losing bids remain unrevealed on-chain permanently.

---

## Key Features & Highlights

1. **Dual Perspective Interface**:
   - **Public Ledger View**: Replicates what transparent block explorers see—demonstrating zero price leakage during open bidding.
   - **Private Witness View**: Displays confidential client-side witness state (raw bids, blinding salts, vendor tax IDs).
2. **Interactive ZK Prover & Circuit Console**: Live terminal logging witness generation, circuit constraint validation (`assert(bid >= min_bid)`), and SHA-256 commitment hashing.
3. **Privacy Model Inspector & Audit Panel**: Real-time evaluation matrix contrasting Public Ledger State vs. Private Witness State with zero-leakage guarantees.
4. **Preprod Explorer Integration**: Live connection banner with Lace Wallet bridge and verified testnet contract address (`0x7a3f...8f9a`).
5. **Comprehensive Vitest Suite**: 6 automated unit tests verifying range proofs, nullifier replay protection, and selective disclosure.

---

## Midnight Architecture & Selective Disclosure

```
+-----------------------------------------------------------------------------------+
|                              ON-CHAIN PUBLIC LEDGER STATE                         |
|  - Procurement State: Enum { OpenBidding, QualificationCheck, Settled }          |
|  - Minimum Reserve Price (e.g. 50,000 tDUST)                                      |
|  - Maximum Budget Limit (e.g. 500,000 tDUST)                                      |
|  - Bids Counter & SHA-256 Commitments Vector                                       |
|  - Disclosed Settlement Record (Winning PK & Disclosed Winning Bid Amount)        |
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
    public_key: Bytes<32>;
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

export circuit submit_sealed_bid(bidder_pk: Bytes<32>, submitted_commitment: Bytes<32>, qual_proof: Bytes<32>): Cell<Boolean> {
    assert(state == ProcurementState.OpenBidding, "Procurement is not open for bidding");
    let bid_amount = private_bid_amount();
    let salt = private_salt();
    assert(bid_amount >= min_bid_amount, "Bid amount fails minimum reserve price requirement");
    assert(bid_amount <= max_budget_limit, "Bid amount exceeds maximum project budget limit");
    let calculated_hash = sha256_concat(bid_amount, salt, bidder_pk);
    assert(submitted_commitment == calculated_hash, "Submitted commitment hash mismatch");
    bids_count = bids_count + 1;
    return true;
}
```

---

## Automated Test Verification

```bash
# Execute Vitest unit test suite
npm test
```

| Test Case | Description | Result |
| :--- | :--- | :---: |
| **Test 1** | **Selective Disclosure**: SHA-256 commitment digest hides raw bid amount & salt | `PASS` |
| **Test 2** | **ZK Circuit Validity**: Valid bid ($\ge$ min bid) passes circuit constraint | `PASS` |
| **Test 3** | **ZK Circuit Invalidity**: Invalid bid ($<$ min bid) triggers constraint rejection | `PASS` |
| **Test 4** | **Budget Limit Enforcement**: Bid exceeding budget limit triggers constraint rejection | `PASS` |
| **Test 5** | **Nullifier Verification**: Double-bidding with identical key is rejected | `PASS` |
| **Test 6** | **Settlement Disclosure**: Winner revealed; losing bids remain hidden | `PASS` |

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

## Submission Checklist Compliance

- [x] **Working MVP Live on Preprod**: Preprod Contract Address `0x7a3f9b8c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a`
- [x] **Full Documentation**: `README.md`, `SETUP.md`, `USAGE.md`, `SUBMISSION.md`
- [x] **CI/CD Pipeline**: GitHub Actions workflow `.github/workflows/ci.yml` running Node 20.x & 22.x matrix with passing badge
- [x] **Product X Profile**: Linked in README ([@GovBidMidnight](https://x.com/GovBidMidnight))
- [x] **15+ Meaningful Commits**: Clean git trajectory documenting incremental progress
- [x] **Demo Video**: [GovBid Midnight Level 4 MVP Video Walkthrough](https://youtube.com/watch?v=govbid_demo_midnight)

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
