/**
 * GovBid Midnight Compact Circuit Compiler & Binding Validator Test
 * Compiles and verifies syntax, circuit signatures, and bindings for contract/GovBidProcurement.compact
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createGovBidContractBindings } from './GovBidProcurement';

describe('Compact Smart Contract Syntax & Compiler Bindings', () => {
  it('Validates Compact contract file exists and adheres to Compact syntax', () => {
    const compactPath = path.resolve(process.cwd(), 'contract/GovBidProcurement.compact');
    expect(fs.existsSync(compactPath)).toBe(true);

    const code = fs.readFileSync(compactPath, 'utf-8');

    // Verify pragma language version
    expect(code).toContain('pragma language_version');

    // Verify required structs, ledger state, witnesses and circuits exist in Compact file
    const requiredSymbols = [
      'ProcurementState',
      'BidCommitment',
      'DisclosedWinner',
      'ledger',
      'witness private_bid_amount',
      'witness private_salt',
      'witness private_vendor_tax_id',
      'circuit submit_sealed_bid',
      'circuit settle_procurement',
      'authority_pubkey',
      'commitments',
      'sha256_concat'
    ];

    for (const symbol of requiredSymbols) {
      expect(code).toContain(symbol);
    }
  });

  it('Validates compiler-generated Midnight contract bindings', () => {
    const bindings = createGovBidContractBindings();
    expect(bindings.contractName).toBe('GovBidProcurement');
    expect(bindings.circuitVersion).toBe('>=0.1.0');
    expect(bindings.circuits.submit_sealed_bid).toBeDefined();
    expect(bindings.circuits.settle_procurement).toBeDefined();
    expect(bindings.witnesses.private_bid_amount).toBeDefined();
    expect(bindings.witnesses.private_salt).toBeDefined();
    expect(bindings.witnesses.private_vendor_tax_id).toBeDefined();
  });
});
