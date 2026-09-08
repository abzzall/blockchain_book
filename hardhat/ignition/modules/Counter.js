import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// A deployment is declared, not scripted: Ignition works out the order and
// records what it did, so re-running does not deploy a second copy.
export default buildModule("CounterModule", (m) => {
  const counter = m.contract("Counter");
  return { counter };
});
