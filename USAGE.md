# User Guide & Walkthrough — GovBid Midnight

This guide walks government procurement agencies and vendors through submitting confidential bids, inspecting privacy isolation, and executing ZK selective disclosure settlements.

---

## 1. Navigating Perspectives

Use the perspective toggle in the top-right header:
- **Public Ledger View**: Demonstrates what external auditors or block explorers see on-chain. Notice how raw bid prices and blinding salts display as `HIDDEN [ZK]`.
- **Private Witness View**: Simulates the bidder's local browser witness state, displaying the unencrypted bid amount, blinding salt, and vendor tax ID.

---

## 2. Submitting a Confidential Sealed Bid

1. Select an active procurement notice from the **Tenders List** (e.g. *National Smart Grid Energy Infrastructure*).
2. Click **Submit Sealed Bid**.
3. In the modal:
   - Enter your confidential **Bid Amount** (e.g. `85000 tDUST`).
   - Enter your **Vendor Tax ID**.
   - Review the auto-generated 256-bit **Blinding Salt**.
4. Observe the live **Calculated SHA-256 Commitment Hash**.
5. Click **Submit to Preprod**.
6. Observe the **Live ZK Prover Console** output logging witness compilation, circuit constraint assertions, salt blinding, and preprod transaction broadcast.

---

## 3. Executing Tender Settlement

1. When bidding closes, click **Execute Settlement**.
2. The tender authority triggers ZK selective disclosure.
3. The winning vendor's public key and winning bid price are disclosed on-chain, accompanied by a cryptographic ZK proof digest.
4. All non-winning bids remain permanently unrevealed.
