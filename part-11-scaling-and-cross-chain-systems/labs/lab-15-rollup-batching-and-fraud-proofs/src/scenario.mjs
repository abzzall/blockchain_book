import { fromBalances } from "./state.mjs";

/** The opening state and canonical batch every command and the marker share. */
export const OPENING = () => fromBalances({ alice: 100, bob: 50, carol: 0 });

export const TRANSFERS = [
  { from: "alice", to: "bob", amount: 30, nonce: 0 },
  { from: "bob", to: "carol", amount: 60, nonce: 0 },
  { from: "alice", to: "carol", amount: 10, nonce: 1 },
];

/** The tampering a dishonest operator applies to the post-state it claims. */
export const INFLATE_CAROL = (next) => {
  next.get("carol").balance += 1_000_000;
  return next;
};

export const CHALLENGE_WINDOW = 3;
