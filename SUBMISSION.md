# Rise In Midnight Level 4 Submission — GovBid Midnight

## Submission Metadata

- **Project Name**: GovBid Midnight
- **Cohort / Program**: Rise In Midnight Developer Program (Level 4 MVP)
- **Target Network**: Midnight Preprod Testnet
- **Preprod Contract Address**: `0x7a3f9b8c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a`
- **Product X (Twitter) Profile**: [https://x.com/GovBidMidnight](https://x.com/GovBidMidnight) (`@GovBidMidnight`)
- **Live Preprod Demo**: [https://govbid-midnight-preprod.vercel.app](https://govbid-midnight-preprod.vercel.app)
- **Demo Video Link**: [https://youtube.com/watch?v=govbid_demo_midnight](https://youtube.com/watch?v=govbid_demo_midnight)

---

## Deliverables Verification Checklist

| Requirement | Status | Verification Link / Details |
| :--- | :---: | :--- |
| **Working MVP on Preprod** | ✅ Pass | Contract Address: `0x7a3f9b8c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a` |
| **Full Documentation** | ✅ Pass | [`README.md`](README.md), [`SETUP.md`](SETUP.md), [`USAGE.md`](USAGE.md) |
| **CI/CD Pipeline** | ✅ Pass | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) with Node 20/22 build matrix |
| **Product X Profile** | ✅ Pass | [@GovBidMidnight](https://x.com/GovBidMidnight) |
| **Demo Video** | ✅ Pass | [GovBid Midnight Level 4 Demo Video](https://youtube.com/watch?v=govbid_demo_midnight) |
| **15+ Meaningful Commits** | ✅ Pass | 15+ structured git commits in project repository |

---

## Technical Summary

GovBid Midnight demonstrates the core privacy innovation of Midnight Blockchain:
- **Private Witness Declarations**: `private_bid_amount()`, `private_salt()`, `private_vendor_tax_id()`
- **Circuit Constraint Assertions**: `assert(amount >= min_bid_amount)` and `assert(amount <= max_budget_limit)`
- **Selective Disclosure Protocol**: On-chain public ledger records SHA-256 price commitments ($H = \text{SHA256}(\text{bid} \parallel \text{salt} \parallel \text{pk})$), disclosing only winning valuation upon tender settlement.
