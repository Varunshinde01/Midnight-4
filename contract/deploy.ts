/**
 * GovBidProcurement Preprod Deployment Script
 * Deploys the GovBidProcurement Compact smart contract to Midnight Preprod testnet.
 */

import { deployContract, setNetworkId } from './GovBidProcurement';

async function main() {
  console.log('----------------------------------------------------');
  console.log(' GovBid Midnight — Preprod Smart Contract Deployer  ');
  console.log('----------------------------------------------------');

  const networkId = setNetworkId('preprod');
  console.log(`[INIT] Network Target: Midnight Network (${networkId})`);
  console.log(`[INIT] Indexer: https://indexer.preprod.midnight.network/api/v1/graphql`);
  console.log(`[INIT] Compiling Compact Circuit: contract/GovBidProcurement.compact`);

  const receipt = await deployContract();

  console.log('\n[SUCCESS] Smart Contract Successfully Deployed on Midnight Preprod!');
  console.log(`  Contract Address: ${receipt.contractAddress}`);
  console.log(`  Deployment Tx Hash: ${receipt.transactionHash}`);
  console.log(`  Block Height: ${receipt.blockHeight}`);
  console.log(`  Block Hash: ${receipt.blockHash}`);
  console.log(`  Network ID: ${receipt.networkId}`);
  console.log(`  Timestamp: ${receipt.deployedAt}`);
  console.log('----------------------------------------------------');
}

main().catch(err => {
  console.error('[ERROR] Deployment failed:', err);
  process.exit(1);
});
