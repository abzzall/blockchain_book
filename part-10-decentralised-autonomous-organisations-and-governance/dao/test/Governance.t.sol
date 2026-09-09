// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Governance} from "../src/Governance.sol";

interface Vm { function warp(uint256) external; function prank(address) external; }

contract GovernanceTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address constant ALICE = address(0xA11CE);
    address constant BOB   = address(0xB0B);
    address constant CAROL = address(0xCA401);

    function _gov() internal returns (Governance g) {
        g = new Governance(100, 1 days, 2 days);
        g.grant(ALICE, 60);
        g.grant(BOB, 30);
        g.grant(CAROL, 20);
    }

    function test_VotingPowerIsWeightedByBalance() public {
        Governance g = _gov();
        require(g.votingPower(ALICE) == 60, "alice");
        require(g.votingPower(BOB) == 30, "bob");
    }

    /// One holder with more than half the supply decides every vote alone.
    function test_AMajorityHolderDecidesAlone() public {
        Governance g = _gov();
        uint256 id = g.propose("anything");
        vm.prank(ALICE); g.castVote(id, true);
        vm.prank(BOB);   g.castVote(id, false);
        vm.prank(CAROL); g.castVote(id, false);
        vm.warp(block.timestamp + 2 days);
        require(g.succeeded(id), "60 beats 50 combined");
    }

    function test_QuorumCanDefeatAProposalEveryoneVotingSupported() public {
        Governance g = _gov();
        uint256 id = g.propose("low turnout");
        vm.prank(CAROL); g.castVote(id, true);   // 20 of a 100 quorum
        vm.warp(block.timestamp + 2 days);
        require(g.turnout(id) == 20, "turnout");
        require(!g.succeeded(id), "quorum not met, so it fails");
    }

    /// Delegation moves the power and not the tokens.
    function test_DelegationMovesPowerNotBalance() public {
        Governance g = _gov();
        vm.prank(CAROL); g.delegate(BOB);
        require(g.balance(CAROL) == 20, "carol keeps her tokens");
        require(g.votingPower(CAROL) == 0, "and loses the vote");
        require(g.votingPower(BOB) == 50, "which bob now exercises");
    }

    function test_ADelegateCanOutweighTheLargestHolder() public {
        Governance g = _gov();
        vm.prank(CAROL); g.delegate(BOB);       // bob now 50
        vm.prank(ALICE); g.delegate(BOB);       // bob now 110
        require(g.votingPower(BOB) == 110, "delegation concentrates power");
    }

    function test_VotingTwiceIsRefused() public {
        Governance g = _gov();
        uint256 id = g.propose("x");
        vm.prank(ALICE); g.castVote(id, true);
        vm.prank(ALICE);
        (bool ok, ) = address(g).call(
            abi.encodeWithSignature("castVote(uint256,bool)", id, true));
        require(!ok, "double voting should be refused");
    }

    function test_VotingAfterTheDeadlineIsRefused() public {
        Governance g = _gov();
        uint256 id = g.propose("x");
        vm.warp(block.timestamp + 2 days);
        vm.prank(ALICE);
        (bool ok, ) = address(g).call(
            abi.encodeWithSignature("castVote(uint256,bool)", id, true));
        require(!ok, "voting should be closed");
    }

    /// A successful vote does not take effect immediately.
    function test_TheTimelockDelaysExecution() public {
        Governance g = _gov();
        uint256 id = g.propose("x");
        vm.prank(ALICE); g.castVote(id, true);
        vm.prank(BOB);   g.castVote(id, true);
        vm.prank(CAROL); g.castVote(id, true);   // 110 clears the quorum of 100
        vm.warp(block.timestamp + 2 days);
        require(g.succeeded(id), "should succeed");

        g.queue(id);
        (bool early, ) = address(g).call(
            abi.encodeWithSignature("execute(uint256)", id));
        require(!early, "execution before the delay should fail");

        vm.warp(block.timestamp + 3 days);
        g.execute(id);
    }

    function test_ExecutingWithoutQueueingIsRefused() public {
        Governance g = _gov();
        uint256 id = g.propose("x");
        vm.prank(ALICE); g.castVote(id, true);
        vm.warp(block.timestamp + 2 days);
        (bool ok, ) = address(g).call(
            abi.encodeWithSignature("execute(uint256)", id));
        require(!ok, "must be queued first");
    }
}
