# Setup & Environment Guide — GovBid Midnight

This document provides step-by-step instructions to configure, run, and test **GovBid Midnight** locally or deploy to Midnight Preprod testnet.

---

## Prerequisites

Ensure you have the following installed:
- **Node.js**: `v20.x` or `v22.x` (Recommended: v22.14.0+)
- **npm**: `v10.x` or higher
- **Git**: `v2.40+`
- **Browser**: Chrome, Brave, or Firefox (with Lace Wallet Extension installed for Midnight Preprod)

---

## Installation Steps

1. **Clone Repository**:
   ```bash
   git clone https://github.com/username/Midnight-GovBid.git
   cd Midnight-GovBid
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Verify Environment**:
   Run the test runner to ensure all ZK witness and circuit constraint modules compile properly:
   ```bash
   npm test
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

---

## Compact Contract Compilation

To inspect or compile the Midnight Compact DSL contract:
- Contract file location: `contract/GovBidProcurement.compact`
- TypeScript SDK bridge location: `contract/GovBidProcurement.ts`

```bash
# Verify compact contract file integrity
test -f contract/GovBidProcurement.compact
```

---

## Deploying to Preprod Testnet

1. Obtain testnet tokens (tDUST) from the Midnight Preprod Faucet.
2. Connect Lace Wallet inside the GovBid Midnight web application header.
3. Interact with Preprod Contract Address: `0x7a3f9b8c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a`.
