import { describe, it, expect, beforeEach } from 'vitest';
import { 
  GovBidContractClient, 
  computeBidCommitment,
  computeVendorQualificationProof, 
  generateBlindingSalt, 
  ProcurementState,
  PrivateWitnessState,
  deployContract,
  setNetworkId,
  createGovBidContractBindings
} from '../../contract/GovBidProcurement';

describe('GovBid Midnight Compact Smart Contract & ZK Witness Suite', () => {
  let client: GovBidContractClient;
  const tenderId = '0xtender_test_9981';
  const authorityPubkey = '0xauthority_gov_defense';
  const minBid = BigInt(50000);
  const maxBudget = BigInt(500000);

  beforeEach(() => {
    client = new GovBidContractClient(undefined, tenderId, authorityPubkey, minBid, maxBudget);
  });

  it('Test 1: [Network Configuration] Validates networkId set to "preprod"', () => {
    const networkId = setNetworkId('preprod');
    expect(networkId).toBe('preprod');
    expect(client.getNetworkId()).toBe('preprod');
    expect(() => setNetworkId('mainnet' as any)).toThrow();
  });

  it('Test 2: [Compiler-Generated Bindings] Validates Midnight Compact bindings generator', () => {
    const bindings = createGovBidContractBindings();
    expect(bindings.contractName).toBe('GovBidProcurement');
    expect(bindings.circuitVersion).toBe('>=0.1.0');
    expect(bindings.circuits.submit_sealed_bid).toBeDefined();
    expect(bindings.circuits.settle_procurement).toBeDefined();
  });

  it('Test 3: [Preprod Contract Deployment] Genuine deployContract() returns valid receipt', async () => {
    const receipt = await deployContract(null, tenderId, authorityPubkey, minBid, maxBudget);
    expect(receipt.contractAddress).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(receipt.transactionHash).toBeDefined();
    expect(receipt.networkId).toBe('preprod');
    expect(receipt.blockHeight).toBeGreaterThan(0);
  });

  it('Test 4: [Canonical Commitment Encoding] SHA-256 price commitment digest hides raw bid amount & salt', async () => {
    const rawBid = BigInt(85000);
    const salt = generateBlindingSalt();
    const vendorTaxId = 'US-TAX-8891-CORP';

    const commitmentHash = await computeBidCommitment(rawBid, salt, vendorTaxId);

    // Assert hash output is a 256-bit hex digest starting with 0x
    expect(commitmentHash).toMatch(/^0x[a-f0-9]{64}$/i);
    // Assert raw bid amount and salt are non-invertibility protected
    expect(commitmentHash).not.toContain('85000');
    expect(commitmentHash).not.toContain(salt);
  });

  it('Test 5: [ZK Circuit Validity] Valid bid (>= min bid) with valid qualification proof passes circuit constraint', async () => {
    const rawBid = BigInt(85000); // 85,000 >= 50,000
    const salt = generateBlindingSalt();
    const vendorTaxId = 'US-TAX-8891-CORP';

    const witness: PrivateWitnessState = {
      bidAmount: rawBid,
      salt,
      vendorTaxId
    };

    const qualProof = await computeVendorQualificationProof(vendorTaxId, authorityPubkey);
    const result = await client.submitSealedBid(null, witness, qualProof);

    expect(result.success).toBe(true);
    expect(result.commitmentHash).toBeDefined();
    expect(result.txHash).toBeDefined();

    const ledger = client.getLedgerState();
    expect(ledger.bidsCount).toBe(1);
    expect(ledger.commitments[0].commitmentHash).toBe(result.commitmentHash);
  });

  it('Test 6: [Qualification Proof Rejection] Invalid qualification proof fails circuit assertion', async () => {
    const rawBid = BigInt(85000);
    const salt = generateBlindingSalt();
    const vendorTaxId = 'US-TAX-UNQUALIFIED';

    const witness: PrivateWitnessState = {
      bidAmount: rawBid,
      salt,
      vendorTaxId
    };

    const fakeQualProof = '0x0000000000000000000000000000000000000000000000000000000000001234';
    await expect(client.submitSealedBid(null, witness, fakeQualProof)).rejects.toThrow(
      'Circuit Constraint Violation: Vendor qualification proof verification failed'
    );
  });

  it('Test 7: [Reserve Price Circuit Rejection] Invalid bid (< min bid) triggers constraint rejection', async () => {
    const invalidBid = BigInt(30000); // 30,000 < 50,000 min bid
    const salt = generateBlindingSalt();

    const witness: PrivateWitnessState = {
      bidAmount: invalidBid,
      salt,
      vendorTaxId: 'US-TAX-LOW-BID'
    };

    await expect(client.submitSealedBid(null, witness)).rejects.toThrow(
      'Circuit Constraint Violation: Bid amount (30000) is below minimum reserve (50000)'
    );

    const ledger = client.getLedgerState();
    expect(ledger.bidsCount).toBe(0);
  });

  it('Test 8: [Budget Limit Circuit] Bid exceeding maximum budget triggers constraint rejection', async () => {
    const excessiveBid = BigInt(750000); // 750,000 > 500,000 max budget
    const salt = generateBlindingSalt();

    const witness: PrivateWitnessState = {
      bidAmount: excessiveBid,
      salt,
      vendorTaxId: 'US-TAX-EXCESS'
    };

    await expect(client.submitSealedBid(null, witness)).rejects.toThrow(
      'Circuit Constraint Violation: Bid amount (750000) exceeds maximum budget limit (500000)'
    );
  });

  it('Test 9: [Commitment Replay Protection] Submitting identical commitment digest twice triggers replay error', async () => {
    const rawBid = BigInt(100000);
    const salt = generateBlindingSalt();

    const witness: PrivateWitnessState = {
      bidAmount: rawBid,
      salt,
      vendorTaxId: 'US-TAX-DOUBLE'
    };

    await client.submitSealedBid(null, witness);

    // Attempt second bid with exact same witness (producing identical commitment hash)
    await expect(client.submitSealedBid(null, witness)).rejects.toThrow(
      'Circuit Constraint Violation: Commitment replay detected! This bid commitment has already been submitted.'
    );
  });

  it('Test 10: [Authority Authorization Check] Non-authority caller fails settlement with Unauthorized error', async () => {
    const winnerPk = '0xwinner_pk_11111111111111111111111111111111';
    const bidAmount = BigInt(95000);
    const salt = generateBlindingSalt();

    const witness: PrivateWitnessState = {
      bidAmount,
      salt,
      vendorTaxId: winnerPk
    };

    const submitResult = await client.submitSealedBid(null, witness);
    const fakeCallerPk = '0xfake_imposter_authority_key_123456789';

    await expect(
      client.settleProcurement(
        null,
        fakeCallerPk,
        winnerPk,
        bidAmount,
        salt,
        submitResult.commitmentHash
      )
    ).rejects.toThrow(/Unauthorized: Caller/);
  });

  it('Test 11: [Registered Commitment Check] Settling unsubmitted commitment digest fails', async () => {
    const winnerPk = '0xwinner_pk_unsubmitted';
    const bidAmount = BigInt(95000);
    const salt = generateBlindingSalt();
    const fakeCommitmentHash = '0x11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';

    await expect(
      client.settleProcurement(
        null,
        authorityPubkey,
        winnerPk,
        bidAmount,
        salt,
        fakeCommitmentHash
      )
    ).rejects.toThrow(/Winning commitment digest not found in authoritative ledger/);
  });

  it('Test 12: [Auction Invariants & Settlement] Valid settlement by authority updates ledger state', async () => {
    const winnerPk = '0xwinner_pk_11111111111111111111111111111111';
    const bidAmount = BigInt(95000);
    const salt = generateBlindingSalt();

    const witness: PrivateWitnessState = {
      bidAmount,
      salt,
      vendorTaxId: winnerPk
    };

    const submitResult = await client.submitSealedBid(null, witness);

    // Call settlement with authority pubkey matching ledger authority
    const winner = await client.settleProcurement(
      null,
      authorityPubkey,
      winnerPk,
      bidAmount,
      salt,
      submitResult.commitmentHash
    );

    expect(winner.winnerPublicKey).toBe(winnerPk);
    expect(winner.winningBidAmount).toBe(bidAmount);
    expect(winner.proofHash).toBeDefined();

    const ledger = client.getLedgerState();
    expect(ledger.state).toBe(ProcurementState.Settled);
    expect(ledger.winner?.winnerPublicKey).toBe(winnerPk);
  });

  it('Test 13: [Explicit Indexer Error Handling] Indexer failure is explicitly surfaced', async () => {
    // Attempt querying invalid indexer endpoint
    const badClient = new GovBidContractClient('0xcontract_address_1234');
    // Override indexer URL to unresolvable domain
    (badClient as any).indexerUrl = 'https://invalid-indexer.midnight.network/graphql';

    await expect(badClient.fetchStateFromIndexer()).rejects.toThrow(/Indexer Failure/);
  });
});
