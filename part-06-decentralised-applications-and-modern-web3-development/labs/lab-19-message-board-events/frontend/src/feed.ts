// The feed, as data rather than as a component.
//
// Everything here is a pure function of logs. It is kept out of App.tsx so that
// the rules a reader most needs to get right -- merging history with live
// arrivals, not showing a message twice, and removing one that was
// reorganised out -- can be tested without a browser, a wallet, or a chain.

export type Message = {
  /** transaction hash plus log index: unique for a log, and stable */
  key: string;
  author: `0x${string}`;
  room: `0x${string}`;
  id: bigint;
  text: string;
  blockNumber: bigint;
  logIndex: number;
  /** false once the block is old enough to be treated as settled */
  pending: boolean;
};

type RawLog = {
  transactionHash: `0x${string}` | null;
  logIndex: number | null;
  blockNumber: bigint | null;
  removed?: boolean;
  args: { author?: `0x${string}`; room?: `0x${string}`; id?: bigint; text?: string };
};

/** A log is identified by where it sits, not by what it says. Two identical
 *  messages are two messages; the same log delivered twice is one. */
export function keyOf(log: { transactionHash: string | null; logIndex: number | null }): string {
  return `${log.transactionHash ?? "pending"}:${log.logIndex ?? 0}`;
}

export function toMessage(log: RawLog, finalisedBelow: bigint): Message | null {
  const { author, room, id, text } = log.args;
  if (author === undefined || room === undefined || id === undefined || text === undefined) {
    return null;
  }
  const blockNumber = log.blockNumber ?? 0n;
  return {
    key: keyOf(log),
    author, room, id, text,
    blockNumber,
    logIndex: log.logIndex ?? 0,
    pending: blockNumber > finalisedBelow,
  };
}

/** Newest first, and deterministic: a block can hold several logs, so the log
 *  index breaks the tie rather than arrival order. */
export function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort((a, b) =>
    a.blockNumber === b.blockNumber
      ? b.logIndex - a.logIndex
      : Number(b.blockNumber - a.blockNumber),
  );
}

/**
 * Fold a batch of logs into the feed.
 *
 * Three things have to be right, and each of them is a real failure people ship:
 *
 *  - A log already present is not added again. The historical query and the
 *    live subscription overlap by design, because the alternative is a gap.
 *  - A log marked `removed` is taken out. The chain reorganised and that
 *    message is no longer in the accepted history. It may well come back in a
 *    later block, with a different block number, which is why removal is by key.
 *  - The result is sorted, so the feed does not depend on which arrived first.
 */
export function applyLogs(
  current: Message[],
  logs: RawLog[],
  finalisedBelow: bigint,
): Message[] {
  const byKey = new Map(current.map((m) => [m.key, m]));
  for (const log of logs) {
    const key = keyOf(log);
    if (log.removed) {
      byKey.delete(key);
      continue;
    }
    const message = toMessage(log, finalisedBelow);
    if (message) byKey.set(key, message);
  }
  return sortMessages([...byKey.values()]);
}

/** Re-evaluate which messages still count as pending, as the head advances. */
export function settle(messages: Message[], finalisedBelow: bigint): Message[] {
  return messages.map((m) => (m.pending && m.blockNumber <= finalisedBelow ? { ...m, pending: false } : m));
}

export const MAX_LENGTH = 280;

export function validate(text: string): string | null {
  if (text.length === 0) return "A message cannot be empty.";
  // The contract counts bytes, not characters. One emoji is four bytes, so a
  // page that counts characters will let through a message the contract
  // rejects -- and the user sees a revert they were given no warning of.
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_LENGTH) return `That is ${bytes} bytes; the limit is ${MAX_LENGTH}.`;
  return null;
}

/** Split a range into windows. A node will refuse one enormous getLogs, so a
 *  historical scan is a loop, and on a public chain it is a long one. */
export function blockWindows(from: bigint, to: bigint, size: bigint): Array<[bigint, bigint]> {
  if (size <= 0n || to < from) return [];
  const windows: Array<[bigint, bigint]> = [];
  for (let start = from; start <= to; start += size) {
    const end = start + size - 1n;
    windows.push([start, end > to ? to : end]);
  }
  return windows;
}
