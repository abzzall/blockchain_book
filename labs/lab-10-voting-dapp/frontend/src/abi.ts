export const classElectionAbi = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "startsAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "endsAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "totalVotes", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "eligible", stateMutability: "view", inputs: [{ name: "voter", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "hasVoted", stateMutability: "view", inputs: [{ name: "voter", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "candidateCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "candidate", stateMutability: "view", inputs: [{ name: "candidateId", type: "uint256" }], outputs: [{ name: "record", type: "tuple", components: [{ name: "name", type: "string" }, { name: "voteCount", type: "uint256" }] }] },
  { type: "function", name: "vote", stateMutability: "nonpayable", inputs: [{ name: "candidateId", type: "uint256" }], outputs: [] },
  { type: "function", name: "setEligibility", stateMutability: "nonpayable", inputs: [{ name: "voters", type: "address[]" }, { name: "allowed", type: "bool" }], outputs: [] },
  { type: "function", name: "result", stateMutability: "view", inputs: [], outputs: [{ name: "winnerId", type: "uint256" }, { name: "tied", type: "bool" }] },
] as const;
