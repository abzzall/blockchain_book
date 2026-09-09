export const studentRegistryAbi = [
  { type: "function", name: "courseName", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "instructor", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "studentCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "getStudent", stateMutability: "view",
    inputs: [{ name: "student", type: "address" }],
    outputs: [{ name: "record", type: "tuple", components: [
      { name: "name", type: "string" }, { name: "score", type: "uint16" },
      { name: "updatedAt", type: "uint64" }, { name: "exists", type: "bool" },
    ] }],
  },
  {
    type: "function", name: "saveStudent", stateMutability: "nonpayable",
    inputs: [{ name: "student", type: "address" }, { name: "name", type: "string" }, { name: "score", type: "uint16" }],
    outputs: [],
  },
] as const;
