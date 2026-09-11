export const governanceAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "delegates", stateMutability: "view", inputs: [{ name: "holder", type: "address" }], outputs: [{ type: "address" }] },
  { type: "function", name: "getVotes", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getPastVotes", stateMutability: "view", inputs: [{ name: "account", type: "address" }, { name: "blockNumber", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "quorumVotes", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "proposalThreshold", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "votingPeriod", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "timelockDelay", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "proposalCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "hasVoted", stateMutability: "view", inputs: [{ name: "proposalId", type: "uint256" }, { name: "voter", type: "address" }], outputs: [{ type: "bool" }] },
  {
    type: "function", name: "proposal", stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{
      name: "record", type: "tuple", components: [
        { name: "proposer", type: "address" },
        { name: "description", type: "string" },
        { name: "target", type: "address" },
        { name: "callData", type: "bytes" },
        { name: "snapshotBlock", type: "uint256" },
        { name: "voteEnd", type: "uint256" },
        { name: "forVotes", type: "uint256" },
        { name: "againstVotes", type: "uint256" },
        { name: "executableAt", type: "uint256" },
        { name: "queued", type: "bool" },
        { name: "executed", type: "bool" },
      ],
    }],
  },
  { type: "function", name: "state", stateMutability: "view", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [{ type: "uint8" }] },
  { type: "function", name: "delegate", stateMutability: "nonpayable", inputs: [{ name: "delegatee", type: "address" }], outputs: [] },
  { type: "function", name: "propose", stateMutability: "nonpayable", inputs: [{ name: "description", type: "string" }, { name: "target", type: "address" }, { name: "callData", type: "bytes" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "castVote", stateMutability: "nonpayable", inputs: [{ name: "proposalId", type: "uint256" }, { name: "support", type: "bool" }], outputs: [] },
  { type: "function", name: "queue", stateMutability: "nonpayable", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [] },
  { type: "function", name: "execute", stateMutability: "nonpayable", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [{ type: "bytes" }] },
] as const;

export const parametersAbi = [
  { type: "function", name: "feeBasisPoints", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "governor", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "setFee", stateMutability: "nonpayable", inputs: [{ name: "newFeeBasisPoints", type: "uint256" }], outputs: [] },
] as const;

/// The proposal states, in the order the contract's enum declares them.
export const PROPOSAL_STATES = ["Active", "Defeated", "Succeeded", "Queued", "Executed"] as const;
