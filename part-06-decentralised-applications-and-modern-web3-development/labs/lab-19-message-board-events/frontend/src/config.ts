import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

export const hardhatLocal = defineChain({
  id: 31337, name: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});
export const config = createConfig({
  chains: [hardhatLocal], connectors: [injected()],
  transports: { [hardhatLocal.id]: http("http://127.0.0.1:8545") },
});
