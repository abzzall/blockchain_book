/**
 * Reading a value, writing a value, and not losing either.
 *
 * WHERE CHAIN DATA SHOULD LIVE.
 * useReadContract keeps the value in the React Query cache, not in this
 * component. That is deliberate and it is the answer to "my data disappears":
 *
 *   - the value survives this component unmounting and mounting again, so
 *     switching tabs or panels does not blank it;
 *   - two components asking for the same thing share one request and one value,
 *     so they cannot disagree;
 *   - it is refreshed on a schedule you set, rather than whenever some
 *     component happens to render.
 *
 * The tempting alternative -- read once into useState inside useEffect -- loses
 * on all three counts, and adds a race: if the user changes the input while a
 * request is in flight, the slower response can land last and overwrite the
 * newer value with an older one. The cache keys each request by its arguments,
 * so a stale response is discarded rather than displayed.
 *
 * WHAT BELONGS IN useState.
 * Only what the user is typing. Form input is genuinely local, genuinely this
 * component's, and is not on the chain.
 *
 * RENDERING A uint256.
 * It arrives as a bigint. React will not render a bigint directly, and
 * JSON.stringify throws on one, so it is converted with .toString() at the
 * point of display -- never with Number(), which silently loses precision above
 * 2^53 - 1, as chapter 21 showed.
 */
import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { counterAbi, config } from '../config.js';
import { StatusBanner } from './StatusBanner.jsx';

export function CounterPanel({ onValueRead }) {
  const { isConnected } = useAccount();
  const [by, setBy] = useState('1');

  const read = useReadContract({
    address: config.ok ? config.contractAddress : undefined,
    abi: counterAbi,
    functionName: 'value',
    query: { enabled: config.ok },
  });

  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  // A write has four states, not two, and each needs its own message. Showing
  // only "loading" for the middle two is what makes a user press the button
  // again: they cannot tell "waiting for you" from "waiting for the chain".
  const waitingForWallet = write.isPending;
  const waitingForChain = receipt.isLoading;
  const busy = waitingForWallet || waitingForChain;

  async function handleIncrement() {
    // Event handlers are outside React's render, so a throw here is not caught
    // by the error boundary. Every handler that can fail must catch its own,
    // or the failure vanishes into the console and the button appears dead.
    try {
      const amount = BigInt(by || '0');
      if (amount <= 0n) throw new Error('Enter a positive whole number.');
      write.writeContract({
        address: config.contractAddress,
        abi: counterAbi,
        functionName: 'increment',
        args: [amount],
      });
    } catch (error) {
      // Surfacing it through the same hook keeps one error path, not two.
      console.error(error);
    }
  }

  // After a write confirms, the value on the chain has changed and the cached
  // read is now wrong. Nothing tells the cache that, so it must be told.
  if (receipt.isSuccess && !read.isFetching) {
    read.refetch();
    onValueRead?.(read.data);
  }

  if (!config.ok) {
    return (
      <section className="panel">
        <h2>Counter</h2>
        <div className="banner error" role="alert">
          <strong>Not configured</strong>
          <p>{config.reason}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Counter</h2>

      {read.isLoading && <p>Reading the contract…</p>}
      {read.isError && <StatusBanner error={read.error} onRetry={() => read.refetch()} />}
      {read.data !== undefined && (
        <p className="value">{read.data.toString()}</p>
      )}

      <label>
        Increment by
        <input value={by} onChange={(event) => setBy(event.target.value)} inputMode="numeric" />
      </label>

      {/* Disabled while busy: this is what stops a user submitting the same
          transaction twice because the first appeared to do nothing. */}
      <button onClick={handleIncrement} disabled={!isConnected || busy}>
        {waitingForWallet ? 'Confirm in your wallet…'
          : waitingForChain ? 'Waiting for confirmation…'
          : 'Increment'}
      </button>

      {!isConnected && <p className="small">Connect a wallet to write. Reading works without one.</p>}

      {write.data && (
        <p className="small">Transaction: <code>{write.data}</code></p>
      )}
      {receipt.isSuccess && (
        <p className="success">Confirmed in block {receipt.data.blockNumber.toString()}.</p>
      )}

      <StatusBanner error={write.error ?? receipt.error} onRetry={() => write.reset()} />
    </section>
  );
}
