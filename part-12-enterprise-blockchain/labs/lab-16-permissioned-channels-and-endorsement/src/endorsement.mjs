/**
 * Endorsement policies.
 *
 * A policy is a small expression over organisation names. It says whose
 * agreement a transaction needs before the network will accept it, which is the
 * permissioned equivalent of asking how much of the hash rate or stake agreed.
 *
 * Leaves are organisation names; the combinators are AND, OR, and OUT-OF.
 */

export const and = (...terms) => ({ kind: "and", terms });
export const or = (...terms) => ({ kind: "or", terms });
export const outOf = (n, ...terms) => ({ kind: "outOf", n, terms });

/** Does the set of endorsing organisations satisfy the policy? */
export function satisfies(policy, endorsingOrgs) {
  const orgs = new Set(endorsingOrgs);
  const evaluate = (node) => {
    if (typeof node === "string") return orgs.has(node);
    switch (node.kind) {
      case "and":
        return node.terms.every(evaluate);
      case "or":
        return node.terms.some(evaluate);
      case "outOf":
        return node.terms.filter(evaluate).length >= node.n;
      default:
        throw new Error(`unknown policy node ${JSON.stringify(node)}`);
    }
  };
  return evaluate(policy);
}

/** A readable rendering, for the command-line output. */
export function describe(policy) {
  if (typeof policy === "string") return policy;
  switch (policy.kind) {
    case "and":
      return `(${policy.terms.map(describe).join(" AND ")})`;
    case "or":
      return `(${policy.terms.map(describe).join(" OR ")})`;
    case "outOf":
      return `${policy.n}-of(${policy.terms.map(describe).join(", ")})`;
    default:
      throw new Error("unknown policy node");
  }
}
