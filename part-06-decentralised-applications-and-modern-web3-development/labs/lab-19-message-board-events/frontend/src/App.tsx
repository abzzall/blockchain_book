import { useEffect, useMemo, useState } from "react";
import {
  useAccount, useConnect, useDisconnect, usePublicClient,
  useReadContract, useWaitForTransactionReceipt, useWatchContractEvent,
  useWriteContract, useBlockNumber,
} from "wagmi";
import { stringToHex, hexToString, trim } from "viem";
import { messageBoardAbi } from "./abi";
import {
  applyLogs, blockWindows, settle, validate, MAX_LENGTH, type Message,
} from "./feed";

const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}` | undefined;
const DEPLOY_BLOCK = BigInt(import.meta.env.VITE_DEPLOY_BLOCK ?? "0");
/** How far back from the head a block is treated as settled. On a local chain
 *  this is theatre; on a public one it is the difference between showing a
 *  message and showing a message that may vanish. */
const CONFIRMATIONS = 2n;
const WINDOW = 5000n;

const roomHex = (name: string) => stringToHex(name, { size: 32 });
const roomName = (hex: `0x${string}`) => {
  try { return hexToString(trim(hex, { dir: "right" })); } catch { return hex; }
};
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function App() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const client = usePublicClient();

  const [room, setRoom] = useState("general");
  const [text, setText] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");

  const { data: head } = useBlockNumber({ watch: true });
  const finalisedBelow = head === undefined ? 0n : head - CONFIRMATIONS;
  const roomTopic = useMemo(() => roomHex(room), [room]);

  const { data: count } = useReadContract({
    address: CONTRACT, abi: messageBoardAbi, functionName: "messageCount",
    query: { enabled: Boolean(CONTRACT) },
  });

  // ---- history -----------------------------------------------------------
  // One query per window, from the deployment block to the head. This is the
  // half a page cannot get from a view function: the contract stores no
  // message, so the only place the feed exists is the log.
  useEffect(() => {
    if (!client || !CONTRACT || head === undefined) return;
    let cancelled = false;
    (async () => {
      setScanning(true);
      setMessages([]);
      const windows = blockWindows(DEPLOY_BLOCK, head, WINDOW);
      let found: Message[] = [];
      for (const [fromBlock, toBlock] of windows) {
        if (cancelled) return;
        const logs = await client.getContractEvents({
          address: CONTRACT, abi: messageBoardAbi, eventName: "Posted",
          args: { room: roomTopic },
          fromBlock, toBlock,
        });
        found = applyLogs(found, logs as never, head - CONFIRMATIONS);
        if (!cancelled) {
          setMessages(found);
          setScanNote(`scanned to block ${toBlock} of ${head}`);
        }
      }
      if (!cancelled) {
        setScanning(false);
        setScanNote(`${windows.length} request${windows.length === 1 ? "" : "s"} from block ${DEPLOY_BLOCK} to ${head}`);
      }
    })().catch((error: unknown) => {
      // Look in the console. A failed getLogs is almost always the node
      // refusing the range, not a bug in this page.
      console.error("historical scan failed", error);
      setScanNote("scan failed — see the browser console");
      setScanning(false);
    });
    return () => { cancelled = true; };
    // Re-scan when the room changes. Deliberately not on every new block.
  }, [client, roomTopic]);

  // ---- live --------------------------------------------------------------
  // The subscription and the scan overlap on purpose: a gap between them would
  // silently lose messages, and applyLogs already refuses duplicates.
  useWatchContractEvent({
    address: CONTRACT, abi: messageBoardAbi, eventName: "Posted",
    args: { room: roomTopic },
    enabled: Boolean(CONTRACT),
    onLogs: (logs) => setMessages((current) => applyLogs(current, logs as never, finalisedBelow)),
    onError: (error) => console.error("subscription dropped", error),
  });

  // A message stops being provisional when the head has moved past it.
  useEffect(() => { setMessages((c) => settle(c, finalisedBelow)); }, [finalisedBelow]);

  // ---- writing -----------------------------------------------------------
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });
  useEffect(() => { if (confirmed) { setText(""); reset(); } }, [confirmed, reset]);

  const problem = text.length > 0 ? validate(text) : null;
  const visible = onlyMine && address
    ? messages.filter((m) => m.author.toLowerCase() === address.toLowerCase())
    : messages;

  if (!CONTRACT) {
    return <main><h1>Message board</h1>
      <p className="warn">Set <code>VITE_CONTRACT_ADDRESS</code> and <code>VITE_DEPLOY_BLOCK</code> in
      <code>.env.local</code>, then restart the dev server. Both are printed by
      <code>npm run deploy:local</code>.</p></main>;
  }

  return (
    <main>
      <h1>Message board</h1>
      <p className="lede">
        Every message below came from a log. The contract stores{" "}
        <strong>{count === undefined ? "…" : String(count)}</strong> as a counter and
        nothing else — no message is in its storage.
      </p>

      <section className="bar">
        {isConnected
          ? <><span>{short(address!)}</span><button onClick={() => disconnect()}>Disconnect</button></>
          : connectors.map((c) => (
              <button key={c.uid} onClick={() => connect({ connector: c })}>Connect {c.name}</button>
            ))}
        <label>room{" "}
          <input value={room} onChange={(e) => setRoom(e.target.value)} />
        </label>
        <label>
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          {" "}only mine
        </label>
      </section>

      <section>
        <textarea
          value={text} rows={3}
          placeholder={`Up to ${MAX_LENGTH} bytes`}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="row">
          <button
            disabled={!isConnected || isPending || confirming || text.length === 0 || problem !== null}
            onClick={() => writeContract({
              address: CONTRACT, abi: messageBoardAbi, functionName: "post",
              args: [roomTopic, text],
            })}
          >
            {isPending ? "Confirm in your wallet…" : confirming ? "Waiting for a block…" : "Post"}
          </button>
          {problem && <span className="warn">{problem}</span>}
          {writeError && <span className="warn">{writeError.message.split("\n")[0]}</span>}
        </div>
      </section>

      <section>
        <h2>
          Feed <small>{scanning ? "scanning…" : scanNote}</small>
        </h2>
        {visible.length === 0 && <p className="quiet">No messages in this room yet.</p>}
        <ul className="feed">
          {visible.map((m) => (
            <li key={m.key} className={m.pending ? "pending" : undefined}>
              <div className="meta">
                <code>{short(m.author)}</code>
                <span>#{String(m.id)}</span>
                <span>{roomName(m.room)}</span>
                <span>block {String(m.blockNumber)}</span>
                {m.pending && <em>not yet settled</em>}
              </div>
              <p>{m.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
