/**
 * The chain configuration, built from the environment.
 *
 * Nothing secret is read here, and nothing secret could be: see src/env.js for
 * why every value in this file is public by construction.
 */
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';
import { readConfig } from './env.js';

export const config = readConfig(import.meta.env);

// A usable fallback so the module still loads when .env is missing. The
// interface checks config.ok and renders an instruction rather than failing.
const chainId = config.ok ? config.chainId : 31337;
const rpcUrl = config.ok ? config.rpcUrl : 'http://127.0.0.1:8545';

export const chain = defineChain({
  id: chainId,
  name: chainId === 31337 ? 'Local development chain' : `Chain ${chainId}`,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

export const wagmiConfig = createConfig({
  chains: [chain],
  // `injected` is the wallet the browser extension injects into the page.
  // wagmi stores the last connection in localStorage and reconnects on load,
  // which is what makes the connection survive a refresh.
  connectors: [injected()],
  transports: { [chain.id]: http(rpcUrl) },
});

export const counterAbi = [
  { type: 'function', name: 'value', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'increment', stateMutability: 'nonpayable', inputs: [{ name: 'by', type: 'uint256' }], outputs: [] },
];
