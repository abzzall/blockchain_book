import { formatEther, formatGwei } from "viem";

export function summarizeTransaction(transaction, receipt, block) {
  if (!transaction || !receipt || !block) {
    throw new Error("transaction, receipt, and block are required");
  }

  const fee = receipt.gasUsed * receipt.effectiveGasPrice;
  return {
    hash: transaction.hash,
    status: receipt.status,
    from: transaction.from,
    to: transaction.to ?? "contract creation",
    valueWei: transaction.value.toString(),
    valueEther: formatEther(transaction.value),
    nonce: transaction.nonce,
    type: transaction.type,
    chainId: transaction.chainId,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    blockTimestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
    gasLimit: transaction.gas.toString(),
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPriceWei: receipt.effectiveGasPrice.toString(),
    effectiveGasPriceGwei: formatGwei(receipt.effectiveGasPrice),
    feeWei: fee.toString(),
    feeEther: formatEther(fee),
  };
}
