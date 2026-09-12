// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {Crowdfunding} from "../../src/Crowdfunding.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function deal(address account, uint256 balance) external;
    function prank(address sender) external;
    function warp(uint256 timestamp) external;
    function expectRevert(bytes4 selector) external;
}

contract CrowdfundingTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private beneficiary;
    address private contributor;
    Crowdfunding private campaign;

    function setUp() public {
        beneficiary = vm.addr(1);
        contributor = vm.addr(2);
        vm.deal(contributor, 10 ether);
        campaign = new Crowdfunding(payable(beneficiary), 2 ether, uint64(block.timestamp + 1 days));
    }

    function testContributionIsRecorded() public {
        vm.prank(contributor);
        campaign.contribute{value: 0.5 ether}();
        require(campaign.contributions(contributor) == 0.5 ether, "wrong contribution");
        require(campaign.totalRaised() == 0.5 ether, "wrong total");
    }

    function testMissedGoalCanBeRefunded() public {
        vm.prank(contributor);
        campaign.contribute{value: 0.5 ether}();
        vm.warp(block.timestamp + 1 days);
        vm.prank(contributor);
        campaign.claimRefund();
        require(campaign.contributions(contributor) == 0, "refund not cleared");
        require(address(campaign).balance == 0, "funds remain");
    }

    function testCannotFinalizeBeforeDeadline() public {
        vm.expectRevert(Crowdfunding.CampaignStillOpen.selector);
        campaign.finalize();
    }
}
