// The ABI carries the events as well as the functions.
//
// This is the part lab 5 deliberately left out. A frontend cannot decode a log
// it has no ABI entry for: the topics are hashes and the data is opaque bytes,
// and without the entry there is nothing to say how to read them. An ABI that
// lists only functions produces a page that can write and cannot observe.
export const messageBoardAbi = [
  {
    type: "function", name: "post", stateMutability: "nonpayable",
    inputs: [{ name: "room", type: "bytes32" }, { name: "text", type: "string" }],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function", name: "postTagged", stateMutability: "nonpayable",
    inputs: [
      { name: "room", type: "bytes32" },
      { name: "text", type: "string" },
      { name: "tag", type: "string" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function", name: "messageCount", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    type: "function", name: "MAX_LENGTH", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }],
  },
  {
    type: "event", name: "Posted",
    inputs: [
      { name: "author", type: "address", indexed: true },
      { name: "room", type: "bytes32", indexed: true },
      { name: "id", type: "uint256", indexed: true },
      { name: "text", type: "string", indexed: false },
    ],
  },
  {
    type: "event", name: "Tagged",
    inputs: [
      { name: "tag", type: "string", indexed: true },
      { name: "id", type: "uint256", indexed: true },
    ],
  },
  // Declaring the errors lets the library name them when a call reverts.
  { type: "error", name: "EmptyMessage", inputs: [] },
  {
    type: "error", name: "MessageTooLong",
    inputs: [{ name: "length", type: "uint256" }, { name: "maximum", type: "uint256" }],
  },
] as const;
