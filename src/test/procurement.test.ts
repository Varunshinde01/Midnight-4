import { describe, it, expect, beforeEach } from 'vitest';
import { 
  GovBidContractClient, 
  computeBidCommitment, 
  generateBlindingSalt, 
  ProcurementState,
  PrivateWitnessState,
  deployContract,
  setNetworkId
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

  it('Test 2: [Preprod Contract Deployment] Genuine deployContract() returns valid receipt', async () => {
    const receipt = await deployContract(undefined, tenderId, authorityPubkey, minBid, maxBudget);
    expect(receipt.contractAddress).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(receipt.transactionHash).toBeDefined();
    expect(receipt.networkId).toBe('preprod');
    expect(receipt.blockHeight).toBeGreaterThan(0);
  });

  it('Test 3: [Selective Disclosure] SHA-256 price commitment digest hides raw bid amount & salt', async () => {
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

  it('Test 4: [ZK Circuit Validity] Valid bid (>= min bid) passes circuit constraint & records commitment on ledger', async () => {
    const rawBid = BigInt(85000); // 85,000 >= 50,000
    const salt = generateBlindingSalt();

    const witness: PrivateWitnessState = {
      bidAmount: rawBid,
      salt,
      vendorTaxId: 'US-TAX-8891-CORP'
    };

    const result = await client.submitSealedBid(null, witness);

    expect(result.success).toBe(true);
    expect(result.commitmentHash).toBeDefined();
    expect(result.txHash).toBeDefined();

    const ledger = client.getLedgerState();
    expect(ledger.bidsCount).toBe(1);
    expect(ledger.commitments[0].commitmentHash).toBe(result.commitmentHash);
  });

  it('Test 5: [ZK Circuit Rejection] Invalid bid (< min bid) triggers constraint rejection', async () => {
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

  it('Test 6: [Budget Limit Circuit] Bid exceeding maximum budget triggers constraint rejection', async () => {
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

  it('Test 7: [Commitment Replay] Submitting identical commitment digest twice triggers replay error', async () => {
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

  it('Test 8: [Repaired Settlement Assertion] Winner verified against winning commitment digest', async () => {
    const winnerPk = '0xwinner_pk_11111111111111111111111111111111';
    const bidAmount = BigInt(95000);
    const salt = generateBlindingSalt();

    const witness: PrivateWitnessState = {
      bidAmount: bidAmount,
      salt,
      vendorTaxId: winnerPk
    };

    const submitResult = await client.submitSealedBid(null, witness);

    // Call settlement with matching commitment digest
    const winner = await client.settleProcurement(
      null,
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

  it('Test 9: [Repaired Settlement Failure] Mismatched settlement parameters trigger assertion error', async () => {
    const winnerPk = '0xwinner_pk_22222222222222222222222222222222';
    const bidAmount = BigInt(95000);
    const salt = generateBlindingSalt();

    const witness: PrivateWitnessState = {
      bidAmount: bidAmount,
      salt,
      vendorTaxId: winnerPk
    };

    const submitResult = await client.submitSealedBid(null, witness);

    // Pass false bid amount at settlement
    const wrongBidAmount = BigInt(120000);
    await expect(
      client.settleProcurement(null, winnerPk, wrongBidAmount, salt, submitResult.commitmentHash)
    ).rejects.toThrow(
      'Circuit Assertion Failed: Disclosed winning parameters do not match winning commitment digest!'
    );
  });
});
