import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Terminal, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Building2, 
  FileCode2, 
  Sparkles, 
  Wallet, 
  RefreshCw,
  Award,
  Clock,
  Send,
  Twitter,
  Github,
  Zap,
  Info
} from 'lucide-react';

import { 
  GovBidContractClient, 
  ProcurementState, 
  computeBidCommitment, 
  generateBlindingSalt,
  PrivateWitnessState,
  LedgerState
} from '../contract/GovBidProcurement';

interface TenderItem {
  id: string;
  title: string;
  department: string;
  category: string;
  minBid: bigint;
  maxBudget: bigint;
  deadline: string;
  description: string;
  status: ProcurementState;
}

const INITIAL_TENDERS: TenderItem[] = [
  {
    id: '0xtender_smart_grid_991',
    title: 'National Smart Grid Energy Storage Infrastructure',
    department: 'Ministry of Energy & Infrastructure',
    category: 'Renewable Power & IoT',
    minBid: BigInt(50000),
    maxBudget: BigInt(500000),
    deadline: '2026-09-15',
    description: 'Procurement of high-capacity grid storage batteries and IoT smart meters with anonymous vendor technical qualification.',
    status: ProcurementState.OpenBidding
  },
  {
    id: '0xtender_defense_vault_772',
    title: 'Confidential Defense Data Center Sovereign Vault',
    department: 'Department of Defense Cyber Agency',
    category: 'Cybersecurity & Hardware',
    minBid: BigInt(250000),
    maxBudget: BigInt(1200000),
    deadline: '2026-09-28',
    description: 'Hardware security modules and zero-knowledge encrypted server clusters for sovereign defense storage.',
    status: ProcurementState.OpenBidding
  },
  {
    id: '0xtender_telehealth_mesh_443',
    title: 'National Telehealth Sovereign Encryption Mesh',
    department: 'Department of Public Health',
    category: 'Healthcare & Cryptography',
    minBid: BigInt(40000),
    maxBudget: BigInt(350000),
    deadline: '2026-10-05',
    description: 'Privacy-preserving health data exchange network with zk-STARK identity verification.',
    status: ProcurementState.OpenBidding
  }
];

export default function App() {
  const [contractClient] = useState(() => new GovBidContractClient());
  const [ledger, setLedger] = useState<LedgerState>(() => contractClient.getLedgerState());
  const [perspective, setPerspective] = useState<'public' | 'private'>('public');
  const [selectedTender, setSelectedTender] = useState<TenderItem>(INITIAL_TENDERS[0]);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletConnected, setWalletConnected] = useState(true);
  const [bidderPk, setBidderPk] = useState('0x88f2c91a7e43d1007421ab39e24f9011985c701234567890abcdef1234567890');
  const [bidAmountInput, setBidAmountInput] = useState('85000');
  const [blindingSalt, setBlindingSalt] = useState(() => generateBlindingSalt());
  const [vendorTaxId, setVendorTaxId] = useState('US-TAX-8891-CORP');
  const [calculatedCommitment, setCalculatedCommitment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Prover Console Logs State
  const [consoleLogs, setConsoleLogs] = useState<Array<{ id: number; time: string; tag: string; msg: string }>>([
    { id: 1, time: '14:50:01', tag: 'ZK-INIT', msg: 'Initialized Midnight Compact ZK Circuit Engine v0.1.0' },
    { id: 2, time: '14:50:02', tag: 'PREPROD', msg: 'Connected to Midnight Preprod Testnet (Address: 0x7a3f...8f9a)' },
    { id: 3, time: '14:50:03', tag: 'LEDGER', msg: 'Fetched on-chain ledger state for Tender #0xtender_smart_grid_991' }
  ]);

  const addConsoleLog = (tag: string, msg: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setConsoleLogs(prev => [
      ...prev,
      { id: Date.now(), time: timeStr, tag, msg }
    ]);
  };

  // Recalculate commitment when inputs change
  useEffect(() => {
    async function updateHash() {
      if (bidAmountInput && blindingSalt && bidderPk) {
        try {
          const amt = BigInt(bidAmountInput);
          const hash = await computeBidCommitment(amt, blindingSalt, bidderPk);
          setCalculatedCommitment(hash);
        } catch {
          setCalculatedCommitment('Invalid input');
        }
      }
    }
    updateHash();
  }, [bidAmountInput, blindingSalt, bidderPk]);

  const handleCopyContractAddress = () => {
    navigator.clipboard.writeText(contractClient.getPreprodContractAddress());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateSalt = () => {
    const newSalt = generateBlindingSalt();
    setBlindingSalt(newSalt);
    addConsoleLog('WITNESS', `Generated fresh 256-bit blinding salt: ${newSalt.slice(0, 14)}...`);
  };

  const handleSubmitSealedBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    addConsoleLog('WITNESS', 'Constructing client-side private witness state...');
    await new Promise(r => setTimeout(r, 600));

    try {
      const amountBigInt = BigInt(bidAmountInput);
      
      addConsoleLog('CIRCUIT', `Executing ZK Circuit assertion: bid (${amountBigInt.toString()}) >= min_bid (${selectedTender.minBid.toString()})`);
      await new Promise(r => setTimeout(r, 700));

      addConsoleLog('CIRCUIT', `Computing SHA-256 Price Commitment Hash: SHA256(${amountBigInt.toString()} || ${blindingSalt.slice(0, 10)}... || ${bidderPk.slice(0, 10)}...)`);
      await new Promise(r => setTimeout(r, 800));

      const privateWitness: PrivateWitnessState = {
        bidAmount: amountBigInt,
        salt: blindingSalt,
        vendorTaxId: vendorTaxId,
        identitySk: '0xsk_secret_witness_key_unrevealed'
      };

      const result = await contractClient.submitSealedBid(bidderPk, privateWitness);

      addConsoleLog('PREPROD', `Published Zero-Knowledge Commitment to Midnight Preprod Ledger: ${result.commitmentHash.slice(0, 20)}...`);
      addConsoleLog('ZK-PROOF', `Generated Succinct Proof Digest: ${result.zkProof}`);

      setLedger(contractClient.getLedgerState());
      setSubmitting(false);
      setIsModalOpen(false);
      
    } catch (err: any) {
      addConsoleLog('CIRCUIT-REJECT', err.message || 'Circuit constraint error');
      setSubmitting(false);
    }
  };

  const handleSettleProcurement = async () => {
    if (ledger.commitments.length === 0) {
      alert('No sealed bids submitted yet to settle.');
      return;
    }

    addConsoleLog('SETTLEMENT', 'Initiating Zero-Knowledge Selective Disclosure Settlement Process...');
    await new Promise(r => setTimeout(r, 800));

    const winningCommitment = ledger.commitments[0];
    const winningAmount = BigInt(bidAmountInput);

    try {
      const winner = await contractClient.settleProcurement(
        winningCommitment.publicKey,
        winningAmount,
        blindingSalt
      );

      addConsoleLog('SELECTIVE-DISCLOSURE', `Winning Bid Revealed: ${winner.winningBidAmount.toString()} tDUST by ${winner.winnerPublicKey.slice(0, 14)}...`);
      addConsoleLog('LEDGER', 'Updated Ledger State: Procurement Settled with On-Chain ZK Proof.');

      setLedger(contractClient.getLedgerState());
    } catch (err: any) {
      addConsoleLog('SETTLE-ERROR', err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. TOP PREPROD NETWORK BANNER */}
      <div className="preprod-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge-preprod">Midnight Preprod Testnet</span>
          <span style={{ color: 'var(--text-muted)' }}>Contract:</span>
          <code className="code-font" style={{ color: '#a5b4fc', fontSize: '0.8rem' }}>
            {contractClient.getPreprodContractAddress().slice(0, 14)}...{contractClient.getPreprodContractAddress().slice(-8)}
          </code>
          <button 
            onClick={handleCopyContractAddress}
            style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}
          >
            <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <a 
            href="https://x.com/GovBidMidnight" 
            target="_blank" 
            rel="noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <Twitter size={14} /> Product X Profile (@GovBidMidnight)
          </a>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noreferrer"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
          >
            <Github size={14} /> GitHub Repo
          </a>
        </div>
      </div>

      {/* 2. MAIN HEADER & NAVBAR */}
      <header style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 2rem', background: 'rgba(17, 20, 37, 0.9)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
            }}>
              <ShieldCheck size={26} color="#ffffff" />
            </div>
            <div>
              <h1 className="gradient-title" style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.1 }}>GovBid Midnight</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Confidential Government Procurement & Sealed-Bid Auction System</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* PERSPECTIVE SWITCHER */}
            <div className="view-switch-container">
              <button 
                className={`view-switch-btn ${perspective === 'public' ? 'active-public' : ''}`}
                onClick={() => {
                  setPerspective('public');
                  addConsoleLog('VIEW', 'Switched to Public Ledger View (Block Explorer perspective)');
                }}
              >
                <Eye size={14} /> Public Ledger View
              </button>
              <button 
                className={`view-switch-btn ${perspective === 'private' ? 'active-private' : ''}`}
                onClick={() => {
                  setPerspective('private');
                  addConsoleLog('VIEW', 'Switched to Private Witness View (Client device perspective)');
                }}
              >
                <EyeOff size={14} /> Private Witness View
              </button>
            </div>

            {/* WALLET BUTTON */}
            <button 
              className="btn-secondary" 
              onClick={() => setWalletConnected(!walletConnected)}
              style={{ fontSize: '0.85rem' }}
            >
              <Wallet size={15} color={walletConnected ? '#10b981' : '#9ca3af'} />
              {walletConnected ? 'Lace Wallet (Connected)' : 'Connect Wallet'}
            </button>
          </div>

        </div>
      </header>

      {/* 3. HERO BANNER */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.75rem 2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(24,28,53,0.9) 0%, rgba(17,20,37,0.9) 100%)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Sparkles size={18} color="#818cf8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Zero-Knowledge Selective Disclosure Protocol
                </span>
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Reducing Public Procurement Corruption via Hidden Bids & Provable Fairness
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '820px' }}>
                Midnight hides bids in client-side witness state until resolution, preventing front-running, mempool snipe attacks, and predatory price exposure. Upon tender completion, a ZK proof selectively discloses <strong>only the winning bid</strong> while losing bids remain permanently unrevealed.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '220px' }}>
              <div className="glass-card" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Current Active Bids</span>
                <span className="code-font" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>
                  {ledger.bidsCount} Sealed Bids
                </span>
              </div>
              <button 
                className="btn-primary" 
                onClick={() => setIsModalOpen(true)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Lock size={16} /> Submit Sealed Bid
              </button>
            </div>
          </div>
        </div>

        {/* 4. PERSPECTIVE EXPLANATION BANNER */}
        <div style={{ 
          padding: '0.85rem 1.25rem', 
          borderRadius: '10px', 
          marginBottom: '1.75rem',
          background: perspective === 'public' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${perspective === 'public' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {perspective === 'public' ? (
            <>
              <Eye size={20} color="#818cf8" />
              <div>
                <strong style={{ color: '#a5b4fc', fontSize: '0.9rem' }}>Public Ledger Perspective (On-Chain Block Explorer)</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  This view simulates what external block explorers and competitors see on-chain: <strong>Zero price amounts or vendor identities are visible</strong>. Only SHA-256 commitment digests are written to the ledger.
                </p>
              </div>
            </>
          ) : (
            <>
              <EyeOff size={20} color="#34d399" />
              <div>
                <strong style={{ color: '#6ee7b7', fontSize: '0.9rem' }}>Private Witness Perspective (Bidder Device Local Storage)</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  This view displays the confidential data residing exclusively inside your local browser witness state (Raw Bid Valuation, Blinding Salts, Tax IDs).
                </p>
              </div>
            </>
          )}
        </div>

        {/* 5. TENDERS & COMMITMENT MATRIX GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* LEFT: TENDER EXPLORER & SELECTION */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="var(--accent-primary)" /> Active Government Procurement Notices
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {INITIAL_TENDERS.map(t => {
                const isSelected = selectedTender.id === t.id;
                return (
                  <div 
                    key={t.id}
                    className="glass-panel"
                    onClick={() => setSelectedTender(t)}
                    style={{ 
                      padding: '1.25rem', 
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                      boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.25)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        {t.category}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={13} /> Closes: {t.deadline}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem', color: '#ffffff' }}>{t.title}</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{t.description}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: 'rgba(10, 12, 22, 0.6)', padding: '0.6rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Min Reserve</span>
                        <strong className="code-font" style={{ color: '#ffffff' }}>{t.minBid.toLocaleString()} tDUST</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Max Budget Limit</span>
                        <strong className="code-font" style={{ color: '#ffffff' }}>{t.maxBudget.toLocaleString()} tDUST</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>State</span>
                        <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>{t.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: LEDGER STATE vs PRIVATE WITNESS STATE */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCode2 size={18} color="var(--accent-secondary)" /> 
                {perspective === 'public' ? 'On-Chain Ledger Commitments' : 'Client Private Witness Records'}
              </h3>
              
              {ledger.state !== ProcurementState.Settled && ledger.commitments.length > 0 && (
                <button 
                  className="btn-outline-cyan"
                  onClick={handleSettleProcurement}
                >
                  <Award size={14} /> Execute Settlement
                </button>
              )}
            </div>

            {/* SETTLEMENT ANNOUNCEMENT CARD */}
            {ledger.winner && (
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,182,212,0.2) 100%)', 
                border: '1px solid var(--accent-success)',
                borderRadius: '10px',
                padding: '1.25rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-success)', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <Award size={20} /> Tender Settled & Winner Selectively Disclosed
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ margin: '0.25rem 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Winning Vendor PK: </span>
                    <code className="code-font" style={{ color: '#ffffff' }}>{ledger.winner.winnerPublicKey.slice(0, 18)}...</code>
                  </div>
                  <div style={{ margin: '0.25rem 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Winning Price: </span>
                    <strong className="code-font" style={{ color: '#34d399', fontSize: '1rem' }}>
                      {ledger.winner.winningBidAmount.toString()} tDUST
                    </strong>
                  </div>
                  <div style={{ margin: '0.25rem 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span>ZK Proof Digest: {ledger.winner.proofHash}</span>
                  </div>
                </div>
              </div>
            )}

            {/* COMMITMENTS LIST */}
            <div className="glass-panel" style={{ padding: '1rem', minHeight: '340px' }}>
              {ledger.commitments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <Lock size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.9rem' }}>No sealed bids submitted yet for this tender.</p>
                  <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>Click "Submit Sealed Bid" to construct a client-side ZK commitment.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ledger.commitments.map((c, idx) => (
                    <div key={idx} className="glass-card" style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span className="code-font" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                          Bidder #{idx + 1}: {c.publicKey.slice(0, 10)}...
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(c.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {perspective === 'public' ? (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                            SHA-256 Price Commitment Hash Digest (Public Ledger):
                          </div>
                          <code className="code-font" style={{ fontSize: '0.78rem', color: '#38bdf8', wordBreak: 'break-all', display: 'block', background: '#090b14', padding: '0.4rem', borderRadius: '4px' }}>
                            {c.commitmentHash}
                          </code>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Lock size={11} /> Raw Price: HIDDEN [ZK]
                            </span>
                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Lock size={11} /> Salt: HIDDEN [ZK]
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Private Raw Bid</span>
                              <strong className="code-font" style={{ color: '#34d399' }}>{bidAmountInput} tDUST</strong>
                            </div>
                            <div style={{ background: 'rgba(99,102,241,0.1)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Vendor Tax ID</span>
                              <span className="code-font" style={{ color: '#a5b4fc', fontSize: '0.75rem' }}>{vendorTaxId}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                            Blinding Salt: <code className="code-font" style={{ color: '#cbd5e1' }}>{blindingSalt.slice(0, 16)}...</code>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 6. REAL-TIME ZK PROVER & WITNESS CONSOLE TERMINAL */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
              <Terminal size={16} color="var(--accent-cyan)" /> Live ZK Prover & Circuit Execution Console
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Midnight Compact Witness Engine v0.1.0</span>
          </div>

          <div className="prover-console">
            {consoleLogs.map(log => (
              <div key={log.id} className="console-line">
                <span className="console-timestamp">[{log.time}]</span>
                <span className={`console-tag-${log.tag.toLowerCase().includes('zk') ? 'zk' : log.tag.toLowerCase().includes('circuit') ? 'circuit' : 'ledger'}`}>
                  [{log.tag}]
                </span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. PRIVACY MODEL AUDIT COMPARISON MATRIX */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} color="var(--accent-success)" /> Privacy Model & State Isolation Audit
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem' }}>State Variable</th>
                  <th style={{ padding: '0.6rem' }}>On-Chain Public Ledger (Preprod)</th>
                  <th style={{ padding: '0.6rem' }}>Client Private Witness (Browser)</th>
                  <th style={{ padding: '0.6rem' }}>Privacy Guarantee</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(42, 49, 88, 0.4)' }}>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>Raw Bid Amount</td>
                  <td style={{ padding: '0.6rem', color: '#ef4444' }}>HIDDEN (Never published)</td>
                  <td style={{ padding: '0.6rem', color: '#34d399' }}>Stored in local witness state</td>
                  <td style={{ padding: '0.6rem', color: '#38bdf8' }}>Zero-Knowledge Range Proof</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(42, 49, 88, 0.4)' }}>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>Blinding Salt (256-bit)</td>
                  <td style={{ padding: '0.6rem', color: '#ef4444' }}>HIDDEN (Never published)</td>
                  <td style={{ padding: '0.6rem', color: '#34d399' }}>Generated on client device</td>
                  <td style={{ padding: '0.6rem', color: '#38bdf8' }}>Cryptographic Hashing (SHA-256)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(42, 49, 88, 0.4)' }}>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>Bid Commitment Hash</td>
                  <td style={{ padding: '0.6rem', color: '#34d399' }}>Disclosed (SHA256 digest)</td>
                  <td style={{ padding: '0.6rem', color: '#34d399' }}>Computed in local circuit</td>
                  <td style={{ padding: '0.6rem', color: '#38bdf8' }}>One-Way Binding Commitment</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>Winning Bid Valuation</td>
                  <td style={{ padding: '0.6rem', color: '#f59e0b' }}>Disclosed ONLY post-settlement</td>
                  <td style={{ padding: '0.6rem', color: '#34d399' }}>Client witness disclosure</td>
                  <td style={{ padding: '0.6rem', color: '#38bdf8' }}>Selective Disclosure Protocol</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* 8. SUBMIT SEALED BID MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(17, 20, 37, 0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Submit Confidential Sealed Bid</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSealedBid} style={{ padding: '1.5rem' }}>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Target Tender</label>
                <input 
                  type="text" 
                  disabled 
                  value={selectedTender.title} 
                  style={{ width: '100%', background: '#0a0c16', border: '1px solid var(--border-color)', color: '#ffffff', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Bid Amount (tDUST) <span style={{ color: '#ef4444' }}>*Private</span>
                  </label>
                  <input 
                    type="number" 
                    required 
                    value={bidAmountInput}
                    onChange={e => setBidAmountInput(e.target.value)}
                    placeholder="e.g. 85000"
                    style={{ width: '100%', background: '#181c35', border: '1px solid var(--accent-primary)', color: '#ffffff', padding: '0.6rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }} 
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    Min reserve: {selectedTender.minBid.toString()} tDUST
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Vendor Tax / Reg ID <span style={{ color: '#ef4444' }}>*Private</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={vendorTaxId}
                    onChange={e => setVendorTaxId(e.target.value)}
                    style={{ width: '100%', background: '#181c35', border: '1px solid var(--border-color)', color: '#ffffff', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem' }} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Blinding Salt (256-bit Hex) <span style={{ color: '#ef4444' }}>*Private</span>
                  </label>
                  <button 
                    type="button"
                    onClick={handleRegenerateSalt}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                  >
                    <RefreshCw size={11} /> Regenerate Salt
                  </button>
                </div>
                <input 
                  type="text" 
                  readOnly 
                  value={blindingSalt}
                  style={{ width: '100%', background: '#0a0c16', border: '1px solid var(--border-color)', color: '#cbd5e1', padding: '0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }} 
                />
              </div>

              <div style={{ marginBottom: '1.25rem', background: '#080911', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Calculated SHA-256 Commitment (Public Output):</span>
                <code className="code-font" style={{ fontSize: '0.78rem', color: '#38bdf8', wordBreak: 'break-all' }}>
                  {calculatedCommitment || 'Calculating...'}
                </code>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Generating ZK Proof...
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Submit to Preprod
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 9. FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem', background: '#070913', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
        <p>GovBid Midnight — Rise In Midnight Developer Program Submission (Level 4 MVP)</p>
        <p style={{ marginTop: '0.25rem' }}>
          Preprod Contract: <code className="code-font" style={{ color: '#818cf8' }}>0x7a3f9b8c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a</code>
        </p>
      </footer>

    </div>
  );
}
