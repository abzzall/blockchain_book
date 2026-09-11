import { FormEvent, useEffect, useState } from "react";
import { encodeFunctionData, getAddress, isAddress } from "viem";
import {
  useConnect, useConnectors, useConnection, useDisconnect,
  useReadContract, useWaitForTransactionReceipt, useWriteContract,
} from "wagmi";
import { governanceAbi, parametersAbi, PROPOSAL_STATES } from "./abi";

const configuredDao = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
const configuredParams = import.meta.env.VITE_PARAMETERS_ADDRESS ?? "";
const address = isAddress(configuredDao) ? getAddress(configuredDao) : undefined;
const parametersAddress = isAddress(configuredParams) ? getAddress(configuredParams) : undefined;

const ZERO = "0x0000000000000000000000000000000000000000" as const;

function short(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function Proposal({ id, voter }: { id: bigint; voter?: `0x${string}` }) {
  const common = { address, abi: governanceAbi } as const;
  const record = useReadContract({ ...common, functionName: "proposal", args: [id], query: { enabled: Boolean(address) } });
  const state = useReadContract({ ...common, functionName: "state", args: [id], query: { enabled: Boolean(address) } });
  const voted = useReadContract({
    ...common, functionName: "hasVoted", args: voter ? [id, voter] : undefined,
    query: { enabled: Boolean(address && voter) },
  });
  const weight = useReadContract({
    ...common, functionName: "getPastVotes",
    args: voter && record.data ? [voter, record.data.snapshotBlock] : undefined,
    query: { enabled: Boolean(address && voter && record.data) },
  });
  const action = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: action.data,
    query: { enabled: Boolean(action.data) },
  });
  // Re-read this proposal once a vote, queue, or execution confirms.
  const { refetch: refetchRecord } = record;
  const { refetch: refetchState } = state;
  const { refetch: refetchVoted } = voted;
  useEffect(() => {
    if (!receipt.isSuccess) return;
    void refetchRecord();
    void refetchState();
    void refetchVoted();
  }, [receipt.isSuccess, refetchRecord, refetchState, refetchVoted]);

  const p = record.data;
  const label = state.data === undefined ? "…" : PROPOSAL_STATES[state.data] ?? "Unknown";
  const eligibleWeight = weight.data ?? 0n;
  const canVote = label === "Active" && !voted.data && eligibleWeight > 0n;

  function send(functionName: "castVote" | "queue" | "execute", support?: boolean) {
    if (!address) return;
    if (functionName === "castVote") {
      action.writeContract({ address, abi: governanceAbi, functionName, args: [id, support!] });
    } else {
      action.writeContract({ address, abi: governanceAbi, functionName, args: [id] });
    }
  }

  if (!p) return <article className="proposal"><p>Loading proposal {id.toString()}…</p></article>;

  const cast = p.forVotes + p.againstVotes;
  const executableIn = p.executableAt === 0n
    ? undefined
    : Number(p.executableAt) - Math.floor(Date.now() / 1000);

  return <article className="proposal">
    <header>
      <span className="badge">#{id.toString()}</span>
      <span className={`state state-${label.toLowerCase()}`}>{label}</span>
    </header>
    <h3>{p.description}</h3>

    <dl className="tally">
      <div><dt>For</dt><dd>{p.forVotes.toString()}</dd></div>
      <div><dt>Against</dt><dd>{p.againstVotes.toString()}</dd></div>
      <div><dt>Cast</dt><dd>{cast.toString()}</dd></div>
      <div><dt>Snapshot block</dt><dd>{p.snapshotBlock.toString()}</dd></div>
      <div><dt>Your weight on this</dt><dd>{eligibleWeight.toString()}</dd></div>
    </dl>

    {/* The description above was written by whoever submitted the proposal.
        This is what will actually run. Show both, always. */}
    <details className="payload" open={label === "Queued"}>
      <summary>What this proposal will execute</summary>
      <p>Target</p>
      <code>{p.target === ZERO ? "none — this proposal calls nothing" : p.target}</code>
      <p>Calldata</p>
      <code className="calldata">{p.callData === "0x" ? "empty" : p.callData}</code>
      <p className="warn">
        The title is a human-readable claim. The target and calldata are what the
        chain will run. A voter who has read only the title has verified nothing.
      </p>
    </details>

    <footer>
      {canVote && <>
        <button onClick={() => send("castVote", true)} disabled={action.isPending}>Vote for</button>
        <button className="quiet" onClick={() => send("castVote", false)} disabled={action.isPending}>Vote against</button>
      </>}
      {voted.data && <span className="note">Your vote is recorded.</span>}
      {label === "Active" && eligibleWeight === 0n && !voted.data &&
        <span className="note">You had no voting power at block {p.snapshotBlock.toString()}.</span>}
      {label === "Succeeded" && <button onClick={() => send("queue")} disabled={action.isPending}>Queue</button>}
      {label === "Queued" && <>
        <button onClick={() => send("execute")} disabled={action.isPending || (executableIn ?? 0) > 0}>Execute</button>
        <span className="note">
          {(executableIn ?? 0) > 0
            ? `Timelock: ${executableIn} s remaining. Anyone who objects can still act.`
            : "The delay has elapsed. Anyone may execute this."}
        </span>
      </>}
      {action.error && <span className="error">{action.error.message.split("\n")[0]}</span>}
    </footer>
  </article>;
}

export function App() {
  const connection = useConnection();
  const connectors = useConnectors();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [delegatee, setDelegatee] = useState("");
  const [title, setTitle] = useState("");
  const [fee, setFee] = useState("75");

  const common = { address, abi: governanceAbi } as const;
  const enabled = Boolean(address);
  const withAccount = Boolean(address && connection.address);

  const supply = useReadContract({ ...common, functionName: "totalSupply", query: { enabled } });
  const quorum = useReadContract({ ...common, functionName: "quorumVotes", query: { enabled } });
  const threshold = useReadContract({ ...common, functionName: "proposalThreshold", query: { enabled } });
  const delay = useReadContract({ ...common, functionName: "timelockDelay", query: { enabled } });
  const count = useReadContract({ ...common, functionName: "proposalCount", query: { enabled } });
  const balance = useReadContract({
    ...common, functionName: "balanceOf", args: connection.address ? [connection.address] : undefined,
    query: { enabled: withAccount },
  });
  const votes = useReadContract({
    ...common, functionName: "getVotes", args: connection.address ? [connection.address] : undefined,
    query: { enabled: withAccount },
  });
  const delegatedTo = useReadContract({
    ...common, functionName: "delegates", args: connection.address ? [connection.address] : undefined,
    query: { enabled: withAccount },
  });
  const currentFee = useReadContract({
    address: parametersAddress, abi: parametersAbi, functionName: "feeBasisPoints",
    query: { enabled: Boolean(parametersAddress) },
  });

  const delegateWrite = useWriteContract();
  const proposeWrite = useWriteContract();
  const activeHash = delegateWrite.data ?? proposeWrite.data;
  const receipt = useWaitForTransactionReceipt({ hash: activeHash, query: { enabled: Boolean(activeHash) } });

  function submitDelegate(event: FormEvent) {
    event.preventDefault();
    if (address && isAddress(delegatee)) {
      delegateWrite.writeContract({ address, abi: governanceAbi, functionName: "delegate", args: [getAddress(delegatee)] });
    }
  }
  function delegateToSelf() {
    if (address && connection.address) {
      delegateWrite.writeContract({ address, abi: governanceAbi, functionName: "delegate", args: [connection.address] });
    }
  }
  function submitProposal(event: FormEvent) {
    event.preventDefault();
    if (!address || !parametersAddress) return;
    const callData = encodeFunctionData({
      abi: parametersAbi, functionName: "setFee", args: [BigInt(fee || "0")],
    });
    proposeWrite.writeContract({
      address, abi: governanceAbi, functionName: "propose",
      args: [title || `Set the fee to ${fee} basis points`, parametersAddress, callData],
    });
  }

  const { refetch: refetchCount } = count;
  useEffect(() => {
    if (receipt.isSuccess) void refetchCount();
  }, [receipt.isSuccess, refetchCount]);

  const total = count.data ? Number(count.data) : 0;
  const ids = Array.from({ length: total }, (_, i) => BigInt(total - 1 - i));
  const hasPower = (votes.data ?? 0n) > 0n;
  const canPropose = hasPower && (votes.data ?? 0n) >= (threshold.data ?? 0n);

  return <main>
    <header>
      <p className="eyebrow">Blockchain Textbook · Chapter 36</p>
      <h1>Governance</h1>
      <p className="lede">
        Voting power, proposals, quorum, and execution after a delay — the four parts,
        driven from a wallet.
      </p>
    </header>

    {!address && <p className="notice">
      Set <code>VITE_CONTRACT_ADDRESS</code> and <code>VITE_PARAMETERS_ADDRESS</code> in
      <code>.env</code>, then restart Vite.
    </p>}

    <section className="wallet">
      {connection.isConnected
        ? <><code>{connection.address}</code><span>{connection.chain?.name ?? connection.chainId}</span>
            <button className="quiet" onClick={() => disconnect()}>Disconnect</button></>
        : connectors.map((c) => <button key={c.uid} onClick={() => connect({ connector: c })}>Connect {c.name}</button>)}
    </section>

    <section className="bar">
      <div><span>Your tokens</span><strong>{balance.data?.toString() ?? "—"}</strong></div>
      <div><span>Your voting power</span><strong>{votes.data?.toString() ?? "—"}</strong></div>
      <div><span>Total supply</span><strong>{supply.data?.toString() ?? "—"}</strong></div>
      <div><span>Quorum</span><strong>{quorum.data?.toString() ?? "—"} cast</strong></div>
      <div><span>Timelock</span><strong>{delay.data?.toString() ?? "—"} s</strong></div>
      <div><span>Protocol fee</span><strong>{currentFee.data?.toString() ?? "—"} bp</strong></div>
    </section>

    {connection.isConnected && !hasPower && <p className="notice">
      You hold {balance.data?.toString() ?? "0"} tokens and have {votes.data?.toString() ?? "0"} voting
      power. Holding is not voting: you must delegate — to yourself or to somebody
      else — before your tokens count.
    </p>}

    <section className="delegation">
      <h2>Delegation</h2>
      <p>
        Delegating moves your voting power. It does not move your tokens, and you can
        change or revoke it at any time.
      </p>
      <p className="current">
        Currently delegated to:{" "}
        <code>{delegatedTo.data && delegatedTo.data !== ZERO
          ? (delegatedTo.data === connection.address ? "yourself" : short(delegatedTo.data))
          : "nobody"}</code>
      </p>
      <form onSubmit={submitDelegate}>
        <input aria-label="Delegate address" value={delegatee} placeholder="0x…"
               onChange={(e) => setDelegatee(e.target.value)} />
        <button disabled={!isAddress(delegatee) || delegateWrite.isPending}>Delegate</button>
        <button type="button" className="quiet" onClick={delegateToSelf} disabled={!connection.isConnected}>
          Delegate to myself
        </button>
      </form>
    </section>

    <section className="propose">
      <h2>New proposal</h2>
      <p>
        A proposal is a description plus a call. The snapshot is taken when you submit,
        so voting power acquired afterwards cannot be used on it.
      </p>
      <form onSubmit={submitProposal}>
        <input aria-label="Proposal title" value={title} placeholder="What this proposal claims to do"
               onChange={(e) => setTitle(e.target.value)} />
        <input aria-label="Fee in basis points" value={fee} inputMode="numeric"
               onChange={(e) => setFee(e.target.value.replace(/[^0-9]/g, ""))} />
        <button disabled={!canPropose || proposeWrite.isPending}>Propose</button>
      </form>
      {connection.isConnected && !canPropose && <p className="note">
        Proposing needs at least {threshold.data?.toString() ?? "—"} voting power. You have {votes.data?.toString() ?? "0"}.
      </p>}
      <p className="note">
        The title and the call are independent. Nothing forces them to agree, which is
        the point of showing both on every proposal below.
      </p>
    </section>

    <section className="proposals">
      <h2>Proposals</h2>
      {total === 0 && <p>No proposals yet.</p>}
      {ids.map((id) => <Proposal key={id.toString()} id={id} voter={connection.address} />)}
    </section>

    <section className="receipt">
      <h2>Transaction</h2>
      {!activeHash && <p>No delegation or proposal submitted in this session.</p>}
      {activeHash && <code>{activeHash}</code>}
      {receipt.isLoading && <p>Waiting for confirmation…</p>}
      {receipt.isSuccess && <p className="success">Confirmed in block {receipt.data.blockNumber.toString()}.</p>}
      {(delegateWrite.error || proposeWrite.error) &&
        <p className="error">{(delegateWrite.error ?? proposeWrite.error)!.message.split("\n")[0]}</p>}
    </section>

    <aside>
      <strong>Scope warning:</strong> this teaching contract weights votes by token
      balance, establishes no identity, keeps no ballot secret, and has no route to
      cancel a passed proposal. It shows how the mechanism works, not how to run an
      organization.
    </aside>
  </main>;
}
