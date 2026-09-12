/**
 * Classifying what went wrong, so the interface can say something true.
 *
 * A dApp fails in more ways than an ordinary web page, and the failures are not
 * interchangeable. "Something went wrong" is the wrong answer to every one of
 * them, and a spinner that never stops is worse: the user cannot tell a slow
 * network from a dead one, and will either wait forever or send the transaction
 * a second time.
 *
 * Every case below is recoverable, and the recovery differs. What the user must
 * be told differs too, and in two cases -- rejection and revert -- nothing was
 * spent and nothing changed, which is a reassurance worth printing.
 *
 * The classifier is a plain function of an error object, so it can be tested
 * without a wallet, a chain, or a browser.
 */

/** @typedef {'rejected'|'insufficient-funds'|'wrong-network'|'reverted'|'offline'|'timeout'|'no-wallet'|'unknown'} Kind */

/**
 * @param {unknown} error
 * @returns {{kind: Kind, title: string, detail: string, recoverable: boolean, costsGas: boolean}}
 */
export function classify(error) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  const message = (typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : String(error ?? '')).toLowerCase();

  // The user pressed reject in the wallet. EIP-1193 gives this code 4001.
  // Nothing was signed, nothing was sent, nothing was spent. This is not a
  // fault and must never be rendered in red as though it were.
  if (code === 4001 || name === 'UserRejectedRequestError' || message.includes('user rejected') || message.includes('user denied')) {
    return { kind: 'rejected', title: 'You cancelled the request', detail: 'Nothing was sent and nothing was spent. Press the button again when you are ready.', recoverable: true, costsGas: false };
  }

  // No injected provider at all: no wallet extension is installed.
  if (name === 'ConnectorNotFoundError' || message.includes('no injected provider') || message.includes('provider not found')) {
    return { kind: 'no-wallet', title: 'No wallet found', detail: 'Install a browser wallet such as MetaMask, then reload this page.', recoverable: true, costsGas: false };
  }

  // The wallet is on a different chain than the contract. The address exists on
  // every network, which is exactly why this is a common and confusing failure:
  // the call goes somewhere real and finds nothing there.
  if (code === 4902 || name === 'ChainMismatchError' || message.includes('chain mismatch') || message.includes('unsupported chain')) {
    return { kind: 'wrong-network', title: 'Wrong network', detail: 'Your wallet is connected to a different network than this contract. Switch networks and try again.', recoverable: true, costsGas: false };
  }

  // The account cannot pay for the gas the transaction would use.
  if (message.includes('insufficient funds')) {
    return { kind: 'insufficient-funds', title: 'Not enough ether for the fee', detail: 'The account cannot cover this transaction’s fee. Add funds, or use a test network faucet.', recoverable: true, costsGas: false };
  }

  // The contract rejected the call. On a write this costs gas; on a read
  // simulation it costs nothing, because nothing was submitted.
  if (name === 'ContractFunctionRevertedError' || message.includes('execution reverted') || message.includes('reverted with')) {
    return { kind: 'reverted', title: 'The contract refused the call', detail: 'A rule in the contract rejected this. State was not changed. Check the values you entered.', recoverable: true, costsGas: true };
  }

  // The request never reached a node: the connection dropped, the endpoint is
  // down, or the machine went offline mid-call. This is the case that hangs a
  // naive interface forever, because no answer is ever coming.
  if (name === 'HttpRequestError' || name === 'TypeError' && message.includes('fetch') ||
      message.includes('failed to fetch') || message.includes('network error') ||
      message.includes('networkerror') || message.includes('econnrefused') || message.includes('offline')) {
    return { kind: 'offline', title: 'Cannot reach the network', detail: 'The request did not reach a node. Check your connection, then retry — no transaction was sent.', recoverable: true, costsGas: false };
  }

  // A node was reached but did not answer in time. Importantly, a timeout on a
  // *submitted* transaction does not mean it failed: it may still be mined, so
  // the interface must not invite the user to send it again.
  if (name === 'TimeoutError' || message.includes('timed out') || message.includes('timeout')) {
    return { kind: 'timeout', title: 'The network did not answer in time', detail: 'If you already confirmed in your wallet, the transaction may still be mined. Check the transaction hash before sending it again.', recoverable: true, costsGas: false };
  }

  return { kind: 'unknown', title: 'Something unexpected happened', detail: 'The full error is below. Retrying is safe if no transaction hash was shown.', recoverable: true, costsGas: false };
}

/**
 * Whether the browser currently believes it has a connection.
 * Cheap, and wrong often enough that it is a hint for the message rather than
 * a gate on the request -- navigator.onLine reports the network interface, not
 * whether an endpoint is actually reachable.
 */
export function browserThinksItIsOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}
