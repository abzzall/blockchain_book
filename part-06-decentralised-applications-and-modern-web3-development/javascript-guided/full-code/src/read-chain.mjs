/**
 * Reading Ethereum from JavaScript, with two libraries at once.
 *
 * The point of running both is that they agree. viem and ethers are different
 * shapes over the same JSON-RPC interface of Chapter 13; neither has private
 * access to anything, and a disagreement between them would be a bug in one
 * of them rather than a difference in the chain.
 *
 * This script only reads. Nothing here is signed, no key is used, and no
 * transaction is sent.
 */

import { createPublicClient, http, formatEther, formatUnits, getAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { JsonRpcProvider, Contract, formatEther as ethersFormatEther } from 'ethers';

const RPC_URL = process.env.RPC_URL ?? 'https://ethereum-rpc.publicnode.com';

// Every contract read below is taken at one block rather than at whatever the
// head happens to be when each call lands. Chapter 26 makes the point: a
// comparison of two quantities is only meaningful if both are read at the same
// block, and any figure quoted from a chain is meaningless without the block it
// was read at. This script prints the block it used, so the run is reproducible
// by anyone who pins the same one.
//
// The block defaults to the current head, because reading an older block is an
// archive request and public endpoints generally refuse it without an account.
// If you have an archive endpoint, set BLOCK to a number to pin the figures:
//
//   RPC_URL=<archive endpoint> BLOCK=25900000 npm run demo
const BLOCK = process.env.BLOCK ? BigInt(process.env.BLOCK) : undefined;
const at = BLOCK === undefined ? {} : { blockNumber: BLOCK };
const ethersAt = BLOCK === undefined ? 'latest' : Number(BLOCK);

// WETH, chosen because it is long-lived, widely known, and an ordinary
// ERC-20 whose reads are cheap and stable. In canonical WETH9,
// totalSupply() returns the contract balance; this is not an independent
// measurement of holder liabilities.
const WETH = getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');

// The ABI of Chapter 14: only the entries actually used are needed.
const ERC20_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

const publicClient = createPublicClient({ chain: mainnet, transport: http(RPC_URL) });
const provider = new JsonRpcProvider(RPC_URL);

function line(label, a, b) {
  const agree = String(a) === String(b) ? 'agree' : 'DISAGREE';
  console.log(`  ${label.padEnd(20)} ${String(a).padEnd(26)} ${agree}`);
}

console.log('Two libraries, one endpoint');
console.log('-'.repeat(64));
console.log(`  reading at           ${BLOCK === undefined ? 'the head' : 'block ' + BLOCK}`);
const [chainId, blockNumber] = await Promise.all([
  publicClient.getChainId(),
  publicClient.getBlockNumber(),
]);
const network = await provider.getNetwork();
line('chain id', chainId, network.chainId);
// Both are asked for the head, so a block may have arrived between the calls.
const ethersBlock = await provider.getBlockNumber();
console.log(`  block number         viem ${blockNumber}, ethers ${ethersBlock}` +
  (blockNumber === BigInt(ethersBlock) ? ' (same)' : ' (a block arrived between the calls)'));

console.log('\nReading a contract, which needs its ABI');
console.log('-'.repeat(64));
const [symbol, decimals, totalSupply] = await Promise.all([
  publicClient.readContract({ address: WETH, abi: ERC20_ABI, functionName: 'symbol', ...at }),
  publicClient.readContract({ address: WETH, abi: ERC20_ABI, functionName: 'decimals', ...at }),
  publicClient.readContract({ address: WETH, abi: ERC20_ABI, functionName: 'totalSupply', ...at }),
]);
const weth = new Contract(WETH, ERC20_ABI, provider);
line('symbol', symbol, await weth.symbol({ blockTag: ethersAt }));
line('decimals', decimals, await weth.decimals({ blockTag: ethersAt }));
const ethersSupply = await weth.totalSupply({ blockTag: ethersAt });
line('totalSupply (wei)', totalSupply, ethersSupply);
console.log(`  formatted            ${formatUnits(totalSupply, decimals)} ${symbol}`);

console.log('\nAmounts are integers, and Number cannot hold them');
console.log('-'.repeat(64));
console.log(`  typeof totalSupply   ${typeof totalSupply}`);
console.log(`  Number.MAX_SAFE      ${Number.MAX_SAFE_INTEGER}`);
console.log(`  one ether in wei     ${10n ** 18n}`);
console.log('  one ether is about 111 times larger than Number.MAX_SAFE_INTEGER');

console.log('\nA read is not a transaction');
console.log('-'.repeat(64));
const balance = await publicClient.getBalance({ address: WETH, ...at });
console.log(`  WETH holds           ${formatEther(balance)} ETH`);
console.log(`  ethers agrees        ${ethersFormatEther(await provider.getBalance(WETH, ethersAt))} ETH`);
console.log('  no signature, no fee, no block: this was eth_call and eth_getBalance');

console.log('\nWriting would need a signer, which this script does not have');
console.log('-'.repeat(64));
console.log('  a public client can only read; sending requires a wallet client');
console.log('  (viem) or a Signer (ethers), and therefore a key or a wallet.');
