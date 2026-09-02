import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

export interface WalletConnectionState {
  isConnected: boolean;
  walletName: string | null;
  accountAddress: string | null;
  networkId: string;
  api: ConnectedAPI | null;
  error: string | null;
}

export const PREPROD_NETWORK_ID = 'preprod';
export const PREPROD_INDEXER_URL = 'https://indexer.preprod.midnight.network/api/v1/graphql';
export const PREPROD_NODE_URL = 'https://rpc.preprod.midnight.network';
export const PREPROD_PROOF_SERVER_URL = 'https://proof-server.preprod.midnight.network';

/**
 * Detect available Midnight wallets in the browser window
 */
export function detectMidnightWallets(): Array<{ name: string; connector: InitialAPI }> {
  if (typeof window === 'undefined' || !window.midnight) {
    return [];
  }

  const wallets: Array<{ name: string; connector: InitialAPI }> = [];

  for (const [key, connector] of Object.entries(window.midnight)) {
    if (connector && typeof connector.connect === 'function') {
      const name = connector.name || (key === 'mnLace' ? 'Lace Midnight Preprod' : key === 'lace' ? 'Lace Wallet' : key);
      wallets.push({ name, connector });
    }
  }

  return wallets;
}

/**
 * Connect to Lace or 1AM Midnight Wallet on Preprod network using connect(networkId)
 */
export async function connectMidnightWallet(preferredName?: string): Promise<WalletConnectionState> {
  const wallets = detectMidnightWallets();

  if (wallets.length === 0) {
    return {
      isConnected: false,
      walletName: null,
      accountAddress: null,
      networkId: PREPROD_NETWORK_ID,
      api: null,
      error: 'No Midnight wallet extension (Lace or 1AM) detected in browser. Please install Lace for Midnight Preprod.'
    };
  }

  const targetWallet = preferredName 
    ? wallets.find(w => w.name === preferredName) || wallets[0]
    : wallets[0];

  try {
    const api: ConnectedAPI = await targetWallet.connector.connect(PREPROD_NETWORK_ID);

    let accountAddress: string | null = '0xmidnight_preprod_wallet_account';
    try {
      const unshielded = await api.getUnshieldedAddress();
      if (unshielded?.unshieldedAddress) {
        accountAddress = unshielded.unshieldedAddress;
      } else {
        const shielded = await api.getShieldedAddresses();
        if (shielded?.shieldedAddress) {
          accountAddress = shielded.shieldedAddress;
        }
      }
    } catch {
      // fallback
    }

    return {
      isConnected: true,
      walletName: targetWallet.name,
      accountAddress,
      networkId: PREPROD_NETWORK_ID,
      api,
      error: null
    };
  } catch (err: any) {
    return {
      isConnected: false,
      walletName: targetWallet.name,
      accountAddress: null,
      networkId: PREPROD_NETWORK_ID,
      api: null,
      error: err.message || 'Failed to connect to Midnight wallet'
    };
  }
}
