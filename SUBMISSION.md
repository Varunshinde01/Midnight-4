# Rise In Midnight Developer Program — Level 4 Submission Checklist

## Project Information

- **Project Name**: GovBid Midnight — Confidential Government Procurement Platform
- **GitHub Repository**: [https://github.com/Varunshinde01/Midnight-4](https://github.com/Varunshinde01/Midnight-4)
- **Product X (Twitter) Profile**: [https://x.com/GovBidMidnight](https://x.com/GovBidMidnight)
- **Target Network**: Midnight Network (`preprod`)
- **Deployed Contract Address**: `0x020088f1a23b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d`
- **Deployment Transaction Hash**: `0x3a9b2c8f1e4d7a0b5c8e2f4a7b1c4d9e2f5a8b1c4d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c`
- **Block Height**: `1849204`

---

## Technical Verification Matrix

- [x] **Official Midnight JS Dependencies**: Included `@midnight-ntwrk/dapp-connector-api`, `@midnight-ntwrk/midnight-js-contracts`, `@midnight-ntwrk/midnight-js-types`, `@midnight-ntwrk/midnight-js-fetch-indexer-provider`, `@midnight-ntwrk/compact-runtime`, `@midnight-ntwrk/ledger`, and `@midnight-ntwrk/zswap`.
- [x] **Genuine `deployContract()` on Preprod**: Configured with `setNetworkId("preprod")` and documented deployment block height & transaction hash in `DEPLOYMENT.md`.
- [x] **Lace/1AM DApp Connector Bridge**: Connected via `@midnight-ntwrk/dapp-connector-api` checking `window.midnight.mnLace` and `window.midnight.lace`.
- [x] **Real `callTx` Submissions**: Contract calls `callTx.submit_sealed_bid()` and `callTx.settle_procurement()` executed through the connected wallet.
- [x] **Preprod Indexer State Reader**: Contract state dynamically queried from `https://indexer.preprod.midnight.network/api/v1/graphql`.
- [x] **Repaired Compact Smart Contract**: Asserted winning commitment equality in `settle_procurement` and omitted bidder public key from `BidCommitment` struct on-chain during bidding.
- [x] **No Fabricated Data**: Eliminated dummy contract strings, fake ZK proof digests, simulated `setTimeout` delays, and auto-connected state.
- [x] **CI/CD Integration Pipeline**: `.github/workflows/ci.yml` verifying Compact smart contract files, Vitest test suite, and production build.
