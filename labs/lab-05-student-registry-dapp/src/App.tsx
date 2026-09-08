import { FormEvent, useState } from "react";
import { getAddress, isAddress } from "viem";
import {
  useConnect, useConnectors, useConnection, useDisconnect, useReadContract,
  useWaitForTransactionReceipt, useWriteContract,
} from "wagmi";
import { studentRegistryAbi } from "./abi";
import { parseStudent } from "./validation";

const rawAddress = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
const contractAddress = isAddress(rawAddress) ? getAddress(rawAddress) : undefined;

export function App() {
  const connection = useConnection();
  const connectors = useConnectors();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [lookup, setLookup] = useState("");
  const [formError, setFormError] = useState("");
  const [student, setStudent] = useState("");
  const [name, setName] = useState("");
  const [score, setScore] = useState("85");

  const course = useReadContract({ address: contractAddress, abi: studentRegistryAbi, functionName: "courseName", query: { enabled: Boolean(contractAddress) } });
  const instructor = useReadContract({ address: contractAddress, abi: studentRegistryAbi, functionName: "instructor", query: { enabled: Boolean(contractAddress) } });
  const count = useReadContract({ address: contractAddress, abi: studentRegistryAbi, functionName: "studentCount", query: { enabled: Boolean(contractAddress) } });
  const record = useReadContract({
    address: contractAddress, abi: studentRegistryAbi, functionName: "getStudent",
    args: isAddress(lookup) ? [getAddress(lookup)] : undefined,
    query: { enabled: Boolean(contractAddress && isAddress(lookup)), retry: false },
  });
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setFormError("");
      if (!contractAddress) throw new Error("Set VITE_CONTRACT_ADDRESS first.");
      const input = parseStudent(student, name, score);
      write.writeContract({ address: contractAddress, abi: studentRegistryAbi, functionName: "saveStudent", args: [input.address, input.name, input.score] });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Invalid form values.");
    }
  }

  const explorer = connection.chainId === 11155111 && write.data
    ? `https://sepolia.etherscan.io/tx/${write.data}` : undefined;

  return <main>
    <header><p className="eyebrow">Blockchain Handbook · Lab 3</p><h1>Student Registry</h1></header>
    {!contractAddress && <p className="notice">Copy `.env.example` to `.env` and set the deployed contract address.</p>}
    <section className="card wallet">
      <h2>Wallet</h2>
      {connection.isConnected ? <>
        <p><strong>Account:</strong> <code>{connection.address}</code></p>
        <p><strong>Network:</strong> {connection.chain?.name ?? connection.chainId}</p>
        <button className="secondary" onClick={() => disconnect()}>Disconnect</button>
      </> : connectors.map((connector) => <button key={connector.uid} disabled={isConnecting} onClick={() => connect({ connector })}>Connect {connector.name}</button>)}
    </section>
    <section className="metrics">
      <article><span>Course</span><strong>{course.data ?? "—"}</strong></article>
      <article><span>Students</span><strong>{count.data?.toString() ?? "—"}</strong></article>
      <article><span>Instructor</span><strong className="compact">{instructor.data ?? "—"}</strong></article>
    </section>
    <section className="grid">
      <form className="card" onSubmit={submit}>
        <h2>Save student</h2>
        <label>Student address<input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="0x…" /></label>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aruzhan" /></label>
        <label>Score<input value={score} onChange={(e) => setScore(e.target.value)} inputMode="numeric" /></label>
        <button disabled={!connection.isConnected || write.isPending}>{write.isPending ? "Confirm in wallet…" : "Save on-chain"}</button>
        {(formError || write.error) && <p className="error">{formError || write.error?.message}</p>}
        {write.data && <p className="hash">Transaction: <code>{write.data}</code></p>}
        {receipt.isLoading && <p>Waiting for confirmation…</p>}
        {receipt.isSuccess && <p className="success">Confirmed in block {receipt.data.blockNumber.toString()}.</p>}
        {explorer && <a href={explorer} target="_blank" rel="noreferrer">Open in Sepolia explorer</a>}
      </form>
      <section className="card">
        <h2>Look up student</h2>
        <label>Student address<input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="0x…" /></label>
        <button className="secondary" disabled={!isAddress(lookup)} onClick={() => record.refetch()}>Refresh</button>
        {record.data && <dl><dt>Name</dt><dd>{record.data.name}</dd><dt>Score</dt><dd>{record.data.score}</dd><dt>Updated</dt><dd>{new Date(Number(record.data.updatedAt) * 1000).toLocaleString()}</dd></dl>}
        {record.error && <p className="error">No saved record at this address.</p>}
      </section>
    </section>
  </main>;
}
