/**
 * Reading Ethereum from JavaScript, with two libraries at once.
 *
 * GUIDED WALKTHROUGH -- STARTER FILE.
 * This script only ever reads. Nothing here is signed, no key is used, and no
 * transaction is sent. The completed file is in ../solution/src/read-chain.mjs.
 */

// TODO (step 6): import a read-only client from each library.
//   from 'viem':        createPublicClient, http, formatEther, formatUnits, getAddress
//   from 'viem/chains': mainnet
//   from 'ethers':      JsonRpcProvider, Contract

const RPC_URL = process.env.RPC_URL ?? 'https://ethereum-rpc.publicnode.com';

// TODO (step 7): the contract to read. WETH is a good subject: an ordinary
// ERC-20, long-lived, whose reads are cheap and stable.
// Address: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
// Pass it through getAddress, which checksums it.

// TODO (step 8): the ABI. Only the entries you actually call are needed.
// You need symbol() -> string, decimals() -> uint8, totalSupply() -> uint256,
// each a view function taking no arguments.

// TODO (step 9): build one client per library against RPC_URL, ask each for the
// chain id, and print whether they agree.

// TODO (step 10): read symbol, decimals and totalSupply through both libraries
// and print whether they agree. Format the supply with formatUnits and the
// contract's own decimals -- never with a hard-coded 18.

console.log('Nothing implemented yet: work through the steps in Chapter 21.');
