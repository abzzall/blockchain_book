/**
 * Membership, as a permissioned network understands it.
 *
 * On a public chain an identity is a key pair and nothing more: anybody may
 * generate one and no authority is consulted. Here the opposite holds. An
 * identity is issued by an organisation's certificate authority, and the
 * question a peer asks is not "is this signature valid?" but "is this identity
 * one my membership service recognises, and which organisation does it belong
 * to?"
 */

export class UnknownIdentity extends Error {}

/** One organisation's certificate authority and its issued identities. */
export class Organisation {
  constructor(name) {
    this.name = name;
    this.issued = new Map();
    this.revoked = new Set();
  }

  /** Issue an identity. Nothing self-generated is ever valid. */
  enrol(commonName, role = "client") {
    const identity = { org: this.name, commonName, role, serial: this.issued.size + 1 };
    this.issued.set(commonName, identity);
    return identity;
  }

  revoke(commonName) {
    this.revoked.add(commonName);
    return this;
  }

  recognises(identity) {
    return (
      identity?.org === this.name &&
      this.issued.get(identity.commonName)?.serial === identity.serial &&
      !this.revoked.has(identity.commonName)
    );
  }
}

/**
 * The membership service for a channel: the set of organisations whose
 * identities that channel accepts.
 */
export class MembershipService {
  constructor(organisations) {
    this.organisations = new Map(organisations.map((o) => [o.name, o]));
  }

  /** Returns the organisation an identity belongs to, or throws. */
  validate(identity) {
    const organisation = this.organisations.get(identity?.org);
    if (!organisation || !organisation.recognises(identity)) {
      throw new UnknownIdentity(
        `identity ${identity?.commonName ?? "(none)"} of ${identity?.org ?? "(no org)"} is not recognised here`,
      );
    }
    return organisation.name;
  }

  isMember(identity) {
    try {
      this.validate(identity);
      return true;
    } catch {
      return false;
    }
  }
}
