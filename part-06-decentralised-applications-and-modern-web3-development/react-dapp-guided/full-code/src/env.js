/**
 * Reading configuration, and the rule about what may live in it.
 *
 * Vite embeds every variable whose name starts with VITE_ into the bundle it
 * ships to the browser. That is not a leak to be fixed; it is how the browser
 * gets the value at all, because there is no server here to keep anything from.
 * The consequence is the rule: a VITE_ variable is public, permanently, to
 * anyone who opens the page and reads the JavaScript.
 *
 * So configuration is split by what it is, not by how secret it feels:
 *
 *   safe here    a contract address, a chain id, a public RPC URL. All three
 *                are on a public chain already; publishing them discloses
 *                nothing that was not already visible.
 *
 *   never here   a private key, a mnemonic, a deployer key, a paid API key, a
 *                database URL, a session secret. These belong to a server the
 *                browser talks to, or to a deployment script that runs on your
 *                machine and is never bundled.
 *
 * This module is a plain function of an env object rather than a reader of
 * import.meta.env, so it can be tested without a browser.
 */

/** Addresses are 20 bytes in hexadecimal, with the 0x prefix. */
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** The address a fresh .env.example carries; it is a placeholder, not a target. */
export const UNSET_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Validate configuration and say exactly what is wrong when it is not usable.
 *
 * Returning a reason rather than throwing lets the interface render a specific
 * instruction ("copy .env.example to .env") instead of a blank page, which is
 * the whole point of chapter 20's argument about failure states.
 *
 * @param {Record<string, string|undefined>} env
 * @returns {{ok: true, contractAddress: string, rpcUrl: string, chainId: number}
 *          |{ok: false, reason: string}}
 */
export function readConfig(env) {
  const address = env.VITE_CONTRACT_ADDRESS;
  const rpcUrl = env.VITE_RPC_URL;
  const chainId = Number(env.VITE_CHAIN_ID);

  if (!address) {
    return { ok: false, reason: 'VITE_CONTRACT_ADDRESS is not set. Copy .env.example to .env and fill it in.' };
  }
  if (!ADDRESS.test(address)) {
    return { ok: false, reason: `VITE_CONTRACT_ADDRESS is not an address: ${address}` };
  }
  if (address === UNSET_ADDRESS) {
    return { ok: false, reason: 'VITE_CONTRACT_ADDRESS is still the placeholder. Deploy the contract and set the address it was given.' };
  }
  if (!rpcUrl) {
    return { ok: false, reason: 'VITE_RPC_URL is not set.' };
  }
  if (!Number.isInteger(chainId) || chainId <= 0) {
    return { ok: false, reason: `VITE_CHAIN_ID is not a chain id: ${env.VITE_CHAIN_ID}` };
  }
  return { ok: true, contractAddress: address, rpcUrl, chainId };
}

/**
 * Names that must never appear in a browser-bundled environment.
 * Used by the test, and worth running over your own .env before a first commit.
 *
 * @param {Record<string, string|undefined>} env
 * @returns {string[]} the offending names, empty when the file is clean
 */
export function forbiddenNames(env) {
  const banned = /(PRIVATE_KEY|MNEMONIC|SECRET|SEED|PASSWORD|_TOKEN)/i;
  return Object.keys(env).filter((name) => name.startsWith('VITE_') && banned.test(name));
}
