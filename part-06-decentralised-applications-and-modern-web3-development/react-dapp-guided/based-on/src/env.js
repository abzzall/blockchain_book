/**
 * Reading configuration, and the rule about what may live in it.
 *
 * GUIDED WALKTHROUGH -- STARTING POINT.
 * The tests in test/env.test.mjs already describe what these must do.
 *
 * Read this first, because it is the part that can actually hurt you:
 * Vite embeds every variable whose name starts with VITE_ into the JavaScript
 * it ships to the browser. Anyone who opens the page can read them. That is not
 * a bug to fix -- it is how the browser receives the value -- but it fixes the
 * rule: a VITE_ variable is public forever.
 *
 *   safe here    contract address, chain id, public RPC URL.
 *   never here   private key, mnemonic, deployer key, paid API key,
 *                database URL, session secret.
 */

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export const UNSET_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * TODO (step 3): validate the configuration.
 *
 * Return { ok: true, contractAddress, rpcUrl, chainId } when it is usable, and
 * { ok: false, reason } when it is not. Return a reason rather than throwing:
 * the interface renders it, which is how the user learns to copy .env.example
 * instead of meeting a blank page.
 *
 * The tests require a distinct reason for: missing address, malformed address,
 * the placeholder address still being in place, missing RPC URL, and a chain id
 * that is not a positive integer.
 */
export function readConfig(env) {
  throw new Error('not implemented: see step 3');
}

/**
 * TODO (step 4): return the names in `env` that must never be bundled.
 * Only names beginning with VITE_ count -- anything else never reaches the
 * browser and is not this function's business. Match PRIVATE_KEY, MNEMONIC,
 * SECRET, SEED, PASSWORD and _TOKEN, case-insensitively.
 */
export function forbiddenNames(env) {
  throw new Error('not implemented: see step 4');
}
