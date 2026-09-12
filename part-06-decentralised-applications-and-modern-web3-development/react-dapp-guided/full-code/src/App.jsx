/**
 * Composition, and how data moves between components.
 *
 * There are three ways to get a value from one component to another, and the
 * right one depends on what the value is.
 *
 * 1. PROPS, for a value one component owns and another needs.
 *    Below, `lastSeen` is owned here and passed down. A child never reaches
 *    up; it is handed what it needs, and hands back events through a callback
 *    prop (`onValueRead`). This is the default and covers most cases.
 *
 * 2. CONTEXT, for something the whole tree needs.
 *    The wallet connection and the query cache are exactly that, which is why
 *    they are providers in main.jsx rather than props threaded through every
 *    level. Passing the account address down four levels by hand is the
 *    mistake context exists to prevent.
 *
 * 3. THE CACHE, for anything that came from the chain.
 *    Chain data needs no passing at all. Any component may call
 *    useReadContract for the same value and will get the same cached result,
 *    without this component knowing it happened. Two panels showing one balance
 *    cannot drift apart, because there is only one copy.
 *
 * The failure this structure prevents is the common one: reading a value in a
 * parent, copying it into useState, passing the copy down, and then having the
 * copy go stale when the chain moves. Do not copy chain data into state.
 */
import { useState } from 'react';
import { WalletPanel } from './components/WalletPanel.jsx';
import { CounterPanel } from './components/CounterPanel.jsx';

export function App() {
  // Genuinely local UI state: a note about what this session has observed.
  // It is not chain data, so it is allowed to live here.
  const [lastSeen, setLastSeen] = useState(null);

  return (
    <main>
      <header>
        <h1>Counter dApp</h1>
        <p>A minimal interface over one contract, built to show the boundary between a page and a chain.</p>
      </header>

      <WalletPanel />

      {/* The callback prop is how a child reports an event upward. It does not
          hand the child a setter for this component's state; it hands it a
          named thing it may do, which keeps the child unaware of how the
          parent stores anything. */}
      <CounterPanel onValueRead={(value) => setLastSeen(value ?? null)} />

      {lastSeen !== undefined && lastSeen !== null && (
        <p className="small">Highest value seen this session: {lastSeen.toString()}</p>
      )}

      <footer className="small">
        <p>
          The contract enforces its own rules. Everything this page checks before
          sending is a convenience for the user, not a control: a page cannot
          prevent anybody from calling the contract directly.
        </p>
      </footer>
    </main>
  );
}
