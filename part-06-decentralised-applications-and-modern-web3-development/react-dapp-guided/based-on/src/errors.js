/**
 * Classifying what went wrong, so the interface can say something true.
 *
 * GUIDED WALKTHROUGH -- STARTING POINT.
 * The tests in test/errors.test.mjs describe every case you must handle.
 *
 * A dApp fails in more ways than an ordinary page, and "Something went wrong"
 * is the wrong answer to all of them. A spinner that never stops is worse: the
 * user cannot tell a slow network from a dead one, and will either wait
 * forever or send the transaction twice.
 */

/**
 * TODO (step 5): return { kind, title, detail, recoverable, costsGas }.
 *
 * Handle each of these, in an order that does not let one swallow another:
 *
 *   'rejected'            EIP-1193 code 4001, or a UserRejectedRequestError.
 *                         The user pressed reject. Nothing sent, nothing spent,
 *                         and it must not be rendered as an error.
 *   'no-wallet'           no injected provider: no extension installed.
 *   'wrong-network'       code 4902 or a chain mismatch. Common and confusing,
 *                         because the address exists on every network.
 *   'insufficient-funds'  the account cannot pay the fee.
 *   'reverted'            the contract refused. THIS IS THE ONLY CASE HERE THAT
 *                         COSTS GAS, because the contract ran before refusing.
 *   'offline'             the request never reached a node -- a dropped
 *                         connection, a dead endpoint, "Failed to fetch". This
 *                         is the case that hangs a naive interface forever.
 *   'timeout'             a node was reached but did not answer. Do NOT invite
 *                         a resend: a submitted transaction may still be mined.
 *   'unknown'             anything else. Must still return a full, renderable
 *                         object -- never undefined, or the banner renders a hole.
 */
export function classify(error) {
  throw new Error('not implemented: see step 5');
}

/**
 * TODO (step 6): report whether the browser believes it is online.
 * Use navigator.onLine, and treat its absence as online. It reports the network
 * interface rather than whether any endpoint is reachable, so it is a hint for
 * the wording and never a gate on the request.
 */
export function browserThinksItIsOnline() {
  throw new Error('not implemented: see step 6');
}
