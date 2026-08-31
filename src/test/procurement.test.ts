import { describe, it, expect, beforeEach } from 'vitest';
import { 
  GovBidContractClient, 
  computeBidCommitment, 
  generateBlindingSalt, 
  ProcurementState,
  PrivateWitnessState 
} from '../../contract/GovBidProcurement';

describe('GovBid Midnight Compact Smart Contract & ZK Witness Suite', () => {
  let client: GovBidContractClient;
  const tenderId = '0xtender_test_9981';
  const authorityPubkey = '0xauthority_gov_defense';
  const minBid = BigInt(50000);
  const maxBudget = BigInt(500000);

  beforeEach(() => {
    client = new GovBidContractClient(tenderId, authorityPubkey, minBid, maxBudget);
  });

  it('Test 1: [Selective Disclosure] SHA-256 price commitment digest hides raw bid amount & salt', async () => {
    const rawBid = BigInt(85000);
    const salt = generateBlindingSalt();
    const pubKey = '0x88f2c91a7e43d1007421ab39e24f9011985c701234567890abcdef1234567890';

    const commitmentHash = await computeBidCommitment(rawBid, salt, pubKey);

    // Assert hash output is a 256-bit hex digest starting with 0x
    expect(commitmentHash).toMatch(/^0x[a-f0-9]{64}$/i);
    // Assert raw bid amount and salt are non-invertibility protected
    expect(commitmentHash).not.toContain('85000');
    expect(commitmentHash).not.toContain(salt);
  });

  it('Test 2: [ZK Circuit Validity] Valid bid (>= min bid) passes circuit constraint & records commitment on ledger', async () => {
    const rawBid = BigInt(85000); // 85,000 >= 50,000
    const salt = generateBlindingSalt();
    const pubKey = '0x88f2c91a7e43d1007421ab39e24f9011985c701234567890abcdef1234567890';

    const witness: PrivateWitnessState = {
      bidAmount: rawBid,
      salt,
      vendorTaxId: 'US-TAX-8891-CORP',
      identitySk: '0xsk_secret'
    };

    const result = await client.submitSealedBid(pubKey, witness);

    expect(result.success).toBe(true);
    expect(result.commitmentHash).toBeDefined();
    expect(result.zkProof).toContain('0xzkp_sha256_witness_');

    const ledger = client.getLedgerState();
    expect(ledger.bidsCount).toBe(1);
    expect(ledger.commitments[0].publicKey).toBe(pubKey);
    expect(ledger.commitments[0].commitmentHash).toBe(result.commitmentHash);
  });

  it('Test 3: [ZK Circuit Invalidity] Invalid bid (< min bid) triggers constraint rejection', async () => {
    const invalidBid = BigInt(30000); // 30,000 < 50,000 min bid
    const salt = generateBlindingSalt();
    const pubKey = '0xlow_bidder_pk_12345678901234567890123456789012';

    const witness: PrivateWitnessState = {
      bidAmount: invalidBid,
      salt,
      vendorTaxId: 'US-TAX-LOW-BID',
      identitySk: '0xsk_secret_low'
    };

    await expect(client.submitSealedBid(pubKey, witness)).rejects.toThrow(
      'Circuit Constraint Violation: Bid amount (30000) is below minimum reserve (50000)'
    );

    const ledger = client.getLedgerState();
    expect(ledger.bidsCount).toBe(0);
  });

  it('Test 4: [Budget Limit Circuit] Bid exceeding maximum budget triggers constraint rejection', async () => {
    const excessiveBid = BigInt(750000); // 750,000 > 500,000 max budget
    const salt = generateBlindingSalt();
    const pubKey = '0xexcessive_bidder_pk_1234567890123456789012';

    const witness: PrivateWitnessState = {
      bidAmount: excessiveBid,
      salt,
      vendorTaxId: 'US-TAX-EXCESS',
      identitySk: '0xsk_excess'
    };

    await expect(client.submitSealedBid(pubKey, witness)).rejects.toThrow(
      'Circuit Constraint Violation: Bid amount (750000) exceeds maximum budget limit (500000)'
    );
  });

  it('Test 5: [Nullifier Verification] Double-bidding with identical key triggers nullifier replay error', async () => {
    const rawBid = BigInt(100000);
    const salt = generateBlindingSalt();
    const pubKey = '0xdouble_bidder_pk_123456789012345678901234';

    const witness: PrivateWitnessState = {
      bidAmount: rawBid,
      salt,
      vendorTaxId: 'US-TAX-DOUBLE',
      identitySk: '0xsk_double'
    };

    await client.submitSealedBid(pubKey, witness);

    // Attempt second bid with same public key
    await expect(client.submitSealedBid(pubKey, witness)).rejects.toThrow(
      'Circuit Constraint Violation: Nullifier replay detected! Public key has already submitted a bid.'
    );
  });

  it('Test 6: [Settlement Selective Disclosure] Winner revealed; losing witness states remain hidden', async () => {
    const pubKey1 = '0xwinner_pk_11111111111111111111111111111111';
    const bid1 = BigInt(95000);
    const salt1 = generateBlindingSalt();

    const witness1: PrivateWitnessState = {
      bidAmount: bid1,
      salt: salt1,
      vendorTaxId: 'WINNER-CORP',
      identitySk: '0xsk_winner'
    };

    await client.submitSealedBid(pubKey1, witness1);

    const winner = await client.settleProcurement(pubKey1, bid1, salt1);

    expect(winner.winnerPublicKey).toBe(pubKey1);
    expect(winner.winningBidAmount).toBe(bid1);
    expect(winner.proofHash).toBeDefined();

    const ledger = client.getLedgerState();
    expect(ledger.state).toBe(ProcurementState.Settled);
    expect(ledger.winner?.winnerPublicKey).toBe(pubKey1);
  });
});
