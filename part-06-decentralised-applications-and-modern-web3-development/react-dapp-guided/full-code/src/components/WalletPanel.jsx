/**
 * Connecting a wallet, and keeping the connection.
 *
 * Three things are commonly got wrong here, and all three are visible below.
 *
 * 1. Connecting is a *request to the user*, not a network call. It can be
 *    refused, so it needs the same error handling as anything else, and a
 *    refusal is not a fault.
 *
 * 2. The connection must survive a page reload. wagmi writes the last connector
 *    to localStorage and reconnects on load, so this is configuration rather
 *    than code -- but only if the app does not throw away the provider tree on
 *    every render. See the comment about the QueryClient in main.jsx.
 *
 * 3. The user can change account or network *in the wallet*, without touching
 *    the page. useAccount re-renders when they do; code that read the address
 *    once into its own useState would not, and would keep showing the old
 *    account. That is the single most common wallet bug in a first dApp, and
 *    the fix is to not copy the value at all.
 */
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { chain } from '../config.js';
import { StatusBanner } from './StatusBanner.jsx';

export function WalletPanel() {
  // Read the live values. Never copy these into useState.
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();

  const onWrongChain = isConnected && chainId !== chain.id;

  if (!isConnected) {
    return (
      <section className="panel">
        <h2>Wallet</h2>
        <p>Connect a wallet to send transactions. Reading the contract needs no wallet at all.</p>
        {connectors.length === 0 && <p className="banner error">No browser wallet detected. Install one, then reload.</p>}
        {connectors.map((c) => (
          // The click handler is the whole bridge between the button and the
          // chain: an ordinary DOM event handler that calls a library function.
          // There is nothing blockchain-specific about wiring it up.
          <button key={c.uid} disabled={isPending} onClick={() => connect({ connector: c })}>
            {isPending ? 'Check your wallet…' : `Connect ${c.name}`}
          </button>
        ))}
        <StatusBanner error={error} onRetry={reset} />
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Wallet</h2>
      <p><strong>Account:</strong> <code>{address}</code></p>
      <p><strong>Connected with:</strong> {connector?.name}</p>
      {onWrongChain && (
        <div className="banner error" role="alert">
          <strong>Wrong network</strong>
          <p>
            Your wallet is on chain {chainId}; this contract is on {chain.id}. The
            same address exists on every network, so a call made here would
            succeed in reaching a chain and find nothing at that address.
          </p>
        </div>
      )}
      <button className="secondary" onClick={() => disconnect()}>Disconnect</button>
    </section>
  );
}
