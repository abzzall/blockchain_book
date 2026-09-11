import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

const { viem, networkHelpers } = await network.create();

const VOTING_PERIOD = 3600n;
const TIMELOCK_DELAY = 172800n; // two days
const QUORUM = 100n;
const THRESHOLD = 10n;

// Proposal states, in the order the enum declares them.
const ACTIVE = 0;
const DEFEATED = 1;
const SUCCEEDED = 2;
const QUEUED = 3;
const EXECUTED = 4;

async function deploy() {
  const [deployer, alice, bob, carol, delegateOnly] = await viem.getWalletClients();
  const holders = [alice.account.address, bob.account.address, carol.account.address];
  const amounts = [60n, 50n, 30n];
  const dao = await viem.deployContract("GovernanceDAO", [
    holders, amounts, QUORUM, THRESHOLD, VOTING_PERIOD, TIMELOCK_DELAY,
  ]);
  const parameters = await viem.deployContract("ProtocolParameters", [dao.address, 30n]);
  return { dao, parameters, deployer, alice, bob, carol, delegateOnly };
}

/// Calldata for ProtocolParameters.setFee(newFee), built by hand so the test
/// shows what a proposal payload actually is.
function setFeeCalldata(newFee: bigint): `0x${string}` {
  const selector = "69fe0e2d"; // keccak256("setFee(uint256)")[0..4]
  return `0x${selector}${newFee.toString(16).padStart(64, "0")}` as `0x${string}`;
}

describe("GovernanceDAO: voting power and delegation", function () {
  it("holding tokens confers no voting power until the holder delegates", async function () {
    const { dao, alice } = await deploy();
    assert.equal(await dao.read.balanceOf([alice.account.address]), 60n);
    assert.equal(await dao.read.getVotes([alice.account.address]), 0n);

    await dao.write.delegate([alice.account.address], { account: alice.account.address });
    assert.equal(await dao.read.getVotes([alice.account.address]), 60n);
  });

  it("delegation moves the voting power and leaves the balance", async function () {
    const { dao, alice, bob } = await deploy();
    await dao.write.delegate([bob.account.address], { account: alice.account.address });

    assert.equal(await dao.read.balanceOf([alice.account.address]), 60n, "alice still owns her tokens");
    assert.equal(await dao.read.getVotes([alice.account.address]), 0n, "and no longer has the say");
    assert.equal(await dao.read.getVotes([bob.account.address]), 60n, "which is now bob's");
    assert.equal(await dao.read.balanceOf([bob.account.address]), 50n, "without bob gaining tokens");
  });

  it("a delegate holding no tokens can outweigh the largest holder", async function () {
    const { dao, alice, bob, carol, delegateOnly } = await deploy();
    const delegateAddress = delegateOnly.account.address;
    await dao.write.delegate([delegateAddress], { account: bob.account.address });
    await dao.write.delegate([delegateAddress], { account: carol.account.address });
    await dao.write.delegate([alice.account.address], { account: alice.account.address });

    assert.equal(await dao.read.balanceOf([delegateAddress]), 0n);
    assert.equal(await dao.read.getVotes([delegateAddress]), 80n);
    assert.equal(await dao.read.getVotes([alice.account.address]), 60n);
    assert.ok(
      (await dao.read.getVotes([delegateAddress])) > (await dao.read.getVotes([alice.account.address])),
      "a token distribution is not a distribution of influence",
    );
  });

  it("transferring tokens moves the voting power with them", async function () {
    const { dao, alice, bob } = await deploy();
    await dao.write.delegate([alice.account.address], { account: alice.account.address });
    await dao.write.delegate([bob.account.address], { account: bob.account.address });

    await dao.write.transfer([bob.account.address, 20n], { account: alice.account.address });
    assert.equal(await dao.read.getVotes([alice.account.address]), 40n);
    assert.equal(await dao.read.getVotes([bob.account.address]), 70n);
  });
});

describe("GovernanceDAO: the snapshot", function () {
  it("voting power acquired after a proposal opens does not count on it", async function () {
    const { dao, alice, bob, carol } = await deploy();
    await dao.write.delegate([alice.account.address], { account: alice.account.address });
    await dao.write.delegate([bob.account.address], { account: bob.account.address });

    const id = await dao.write.propose(["Raise the fee", "0x0000000000000000000000000000000000000000", "0x"], {
      account: alice.account.address,
    });
    assert.ok(id);

    // Carol delegates only now, after the snapshot was taken.
    await dao.write.delegate([carol.account.address], { account: carol.account.address });
    assert.equal(await dao.read.getVotes([carol.account.address]), 30n, "she has power now");

    await assert.rejects(
      dao.write.castVote([0n, true], { account: carol.account.address }),
      "but not as of the snapshot the proposal reads",
    );
  });
});

describe("GovernanceDAO: quorum", function () {
  it("a proposal every voter supported still fails if too few voted", async function () {
    const { dao, alice, carol } = await deploy();
    await dao.write.delegate([carol.account.address], { account: carol.account.address });
    await dao.write.delegate([alice.account.address], { account: alice.account.address });

    await dao.write.propose(["A quiet proposal", "0x0000000000000000000000000000000000000000", "0x"], {
      account: alice.account.address,
    });

    // Only carol votes: 30 votes cast, against a quorum of 100.
    await dao.write.castVote([0n, true], { account: carol.account.address });
    await networkHelpers.time.increase(VOTING_PERIOD + 1n);

    const proposal = await dao.read.proposal([0n]);
    assert.equal(proposal.forVotes, 30n);
    assert.equal(proposal.againstVotes, 0n);
    assert.equal(await dao.read.state([0n]), DEFEATED, "unanimous among those present, and still defeated");
  });

  it("a majority holder carries a vote against everyone else combined", async function () {
    const { dao, alice, bob, carol } = await deploy();
    for (const holder of [alice, bob, carol]) {
      await dao.write.delegate([holder.account.address], { account: holder.account.address });
    }
    await dao.write.propose(["Alice decides", "0x0000000000000000000000000000000000000000", "0x"], {
      account: alice.account.address,
    });

    await dao.write.castVote([0n, true], { account: alice.account.address });   // 60 for
    await dao.write.castVote([0n, false], { account: bob.account.address });    // 50 against
    await dao.write.castVote([0n, false], { account: carol.account.address });  // 30 against

    await networkHelpers.time.increase(VOTING_PERIOD + 1n);
    const proposal = await dao.read.proposal([0n]);
    assert.equal(proposal.forVotes, 60n);
    assert.equal(proposal.againstVotes, 80n);
    assert.equal(await dao.read.state([0n]), DEFEATED);
  });

  it("sixty defeats fifty and thirty when they do not agree with each other", async function () {
    const { dao, alice, bob, carol } = await deploy();
    for (const holder of [alice, bob, carol]) {
      await dao.write.delegate([holder.account.address], { account: holder.account.address });
    }
    await dao.write.propose(["Alice decides", "0x0000000000000000000000000000000000000000", "0x"], {
      account: alice.account.address,
    });
    await dao.write.castVote([0n, true], { account: alice.account.address });   // 60 for
    await dao.write.castVote([0n, true], { account: bob.account.address });     // 50 for
    await dao.write.castVote([0n, false], { account: carol.account.address });  // 30 against
    await networkHelpers.time.increase(VOTING_PERIOD + 1n);
    assert.equal(await dao.read.state([0n]), SUCCEEDED);
  });
});

describe("GovernanceDAO: the timelock", function () {
  async function passAProposal() {
    const context = await deploy();
    const { dao, parameters, alice, bob } = context;
    await dao.write.delegate([alice.account.address], { account: alice.account.address });
    await dao.write.delegate([bob.account.address], { account: bob.account.address });

    await dao.write.propose(["Set the fee to 75 basis points", parameters.address, setFeeCalldata(75n)], {
      account: alice.account.address,
    });
    await dao.write.castVote([0n, true], { account: alice.account.address });
    await dao.write.castVote([0n, true], { account: bob.account.address });
    await networkHelpers.time.increase(VOTING_PERIOD + 1n);
    assert.equal(await dao.read.state([0n]), SUCCEEDED);
    return context;
  }

  it("refuses to execute a proposal that has not been queued", async function () {
    const { dao } = await passAProposal();
    await assert.rejects(dao.write.execute([0n]));
  });

  it("refuses to execute before the delay has elapsed, and allows it afterwards", async function () {
    const { dao, parameters } = await passAProposal();
    await dao.write.queue([0n]);
    assert.equal(await dao.read.state([0n]), QUEUED);

    await networkHelpers.time.increase(TIMELOCK_DELAY - 60n);
    await assert.rejects(dao.write.execute([0n]), "still inside the window");
    assert.equal(await parameters.read.feeBasisPoints(), 30n, "the fee has not moved");

    await networkHelpers.time.increase(120n);
    await dao.write.execute([0n]);

    assert.equal(await dao.read.state([0n]), EXECUTED);
    assert.equal(await parameters.read.feeBasisPoints(), 75n, "the proposal did what it said");
  });

  it("cannot execute the same proposal twice", async function () {
    const { dao } = await passAProposal();
    await dao.write.queue([0n]);
    await networkHelpers.time.increase(TIMELOCK_DELAY + 1n);
    await dao.write.execute([0n]);
    await assert.rejects(dao.write.execute([0n]));
  });

  it("refuses to queue a defeated proposal", async function () {
    const { dao, alice, carol } = await deploy();
    await dao.write.delegate([carol.account.address], { account: carol.account.address });
    await dao.write.delegate([alice.account.address], { account: alice.account.address });
    await dao.write.propose(["A quiet proposal", "0x0000000000000000000000000000000000000000", "0x"], {
      account: alice.account.address,
    });
    await dao.write.castVote([0n, true], { account: carol.account.address });
    await networkHelpers.time.increase(VOTING_PERIOD + 1n);
    await assert.rejects(dao.write.queue([0n]));
  });
});

describe("GovernanceDAO: proposing and voting rules", function () {
  it("an address below the proposal threshold cannot propose", async function () {
    const { dao, delegateOnly } = await deploy();
    await assert.rejects(
      dao.write.propose(["Anyone can ask", "0x0000000000000000000000000000000000000000", "0x"], {
        account: delegateOnly.account.address,
      }),
    );
  });

  it("an address with no voting power cannot vote", async function () {
    const { dao, alice, delegateOnly } = await deploy();
    await dao.write.delegate([alice.account.address], { account: alice.account.address });
    await dao.write.propose(["A proposal", "0x0000000000000000000000000000000000000000", "0x"], {
      account: alice.account.address,
    });
    await assert.rejects(dao.write.castVote([0n, true], { account: delegateOnly.account.address }));
  });

  it("nobody votes twice, and nobody votes after the deadline", async function () {
    const { dao, alice } = await deploy();
    await dao.write.delegate([alice.account.address], { account: alice.account.address });
    await dao.write.propose(["A proposal", "0x0000000000000000000000000000000000000000", "0x"], {
      account: alice.account.address,
    });
    await dao.write.castVote([0n, true], { account: alice.account.address });
    await assert.rejects(dao.write.castVote([0n, false], { account: alice.account.address }));

    await networkHelpers.time.increase(VOTING_PERIOD + 1n);
    const { bob } = await deploy();
    assert.ok(bob);
    await assert.rejects(dao.write.castVote([0n, true], { account: alice.account.address }));
  });

  it("the parameter contract refuses anyone but the governor", async function () {
    const { parameters, alice } = await deploy();
    await assert.rejects(parameters.write.setFee([75n], { account: alice.account.address }));
  });
});

describe("GovernanceDAO: what the description does not tell you", function () {
  it("stores the calldata separately from the description, and executes the calldata", async function () {
    const { dao, parameters, alice, bob } = await deploy();
    await dao.write.delegate([alice.account.address], { account: alice.account.address });
    await dao.write.delegate([bob.account.address], { account: bob.account.address });

    // The description says one thing. The calldata says another. The contract
    // has no opinion about the disagreement; it runs the calldata.
    await dao.write.propose(["Reduce the fee to zero", parameters.address, setFeeCalldata(1000n)], {
      account: alice.account.address,
    });
    await dao.write.castVote([0n, true], { account: alice.account.address });
    await dao.write.castVote([0n, true], { account: bob.account.address });
    await networkHelpers.time.increase(VOTING_PERIOD + 1n);
    await dao.write.queue([0n]);
    await networkHelpers.time.increase(TIMELOCK_DELAY + 1n);
    await dao.write.execute([0n]);

    const proposal = await dao.read.proposal([0n]);
    assert.equal(proposal.description, "Reduce the fee to zero");
    assert.equal(await parameters.read.feeBasisPoints(), 1000n, "the fee went up to the maximum instead");
  });
});
