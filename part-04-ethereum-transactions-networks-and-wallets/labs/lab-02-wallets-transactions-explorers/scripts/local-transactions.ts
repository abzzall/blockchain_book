import { network } from "hardhat";
import { formatEther } from "viem";
import { summarizeTransaction } from "../src/summarize-receipt.mjs";

const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const [sender, recipient] = await viem.getWalletClients();

const successfulHash = await sender.sendTransaction({
  account: sender.account,
  to: recipient.account.address,
  value: 1_000_000_000_000_000n,
});
const successfulReceipt = await publicClient.waitForTransactionReceipt({ hash: successfulHash });
const successfulTransaction = await publicClient.getTransaction({ hash: successfulHash });
const successfulBlock = await publicClient.getBlock({ blockHash: successfulReceipt.blockHash });

const rejecting = await viem.deployContract("RejectEther");
const failedHash = await sender.sendTransaction({
  account: sender.account,
  to: rejecting.address,
  value: 1n,
  gas: 100_000n,
});
const failedReceipt = await publicClient.waitForTransactionReceipt({ hash: failedHash });
const failedTransaction = await publicClient.getTransaction({ hash: failedHash });
const failedBlock = await publicClient.getBlock({ blockHash: failedReceipt.blockHash });

console.log("local chain");
console.log(`chainId        ${successfulTransaction.chainId}`);
console.log(`sender         ${sender.account.address}`);
console.log(`recipient      ${recipient.account.address}`);
console.log(`value          ${formatEther(successfulTransaction.value)} ether`);
console.log("");
console.log("successful transfer");
console.log(JSON.stringify(summarizeTransaction(successfulTransaction, successfulReceipt, successfulBlock), null, 2));
console.log("");
console.log("failed transfer");
console.log(JSON.stringify(summarizeTransaction(failedTransaction, failedReceipt, failedBlock), null, 2));
