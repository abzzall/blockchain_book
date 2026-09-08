import { FormEvent, useMemo, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useConnect, useConnectors, useConnection, useDisconnect, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { classElectionAbi } from "./abi";

const configured = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
const address = isAddress(configured) ? getAddress(configured) : undefined;

function Candidate({ id, disabled, onVote }: { id: bigint; disabled: boolean; onVote: (id: bigint) => void }) {
  const query = useReadContract({ address, abi: classElectionAbi, functionName: "candidate", args: [id], query: { enabled: Boolean(address) } });
  return <article className="candidate"><span>Candidate {Number(id) + 1}</span><h3>{query.data?.name ?? "Loading…"}</h3><strong>{query.data?.voteCount.toString() ?? "—"} votes</strong><button disabled={disabled} onClick={() => onVote(id)}>Vote</button></article>;
}

export function App() {
  const connection = useConnection();
  const connectors = useConnectors();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [newVoter, setNewVoter] = useState("");
  const common = { address, abi: classElectionAbi } as const;
  const owner = useReadContract({ ...common, functionName: "owner", query: { enabled: Boolean(address) } });
  const starts = useReadContract({ ...common, functionName: "startsAt", query: { enabled: Boolean(address) } });
  const ends = useReadContract({ ...common, functionName: "endsAt", query: { enabled: Boolean(address) } });
  const total = useReadContract({ ...common, functionName: "totalVotes", query: { enabled: Boolean(address) } });
  const eligible = useReadContract({ ...common, functionName: "eligible", args: connection.address ? [connection.address] : undefined, query: { enabled: Boolean(address && connection.address) } });
  const voted = useReadContract({ ...common, functionName: "hasVoted", args: connection.address ? [connection.address] : undefined, query: { enabled: Boolean(address && connection.address) } });
  const voteWrite = useWriteContract();
  const eligibilityWrite = useWriteContract();
  const activeHash = voteWrite.data ?? eligibilityWrite.data;
  const receipt = useWaitForTransactionReceipt({ hash: activeHash });
  const isOwner = connection.address?.toLowerCase() === owner.data?.toLowerCase();
  const phase = useMemo(() => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (!starts.data || !ends.data) return "Loading schedule";
    if (now < starts.data) return "Not started";
    if (now >= ends.data) return "Closed";
    return "Voting open";
  }, [starts.data, ends.data, receipt.data]);
  const canVote = Boolean(connection.isConnected && eligible.data && !voted.data && phase === "Voting open");

  function vote(id: bigint) {
    if (address) voteWrite.writeContract({ address, abi: classElectionAbi, functionName: "vote", args: [id] });
  }
  function allow(event: FormEvent) {
    event.preventDefault();
    if (address && isAddress(newVoter)) eligibilityWrite.writeContract({ address, abi: classElectionAbi, functionName: "setEligibility", args: [[getAddress(newVoter)], true] });
  }
  const explorer = connection.chainId === 11155111 && activeHash ? `https://sepolia.etherscan.io/tx/${activeHash}` : undefined;

  return <main>
    <header><p className="eyebrow">Blockchain Handbook · Lab 6</p><h1>Class representative election</h1><p className="lede">A transparent teaching vote with explicit eligibility and one vote per address.</p></header>
    {!address && <p className="notice">Set `VITE_CONTRACT_ADDRESS` in `.env`, then restart Vite.</p>}
    <section className="bar"><div><span>Status</span><strong>{phase}</strong></div><div><span>Total votes</span><strong>{total.data?.toString() ?? "—"}</strong></div><div><span>Your eligibility</span><strong>{eligible.data ? "Eligible" : "Not eligible"}</strong></div><div><span>Your vote</span><strong>{voted.data ? "Recorded" : "Not cast"}</strong></div></section>
    <section className="wallet">
      {connection.isConnected ? <><code>{connection.address}</code><span>{connection.chain?.name ?? connection.chainId}</span><button className="quiet" onClick={() => disconnect()}>Disconnect</button></> : connectors.map((connector) => <button key={connector.uid} onClick={() => connect({ connector })}>Connect {connector.name}</button>)}
    </section>
    <section className="candidates"><Candidate id={0n} disabled={!canVote || voteWrite.isPending} onVote={vote} /><Candidate id={1n} disabled={!canVote || voteWrite.isPending} onVote={vote} /><Candidate id={2n} disabled={!canVote || voteWrite.isPending} onVote={vote} /></section>
    {isOwner && <form className="admin" onSubmit={allow}><div><span>Election owner</span><h2>Grant eligibility</h2></div><input aria-label="Voter address" value={newVoter} onChange={(e) => setNewVoter(e.target.value)} placeholder="0x…" /><button disabled={!isAddress(newVoter)}>Allow voter</button></form>}
    <section className="receipt"><h2>Transaction</h2>{!activeHash && <p>No transaction submitted in this session.</p>}{activeHash && <code>{activeHash}</code>}{receipt.isLoading && <p>Waiting for confirmation…</p>}{receipt.isSuccess && <p className="success">Confirmed in block {receipt.data.blockNumber.toString()}.</p>}{(voteWrite.error || eligibilityWrite.error) && <p className="error">{voteWrite.error?.message ?? eligibilityWrite.error?.message}</p>}{explorer && <a href={explorer} target="_blank" rel="noreferrer">Open in Sepolia explorer</a>}</section>
    <aside><strong>Scope warning:</strong> this classroom contract does not provide secret ballots, identity proofing, coercion resistance, voter privacy, accessible recovery, or governance legitimacy. It is not suitable for public elections.</aside>
  </main>;
}
