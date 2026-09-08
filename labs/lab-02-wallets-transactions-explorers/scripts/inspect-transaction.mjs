import { createPublicClient, http } from "viem";
import { summarizeTransaction } from "../src/summarize-receipt.mjs";

const rpcUrl = process.env.RPC_URL;
const transactionHash = process.argv[2];

if (!rpcUrl || !/^https?:\/\//u.test(rpcUrl)) {
  console.error("Set RPC_URL to the HTTPS endpoint for the same testnet.");
  process.exit(1);
}
if (!/^0x[0-9a-fA-F]{64}$/u.test(transactionHash ?? "")) {
  console.error("Usage: npm run inspect -- 0x<64-hex-character-transaction-hash>");
  process.exit(1);
}

const client = createPublicClient({ transport: http(rpcUrl) });
const transaction = await client.getTransaction({ hash: transactionHash });
const receipt = await client.getTransactionReceipt({ hash: transactionHash });
const block = await client.getBlock({ blockHash: receipt.blockHash });

console.log(JSON.stringify(summarizeTransaction(transaction, receipt, block), null, 2));
