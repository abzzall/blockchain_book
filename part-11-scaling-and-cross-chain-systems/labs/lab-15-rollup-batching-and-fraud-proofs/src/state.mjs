import { createHash } from "node:crypto";

/**
 * The account state a rollup keeps off-chain. It is deliberately the smallest
 * thing that can be got wrong: balances and nonces, and a root committing to
 * both.
 */

export const sha256 = (data) => createHash("sha256").update(data).digest("hex");

export function emptyState() {
  return new Map();
}

export function fromBalances(balances) {
  return new Map(
    Object.entries(balances).map(([account, balance]) => [account, { balance, nonce: 0 }]),
  );
}

export function clone(state) {
  return new Map([...state].map(([account, entry]) => [account, { ...entry }]));
}

/**
 * An ordered commitment to every account. Sorting by name makes the root
 * independent of the order accounts were created in, so two operators that
 * processed the same transfers agree.
 */
export function stateRoot(state) {
  const body = [...state.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([account, { balance, nonce }]) => `${account}:${balance}:${nonce}`)
    .join("|");
  return sha256(body);
}

export class InvalidTransfer extends Error {}

/**
 * Apply one transfer. A transfer that breaks a rule throws rather than being
 * silently skipped: the whole point of the lab is that an operator who skips
 * the check produces a state root a challenger can disprove.
 */
export function applyTransfer(state, transfer) {
  const { from, to, amount, nonce } = transfer;
  const sender = state.get(from);
  if (!sender) throw new InvalidTransfer(`${from} has no account`);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new InvalidTransfer("an amount must be a positive integer");
  }
  if (nonce !== sender.nonce) {
    throw new InvalidTransfer(`nonce ${nonce} does not follow ${sender.nonce}`);
  }
  if (sender.balance < amount) {
    throw new InvalidTransfer(`${from} cannot afford ${amount}`);
  }
  sender.balance -= amount;
  sender.nonce += 1;
  const recipient = state.get(to) ?? { balance: 0, nonce: 0 };
  recipient.balance += amount;
  state.set(to, recipient);
  return state;
}

/** Apply an ordered list, returning the resulting state. */
export function applyAll(state, transfers) {
  for (const transfer of transfers) applyTransfer(state, transfer);
  return state;
}

export function totalSupply(state) {
  return [...state.values()].reduce((sum, { balance }) => sum + balance, 0);
}
