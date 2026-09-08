// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Commitment} from "../src/Commitment.sol";

interface Vm { function prank(address) external; }

contract CommitmentTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function test_ACommitmentBindsWithoutDisclosing() public {
        Commitment c = new Commitment();
        bytes32 h = c.makeCommitment(42, bytes32(uint256(0xC0FFEE)));
        c.commit(h);
        // The chain now holds a hash. Nothing about 42 is readable from it.
        require(c.commitmentOf(address(this)) == h, "stored");
        require(!c.revealed(address(this)), "nothing disclosed yet");
    }

    function test_TheCommitterCannotChangeTheirMind() public {
        Commitment c = new Commitment();
        c.commit(c.makeCommitment(42, bytes32(uint256(1))));
        (bool ok, ) = address(c).call(
            abi.encodeWithSignature("reveal(uint256,bytes32)", uint256(43), bytes32(uint256(1))));
        require(!ok, "a different value must not match");
    }

    function test_RevealingProvesWhatWasCommitted() public {
        Commitment c = new Commitment();
        c.commit(c.makeCommitment(42, bytes32(uint256(1))));
        c.reveal(42, bytes32(uint256(1)));
        require(c.revealedValue(address(this)) == 42, "revealed");
    }

    /// Without a salt, a small value space is simply enumerable. This is why
    /// commitments need randomness, and why hashing alone is not hiding.
    function test_WithoutASaltASmallSpaceIsEnumerable() public {
        Commitment c = new Commitment();
        bytes32 noSalt = bytes32(0);
        bytes32 target = c.makeCommitment(7, noSalt);
        uint256 found;
        for (uint256 guess = 0; guess < 100; guess++) {
            if (c.makeCommitment(guess, noSalt) == target) { found = guess; break; }
        }
        require(found == 7, "the value was recovered by guessing");
    }
}
