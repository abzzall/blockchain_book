import { MembershipService, UnknownIdentity } from "./identity.mjs";
import { satisfies } from "./endorsement.mjs";

/**
 * A channel: its own membership, its own ledger, its own world state.
 *
 * A channel is not a permission filter over one shared ledger. It is a separate
 * ledger, and an organisation outside it does not receive the data at all
 * rather than receiving it in a form it cannot read.
 */

export class NotAMember extends Error {}

/** A world-state entry carries a version, which is what makes conflicts detectable. */
class Entry {
  constructor(value, version = 0) {
    this.value = value;
    this.version = version;
  }
}

export class Channel {
  constructor(name, organisations, policy) {
    this.name = name;
    this.membership = new MembershipService(organisations);
    this.policy = policy;
    this.state = new Map();
    this.ledger = [];
  }

  /** Reading requires membership. A non-member is refused, not filtered. */
  read(identity, key) {
    this.requireMember(identity);
    return this.state.get(key)?.value;
  }

  requireMember(identity) {
    try {
      this.membership.validate(identity);
    } catch (error) {
      if (error instanceof UnknownIdentity) {
        throw new NotAMember(`${identity?.commonName ?? "(unknown)"} cannot access channel ${this.name}: ${error.message}`);
      }
      throw error;
    }
  }

  version(key) {
    return this.state.get(key)?.version ?? 0;
  }

  /**
   * Simulate a proposal against the current state. This is the "execute" of
   * execute--order--validate, and it produces a read set and a write set
   * without changing anything.
   */
  simulate(identity, chaincode) {
    this.requireMember(identity);
    const readSet = new Map();
    const writeSet = new Map();
    const context = {
      get: (key) => {
        readSet.set(key, this.version(key));
        return this.state.get(key)?.value;
      },
      put: (key, value) => {
        writeSet.set(key, value);
      },
    };
    chaincode(context);
    return { readSet, writeSet };
  }

  /**
   * Validate and commit an ordered transaction. Every transaction reaches the
   * ledger; an invalid one is recorded and marked, and its writes are not
   * applied.
   */
  commit(transaction) {
    const endorsingOrgs = transaction.endorsements.map((e) => e.org);
    let status = "valid";

    if (!this.divergenceFree(transaction)) {
      status = "ENDORSEMENT_MISMATCH";
    } else if (!satisfies(this.policy, endorsingOrgs)) {
      status = "ENDORSEMENT_POLICY_FAILURE";
    } else if (!this.readSetCurrent(transaction.readSet)) {
      status = "MVCC_READ_CONFLICT";
    }

    if (status === "valid") {
      for (const [key, value] of transaction.writeSet) {
        this.state.set(key, new Entry(value, this.version(key) + 1));
      }
    }

    const record = { ...transaction, status, sequence: this.ledger.length };
    this.ledger.push(record);
    return record;
  }

  /** Every endorsing peer must have produced the same write set. */
  divergenceFree(transaction) {
    const encode = (writeSet) => JSON.stringify([...writeSet].sort());
    const first = encode(transaction.endorsements[0]?.writeSet ?? new Map());
    return transaction.endorsements.every((e) => encode(e.writeSet) === first);
  }

  /** Nothing read during simulation may have changed since. */
  readSetCurrent(readSet) {
    for (const [key, version] of readSet) {
      if (this.version(key) !== version) return false;
    }
    return true;
  }
}

/**
 * The ordering service. It places transactions in an order and does nothing
 * else: it never executes them and never validates them.
 */
export class OrderingService {
  constructor() {
    this.blocks = [];
  }

  orderBlock(transactions) {
    const block = { number: this.blocks.length, transactions: [...transactions] };
    this.blocks.push(block);
    return block;
  }
}

/** Collect an endorsement from one organisation's peer. */
export function endorse(channel, identity, chaincode) {
  const org = channel.membership.validate(identity);
  const { readSet, writeSet } = channel.simulate(identity, chaincode);
  return { org, by: identity.commonName, readSet, writeSet };
}

/** Assemble a transaction from endorsements gathered for one proposal. */
export function assemble(endorsements) {
  if (endorsements.length === 0) throw new Error("a transaction needs at least one endorsement");
  return {
    endorsements,
    readSet: endorsements[0].readSet,
    writeSet: endorsements[0].writeSet,
  };
}
